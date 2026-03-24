/* ── app.js ── index page ── */

const TYPE_LABELS = {
    maintenance_first_time: 'First Time',
    maintenance_renewal:    'Renewal',
    maintenance_check:      'Check',
    filter_change:          'Filter Change',
    service_call:           'Service Call',
};
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

// ── Init ──────────────────────────────────────────
const jobList    = document.getElementById('job-list');
const headerDate = document.getElementById('header-date');
const fabAdd     = document.getElementById('fab-add');

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
        const res  = await fetch(`api/jobs.php?date=${todayStr()}`);
        const jobs = await res.json();
        renderJobs(jobs);
    } catch (err) {
        jobList.innerHTML = '<div class="empty-state"><p>Failed to load jobs.</p></div>';
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
    jobList.innerHTML = jobs.map(jobCard).join('');
}

function jobCard(job) {
    const addr   = [job.address_line1, job.address_line2].filter(Boolean).join(', ');
    const mapsUrl = addr ? `https://maps.google.com/?q=${encodeURIComponent(addr)}` : null;
    const tel     = job.phone ? 'tel:' + job.phone.replace(/\D/g, '') : null;
    const sys     = SYS_LABELS[job.system_type] ?? '';

    const statusOpts = STATUS_OPTS.map(s =>
        `<option value="${s}" ${job.status === s ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`
    ).join('');

    return `
    <div class="job-card status-${job.status}" id="card-${job.id}">
        <div class="job-card-header">
            <div>
                <div class="job-card-name">${esc(job.customer_name)}</div>
                ${addr ? `<div class="job-card-address">${esc(addr)}</div>` : ''}
                <div class="job-card-meta">
                    <span class="badge ${TYPE_BADGE[job.job_type] ?? ''}">${TYPE_LABELS[job.job_type] ?? job.job_type}</span>
                    ${sys ? `<span class="badge badge-sys">${esc(sys)}</span>` : ''}
                </div>
            </div>
            <select class="status-select" onchange="updateStatus(${job.id}, this.value, this)">
                ${statusOpts}
            </select>
        </div>
        <div class="job-card-actions">
            ${tel ? `<a href="${tel}" class="btn btn-call btn-sm">&#128222; Call</a>` : ''}
            ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" class="btn btn-map btn-sm">&#128205; Maps</a>` : ''}
            <a href="job_view.php?id=${job.id}" class="btn btn-edit btn-sm">&#128065; View</a>
            <a href="job_form.php?id=${job.id}" class="btn btn-edit btn-sm">&#9998; Edit</a>
        </div>
    </div>`;
}

// ── Status update ─────────────────────────────────
async function updateStatus(id, status, selectEl) {
    const card = document.getElementById('card-' + id);
    try {
        await fetch('api/jobs.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status }),
        });
        card.className = card.className.replace(/status-\S+/, 'status-' + status);
        showToast('Status updated');
    } catch {
        showToast('Failed to update', true);
    }
}

// ── Toast ─────────────────────────────────────────
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg, isError = false) {
    toastEl.textContent = msg;
    toastEl.className   = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.className = 'toast'; }, 2500);
}

function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
