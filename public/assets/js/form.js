// Form - Complete with all features

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

function formatPhone(p) {
    if (!p) return '';
    const d = p.replace(/\D/g, '');
    if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
    return p;
}

async function loadJob(jobId) {
    try {
        const res = await fetch(`/api/jobs/${jobId}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Job not found');
        return await res.json();
    } catch (err) {
        console.error(err);
        alert('Error loading job');
        window.location.href = '/';
        return null;
    }
}

async function saveJob(data) {
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');
    const url = jobId ? `/api/jobs/${jobId}` : '/api/jobs';
    const method = jobId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Save failed');
        const job = await res.json();
        alert('Job saved');
        window.location.href = `job_view.html?id=${job.id}`;
    } catch (err) {
        console.error(err);
        alert('Error saving job: ' + err.message);
    }
}

async function deleteJob() {
    if (!confirm('Delete this job?')) return;
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');
    if (!jobId) return;

    try {
        const res = await fetch(`/api/jobs/${jobId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Delete failed');
        alert('Job deleted');
        window.location.href = '/';
    } catch (err) {
        console.error(err);
        alert('Error deleting job');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('job-form');
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');

    // Set today's date by default
    const dateInput = document.querySelector('[name="job_date"]');
    if (!dateInput.value) {
        dateInput.valueAsDate = new Date();
    }

    // Show systems section
    document.getElementById('systems-section').style.display = 'block';

    // Phone formatting on blur
    const phoneInput = document.querySelector('[name="phone"]');
    phoneInput.addEventListener('blur', () => {
        phoneInput.value = formatPhone(phoneInput.value);
    });

    // Load job if editing
    if (jobId) {
        const job = await loadJob(jobId);
        if (!job) return;

        document.getElementById('form-title').textContent = 'Edit Job';
        document.getElementById('delete-btn').style.display = '';

        // Populate basic fields
        document.querySelector('[name="customer_name"]').value = job.customer_name || '';
        document.querySelector('[name="address_line1"]').value = job.address_line1 || '';
        document.querySelector('[name="address_line2"]').value = job.address_line2 || '';
        document.querySelector('[name="phone"]').value = job.phone || '';
        document.querySelector('[name="job_type"]').value = job.job_type || '';
        document.querySelector('[name="status"]').value = job.status || 'pending';
        document.querySelector('[name="notes"]').value = job.job_data?.notes || '';
        document.querySelector('[name="job_date"]').value = job.job_date || '';
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedSystems = Array.from(document.querySelectorAll('[name^="system_"]:checked'))
            .map(el => el.name.replace('system_', ''));

        if (!selectedSystems.length && !jobId) {
            alert('Select at least one system');
            return;
        }

        const data = {
            job_date: document.querySelector('[name="job_date"]').value,
            job_type: document.querySelector('[name="job_type"]').value,
            customer_name: document.querySelector('[name="customer_name"]').value,
            address_line1: document.querySelector('[name="address_line1"]').value,
            address_line2: document.querySelector('[name="address_line2"]').value,
            phone: document.querySelector('[name="phone"]').value,
            status: document.querySelector('[name="status"]').value,
            job_data: {
                notes: document.querySelector('[name="notes"]').value
            }
        };

        // Collect all form field values
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.name && !el.name.startsWith('system_') && !['job_date', 'job_type', 'customer_name', 'address_line1', 'address_line2', 'phone', 'status', 'notes'].includes(el.name)) {
                let value = el.type === 'checkbox' ? el.checked : el.value;
                if (value) {
                    data.job_data[el.name] = value;
                }
            }
        });

        await saveJob(data);
    });
});
