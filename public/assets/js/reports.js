/* ── reports.js — Reports page ── */

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getSessionId() {
    let id = localStorage.getItem('hvac_session_id');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('hvac_session_id', id); }
    return id;
}
function sessionHeaders() {
    return { 'X-Session-ID': getSessionId() };
}
function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Time helpers ──────────────────────────────────────
function durMs(inTs, outTs) {
    if (!inTs || !outTs) return 0;
    return Math.max(0, new Date(outTs) - new Date(inTs));
}

function fmtDurHHMM(ms) {
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = String(totalMin % 60).padStart(2, '0');
    return `${h}:${m}`;
}

function fmtDur(ms) {
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtTime(ts) {
    if (!ts) return '--';
    return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Returns YYYY-MM-DD for a Date object (local)
function localDateStr(d) {
    return d.toLocaleDateString('en-CA');
}

// Wednesday of the week containing d
function weekWednesday(d) {
    const day = d.getDay(); // 0=Sun, 3=Wed
    const diff = (day === 0) ? 3 : 3 - day;
    const wed = new Date(d);
    wed.setDate(d.getDate() + diff);
    wed.setHours(0, 0, 0, 0);
    return wed;
}

// ── Tab state ─────────────────────────────────────────
let activeTab    = 'time';
let weekStart    = weekWednesday(new Date());   // Date object (Wednesday)
let reportMonth  = new Date();               // used for year/month

function switchTab(tab, btn) {
    activeTab = tab;
    document.getElementById('tab-time').style.display  = tab === 'time'  ? '' : 'none';
    document.getElementById('tab-maint').style.display = tab === 'maint' ? '' : 'none';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (tab === 'time')  loadTimeReport();
    if (tab === 'maint') loadMaintReport();
}

// ── Week navigation ───────────────────────────────────
function shiftWeek(dir) {
    weekStart = new Date(weekStart);
    weekStart.setDate(weekStart.getDate() + dir * 7);
    loadTimeReport();
}

function updateWeekLabel() {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    document.getElementById('week-label').textContent =
        `${fmt(weekStart)} – ${fmt(end)}, ${end.getFullYear()}`;
}

async function loadTimeReport() {
    updateWeekLabel();
    document.getElementById('time-report-body').innerHTML =
        '<div class="loading-spinner"><div class="spinner"></div></div>';

    const weekStr = localDateStr(weekStart);
    const res  = await fetch(`api/time.php?week_start=${weekStr}`, { headers: sessionHeaders() });
    const data = await res.json();
    renderTimeReport(data.entries || []);
}

function renderTimeReport(entries) {
    const body = document.getElementById('time-report-body');

    // Group completed entries by local date
    const byDay = {};
    for (const e of entries) {
        if (!e.clock_out) continue; // skip open entries
        const dayKey = localDateStr(new Date(e.clock_in));
        if (!byDay[dayKey]) byDay[dayKey] = [];
        byDay[dayKey].push(e);
    }

    if (!Object.keys(byDay).length) {
        body.innerHTML = '<div class="empty-report">No time entries this week.</div>';
        return;
    }

    let html = '';
    let weekTotalMs = 0;

    // Iterate Mon–Sun
    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        const key      = localDateStr(day);
        const dayEntries = byDay[key];
        if (!dayEntries) continue;

        const dayMs = dayEntries.reduce((sum, e) => sum + durMs(e.clock_in, e.clock_out), 0);
        weekTotalMs += dayMs;

        const dayName = DAY_NAMES[day.getDay()];
        const dayFmt  = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        html += `<div class="report-day">
            <div class="report-day-header">
                <span class="report-day-name">${dayName}, ${dayFmt}</span>
                <span class="report-day-total">${fmtDurHHMM(dayMs)}</span>
            </div>`;

        for (const e of dayEntries) {
            const ms = durMs(e.clock_in, e.clock_out);
            html += `<div class="report-entry-row">
                <div class="report-entry-top">
                    <div class="report-entry-addr">${esc(e.job_address || 'No address')}</div>
                    <div class="report-entry-dur">${fmtDur(ms)}</div>
                </div>
                <div class="report-entry-times">${fmtTime(e.clock_in)} &rarr; ${fmtTime(e.clock_out)}</div>
            </div>`;
        }

        html += '</div>';
    }

    html += `<div class="report-week-total">
        <span>Week Total</span>
        <span class="report-week-total-hrs">${fmtDurHHMM(weekTotalMs)}</span>
    </div>`;

    body.innerHTML = html;
}

// ── Month navigation ──────────────────────────────────
function shiftMonth(dir) {
    reportMonth = new Date(reportMonth.getFullYear(), reportMonth.getMonth() + dir, 1);
    loadMaintReport();
}

function updateMonthLabel() {
    document.getElementById('month-label').textContent =
        `${MONTH_NAMES[reportMonth.getMonth()]} ${reportMonth.getFullYear()}`;
}

async function loadMaintReport() {
    updateMonthLabel();
    document.getElementById('maint-report-body').innerHTML =
        '<div class="loading-spinner"><div class="spinner"></div></div>';

    const y = reportMonth.getFullYear();
    const m = String(reportMonth.getMonth() + 1).padStart(2, '0');
    const res  = await fetch(`api/reports/maintenance.php?month=${y}-${m}`, { headers: sessionHeaders() });
    const data = await res.json();
    renderMaintReport(data);
}

function renderMaintReport(data) {
    const body = document.getElementById('maint-report-body');
    if (data.error) {
        body.innerHTML = `<div class="empty-report">${esc(data.error)}</div>`;
        return;
    }
    const { first_time = 0, renewal = 0, total = 0, first_time_jobs = [], renewal_jobs = [] } = data;

    function jobListHtml(jobs, type) {
        if (!jobs.length) return `<div class="maint-job-empty">None</div>`;
        return jobs.map(j => `
            <div class="maint-job-row maint-job-row--${type}" id="maint-job-${j.id}">
                <div class="maint-job-main">
                    <div class="maint-job-addr">${esc(j.address)}</div>
                    <div class="maint-job-systems">${j.systems} ${j.systems === 1 ? 'system' : 'systems'}</div>
                </div>
                <button class="maint-job-delete" onclick="deleteMaintJob(${j.id})" title="Delete">&#10005;</button>
            </div>`).join('');
    }

    body.innerHTML = `
        <div class="maint-stat-grid">
            <div class="maint-stat-card first-time">
                <div class="maint-stat-value">${first_time}</div>
                <div class="maint-stat-label">First Time</div>
            </div>
            <div class="maint-stat-card renewal">
                <div class="maint-stat-value">${renewal}</div>
                <div class="maint-stat-label">Renewal</div>
            </div>
            <div class="maint-stat-card total">
                <div class="maint-stat-value">${total}</div>
                <div class="maint-stat-label">Total</div>
            </div>
        </div>
        ${total === 0 ? '<div class="empty-report">No maintenance jobs this month.</div>' : `
        <div class="maint-section maint-section--first-time">
            <div class="maint-section-title">First Time</div>
            ${jobListHtml(first_time_jobs, 'first-time')}
        </div>
        <div class="maint-section maint-section--renewal">
            <div class="maint-section-title">Renewal</div>
            ${jobListHtml(renewal_jobs, 'renewal')}
        </div>`}`;
}

// ── Remove from maintenance report (changes job_type to maintenance_check) ──
async function deleteMaintJob(id) {
    const row = document.getElementById('maint-job-' + id);
    if (row) row.style.opacity = '0.4';
    try {
        const res  = await fetch('api/jobs.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
            body: JSON.stringify({ id, job_type: 'maintenance_check' }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (row) row.remove();
        loadMaintReport();
    } catch (e) {
        if (row) row.style.opacity = '';
        alert('Failed: ' + e.message);
    }
}

// ── Init ──────────────────────────────────────────────
loadTimeReport();
