// Job view page

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

async function loadJob() {
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');

    if (!jobId) {
        window.location.href = '/';
        return;
    }

    try {
        const res = await fetch(`/api/jobs/${jobId}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Not found');
        const job = await res.json();
        renderJob(job);
    } catch (err) {
        document.getElementById('view-container').innerHTML = '<p style="padding: 2rem; color: red;">Error loading job</p>';
    }
}

function renderJob(job) {
    const container = document.getElementById('view-container');

    let html = `
        <section class="form-section">
            <h2>Customer Information</h2>
            <div class="job-row">
                <div class="job-row-label">Name:</div>
                <div class="job-row-value">${job.customer_name}</div>
            </div>
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
        </section>

        <section class="form-section">
            <h2>Job Details</h2>
            <div class="job-row">
                <div class="job-row-label">Date:</div>
                <div class="job-row-value">${new Date(job.job_date).toLocaleDateString()}</div>
            </div>
            <div class="job-row">
                <div class="job-row-label">Type:</div>
                <div class="job-row-value">${JOB_TYPES[job.job_type] || job.job_type}</div>
            </div>
            <div class="job-row">
                <div class="job-row-label">Status:</div>
                <div class="job-row-value">${STATUS[job.status] || job.status}</div>
            </div>
        </section>
    `;

    // Render system data
    const jobData = job.job_data || {};
    Object.keys(jobData).forEach(key => {
        if (key.includes('_indoor') || key.includes('_outdoor')) {
            const [sysType, section] = key.includes('_indoor')
                ? [key.replace('_indoor', ''), 'indoor']
                : [key.replace('_outdoor', ''), 'outdoor'];

            const title = section === 'indoor' ? 'Indoor Unit' : 'Outdoor Unit';
            const data = jobData[key];

            html += `
                <section class="form-section">
                    <h2>${title}</h2>
            `;

            Object.entries(data).forEach(([field, value]) => {
                if (typeof value === 'boolean') {
                    value = value ? '✓' : '✗';
                }
                html += `
                    <div class="job-row">
                        <div class="job-row-label">${field.replace(/_/g, ' ')}:</div>
                        <div class="job-row-value">${value || '—'}</div>
                    </div>
                `;
            });

            html += '</section>';
        }
    });

    if (jobData.notes) {
        html += `
            <section class="form-section">
                <h2>Notes</h2>
                <p>${jobData.notes}</p>
            </section>
        `;
    }

    html += `
        <div class="form-actions">
            <a href="job_form.html?id=${job.id}" class="btn btn-secondary" style="flex: 1; text-align: center;">Edit</a>
            <button class="btn btn-primary" style="flex: 1;" onclick="window.location.href='/'">Back</button>
        </div>
    `;

    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', loadJob);
