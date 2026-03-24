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
        const res = await fetch(`/api/jobs.php?id=${jobId}`, { headers: getHeaders() });
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
    const url = '/api/jobs.php';
    const method = jobId ? 'PUT' : 'POST';
    if (jobId) data.id = parseInt(jobId);

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
        const res = await fetch(`/api/jobs.php?id=${jobId}`, {
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

    // System selection - show/hide sections
    const systemCheckboxes = document.querySelectorAll('[name^="system_"]');
    systemCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const isElectricHP = document.querySelector('[name="system_electric_heat_pump"]').checked;
            const isElectricAC = document.querySelector('[name="system_electric_ac"]').checked;
            const isGasAC = document.querySelector('[name="system_gas_ac"]').checked;
            const isDualFuel = document.querySelector('[name="system_dual_fuel"]').checked;

            // Electric sections show if Heat Pump or AC selected
            document.getElementById('electric-indoor').style.display = (isElectricHP || isElectricAC) ? 'block' : 'none';
            document.getElementById('electric-outdoor').style.display = (isElectricHP || isElectricAC) ? 'block' : 'none';

            // Gas sections show if Gas AC or Dual Fuel selected
            document.getElementById('gas-indoor').style.display = (isGasAC || isDualFuel) ? 'block' : 'none';
            document.getElementById('gas-outdoor').style.display = (isGasAC || isDualFuel) ? 'block' : 'none';
        });
    });

    // Conditional checkboxes - show UF value inputs
    document.addEventListener('change', (e) => {
        // Electric heat pump conditional checkboxes
        if (e.target.name === 'i_replaced_blower_cap') {
            const cond = document.getElementById('i_replaced_blower_cap_conditional');
            if (cond) cond.style.display = e.target.checked ? 'block' : 'none';
        }
        if (e.target.name === 'ie_replaced_dual_cap') {
            const cond = document.getElementById('ie_replaced_dual_cap_conditional');
            if (cond) cond.style.display = e.target.checked ? 'block' : 'none';
        }
        // Gas system conditional checkboxes
        if (e.target.name === 'g_replaced_blower_cap') {
            const cond = document.getElementById('g_replaced_blower_cap_conditional');
            if (cond) cond.style.display = e.target.checked ? 'block' : 'none';
        }
        if (e.target.name === 'go_replaced_dual_cap') {
            const cond = document.getElementById('go_replaced_dual_cap_conditional');
            if (cond) cond.style.display = e.target.checked ? 'block' : 'none';
        }

        // Radio buttons - show conditional options
        if (e.target.name === 'i_evap_coil_clean') {
            const cond = document.getElementById('i_evap_coil_clean_conditional');
            if (cond) cond.style.display = e.target.value === 'no' ? 'block' : 'none';
        }
        if (e.target.name === 'i_blower_motor_clean') {
            const cond = document.getElementById('i_blower_motor_clean_conditional');
            if (cond) cond.style.display = e.target.value === 'no' ? 'block' : 'none';
        }
        if (e.target.name === 'ie_condenser_clean') {
            const cond = document.getElementById('ie_condenser_clean_conditional');
            if (cond) cond.style.display = e.target.value === 'no' ? 'block' : 'none';
        }
        // Gas system conditionals
        if (e.target.name === 'g_evap_coil_clean') {
            const cond = document.getElementById('g_evap_coil_clean_conditional');
            if (cond) cond.style.display = e.target.value === 'no' ? 'block' : 'none';
        }
        if (e.target.name === 'g_blower_motor_clean') {
            const cond = document.getElementById('g_blower_motor_clean_conditional');
            if (cond) cond.style.display = e.target.value === 'no' ? 'block' : 'none';
        }
        if (e.target.name === 'go_condenser_clean') {
            const cond = document.getElementById('go_condenser_clean_conditional');
            if (cond) cond.style.display = e.target.value === 'no' ? 'block' : 'none';
        }

        // Capacitor type - show dual or run caps
        if (e.target.name === 'ie_cap_type') {
            document.getElementById('ie_dual_caps').style.display = e.target.value === 'dual' ? 'block' : 'none';
            document.getElementById('ie_run_caps').style.display = e.target.value === 'run' ? 'block' : 'none';
        }
        if (e.target.name === 'go_cap_type') {
            document.getElementById('go_dual_caps').style.display = e.target.value === 'dual' ? 'block' : 'none';
            document.getElementById('go_run_caps').style.display = e.target.value === 'run' ? 'block' : 'none';
        }
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
