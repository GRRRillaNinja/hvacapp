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

// ── Session ID ────────────────────────────────────
function getSessionId() {
    let id = localStorage.getItem('hvac_session_id');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('hvac_session_id', id); }
    return id;
}
function sessionHeaders() { return { 'X-Session-ID': getSessionId() }; }

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
        return;
    }
    jobList.innerHTML = jobs.map((job, index) => jobCard(job, index)).join('');
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
    const dis = activeEntry ? 'disabled' : '';
    return `<button class="btn btn-clock-in btn-sm" ${dis} onclick="clockIn(event, '${job.id}')">Clock In</button>`;
}

function refreshClockButtons() {
    allJobs.forEach(job => {
        const slot = document.getElementById('clock-btn-' + job.id);
        if (slot) slot.innerHTML = clockBtnHtml(job);
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
