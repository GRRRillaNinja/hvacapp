// Job list page

const JOB_TYPES = {
    maintenance_first_time: 'Maintenance - First Time',
    maintenance_renewal: 'Maintenance - Renewal',
    maintenance_check: 'Maintenance - Check',
    filter_change: 'Filter Change',
    service_call: 'Service Call'
};

const STATUS = {
    pending: 'Pending',
    in_progress: 'In Progress',
    complete: 'Complete'
};

function getSessionId() {
    let id = localStorage.getItem('hvac_session_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('hvac_session_id', id);
    }
    return id;
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-Session-ID': getSessionId()
    };
}

async function loadJobs() {
    try {
        const res = await fetch('/api/jobs', { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to load jobs');
        const jobs = await res.json();
        renderJobs(jobs);
    } catch (err) {
        console.error(err);
        document.querySelector('.jobs-container').innerHTML =
            '<p style="padding: 2rem; color: red;">Error loading jobs</p>';
    }
}

function renderJobs(jobs) {
    const container = document.querySelector('.jobs-container');

    if (jobs.length === 0) {
        container.innerHTML = '<p style="padding: 2rem; text-align: center; color: #666;">No jobs yet. <a href="job_form.html">Create one</a></p>';
        return;
    }

    const colors = ['#1d4ed8', '#c2410c', '#7c3aed', '#0d9488', '#c0392b', '#b07d1a'];

    container.innerHTML = jobs.map((job, idx) => {
        const color = colors[idx % colors.length];
        const date = new Date(job.job_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const addr = [job.address_line1, job.address_line2].filter(Boolean).join(', ') || 'No address';

        return `
            <div class="job-card" style="border-left-color: ${color}">
                <div class="job-card-header" onclick="toggleCard(this)">
                    <div>
                        <div class="job-card-title">${job.customer_name}</div>
                        <div class="job-card-subtitle">${date} • ${JOB_TYPES[job.job_type] || job.job_type}</div>
                    </div>
                    <div class="job-card-toggle">▼</div>
                </div>
                <div class="job-card-body">
                    <div class="job-row">
                        <div class="job-row-label">Address:</div>
                        <div class="job-row-value">${job.address_line1 || '—'}</div>
                    </div>
                    <div class="job-row">
                        <div class="job-row-label">City/Zip:</div>
                        <div class="job-row-value">${job.address_line2 || '—'}</div>
                    </div>
                    <div class="job-row">
                        <div class="job-row-label">Phone:</div>
                        <div class="job-row-value"><a href="tel:${job.phone?.replace(/\D/g, '')}">${job.phone || '—'}</a></div>
                    </div>
                    <div class="job-row">
                        <div class="job-row-label">Status:</div>
                        <div class="job-row-value">${STATUS[job.status] || job.status}</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                        <a href="job_view.html?id=${job.id}" class="btn btn-secondary" style="flex: 1; text-align: center;">View</a>
                        <a href="job_form.html?id=${job.id}" class="btn btn-secondary" style="flex: 1; text-align: center;">Edit</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleCard(header) {
    const card = header.closest('.job-card');
    card.classList.toggle('expanded');
}

document.addEventListener('DOMContentLoaded', () => {
    loadJobs();
    setInterval(loadJobs, 30000);
});
