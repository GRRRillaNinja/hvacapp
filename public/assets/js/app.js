/* ── app.js ── index page ── */

const TYPE_LABELS = {
    maintenance_first_time: 'First Time',
    maintenance_renewal:    'Renewal',
    maintenance_check:      'Check',
    filter_change:          'Filter Change',
    service_call:           'Service Call',
    shop:                   'Shop',
};

// Always-present synthetic Shop job
const SHOP_JOB = { id: 'shop', customer_name: 'Shop', job_type: 'shop', address_line1: null, address_line2: null, phone: null, system_type: null, status: 'pending' };
const TYPE_BADGE = {
    maintenance_first_time: 'badge-type-first',
    maintenance_renewal:    'badge-type-renewal',
    maintenance_check:      'badge-type-check',
    filter_change:          'badge-type-filter',
    service_call:           'badge-type-service',
};
const SYS_LABELS = {
    electric_heat_pump: 'Electric Heat Pump',
    gas_ac:             'Gas / AC',
    electric_ac:        'Electric / AC',
    dual_fuel:          'Dual Fuel',
};
const STATUS_OPTS = ['pending', 'in_progress', 'complete'];
const STATUS_LABELS = { pending: 'Pending', in_progress: 'In Progress', complete: 'Complete' };

// ── Marquee Messages ──────────────────────────────
const MARQUEE_MESSAGES = [
    'You already know this condenser is gonna fuck your whole day up.',
    'You\'re about to open a panel and immediately regret every life choice that led here.',
    'That quick call\' is a goddamn lie and you know it.',
    'You\'re gonna swear that capacitor is fine right before it absolutely isn\'t.',
    'You\'re 90% sure that filter is held together by pure fucking hate.',
    'You\'re about to find someone\'s I watched a YouTube video\' wiring disaster.',
    'That blower wheel is about to spin up and ruin your whole damn mood.',
    'You already don\'t trust that thermostat—and it\'s not exactly trusting you either.',
    'You\'re gonna touch that contactor and instantly regret being alive.',
    'That coil is about to turn your gloves into soggy fucking regret.',
    'You\'re about to open this install and wonder how it\'s even running at all.',
    'That drain line is definitely growing something that shouldn\'t be alive.',
    'You\'re gonna open that return and hear it whisper you\'re fucked.\'',
    'That TXV is acting like a pissed-off demon with refrigerant addiction.',
    'You already know the charge is held together with hope, prayer, and bullshit.',
    'You\'re about to chase airflow like it owes you money and respect.',
    'That unit isn\'t acting weird\'—it\'s actively fucking with you.',
    'You\'re gonna hear that fan and feel your soul leave your body a little.',
    'That low voltage issue is 100% some lazy-ass shortcut from last time.',
    'You\'re about to realize this went from quick fix\' to fuck my whole day.\'',
    'That compressor sounds like it\'s screaming for help in fucking Morse code.',
    'You\'re gonna open that panel and immediately hate everyone involved.',
    'That evap coil is one bad decision away from becoming a frozen disaster.',
    'Somebody confidently fucked this up and walked away proud.',
    'You\'re gonna fix one thing and accidentally unleash three more problems.',
    'That static pressure is about to personally insult your entire skillset.',
    'You\'re about to realize this job needed an exorcism, not tools.',
    'That thermostat is lying like a motherfucker right now.',
    'You\'re gonna leave this job slightly more broken than when you arrived.',
    'That system is about to test your patience, your tools, and your fucking sanity.',
    'Alright—you\'re still gonna fix this shit, even if it fights you the whole way.',
];

let lastMarqueeMessage = null;

let marqueeQueue = [];
let marqueeAnimating = false;

function getNextMessage() {
    let msg;
    do {
        msg = MARQUEE_MESSAGES[Math.floor(Math.random() * MARQUEE_MESSAGES.length)];
    } while (msg === lastMarqueeMessage && MARQUEE_MESSAGES.length > 1);
    lastMarqueeMessage = msg;
    return msg;
}

function startMarqueeAnimation() {
    const marqueeEl = document.getElementById('marquee-text');
    if (!marqueeEl || marqueeAnimating) return;

    marqueeAnimating = true;

    const msg = marqueeQueue.shift() || getNextMessage();
    marqueeEl.textContent = msg;
    marqueeEl.style.opacity = '1';

    // Force layout to get accurate offsetWidth
    const textWidth = marqueeEl.offsetWidth;
    const containerWidth = window.innerWidth;
    const totalDistance = containerWidth + textWidth;
    const pixelsPerSecond = 40;
    const duration = totalDistance / pixelsPerSecond;

    // Start fully off-screen to the right
    marqueeEl.style.transform = `translateX(${containerWidth}px)`;

    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = (currentTime - startTime) / 1000;
        const progress = elapsed / duration;

        if (progress >= 1) {
            marqueeEl.style.transform = `translateX(${-textWidth}px)`;
            marqueeAnimating = false;
            // Chain next message immediately
            requestAnimationFrame(() => startMarqueeAnimation());
            return;
        }

        const currentX = containerWidth - (progress * totalDistance);
        marqueeEl.style.transform = `translateX(${currentX}px)`;
        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}

// Initialize marquee on page load
window.addEventListener('load', () => {
    // Pre-queue first few messages for smooth start
    marqueeQueue.push(getNextMessage());
    startMarqueeAnimation();
});

// ── Session ID ────────────────────────────────────
function getSessionId() {
    let id = localStorage.getItem('hvac_session_id');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('hvac_session_id', id); }
    return id;
}
function sessionHeaders() { return { 'X-Session-ID': getSessionId() }; }

// ── Offline Job Queue ──────────────────────────────
const QUEUE_KEY = 'hvac_job_queue';

function getJobQueue() {
    try {
        const json = localStorage.getItem(QUEUE_KEY);
        return json ? JSON.parse(json) : [];
    } catch (e) {
        console.error('[QUEUE] Error reading queue:', e);
        return [];
    }
}

function saveQueue(queue) {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.error('[QUEUE] Error saving queue (quota exceeded?):', e);
        // Quota exceeded: remove oldest unverified item to make space
        if (e.name === 'QuotaExceededError') {
            const currentQueue = getJobQueue();
            const unverified = currentQueue.filter(q => !q.verified);
            if (unverified.length > 0) {
                const oldestUnverified = unverified[0];
                const newQueue = currentQueue.filter(q => q.tempId !== oldestUnverified.tempId);
                saveQueue(newQueue); // Retry with one fewer item
            }
        }
    }
}

function addJobToQueue(jobData, tempId) {
    const queue = getJobQueue();
    const item = {
        tempId,
        serverId: null,
        jobData: { ...jobData, idempotency_key: tempId },
        status: 'pending',
        createdAt: new Date().toISOString(),
        lastAttemptAt: null,
        lastError: null,
        attemptCount: 0,
        verified: false,
    };
    queue.push(item);
    saveQueue(queue);
    console.log('[QUEUE] Added job to queue:', tempId);
}

function markJobSynced(tempId, serverId) {
    const queue = getJobQueue();
    const item = queue.find(q => q.tempId === tempId);
    if (item) {
        item.status = 'synced';
        item.serverId = serverId;
        item.lastAttemptAt = new Date().toISOString();
        saveQueue(queue);
        console.log('[QUEUE] Marked as synced:', tempId, '→', serverId);
    }
}

function markJobVerified(tempId) {
    const queue = getJobQueue();
    const item = queue.find(q => q.tempId === tempId);
    if (item) {
        item.verified = true;
        saveQueue(queue);
        console.log('[QUEUE] Marked as verified:', tempId);
    }
}

function removeVerifiedJob(tempId) {
    let queue = getJobQueue();
    queue = queue.filter(q => q.tempId !== tempId);
    saveQueue(queue);
    console.log('[QUEUE] Removed verified job:', tempId);
}

function getPendingJobs() {
    return getJobQueue().filter(q => q.status === 'pending' || q.status === 'error');
}

function getAllQueuedJobs() {
    return getJobQueue().filter(q => !q.verified);
}

function updateQueueItemJobData(tempId, jobData) {
    const queue = getJobQueue();
    const item = queue.find(q => q.tempId === tempId);
    if (item) {
        item.jobData = { ...jobData, idempotency_key: tempId };
        item.lastAttemptAt = null; // Reset attempt counter on edit
        item.status = 'pending';
        saveQueue(queue);
        console.log('[QUEUE] Updated job data:', tempId);
    }
}

// ── Sync Pending Jobs ──────────────────────────────
async function syncPendingJobs() {
    const pending = getPendingJobs();
    if (pending.length === 0) {
        showToast('No jobs to sync', false);
        return;
    }

    const syncBtn = document.getElementById('sync-btn');
    syncBtn.classList.add('syncing');
    syncBtn.disabled = true;

    let synced = 0;
    let failed = 0;

    for (const item of pending) {
        try {
            console.log('[SYNC] Syncing job:', item.tempId);
            const res = await fetch('api/jobs.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
                body: JSON.stringify(item.jobData),
            });

            const json = await res.json();

            if (json.error) {
                throw new Error(json.error);
            }

            // Success: mark as synced with server ID
            const serverId = json.id;
            markJobSynced(item.tempId, serverId);
            synced++; // Count as synced once POST succeeds
            console.log('[SYNC] Synced:', item.tempId, '→', serverId);

            // Verify job exists on server (cleanup only; don't block on failure)
            try {
                const verifyRes = await fetch(`api/jobs.php?id=${serverId}`, {
                    headers: sessionHeaders(),
                });
                const verifyData = await verifyRes.json();
                if (verifyData && verifyData.id === serverId) {
                    markJobVerified(item.tempId);
                    removeVerifiedJob(item.tempId);
                    console.log('[SYNC] Verified and removed:', item.tempId);
                }
            } catch (e) {
                console.warn('[SYNC] Verification failed for', item.tempId, 'but keeping in queue:', e);
                // Keep in queue if verification failed; next sync will retry
            }
        } catch (e) {
            console.error('[SYNC] Error syncing', item.tempId, e);
            const queue = getJobQueue();
            const qItem = queue.find(q => q.tempId === item.tempId);
            if (qItem) {
                qItem.status = 'error';
                qItem.lastError = e.message;
                qItem.attemptCount = (qItem.attemptCount || 0) + 1;
                qItem.lastAttemptAt = new Date().toISOString();
                saveQueue(queue);
            }
            failed++;
        }
    }

    syncBtn.classList.remove('syncing');
    syncBtn.disabled = false;

    // Reload jobs and update UI
    await loadJobs();

    let msg = '';
    if (synced > 0) msg += `Synced ${synced} job(s). `;
    if (failed > 0) msg += `${failed} still pending.`;
    if (synced === pending.length) msg = 'All jobs synced!';

    showToast(msg, failed > 0);
}

// ── Init ──────────────────────────────────────────
const jobList    = document.getElementById('job-list');
const headerDate = document.getElementById('header-date');
const fabAdd     = document.getElementById('fab-add');

let allJobs     = [];
let jobsById    = {};
let activeEntry = null;

function todayStr() {
    return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
}

updateHeaderDate();
loadJobs();

function updateHeaderDate() {
    const d = new Date();
    headerDate.textContent = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    fabAdd.href = `job_form.php?date=${todayStr()}`;
}

// ── Load jobs ─────────────────────────────────────
async function loadJobs() {
    jobList.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    try {
        const [jobsRes, activeRes] = await Promise.all([
            fetch(`api/jobs.php?date=${todayStr()}`, { headers: sessionHeaders() }),
            fetch('api/time.php?active=1', { headers: sessionHeaders() }),
        ]);
        const jobs       = await jobsRes.json();
        const activeData = await activeRes.json();
        if (jobs.error) throw new Error(jobs.error);
        activeEntry = activeData.entry || null;
        allJobs = [SHOP_JOB, ...(Array.isArray(jobs) ? jobs : [])];
        allJobs.forEach(j => { jobsById[j.id] = j; });
        renderJobs(allJobs);
    } catch (err) {
        jobList.innerHTML = `<div class="empty-state"><p>Error: ${esc(err.message)}</p></div>`;
    }
}

function renderJobs(jobs) {
    if (!jobs.length) {
        jobList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <p>No jobs for today.<br>Tap <strong>+</strong> to add one.</p>
            </div>`;
    } else {
        jobList.innerHTML = jobs.map((job, index) => jobCard(job, index)).join('');
    }
    updateSyncButton();
}

function updateSyncButton() {
    const pending = getPendingJobs();
    const syncBtn = document.getElementById('sync-btn');
    const syncBadge = document.getElementById('sync-badge');

    if (pending.length > 0) {
        syncBtn.style.display = 'flex';
        syncBadge.textContent = pending.length;
    } else {
        syncBtn.style.display = 'none';
    }
}

function jobCard(job, index) {
    const isShop  = job.id === 'shop';
    const addrFull = [job.address_line1, job.address_line2].filter(Boolean).join(', ');
    const mapsUrl = addrFull ? `https://maps.google.com/?q=${encodeURIComponent(addrFull)}` : null;
    const tel     = job.phone ? 'tel:' + job.phone.replace(/\D/g, '') : null;
    const sys     = SYS_LABELS[job.system_type] ?? '';

    let addressDisplay = '';
    if (job.address_line1 && job.address_line2) {
        addressDisplay = job.address_line1 + ', ' + job.address_line2;
    } else if (job.address_line1) {
        addressDisplay = job.address_line1;
    } else if (job.address_line2) {
        addressDisplay = job.address_line2;
    }

    const jobColors = ['job-color-1', 'job-color-2', 'job-color-3', 'job-color-4', 'job-color-5', 'job-color-6'];
    const jobColor  = isShop ? 'job-color-shop' : jobColors[index % jobColors.length];

    const isActive  = activeEntry && (
        isShop ? activeEntry.job_id === null : activeEntry.job_id == job.id
    );
    const activeClass = isActive ? 'active-job' : '';

    const statusOpts = STATUS_OPTS.map(s =>
        `<option value="${s}" ${job.status === s ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`
    ).join('');

    const expandedContent = isShop
        ? ''
        : `<div class="job-card-status">
               <label>Status:</label>
               <select class="status-select" onchange="updateStatus(${job.id}, this.value, this)">
                   ${statusOpts}
               </select>
           </div>
           ${addressDisplay ? `<div class="job-card-detail-row"><strong>Address:</strong> ${esc(addressDisplay)}</div>` : ''}
           ${job.phone ? `<div class="job-card-detail-row"><strong>Phone:</strong> ${esc(job.phone)}</div>` : ''}
           ${sys ? `<div class="job-card-detail-row"><strong>System:</strong> ${esc(sys)}</div>` : ''}
           <div class="job-card-actions">
               ${tel ? `<a href="${tel}" class="btn btn-call btn-sm">&#128222; Call</a>` : ''}
               ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" class="btn btn-map btn-sm">&#128205; Maps</a>` : ''}
               <a href="job_view.php?id=${job.id}" class="btn btn-view btn-sm">&#128065; View</a>
               <a href="job_form.php?id=${job.id}" class="btn btn-edit btn-sm">&#9998; Edit</a>
           </div>`;

    return `
    <div class="job-card ${jobColor} status-${job.status} ${activeClass}" id="card-${job.id}">
        <div class="job-card-header" onclick="toggleJobCard('${job.id}')">
            <div class="job-card-header-content">
                <div class="job-card-name">${esc(job.customer_name)}</div>
                <span class="job-card-badge">${TYPE_LABELS[job.job_type] ?? job.job_type}</span>
                ${(job.days_until_deletion !== undefined && job.days_until_deletion <= 2) ? `<span class="deletion-warning-badge" title="This job will be deleted in ${job.days_until_deletion} day(s)">⚠️ Deleting soon</span>` : ''}
            </div>
            <div class="job-card-header-right">
                <span class="clock-btn-slot" id="clock-btn-${job.id}" onclick="event.stopPropagation()">${clockBtnHtml(job)}</span>
                <div class="job-card-toggle">
                    <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
            </div>
        </div>
        <div class="job-card-expanded" style="display:none">
            ${expandedContent}
        </div>
    </div>`;
}

function toggleJobCard(jobId) {
    const card     = document.getElementById('card-' + jobId);
    const expanded = card.querySelector('.job-card-expanded');
    const chevron  = card.querySelector('.chevron');
    const isOpen   = expanded.style.display !== 'none';
    expanded.style.display    = isOpen ? 'none' : '';
    chevron.style.transform   = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

// ── Status update ─────────────────────────────────
async function updateStatus(id, status, selectEl) {
    const card = document.getElementById('card-' + id);
    try {
        console.log(`[HVAC] Updating job ${id} status to: ${status}`);
        const res = await fetch('api/jobs.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
            body: JSON.stringify({ id, status }),
        });
        const result = await res.json();
        console.log(`[HVAC] Status update response:`, result);
        if (result.error) throw new Error(result.error);
        card.className = card.className.replace(/status-\S+/, 'status-' + status);
        showToast('Status updated');
    } catch (err) {
        console.error(`[HVAC] Error updating status:`, err);
        showToast(`Failed to update: ${err.message}`, true);
    }
}

// ── Toast ─────────────────────────────────────────
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg, variant = false) {
    toastEl.textContent = msg;
    const cls = variant === true ? 'error' : (variant || '');
    toastEl.className   = 'toast show' + (cls ? ' ' + cls : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.className = 'toast'; }, 2500);
}

// ── Clock In / Out ────────────────────────────────
function clockBtnHtml(job) {
    const isShopJob = job.id === 'shop';
    const isActive  = activeEntry && (
        isShopJob ? activeEntry.job_id === null : activeEntry.job_id == job.id
    );
    if (isActive) {
        return `<button class="btn btn-clock-out btn-sm" onclick="clockOut(event, '${job.id}')">Clock Out</button>`;
    }
    // Enable clock-in for all jobs; clicking another job auto-clocks out the previous one
    return `<button class="btn btn-clock-in btn-sm" onclick="clockIn(event, '${job.id}')">Clock In</button>`;
}

function refreshClockButtons() {
    allJobs.forEach(job => {
        const slot = document.getElementById('clock-btn-' + job.id);
        if (slot) slot.innerHTML = clockBtnHtml(job);

        // Update active-job class on the job card itself
        const card = document.getElementById('card-' + job.id);
        if (card) {
            const isShop = job.id === 'shop';
            const isActive = activeEntry && (
                isShop ? activeEntry.job_id === null : activeEntry.job_id == job.id
            );
            if (isActive) {
                card.classList.add('active-job');
            } else {
                card.classList.remove('active-job');
            }
        }
    });
}

async function clockIn(e, jobId) {
    e.preventDefault();
    try {
        // Auto clock-out any active job first
        if (activeEntry) {
            const res = await fetch('api/time.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
                body: JSON.stringify({ id: activeEntry.id }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
        }

        // Clock in to new job
        const job    = jobsById[jobId];
        const isShop = job.id === 'shop';
        const addr   = isShop ? 'Shop' : [job.address_line1, job.address_line2].filter(Boolean).join(', ');
        const res  = await fetch('api/time.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
            body: JSON.stringify({ job_id: isShop ? null : job.id, job_address: addr }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        activeEntry = data.entry;
        refreshClockButtons();
        showToast('Clocked in', 'clock-in');
    } catch (err) {
        showToast(err.message, true);
    }
}

async function clockOut(e, jobId) {
    e.preventDefault();
    if (!activeEntry) return;
    try {
        const res  = await fetch('api/time.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
            body: JSON.stringify({ id: activeEntry.id }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        activeEntry = null;
        refreshClockButtons();
        showToast('Clocked out', 'clock-out');
    } catch (err) {
        showToast(err.message, true);
    }
}

function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
