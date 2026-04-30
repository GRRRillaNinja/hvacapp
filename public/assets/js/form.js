/* ── form.js ── job create/edit ── */

// ── Scroll focused input to top so fields below stay visible ──
// When the keyboard opens (visualViewport shrinks), scroll so the
// focused input is near the top, leaving the lower half visible.
function scrollInputNearTop(input) {
    const rect = input.getBoundingClientRect();
    const offset = window.scrollY + rect.top - 72; // 72px below the header
    window.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
}
if (window.visualViewport) {
    let _vpResizeTimer;
    window.visualViewport.addEventListener('resize', () => {
        clearTimeout(_vpResizeTimer);
        _vpResizeTimer = setTimeout(() => {
            if (_lastInput && document.activeElement === _lastInput) {
                scrollInputNearTop(_lastInput);
            }
        }, 80);
    });
}

// ── Scroll to save button after job type / quantity selection ──
function scrollToSave() {
    const btn = document.getElementById('btn-save');
    if (btn) setTimeout(() => btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150);
}

// true when creating a new job (no ?id param) — maintenance sections hidden until edit
let isNewMode = true;

// ── Session ID ────────────────────────────────────
function getSessionId() {
    let id = localStorage.getItem('hvac_session_id');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('hvac_session_id', id); }
    return id;
}
function sessionHeaders() { return { 'X-Session-ID': getSessionId() }; }

// ─────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────
function show(id) { const el = document.getElementById(id); if (el) el.style.display = ''; }
function hide(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
function showEl(el) { if (el) el.style.display = ''; }
function hideEl(el) { if (el) el.style.display = 'none'; }

function val(name) {
    const el = document.querySelector(`[name="${name}"]`);
    if (!el) return null;
    if (el.type === 'checkbox') return el.checked;
    return el.value || null;
}
function numVal(name) {
    const v = val(name);
    return v === null || v === '' ? null : parseFloat(v);
}
function radioVal(name) {
    const el = document.querySelector(`[name="${name}"]:checked`);
    return el ? el.value : null;
}
function checkVal(name) {
    const el = document.querySelector(`[name="${name}"]`);
    return el ? el.checked : false;
}
function setVal(name, value) {
    const el = document.querySelector(`[name="${name}"]`);
    if (!el) return;
    if (el.type === 'checkbox') { el.checked = !!value; }
    else { el.value = value ?? ''; }
}
function setRadio(name, value) {
    const el = document.querySelector(`[name="${name}"][value="${value}"]`);
    if (el) { el.checked = true; el.dispatchEvent(new Event('change')); }
}

// ─────────────────────────────────────────────────
// Dynamic show/hide helpers (called from HTML)
// ─────────────────────────────────────────────────
function toggleNA(checkbox, inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.disabled = checkbox.checked;
    if (checkbox.checked) input.value = '';
}

function toggleReplaced(checkbox, rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    row.classList.toggle('visible', checkbox.checked);
}

function onYN(radio) {
    const name    = radio.name;
    const noPanel = document.getElementById(name + '_no');
    if (!noPanel) return;

    // style the yn-option labels
    radio.closest('.yn-row').querySelectorAll('.yn-option').forEach(opt => {
        const r = opt.querySelector('input[type="radio"]');
        opt.classList.remove('selected-yes', 'selected-no');
        if (r.checked) opt.classList.add(r.value === 'yes' ? 'selected-yes' : 'selected-no');
    });

    noPanel.classList.toggle('visible', radio.value === 'no');
}

function toggleReasonInput(radio, inputId) {
    const input = document.getElementById(inputId);
    if (input) input.classList.toggle('visible', radio.value === 'could_not' && radio.checked);
}

function onCapType(prefix, radio) {
    const isDual = radio.value === 'dual';
    document.getElementById(prefix + '_cap_dual_fields').style.display = isDual ? '' : 'none';
    document.getElementById(prefix + '_cap_run_fields').style.display  = isDual ? 'none' : '';
    radio.closest('.yn-row').querySelectorAll('.yn-option').forEach(opt => {
        const r = opt.querySelector('input[type="radio"]');
        opt.classList.remove('selected-yes', 'selected-no');
        if (r.checked) opt.classList.add('selected-yes');
    });
}

function onHeatStripCircuit(radio, prefix) {
    const singleId = prefix ? `heat-strip-single-${prefix}` : 'heat-strip-single';
    const doubleId = prefix ? `heat-strip-double-${prefix}` : 'heat-strip-double';
    document.getElementById(singleId).style.display = radio.value === 'single' ? '' : 'none';
    document.getElementById(doubleId).style.display = radio.value === 'double' ? '' : 'none';
    // style the option buttons
    radio.closest('.yn-row').querySelectorAll('.yn-option').forEach(opt => {
        const r = opt.querySelector('input[type="radio"]');
        opt.classList.remove('selected-yes', 'selected-no');
        if (r.checked) opt.classList.add('selected-yes');
    });
}

// ─────────────────────────────────────────────────
// Job type / system count logic
// ─────────────────────────────────────────────────
const jobTypeEl  = document.getElementById('job_type');

const MAINT_TYPES = ['maintenance_first_time', 'maintenance_renewal', 'maintenance_check'];
const SYSTEM_TYPES = ['electric_heat_pump', 'gas_ac', 'electric_ac', 'dual_fuel', 'mini_split'];
const SYSTEM_LABELS = {
    'electric_heat_pump': 'Electric Heat Pump',
    'gas_ac': 'Gas / AC',
    'electric_ac': 'Electric / AC',
    'dual_fuel': 'Dual Fuel',
    'mini_split': 'Mini Split'
};

jobTypeEl.addEventListener('change', onJobTypeChange);

// Add change listeners to all system count inputs
SYSTEM_TYPES.forEach(sysType => {
    const input = document.querySelector(`[name="system_count_${sysType}"]`);
    if (input) input.addEventListener('change', onSystemCountChange);
});

function onJobTypeChange() {
    const t = jobTypeEl.value;
    const isMaint = MAINT_TYPES.includes(t);

    // system type row
    document.getElementById('system-type-group').style.display = isMaint ? '' : 'none';
    if (!isMaint) {
        // Reset all system counts
        SYSTEM_TYPES.forEach(sysType => {
            const input = document.querySelector(`[name="system_count_${sysType}"]`);
            if (input) input.value = 0;
        });
    }

    // hide all dynamic sections
    document.getElementById('maintenance-sections-container').innerHTML = '';
    document.getElementById('section-other-notes').style.display = 'none';
    document.getElementById('section-simple').style.display = 'none';

    if (isMaint) {
        onSystemCountChange();
    } else if (!isNewMode && (t === 'filter_change' || t === 'service_call')) {
        show('section-simple');
    }
    scrollToSave();
}

function onSystemCountChange() {
    const container = document.getElementById('maintenance-sections-container');
    container.innerHTML = ''; // Clear existing sections

    const isMaint = MAINT_TYPES.includes(jobTypeEl.value);
    if (!isMaint || isNewMode) return;

    let hasAnySystems = false;
    let sysIndex = 0;

    // Build sections for each system type with specified count
    SYSTEM_TYPES.forEach(sysType => {
        const countInput = document.querySelector(`[name="system_count_${sysType}"]`);
        const count = parseInt(countInput?.value) || 0;

        for (let unitNum = 1; unitNum <= count; unitNum++) {
            hasAnySystems = true;
            sysIndex++;

            if (sysType === 'mini_split') {
                // Mini splits are handled separately
                continue;
            }

            const si = Math.min(sysIndex, 6);
            const isElectric = sysType === 'electric_heat_pump' || sysType === 'electric_ac';
            const isGas = sysType === 'gas_ac' || sysType === 'dual_fuel';

            // Build unique prefixes for this system instance
            const prefix = `${sysType}_${unitNum}`;
            const iPrefix = `${prefix}_i`;
            const iePrefix = `${prefix}_ie`;
            const gPrefix = `${prefix}_g`;
            const goPrefix = `${prefix}_go`;

            let html = '';

            // Electric indoor
            if (isElectric) {
                html += buildElectricIndoorSection(unitNum, sysType, iPrefix, si);
            }

            // Gas indoor
            if (isGas) {
                html += buildGasIndoorSection(unitNum, sysType, gPrefix, si);
            }

            // Electric outdoor
            if (isElectric) {
                html += buildElectricOutdoorSection(unitNum, sysType, iePrefix, si);
            }

            // Gas outdoor
            if (isGas) {
                html += buildGasOutdoorSection(unitNum, sysType, goPrefix, si);
            }

            container.innerHTML += html;
        }
    });

    // Handle mini splits separately
    const miniSplitCount = parseInt(document.querySelector('[name="system_count_mini_split"]')?.value) || 0;
    if (miniSplitCount > 0) {
        hasAnySystems = true;
        const miniSplitContainer = document.getElementById('mini-splits-container');
        miniSplitContainer.innerHTML = '';
        for (let unitNum = 1; unitNum <= miniSplitCount; unitNum++) {
            miniSplitContainer.innerHTML += buildMiniSplitSection(unitNum);
        }
        show('section-mini-splits');
    } else {
        hide('section-mini-splits');
    }

    if (hasAnySystems) {
        show('section-other-notes');
    }
    scrollToSave();
}

// ─────────────────────────────────────────────────
// Builder functions for dynamic maintenance sections
// ─────────────────────────────────────────────────
function buildElectricIndoorSection(unitNum, sysType, iPrefix, si) {
    const isHeatPump = sysType === 'electric_heat_pump';
    const prefix = `${sysType}_${unitNum}`;
    let html = `<div class="form-section indoor-section sys-${si}-indoor"><div class="section-title indoor-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>${SYSTEM_LABELS[sysType]} - Unit ${unitNum} (Indoor)</span>
        <input type="text" name="${prefix}_indoor_designation" placeholder="e.g., Attic, Master Bedroom" style="flex:1;max-width:250px;padding:0.4rem;border:1px solid var(--slate-400);border-radius:4px;font-size:0.9rem;margin-left:1rem" />
    </div>`;

    if (isHeatPump) {
        html += `<div class="field-group" id="field-heat-strip-${iPrefix}">
            <label class="field-label">Heat Strip Amps</label>
            <div class="yn-row">
                <label class="yn-option">
                    <input type="radio" name="${iPrefix}_heat_strip_circuit" value="single" onchange="onHeatStripCircuit(this, '${iPrefix}')"> Single Circuit
                </label>
                <label class="yn-option">
                    <input type="radio" name="${iPrefix}_heat_strip_circuit" value="double" onchange="onHeatStripCircuit(this, '${iPrefix}')"> Double Circuit
                </label>
            </div>
            <div id="heat-strip-single-${iPrefix}" style="display:none">
                <div class="input-row">
                    <input class="field-input" type="number" name="${iPrefix}_heat_strip_amps" step="0.1" min="0" placeholder="0.0">
                    <span class="input-unit">A</span>
                </div>
            </div>
            <div id="heat-strip-double-${iPrefix}" style="display:none">
                <div class="input-row">
                    <input class="field-input" type="number" name="${iPrefix}_heat_strip_amps_1" step="0.1" min="0" placeholder="0.0">
                    <span class="input-unit">A</span>
                    <span style="font-weight:700;font-size:1.1rem;color:var(--text-muted)">+</span>
                    <input class="field-input" type="number" name="${iPrefix}_heat_strip_amps_2" step="0.1" min="0" placeholder="0.0">
                    <span class="input-unit">A</span>
                </div>
            </div>
        </div>`;
    }

    html += `<div class="field-pair">
        <div class="field-group">
            <label class="field-label">Blower Amps</label>
            <div class="input-row">
                <input class="field-input" type="number" name="${iPrefix}_blower_amps" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">A</span>
            </div>
        </div>
        <div class="field-group">
            <label class="field-label">Blower Capacitor</label>
            <div class="input-row">
                <input class="field-input" type="number" name="${iPrefix}_blower_cap" step="1" min="0" placeholder="0">
                <span class="input-unit">uf</span>
                <label style="display:flex;align-items:center;gap:0.3rem">
                    <input type="checkbox" name="${iPrefix}_blower_cap_na" onchange="toggleNA(this, '${iPrefix}_blower_cap')"> N/A
                </label>
            </div>
        </div>
    </div>
    <div class="field-group">
        <label style="display:flex;align-items:center;gap:0.5rem">
            <input type="checkbox" name="${iPrefix}_replaced_blower_cap" onchange="toggleReplaced(this, '${iPrefix}_replaced_blower_cap_uf_row')"> Replaced Blower Capacitor
        </label>
        <div class="input-row" id="${iPrefix}_replaced_blower_cap_uf_row" style="display:none">
            <input class="field-input" type="number" name="${iPrefix}_replaced_blower_cap_uf" step="1" min="0" placeholder="0">
            <span class="input-unit">uf</span>
        </div>
    </div>
    <div class="field-group">
        <label class="field-label">Evap Coil Clean?</label>
        <div class="yn-row">
            <label class="yn-option">
                <input type="radio" name="${iPrefix}_evap_coil_clean" value="yes" onchange="onYN(this)"> Yes
            </label>
            <label class="yn-option">
                <input type="radio" name="${iPrefix}_evap_coil_clean" value="no" onchange="onYN(this)"> No
            </label>
        </div>
        <div id="${iPrefix}_evap_coil_clean_no" style="display:none">
            <label style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem">
                <input type="checkbox" name="${iPrefix}_evap_brushed"> Brushed
            </label>
            <label style="display:flex;align-items:center;gap:0.5rem">
                <input type="checkbox" name="${iPrefix}_evap_sprayed"> Sprayed
            </label>
            <label style="display:flex;align-items:center;gap:0.5rem">
                <input type="checkbox" name="${iPrefix}_evap_pulled_cleaned"> Pulled & Cleaned
            </label>
        </div>
    </div>
    <div class="field-group">
        <label class="field-label">Blower Motor Clean?</label>
        <div class="yn-row">
            <label class="yn-option">
                <input type="radio" name="${iPrefix}_blower_motor_clean" value="yes" onchange="onYN(this)"> Yes
            </label>
            <label class="yn-option">
                <input type="radio" name="${iPrefix}_blower_motor_clean" value="no" onchange="onYN(this)"> No
            </label>
        </div>
        <div id="${iPrefix}_blower_motor_clean_no" style="display:none">
            <div style="margin-top:0.5rem">
                <label class="yn-option">
                    <input type="radio" name="${iPrefix}_blower_motor_action" value="pulled_cleaned" onchange="toggleReasonInput(this, '${iPrefix}_blower_motor_reason')"> Pulled & Cleaned
                </label>
                <label class="yn-option">
                    <input type="radio" name="${iPrefix}_blower_motor_action" value="could_not" onchange="toggleReasonInput(this, '${iPrefix}_blower_motor_reason')"> Could Not
                </label>
            </div>
            <input class="field-input" type="text" name="${iPrefix}_blower_motor_reason" id="${iPrefix}_blower_motor_reason" placeholder="Reason" style="margin-top:0.5rem;display:none">
        </div>
    </div>
    <div class="field-group">
        <label class="field-label">Condensate Drain</label>
        <div class="yn-row">
            <label class="yn-option">
                <input type="radio" name="${iPrefix}_condensate" value="yes" onchange="onYN(this)"> Clear
            </label>
            <label class="yn-option">
                <input type="radio" name="${iPrefix}_condensate" value="no" onchange="onYN(this)"> Could Not
            </label>
        </div>
        <div id="${iPrefix}_condensate_no" style="display:none">
            <input class="field-input" type="text" name="${iPrefix}_condensate_reason" placeholder="Reason" style="margin-top:0.5rem">
        </div>
    </div>
    <div class="check-group">
        <label><input type="checkbox" name="${iPrefix}_insulated_condensate"> Insulated Condensate Drain</label>
        <label><input type="checkbox" name="${iPrefix}_insulated_suction"> Insulated Suction Line</label>
        <label><input type="checkbox" name="${iPrefix}_reglued_cabinet"> Reglued Cabinet Insulation</label>
        <label><input type="checkbox" name="${iPrefix}_cleaned_media_filter"> Cleaned Media Filter</label>
        <label><input type="checkbox" name="${iPrefix}_verified_uv_light"> Verified UV Light Working</label>
    </div>
    <div class="field-group">
        <label class="field-label">Other Notes</label>
        <textarea class="field-input" name="${iPrefix}_electric_other" rows="2" placeholder="Any other observations..."></textarea>
    </div></div>`;

    return html;
}

function buildElectricOutdoorSection(unitNum, sysType, iePrefix, si) {
    const prefix = `${sysType}_${unitNum}`;
    let html = `<div class="form-section outdoor-section sys-${si}-outdoor"><div class="section-title outdoor-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>${SYSTEM_LABELS[sysType]} - Unit ${unitNum} (Outdoor)</span>
        <input type="text" name="${prefix}_outdoor_designation" placeholder="e.g., Left, Right Side" style="flex:1;max-width:250px;padding:0.4rem;border:1px solid var(--slate-400);border-radius:4px;font-size:0.9rem;margin-left:1rem" />
    </div>`;
    html += `<div class="field-group">
        <label class="field-label">Condenser Coil Clean?</label>
        <div class="yn-row">
            <label class="yn-option">
                <input type="radio" name="${iePrefix}_condenser_clean" value="yes" onchange="onYN(this)"> Yes
            </label>
            <label class="yn-option">
                <input type="radio" name="${iePrefix}_condenser_clean" value="no" onchange="onYN(this)"> No
            </label>
        </div>
        <div id="${iePrefix}_condenser_clean_no" style="display:none">
            <label style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem">
                <input type="checkbox" name="${iePrefix}_condenser_cleaned"> Cleaned
            </label>
        </div>
    </div>
    <div class="field-group">
        <label class="field-label">Capacitor Type</label>
        <div class="yn-row">
            <label class="yn-option">
                <input type="radio" name="${iePrefix}_cap_type" value="dual" onchange="onCapType('${iePrefix}', this)"> Dual
            </label>
            <label class="yn-option">
                <input type="radio" name="${iePrefix}_cap_type" value="run" onchange="onCapType('${iePrefix}', this)"> Run
            </label>
        </div>
    </div>
    <div id="${iePrefix}_cap_dual_fields" style="display:none">
        <div class="field-pair">
            <div class="field-group">
                <label class="field-label">Dual Cap — Comp</label>
                <div class="input-row">
                    <input class="field-input" type="number" name="${iePrefix}_dual_cap_comp" step="1" min="0" placeholder="0">
                    <span class="input-unit">uf</span>
                </div>
            </div>
            <div class="field-group">
                <label class="field-label">Dual Cap — Fan <label style="font-weight:500;font-size:0.85rem"><input type="checkbox" name="${iePrefix}_dual_cap_na" onchange="toggleNA(this, '${iePrefix}_dual_cap_comp'); toggleNA(this, '${iePrefix}_dual_cap_fan')"> N/A</label></label>
                <div class="input-row">
                    <input class="field-input" type="number" name="${iePrefix}_dual_cap_fan" step="1" min="0" placeholder="0">
                    <span class="input-unit">uf</span>
                </div>
            </div>
        </div>
        <div class="field-group">
            <label style="display:flex;align-items:center;gap:0.5rem">
                <input type="checkbox" name="${iePrefix}_replaced_dual_cap" onchange="toggleReplaced(this, '${iePrefix}_replaced_dual_cap_uf_row')"> Replaced Dual Capacitor
            </label>
            <div class="input-row" id="${iePrefix}_replaced_dual_cap_uf_row" style="display:none">
                <input class="field-input" type="number" name="${iePrefix}_replaced_dual_cap_uf" step="1" min="0" placeholder="0">
                <span class="input-unit">uf</span>
            </div>
        </div>
    </div>
    <div id="${iePrefix}_cap_run_fields" style="display:none">
        <div class="field-pair">
            <div class="field-group">
                <label class="field-label">Comp Run Cap <label style="font-weight:500;font-size:0.85rem"><input type="checkbox" name="${iePrefix}_comp_run_cap_na" onchange="toggleNA(this, '${iePrefix}_comp_run_cap')"> N/A</label></label>
                <div class="input-row">
                    <input class="field-input" type="number" name="${iePrefix}_comp_run_cap" step="1" min="0" placeholder="0">
                    <span class="input-unit">uf</span>
                </div>
            </div>
            <div class="field-group">
                <label class="field-label">Fan Run Cap <label style="font-weight:500;font-size:0.85rem"><input type="checkbox" name="${iePrefix}_fan_run_cap_na" onchange="toggleNA(this, '${iePrefix}_fan_run_cap')"> N/A</label></label>
                <div class="input-row">
                    <input class="field-input" type="number" name="${iePrefix}_fan_run_cap" step="1" min="0" placeholder="0">
                    <span class="input-unit">uf</span>
                </div>
            </div>
        </div>
        <div class="check-group">
            <label><input type="checkbox" name="${iePrefix}_replaced_comp_run_cap" onchange="toggleReplaced(this, '${iePrefix}_replaced_comp_run_cap_uf_row')"> Replaced Comp Run Cap</label>
            <label><input type="checkbox" name="${iePrefix}_replaced_fan_run_cap" onchange="toggleReplaced(this, '${iePrefix}_replaced_fan_run_cap_uf_row')"> Replaced Fan Run Cap</label>
        </div>
        <div class="input-row" id="${iePrefix}_replaced_comp_run_cap_uf_row" style="display:none">
            <input class="field-input" type="number" name="${iePrefix}_replaced_comp_run_cap_uf" step="1" min="0" placeholder="Comp uf">
            <span class="input-unit">uf</span>
        </div>
        <div class="input-row" id="${iePrefix}_replaced_fan_run_cap_uf_row" style="display:none">
            <input class="field-input" type="number" name="${iePrefix}_replaced_fan_run_cap_uf" step="1" min="0" placeholder="Fan uf">
            <span class="input-unit">uf</span>
        </div>
    </div>
    <div class="field-pair">
        <div class="field-group">
            <label class="field-label">Compressor Amps</label>
            <div class="input-row">
                <input class="field-input" type="number" name="${iePrefix}_comp_amps" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">A</span>
            </div>
        </div>
        <div class="field-group">
            <label class="field-label">Fan Amps</label>
            <div class="input-row">
                <input class="field-input" type="number" name="${iePrefix}_fan_amps" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">A</span>
            </div>
        </div>
    </div>
    <div class="field-group">
        <label class="field-label">Operating Pressures</label>
        <div style="display:flex;gap:1rem;align-items:flex-end">
            <div style="flex:1">
                <label style="display:block;font-size:0.9rem;margin-bottom:0.3rem">Low (PSI)</label>
                <div class="input-row">
                    <input class="field-input" type="number" name="${iePrefix}_pressure_low" step="0.1" min="0" placeholder="0.0">
                </div>
            </div>
            <div style="flex:1">
                <label style="display:block;font-size:0.9rem;margin-bottom:0.3rem">High (PSI)</label>
                <div class="input-row">
                    <input class="field-input" type="number" name="${iePrefix}_pressure_high" step="0.1" min="0" placeholder="0.0">
                </div>
            </div>
        </div>
    </div>
    <div class="field-group">
        <label class="field-label">Refrigerant Type</label>
        <select class="field-input" name="${iePrefix}_refrigerant">
            <option value="">-- Select --</option>
            <option value="R-410A">R-410A (Puron)</option>
            <option value="R-22">R-22 (Freon)</option>
            <option value="R-454B">R-454B (Puron Advanced)</option>
            <option value="R-32">R-32</option>
            <option value="R-407C">R-407C</option>
            <option value="R-134a">R-134a</option>
        </select>
    </div>
    <div class="field-pair">
        <div class="field-group">
            <label class="field-label">Superheat <label style="font-weight:500;font-size:0.85rem"><input type="checkbox" name="${iePrefix}_superheat_na"> N/A</label></label>
            <div class="input-row">
                <input class="field-input" type="number" name="${iePrefix}_superheat" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">°F</span>
            </div>
        </div>
        <div class="field-group">
            <label class="field-label">Subcool <label style="font-weight:500;font-size:0.85rem"><input type="checkbox" name="${iePrefix}_subcool_na"> N/A</label></label>
            <div class="input-row">
                <input class="field-input" type="number" name="${iePrefix}_subcool" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">°F</span>
            </div>
        </div>
    </div>
    <div class="field-pair">
        <div class="field-group">
            <label class="field-label">Suction Line Temp</label>
            <div class="input-row">
                <input class="field-input" type="number" name="${iePrefix}_suction_temp" step="0.1" placeholder="0.0">
                <span class="input-unit">°F</span>
            </div>
        </div>
        <div class="field-group">
            <label class="field-label">Liquid Line Temp</label>
            <div class="input-row">
                <input class="field-input" type="number" name="${iePrefix}_liquid_temp" step="0.1" placeholder="0.0">
                <span class="input-unit">°F</span>
            </div>
        </div>
    </div>
    <div class="field-pair">
        <div class="field-group">
            <label class="field-label">Indoor Ambient</label>
            <div class="input-row">
                <input class="field-input" type="number" name="${iePrefix}_indoor_ambient" step="0.1" placeholder="0.0">
                <span class="input-unit">°F</span>
            </div>
        </div>
        <div class="field-group">
            <label class="field-label">Outdoor Ambient</label>
            <div class="input-row">
                <input class="field-input" type="number" name="${iePrefix}_outdoor_ambient" step="0.1" placeholder="0.0">
                <span class="input-unit">°F</span>
            </div>
        </div>
    </div></div>`;

    return html;
}

function buildGasIndoorSection(unitNum, sysType, gPrefix, si) {
    const prefix = `${sysType}_${unitNum}`;
    let html = `<div class="form-section indoor-section sys-${si}-indoor"><div class="section-title indoor-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>${SYSTEM_LABELS[sysType]} - Unit ${unitNum} (Indoor)</span>
        <input type="text" name="${prefix}_indoor_designation" placeholder="e.g., Attic, Master Bedroom" style="flex:1;max-width:250px;padding:0.4rem;border:1px solid var(--slate-400);border-radius:4px;font-size:0.9rem;margin-left:1rem" />
    </div>`;
    html += `<div class="field-group">
        <label style="display:flex;align-items:center;gap:0.5rem">
            <input type="checkbox" name="${gPrefix}_cleaned_flame_sensor"> Cleaned Flame Sensor
        </label>
    </div>
    <div class="field-group">
        <label class="field-label">Gas Pressure</label>
        <div style="display:flex;gap:1rem;align-items:flex-end">
            <div style="flex:1">
                <label style="display:block;font-size:0.9rem;margin-bottom:0.3rem">In (in wc)</label>
                <input class="field-input" type="number" name="${gPrefix}_gas_pressure_in" step="0.01" min="0" placeholder="0.00">
            </div>
            <div style="flex:1">
                <label style="display:block;font-size:0.9rem;margin-bottom:0.3rem">Out (in wc)</label>
                <input class="field-input" type="number" name="${gPrefix}_gas_pressure_out" step="0.01" min="0" placeholder="0.00">
            </div>
        </div>
    </div>
    <div class="field-pair">
        <div class="field-group">
            <label class="field-label">Inducer Motor Amps</label>
            <div class="input-row">
                <input class="field-input" type="number" name="${gPrefix}_inducer_amps" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">A</span>
            </div>
        </div>
        <div class="field-group">
            <label class="field-label">Blower Amps</label>
            <div class="input-row">
                <input class="field-input" type="number" name="${gPrefix}_blower_amps" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">A</span>
            </div>
        </div>
    </div>
    <div class="field-pair">
        <div class="field-group">
            <label class="field-label">Blower Cap <label style="font-weight:500;font-size:0.85rem"><input type="checkbox" name="${gPrefix}_blower_cap_na" onchange="toggleNA(this, '${gPrefix}_blower_cap')"> N/A</label></label>
            <div class="input-row">
                <input class="field-input" type="number" name="${gPrefix}_blower_cap" step="1" min="0" placeholder="0">
                <span class="input-unit">uf</span>
            </div>
        </div>
        <div class="field-group" style="display:flex;flex-direction:column;justify-content:flex-end">
            <div class="check-group" style="padding-bottom:0">
                <label><input type="checkbox" name="${gPrefix}_replaced_inducer_cap" onchange="toggleReplaced(this, '${gPrefix}_replaced_inducer_cap_uf_row')"> Replaced Inducer Cap</label>
                <label><input type="checkbox" name="${gPrefix}_replaced_blower_cap" onchange="toggleReplaced(this, '${gPrefix}_replaced_blower_cap_uf_row')"> Replaced Blower Cap</label>
            </div>
        </div>
    </div>
    <div class="input-row" id="${gPrefix}_replaced_inducer_cap_uf_row" style="display:none">
        <input class="field-input" type="number" name="${gPrefix}_replaced_inducer_cap_uf" step="1" min="0" placeholder="Inducer uf">
        <span class="input-unit">uf</span>
    </div>
    <div class="input-row" id="${gPrefix}_replaced_blower_cap_uf_row" style="display:none">
        <input class="field-input" type="number" name="${gPrefix}_replaced_blower_cap_uf" step="1" min="0" placeholder="Blower uf">
        <span class="input-unit">uf</span>
    </div>
    <div class="field-group">
        <label class="field-label">Evap Coil Clean?</label>
        <div class="yn-row">
            <label class="yn-option">
                <input type="radio" name="${gPrefix}_evap_coil_clean" value="yes" onchange="onYN(this)"> Yes
            </label>
            <label class="yn-option">
                <input type="radio" name="${gPrefix}_evap_coil_clean" value="no" onchange="onYN(this)"> No
            </label>
        </div>
        <div id="${gPrefix}_evap_coil_clean_no" style="display:none" >
            <label style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem">
                <input type="checkbox" name="${gPrefix}_evap_brushed"> Brushed
            </label>
            <label style="display:flex;align-items:center;gap:0.5rem">
                <input type="checkbox" name="${gPrefix}_evap_sprayed"> Sprayed
            </label>
            <label style="display:flex;align-items:center;gap:0.5rem">
                <input type="checkbox" name="${gPrefix}_evap_pulled_cleaned"> Pulled & Cleaned
            </label>
        </div>
    </div>
    <div class="field-group">
        <label class="field-label">Blower Motor Clean?</label>
        <div class="yn-row">
            <label class="yn-option">
                <input type="radio" name="${gPrefix}_blower_motor_clean" value="yes" onchange="onYN(this)"> Yes
            </label>
            <label class="yn-option">
                <input type="radio" name="${gPrefix}_blower_motor_clean" value="no" onchange="onYN(this)"> No
            </label>
        </div>
        <div id="${gPrefix}_blower_motor_clean_no" style="display:none" >
            <div style="margin-top:0.5rem">
                <label class="yn-option">
                    <input type="radio" name="${gPrefix}_blower_motor_action" value="pulled_cleaned" onchange="toggleReasonInput(this, '${gPrefix}_blower_motor_reason')"> Pulled & Cleaned
                </label>
                <label class="yn-option">
                    <input type="radio" name="${gPrefix}_blower_motor_action" value="could_not" onchange="toggleReasonInput(this, '${gPrefix}_blower_motor_reason')"> Could Not
                </label>
            </div>
            <input class="field-input" type="text" name="${gPrefix}_blower_motor_reason" id="${gPrefix}_blower_motor_reason" placeholder="Reason" style="margin-top:0.5rem;display:none">
        </div>
    </div>
    <div class="field-group">
        <label class="field-label">Condensate Drain</label>
        <div class="yn-row">
            <label class="yn-option">
                <input type="radio" name="${gPrefix}_condensate" value="yes" onchange="onYN(this)"> Clear
            </label>
            <label class="yn-option">
                <input type="radio" name="${gPrefix}_condensate" value="no" onchange="onYN(this)"> Could Not
            </label>
        </div>
        <div id="${gPrefix}_condensate_no" style="display:none" >
            <input class="field-input" type="text" name="${gPrefix}_condensate_reason" placeholder="Reason" style="margin-top:0.5rem">
        </div>
    </div>
    <div class="check-group">
        <label><input type="checkbox" name="${gPrefix}_insulated_condensate"> Insulated Condensate Drain</label>
        <label><input type="checkbox" name="${gPrefix}_insulated_suction"> Insulated Suction Line</label>
        <label><input type="checkbox" name="${gPrefix}_reglued_cabinet"> Reglued Cabinet Insulation</label>
        <label><input type="checkbox" name="${gPrefix}_cleaned_media_filter"> Cleaned Media Filter</label>
        <label><input type="checkbox" name="${gPrefix}_verified_uv_light"> Verified UV Light Working</label>
    </div>
    <div class="field-group">
        <label class="field-label">Other Notes</label>
        <textarea class="field-input" name="${gPrefix}_indoor_other" rows="2" placeholder="Any other observations..."></textarea>
    </div></div>`;

    return html;
}

function buildGasOutdoorSection(unitNum, sysType, goPrefix, si) {
    const prefix = `${sysType}_${unitNum}`;
    let html = `<div class="form-section outdoor-section sys-${si}-outdoor"><div class="section-title outdoor-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>${SYSTEM_LABELS[sysType]} - Unit ${unitNum} (Outdoor)</span>
        <input type="text" name="${prefix}_outdoor_designation" placeholder="e.g., Left, Right Side" style="flex:1;max-width:250px;padding:0.4rem;border:1px solid var(--slate-400);border-radius:4px;font-size:0.9rem;margin-left:1rem" />
    </div>`;
    html += `<div class="field-group">
        <label class="field-label">Condenser Coil Clean?</label>
        <div class="yn-row">
            <label class="yn-option">
                <input type="radio" name="${goPrefix}_condenser_clean" value="yes" onchange="onYN(this)"> Yes
            </label>
            <label class="yn-option">
                <input type="radio" name="${goPrefix}_condenser_clean" value="no" onchange="onYN(this)"> No
            </label>
        </div>
        <div id="${goPrefix}_condenser_clean_no" style="display:none">
            <label style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem">
                <input type="checkbox" name="${goPrefix}_condenser_cleaned"> Cleaned
            </label>
        </div>
    </div>
    <div class="field-group">
        <label class="field-label">Capacitor Type</label>
        <div class="yn-row">
            <label class="yn-option">
                <input type="radio" name="${goPrefix}_cap_type" value="dual" onchange="onCapType('${goPrefix}', this)"> Dual
            </label>
            <label class="yn-option">
                <input type="radio" name="${goPrefix}_cap_type" value="run" onchange="onCapType('${goPrefix}', this)"> Run
            </label>
        </div>
    </div>
    <div id="${goPrefix}_cap_dual_fields" style="display:none">
        <div class="field-pair">
            <div class="field-group">
                <label class="field-label">Dual Cap — Comp</label>
                <div class="input-row">
                    <input class="field-input" type="number" name="${goPrefix}_dual_cap_comp" step="1" min="0" placeholder="0">
                    <span class="input-unit">uf</span>
                </div>
            </div>
            <div class="field-group">
                <label class="field-label">Dual Cap — Fan <label style="font-weight:500;font-size:0.85rem"><input type="checkbox" name="${goPrefix}_dual_cap_na" onchange="toggleNA(this, '${goPrefix}_dual_cap_comp'); toggleNA(this, '${goPrefix}_dual_cap_fan')"> N/A</label></label>
                <div class="input-row">
                    <input class="field-input" type="number" name="${goPrefix}_dual_cap_fan" step="1" min="0" placeholder="0">
                    <span class="input-unit">uf</span>
                </div>
            </div>
        </div>
        <div class="field-group">
            <label style="display:flex;align-items:center;gap:0.5rem">
                <input type="checkbox" name="${goPrefix}_replaced_dual_cap" onchange="toggleReplaced(this, '${goPrefix}_replaced_dual_cap_uf_row')"> Replaced Dual Capacitor
            </label>
            <div class="input-row" id="${goPrefix}_replaced_dual_cap_uf_row" style="display:none">
                <input class="field-input" type="number" name="${goPrefix}_replaced_dual_cap_uf" step="1" min="0" placeholder="0">
                <span class="input-unit">uf</span>
            </div>
        </div>
    </div>
    <div id="${goPrefix}_cap_run_fields" style="display:none">
        <div class="field-pair">
            <div class="field-group">
                <label class="field-label">Comp Run Cap <label style="font-weight:500;font-size:0.85rem"><input type="checkbox" name="${goPrefix}_comp_run_cap_na" onchange="toggleNA(this, '${goPrefix}_comp_run_cap')"> N/A</label></label>
                <div class="input-row">
                    <input class="field-input" type="number" name="${goPrefix}_comp_run_cap" step="1" min="0" placeholder="0">
                    <span class="input-unit">uf</span>
                </div>
            </div>
            <div class="field-group">
                <label class="field-label">Fan Run Cap <label style="font-weight:500;font-size:0.85rem"><input type="checkbox" name="${goPrefix}_fan_run_cap_na" onchange="toggleNA(this, '${goPrefix}_fan_run_cap')"> N/A</label></label>
                <div class="input-row">
                    <input class="field-input" type="number" name="${goPrefix}_fan_run_cap" step="1" min="0" placeholder="0">
                    <span class="input-unit">uf</span>
                </div>
            </div>
        </div>
        <div class="check-group">
            <label><input type="checkbox" name="${goPrefix}_replaced_comp_run_cap" onchange="toggleReplaced(this, '${goPrefix}_replaced_comp_run_cap_uf_row')"> Replaced Comp Run Cap</label>
            <label><input type="checkbox" name="${goPrefix}_replaced_fan_run_cap" onchange="toggleReplaced(this, '${goPrefix}_replaced_fan_run_cap_uf_row')"> Replaced Fan Run Cap</label>
        </div>
        <div class="input-row" id="${goPrefix}_replaced_comp_run_cap_uf_row" style="display:none">
            <input class="field-input" type="number" name="${goPrefix}_replaced_comp_run_cap_uf" step="1" min="0" placeholder="Comp uf">
            <span class="input-unit">uf</span>
        </div>
        <div class="input-row" id="${goPrefix}_replaced_fan_run_cap_uf_row" style="display:none">
            <input class="field-input" type="number" name="${goPrefix}_replaced_fan_run_cap_uf" step="1" min="0" placeholder="Fan uf">
            <span class="input-unit">uf</span>
        </div>
    </div>
    <div class="field-pair">
        <div class="field-group">
            <label class="field-label">Compressor Amps</label>
            <div class="input-row">
                <input class="field-input" type="number" name="${goPrefix}_comp_amps" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">A</span>
            </div>
        </div>
        <div class="field-group">
            <label class="field-label">Fan Amps</label>
            <div class="input-row">
                <input class="field-input" type="number" name="${goPrefix}_fan_amps" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">A</span>
            </div>
        </div>
    </div>
    <div class="field-group">
        <label class="field-label">Operating Pressures</label>
        <div style="display:flex;gap:1rem;align-items:flex-end">
            <div style="flex:1">
                <label style="display:block;font-size:0.9rem;margin-bottom:0.3rem">Low (PSI)</label>
                <div class="input-row">
                    <input class="field-input" type="number" name="${goPrefix}_pressure_low" step="0.1" min="0" placeholder="0.0">
                </div>
            </div>
            <div style="flex:1">
                <label style="display:block;font-size:0.9rem;margin-bottom:0.3rem">High (PSI)</label>
                <div class="input-row">
                    <input class="field-input" type="number" name="${goPrefix}_pressure_high" step="0.1" min="0" placeholder="0.0">
                </div>
            </div>
        </div>
    </div>
    <div class="field-group">
        <label class="field-label">Refrigerant Type</label>
        <select class="field-input" name="${goPrefix}_refrigerant">
            <option value="">-- Select --</option>
            <option value="R-410A">R-410A (Puron)</option>
            <option value="R-22">R-22 (Freon)</option>
            <option value="R-454B">R-454B (Puron Advanced)</option>
            <option value="R-32">R-32</option>
            <option value="R-407C">R-407C</option>
            <option value="R-134a">R-134a</option>
        </select>
    </div>
    <div class="field-pair">
        <div class="field-group">
            <label class="field-label">Superheat <label style="font-weight:500;font-size:0.85rem"><input type="checkbox" name="${goPrefix}_superheat_na"> N/A</label></label>
            <div class="input-row">
                <input class="field-input" type="number" name="${goPrefix}_superheat" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">°F</span>
            </div>
        </div>
        <div class="field-group">
            <label class="field-label">Subcool <label style="font-weight:500;font-size:0.85rem"><input type="checkbox" name="${goPrefix}_subcool_na"> N/A</label></label>
            <div class="input-row">
                <input class="field-input" type="number" name="${goPrefix}_subcool" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">°F</span>
            </div>
        </div>
    </div>
    <div class="field-pair">
        <div class="field-group">
            <label class="field-label">Suction Line Temp</label>
            <div class="input-row">
                <input class="field-input" type="number" name="${goPrefix}_suction_temp" step="0.1" placeholder="0.0">
                <span class="input-unit">°F</span>
            </div>
        </div>
        <div class="field-group">
            <label class="field-label">Liquid Line Temp</label>
            <div class="input-row">
                <input class="field-input" type="number" name="${goPrefix}_liquid_temp" step="0.1" placeholder="0.0">
                <span class="input-unit">°F</span>
            </div>
        </div>
    </div>
    <div class="field-pair">
        <div class="field-group">
            <label class="field-label">Indoor Ambient</label>
            <div class="input-row">
                <input class="field-input" type="number" name="${goPrefix}_indoor_ambient" step="0.1" placeholder="0.0">
                <span class="input-unit">°F</span>
            </div>
        </div>
        <div class="field-group">
            <label class="field-label">Outdoor Ambient</label>
            <div class="input-row">
                <input class="field-input" type="number" name="${goPrefix}_outdoor_ambient" step="0.1" placeholder="0.0">
                <span class="input-unit">°F</span>
            </div>
        </div>
    </div></div>`;

    return html;
}

function buildMiniSplitSection(unitNum) {
    const prefix = `mini_split_${unitNum}`;
    return `<div class="form-section" style="border-left: 5px solid #f59e0b;">
    <div class="section-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>Mini Split Unit ${unitNum}</span>
        <input type="text" name="${prefix}_location" placeholder="e.g., Master Bedroom" style="flex:1;max-width:250px;padding:0.4rem;border:1px solid var(--border-default);border-radius:4px;font-size:0.9rem;margin-left:1rem" />
    </div>

    <div class="field-group">
        <label class="field-label">Filters Clean?</label>
        <div class="yn-row">
            <label class="yn-option"><input type="radio" name="${prefix}_filters_clean" value="yes"> Yes</label>
            <label class="yn-option"><input type="radio" name="${prefix}_filters_clean" value="no"> No</label>
        </div>
        <div class="sub-fields" id="${prefix}_filters_no" style="display:none">
            <label class="check-label"><input type="checkbox" name="${prefix}_filters_cleaned"> Cleaned</label>
        </div>
    </div>

    <div class="field-group">
        <label class="field-label">Blower Wheel Clean?</label>
        <div class="yn-row">
            <label class="yn-option"><input type="radio" name="${prefix}_blower_clean" value="yes"> Yes</label>
            <label class="yn-option"><input type="radio" name="${prefix}_blower_clean" value="no"> No</label>
        </div>
        <div class="sub-fields" id="${prefix}_blower_no" style="display:none">
            <label class="check-label"><input type="checkbox" name="${prefix}_blower_cleaned"> Cleaned</label>
        </div>
    </div>

    <div class="field-group">
        <label class="field-label">Evap Coil Clean?</label>
        <div class="yn-row">
            <label class="yn-option"><input type="radio" name="${prefix}_evap_coil_clean" value="yes"> Yes</label>
            <label class="yn-option"><input type="radio" name="${prefix}_evap_coil_clean" value="no"> No</label>
        </div>
        <div class="sub-fields" id="${prefix}_evap_coil_no" style="display:none">
            <label class="check-label"><input type="checkbox" name="${prefix}_evap_cleaned"> Cleaned</label>
        </div>
    </div>

    <div class="field-group">
        <label class="field-label">Condenser Coil Clean?</label>
        <div class="yn-row">
            <label class="yn-option"><input type="radio" name="${prefix}_condenser_coil_clean" value="yes"> Yes</label>
            <label class="yn-option"><input type="radio" name="${prefix}_condenser_coil_clean" value="no"> No</label>
        </div>
        <div class="sub-fields" id="${prefix}_condenser_coil_no" style="display:none">
            <label class="check-label"><input type="checkbox" name="${prefix}_condenser_cleaned"> Cleaned</label>
        </div>
    </div>

    <div class="field-group">
        <label class="field-label">Test Mode</label>
        <div style="margin-top:0.5rem;">
            <label class="check-label"><input type="checkbox" name="${prefix}_test_heat" onchange="onMiniSplitTestMode(this, '${prefix}')"> Heat Mode</label>
            <div id="${prefix}_heat_mode" style="display:none; margin-left:1rem; margin-top:0.5rem;">
                <label class="field-label" style="font-size:0.9rem;">Blowing Hot?</label>
                <div class="yn-row">
                    <label class="yn-option"><input type="radio" name="${prefix}_heat_blowing" value="yes"> Yes</label>
                    <label class="yn-option"><input type="radio" name="${prefix}_heat_blowing" value="no"> No</label>
                </div>
            </div>
        </div>
        <div style="margin-top:0.5rem;">
            <label class="check-label"><input type="checkbox" name="${prefix}_test_cool" onchange="onMiniSplitTestMode(this, '${prefix}')"> Cool Mode</label>
            <div id="${prefix}_cool_mode" style="display:none; margin-left:1rem; margin-top:0.5rem;">
                <label class="field-label" style="font-size:0.9rem;">Blowing Cold?</label>
                <div class="yn-row">
                    <label class="yn-option"><input type="radio" name="${prefix}_cool_blowing" value="yes"> Yes</label>
                    <label class="yn-option"><input type="radio" name="${prefix}_cool_blowing" value="no"> No</label>
                </div>
            </div>
        </div>
    </div>

    <div class="field-group">
        <label class="field-label">Cleared Condensate Drain?</label>
        <div class="yn-row">
            <label class="yn-option"><input type="radio" name="${prefix}_drain_cleared" value="yes"> Yes</label>
            <label class="yn-option"><input type="radio" name="${prefix}_drain_cleared" value="no"> No</label>
        </div>
    </div>

    <div class="field-group">
        <label class="field-label">Blower Speed Check</label>
        <div style="display:flex; gap:1rem; flex-wrap:wrap;">
            <label class="check-label"><input type="checkbox" name="${prefix}_speed_low"> Low</label>
            <label class="check-label"><input type="checkbox" name="${prefix}_speed_medium"> Medium</label>
            <label class="check-label"><input type="checkbox" name="${prefix}_speed_high"> High</label>
        </div>
    </div>

    <div class="field-group">
        <label class="field-label" for="${prefix}_notes">Other Notes</label>
        <textarea class="field-input" id="${prefix}_notes" name="${prefix}_notes" rows="3" placeholder="Additional notes..."></textarea>
    </div>
    </div>`;
}

// ─────────────────────────────────────────────────
// Mini split test mode handlers
// ─────────────────────────────────────────────────
function onMiniSplitTestMode(el, prefix) {
    const heatCheckbox = document.querySelector(`[name="${prefix}_test_heat"]`);
    const coolCheckbox = document.querySelector(`[name="${prefix}_test_cool"]`);
    const heatModeDiv = document.getElementById(`${prefix}_heat_mode`);
    const coolModeDiv = document.getElementById(`${prefix}_cool_mode`);

    if (heatCheckbox?.checked) {
        heatModeDiv.style.display = '';
    } else {
        heatModeDiv.style.display = 'none';
    }

    if (coolCheckbox?.checked) {
        coolModeDiv.style.display = '';
    } else {
        coolModeDiv.style.display = 'none';
    }
}

// Handle yes/no toggle for mini split sub-fields
document.addEventListener('change', function(e) {
    if (e.target.type === 'radio' && e.target.name) {
        const name = e.target.name;
        if (name.includes('_filters_clean') || name.includes('_blower_clean') ||
            name.includes('_evap_coil_clean') || name.includes('_condenser_coil_clean')) {
            const prefix = name.replace(/_filters_clean|_blower_clean|_evap_coil_clean|_condenser_coil_clean$/, '');
            const noDiv = document.getElementById(`${prefix}_${name.split('_').pop()}_no`);
            if (noDiv) {
                noDiv.style.display = e.target.value === 'no' ? '' : 'none';
            }
        }
    }
});

// ─────────────────────────────────────────────────
// Collect all form data
// ─────────────────────────────────────────────────
function collectData() {
    const jobType = jobTypeEl.value;
    const isMaint = MAINT_TYPES.includes(jobType);

    const base = {
        id:            document.getElementById('job-id').value || null,
        job_date:      val('job_date'),
        job_type:      jobType,
        customer_name: val('customer_name'),
        address_line1: val('address_line1'),
        address_line2: val('address_line2'),
        phone:         val('phone'),
        system_type:   null, // Will be set below
        status:        val('status'),
        job_data:      {},
    };

    if (!isMaint) {
        base.job_data = { notes: val('simple_notes') };
        return base;
    }

    // Collect system counts and build system instances structure
    const systemCounts = {};
    const systemInstances = [];

    SYSTEM_TYPES.forEach(sysType => {
        const countInput = document.querySelector(`[name="system_count_${sysType}"]`);
        const count = parseInt(countInput?.value) || 0;
        if (count > 0) {
            systemCounts[sysType] = count;
            for (let unitNum = 1; unitNum <= count; unitNum++) {
                systemInstances.push({ sysType, unitNum });
            }
        }
    });

    // Set system_type to first system for backward compatibility
    if (systemInstances.length > 0) {
        base.system_type = systemInstances[0].sysType;
    }

    // Collect data for each system instance
    systemInstances.forEach(({ sysType, unitNum }) => {
        const prefix = `${sysType}_${unitNum}`;
        const isElectric = sysType === 'electric_heat_pump' || sysType === 'electric_ac';
        const isGas = sysType === 'gas_ac' || sysType === 'dual_fuel';
        const isHeatPump = sysType === 'electric_heat_pump';

        // Build system key like "electric_heat_pump_1"
        const sysKey = prefix;

        // Electric indoor
        if (isElectric) {
            const iPrefix = `${prefix}_i`;
            const d = {};
            // Store designation for this specific unit
            const designation = val(`${prefix}_indoor_designation`);
            if (designation) {
                d.designation = designation;
            }
            if (isHeatPump) {
                d.heat_strip_circuit = radioVal(`${iPrefix}_heat_strip_circuit`);
                if (d.heat_strip_circuit === 'single') {
                    d.heat_strip_amps = numVal(`${iPrefix}_heat_strip_amps`);
                } else if (d.heat_strip_circuit === 'double') {
                    d.heat_strip_amps_1 = numVal(`${iPrefix}_heat_strip_amps_1`);
                    d.heat_strip_amps_2 = numVal(`${iPrefix}_heat_strip_amps_2`);
                }
            }
            d.blower_amps            = numVal(`${iPrefix}_blower_amps`);
            d.blower_cap             = checkVal(`${iPrefix}_blower_cap_na`) ? null : numVal(`${iPrefix}_blower_cap`);
            d.blower_cap_na          = checkVal(`${iPrefix}_blower_cap_na`);
            d.replaced_blower_cap    = checkVal(`${iPrefix}_replaced_blower_cap`);
            d.replaced_blower_cap_uf = d.replaced_blower_cap ? numVal(`${iPrefix}_replaced_blower_cap_uf`) : null;
            d.evap_coil_clean        = radioVal(`${iPrefix}_evap_coil_clean`);
            if (d.evap_coil_clean === 'no') {
                d.evap_brushed       = checkVal(`${iPrefix}_evap_brushed`);
                d.evap_sprayed       = checkVal(`${iPrefix}_evap_sprayed`);
                d.evap_pulled_cleaned= checkVal(`${iPrefix}_evap_pulled_cleaned`);
            }
            d.blower_motor_clean     = radioVal(`${iPrefix}_blower_motor_clean`);
            if (d.blower_motor_clean === 'no') {
                d.blower_motor_action = radioVal(`${iPrefix}_blower_motor_action`);
                d.blower_motor_reason = d.blower_motor_action === 'could_not' ? val(`${iPrefix}_blower_motor_reason`) : null;
            }
            d.condensate             = radioVal(`${iPrefix}_condensate`);
            d.condensate_reason      = d.condensate === 'no' ? val(`${iPrefix}_condensate_reason`) : null;
            d.insulated_condensate   = checkVal(`${iPrefix}_insulated_condensate`);
            d.insulated_suction      = checkVal(`${iPrefix}_insulated_suction`);
            d.reglued_cabinet        = checkVal(`${iPrefix}_reglued_cabinet`);
            d.cleaned_media_filter   = checkVal(`${iPrefix}_cleaned_media_filter`);
            d.electric_other         = val(`${iPrefix}_electric_other`);
            base.job_data[`${sysKey}_indoor`] = d;
        }

        // Gas indoor
        if (isGas) {
            const gPrefix = `${prefix}_g`;
            const d = {};
            // Store designation for this specific unit
            const designation = val(`${prefix}_indoor_designation`);
            if (designation) {
                d.designation = designation;
            }
            d.cleaned_flame_sensor   = checkVal(`${gPrefix}_cleaned_flame_sensor`);
            d.gas_pressure_in        = numVal(`${gPrefix}_gas_pressure_in`);
            d.gas_pressure_out       = numVal(`${gPrefix}_gas_pressure_out`);
            d.inducer_amps           = numVal(`${gPrefix}_inducer_amps`);
            d.replaced_inducer_cap   = checkVal(`${gPrefix}_replaced_inducer_cap`);
            d.replaced_inducer_cap_uf= d.replaced_inducer_cap ? numVal(`${gPrefix}_replaced_inducer_cap_uf`) : null;
            d.blower_amps            = numVal(`${gPrefix}_blower_amps`);
            d.blower_cap             = checkVal(`${gPrefix}_blower_cap_na`) ? null : numVal(`${gPrefix}_blower_cap`);
            d.blower_cap_na          = checkVal(`${gPrefix}_blower_cap_na`);
            d.replaced_blower_cap    = checkVal(`${gPrefix}_replaced_blower_cap`);
            d.replaced_blower_cap_uf = d.replaced_blower_cap ? numVal(`${gPrefix}_replaced_blower_cap_uf`) : null;
            d.evap_coil_clean        = radioVal(`${gPrefix}_evap_coil_clean`);
            if (d.evap_coil_clean === 'no') {
                d.evap_brushed        = checkVal(`${gPrefix}_evap_brushed`);
                d.evap_sprayed        = checkVal(`${gPrefix}_evap_sprayed`);
                d.evap_pulled_cleaned = checkVal(`${gPrefix}_evap_pulled_cleaned`);
            }
            d.blower_motor_clean     = radioVal(`${gPrefix}_blower_motor_clean`);
            if (d.blower_motor_clean === 'no') {
                d.blower_motor_action = radioVal(`${gPrefix}_blower_motor_action`);
                d.blower_motor_reason = d.blower_motor_action === 'could_not' ? val(`${gPrefix}_blower_motor_reason`) : null;
            }
            d.condensate             = radioVal(`${gPrefix}_condensate`);
            d.condensate_reason      = d.condensate === 'no' ? val(`${gPrefix}_condensate_reason`) : null;
            d.insulated_condensate   = checkVal(`${gPrefix}_insulated_condensate`);
            d.insulated_suction      = checkVal(`${gPrefix}_insulated_suction`);
            d.reglued_cabinet        = checkVal(`${gPrefix}_reglued_cabinet`);
            d.cleaned_media_filter   = checkVal(`${gPrefix}_cleaned_media_filter`);
            d.indoor_other           = val(`${gPrefix}_indoor_other`);
            base.job_data[`${sysKey}_indoor`] = d;
        }

        // Electric outdoor
        if (isElectric) {
            const iePrefix = `${prefix}_ie`;
            const d = {};
            // Store designation for this specific unit
            const designation = val(`${prefix}_outdoor_designation`);
            if (designation) {
                d.designation = designation;
            }
            d.condenser_clean  = radioVal(`${iePrefix}_condenser_clean`);
            d.condenser_cleaned = d.condenser_clean === 'no' ? checkVal(`${iePrefix}_condenser_cleaned`) : false;
            d.cap_type = radioVal(`${iePrefix}_cap_type`);
            // Always collect cap fields (user may enter values before selecting type)
            d.dual_cap_na          = checkVal(`${iePrefix}_dual_cap_na`);
            d.dual_cap_comp        = d.dual_cap_na ? null : numVal(`${iePrefix}_dual_cap_comp`);
            d.dual_cap_fan         = d.dual_cap_na ? null : numVal(`${iePrefix}_dual_cap_fan`);
            d.replaced_dual_cap    = checkVal(`${iePrefix}_replaced_dual_cap`);
            d.replaced_dual_cap_uf = d.replaced_dual_cap ? numVal(`${iePrefix}_replaced_dual_cap_uf`) : null;
            d.comp_run_cap_na          = checkVal(`${iePrefix}_comp_run_cap_na`);
            d.comp_run_cap             = d.comp_run_cap_na ? null : numVal(`${iePrefix}_comp_run_cap`);
            d.replaced_comp_run_cap    = checkVal(`${iePrefix}_replaced_comp_run_cap`);
            d.replaced_comp_run_cap_uf = d.replaced_comp_run_cap ? numVal(`${iePrefix}_replaced_comp_run_cap_uf`) : null;
            d.fan_run_cap_na           = checkVal(`${iePrefix}_fan_run_cap_na`);
            d.fan_run_cap              = d.fan_run_cap_na ? null : numVal(`${iePrefix}_fan_run_cap`);
            d.replaced_fan_run_cap     = checkVal(`${iePrefix}_replaced_fan_run_cap`);
            d.replaced_fan_run_cap_uf  = d.replaced_fan_run_cap ? numVal(`${iePrefix}_replaced_fan_run_cap_uf`) : null;
            d.comp_amps               = numVal(`${iePrefix}_comp_amps`);
            d.fan_amps                = numVal(`${iePrefix}_fan_amps`);
            d.pressure_low            = numVal(`${iePrefix}_pressure_low`);
            d.pressure_high           = numVal(`${iePrefix}_pressure_high`);
            d.refrigerant             = val(`${iePrefix}_refrigerant`);
            d.superheat_na            = checkVal(`${iePrefix}_superheat_na`);
            d.superheat               = d.superheat_na ? null : numVal(`${iePrefix}_superheat`);
            d.subcool_na              = checkVal(`${iePrefix}_subcool_na`);
            d.subcool                 = d.subcool_na ? null : numVal(`${iePrefix}_subcool`);
            d.suction_temp            = numVal(`${iePrefix}_suction_temp`);
            d.liquid_temp             = numVal(`${iePrefix}_liquid_temp`);
            d.indoor_ambient          = numVal(`${iePrefix}_indoor_ambient`);
            d.outdoor_ambient         = numVal(`${iePrefix}_outdoor_ambient`);
            base.job_data[`${sysKey}_outdoor`] = d;
        }

        // Gas outdoor
        if (isGas) {
            const goPrefix = `${prefix}_go`;
            const d = {};
            // Store designation for this specific unit
            const designation = val(`${prefix}_outdoor_designation`);
            if (designation) {
                d.designation = designation;
            }
            d.condenser_clean  = radioVal(`${goPrefix}_condenser_clean`);
            d.condenser_cleaned = d.condenser_clean === 'no' ? checkVal(`${goPrefix}_condenser_cleaned`) : false;
            d.cap_type = radioVal(`${goPrefix}_cap_type`);
            // Always collect cap fields
            d.dual_cap_na          = checkVal(`${goPrefix}_dual_cap_na`);
            d.dual_cap_comp        = d.dual_cap_na ? null : numVal(`${goPrefix}_dual_cap_comp`);
            d.dual_cap_fan         = d.dual_cap_na ? null : numVal(`${goPrefix}_dual_cap_fan`);
            d.replaced_dual_cap    = checkVal(`${goPrefix}_replaced_dual_cap`);
            d.replaced_dual_cap_uf = d.replaced_dual_cap ? numVal(`${goPrefix}_replaced_dual_cap_uf`) : null;
            d.comp_run_cap_na          = checkVal(`${goPrefix}_comp_run_cap_na`);
            d.comp_run_cap             = d.comp_run_cap_na ? null : numVal(`${goPrefix}_comp_run_cap`);
            d.replaced_comp_run_cap    = checkVal(`${goPrefix}_replaced_comp_run_cap`);
            d.replaced_comp_run_cap_uf = d.replaced_comp_run_cap ? numVal(`${goPrefix}_replaced_comp_run_cap_uf`) : null;
            d.fan_run_cap_na           = checkVal(`${goPrefix}_fan_run_cap_na`);
            d.fan_run_cap              = d.fan_run_cap_na ? null : numVal(`${goPrefix}_fan_run_cap`);
            d.replaced_fan_run_cap     = checkVal(`${goPrefix}_replaced_fan_run_cap`);
            d.replaced_fan_run_cap_uf  = d.replaced_fan_run_cap ? numVal(`${goPrefix}_replaced_fan_run_cap_uf`) : null;
            d.comp_amps               = numVal(`${goPrefix}_comp_amps`);
            d.fan_amps                = numVal(`${goPrefix}_fan_amps`);
            d.pressure_low            = numVal(`${goPrefix}_pressure_low`);
            d.pressure_high           = numVal(`${goPrefix}_pressure_high`);
            d.refrigerant             = val(`${goPrefix}_refrigerant`);
            d.superheat_na            = checkVal(`${goPrefix}_superheat_na`);
            d.superheat               = d.superheat_na ? null : numVal(`${goPrefix}_superheat`);
            d.subcool_na              = checkVal(`${goPrefix}_subcool_na`);
            d.subcool                 = d.subcool_na ? null : numVal(`${goPrefix}_subcool`);
            d.suction_temp            = numVal(`${goPrefix}_suction_temp`);
            d.liquid_temp             = numVal(`${goPrefix}_liquid_temp`);
            d.indoor_ambient          = numVal(`${goPrefix}_indoor_ambient`);
            d.outdoor_ambient         = numVal(`${goPrefix}_outdoor_ambient`);
            base.job_data[`${sysKey}_outdoor`] = d;
        }
    });

    // Save system counts to job_data (used by maintenance report to tally systems)
    Object.entries(systemCounts).forEach(([sysType, count]) => {
        if (count > 0) {
            base.job_data[`system_count_${sysType}`] = count;
        }
    });

    // Other notes
    base.job_data.other_notes = val('other_notes');

    return base;
}

// ─────────────────────────────────────────────────
// Save job (with offline queue fallback)
// ─────────────────────────────────────────────────
async function saveJob() {
    const data = collectData();

    if (!data.customer_name) { showToast('Customer name is required', true); return; }

    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const isEdit = !!data.id;
        const method = isEdit ? 'PUT' : 'POST';

        // Generate tempId for new jobs (used as idempotency key)
        const tempId = !isEdit ? crypto.randomUUID() : null;
        if (tempId) data.idempotency_key = tempId;

        console.log(`[HVAC] Saving job (${method}):`, data);
        const res    = await fetch('api/jobs.php', {
            method,
            headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
            body: JSON.stringify(data),
        });
        console.log(`[HVAC] Save response status: ${res.status}`);
        const json = await res.json();
        console.log(`[HVAC] Save response:`, json);

        if (json.error) {
            throw new Error(json.error);
        }

        // Success: offline, redirect to job list
        const date = data.job_date || new Date().toLocaleDateString('en-CA');
        window.location.href = `/?date=${date}`;

    } catch (e) {
        console.error(`[HVAC] Error saving job:`, e);

        // Distinguish network errors from validation errors
        const isNetworkError = e instanceof TypeError || e.message.includes('Failed to fetch') || e.name === 'AbortError';

        if (isNetworkError && !data.id) {
            // Network error on NEW job: queue it for later sync
            const tempId = data.idempotency_key || crypto.randomUUID();
            addJobToQueue(data, tempId);
            showToast('Job saved offline. Will sync when online.', false);
            console.log('[OFFLINE] Job queued:', tempId);

            // Still navigate back, but show that job is pending sync
            const date = data.job_date || new Date().toLocaleDateString('en-CA');
            setTimeout(() => {
                window.location.href = `/?date=${date}`;
            }, 1500);
        } else {
            // Validation error or edit failed: show error, don't queue
            showToast('Save failed: ' + e.message, true);
            btn.disabled = false;
            btn.textContent = 'Save Job';
        }
    }
}

// ─────────────────────────────────────────────────
// Delete job
// ─────────────────────────────────────────────────
async function deleteJob() {
    const id = document.getElementById('job-id').value;
    if (!id) return;
    if (!confirm('Delete this job?')) return;

    try {
        console.log(`[HVAC] Deleting job ${id}`);
        const res = await fetch(`api/jobs.php?id=${id}`, { method: 'DELETE', headers: sessionHeaders() });
        const result = await res.json();
        console.log(`[HVAC] Delete response:`, result);
        if (result.error) throw new Error(result.error);
        window.location.href = '/';
    } catch (e) {
        console.error(`[HVAC] Error deleting job:`, e);
        showToast('Delete failed: ' + e.message, true);
    }
}

// ─────────────────────────────────────────────────
// Populate form for editing
// ─────────────────────────────────────────────────
function populateForm(job) {
    document.getElementById('job-id').value = job.id;
    isNewMode = false; // editing — show all maintenance sections
    document.getElementById('form-title').textContent = 'Edit Job';
    document.getElementById('btn-delete').style.display = '';

    setVal('customer_name', job.customer_name);
    setVal('address_line1', job.address_line1);
    setVal('address_line2', job.address_line2);
    setVal('phone', job.phone);
    setVal('job_date', job.job_date);
    setVal('job_type', job.job_type);
    setVal('status', job.status);

    // Trigger job type change to show right sections
    jobTypeEl.dispatchEvent(new Event('change'));

    const d = job.job_data || {};

    // Extract system counts: prefer explicit system_count_* keys, fall back to inferring from units
    const systemCounts = {};
    SYSTEM_TYPES.forEach(sysType => {
        const saved = d[`system_count_${sysType}`];
        if (saved) systemCounts[sysType] = parseInt(saved) || 0;
    });
    // Fallback: infer from unit structure if not explicitly saved
    if (Object.keys(systemCounts).every(k => !systemCounts[k])) {
        const sysTypePattern = /^(electric_heat_pump|gas_ac|electric_ac|dual_fuel)_(\d+)_(indoor|outdoor)$/;
        for (const key in d) {
            if (typeof d[key] === 'object' && d[key] !== null) {
                const m = key.match(sysTypePattern);
                if (m) {
                    const sysType = m[1];
                    const unitNum = parseInt(m[2]);
                    if (!systemCounts[sysType]) systemCounts[sysType] = 0;
                    systemCounts[sysType] = Math.max(systemCounts[sysType], unitNum);
                }
            }
        }
    }

    // Set system count inputs
    SYSTEM_TYPES.forEach(sysType => {
        const input = document.querySelector(`[name="system_count_${sysType}"]`);
        if (input) {
            input.value = systemCounts[sysType] || 0;
        }
    });

    // Trigger system count change to generate form sections
    onSystemCountChange();

    // Populate all system instance data
    for (const key in d) {
        if (typeof d[key] === 'object' && d[key] !== null && !Array.isArray(d[key])) {
            // Check if this is a nested data object (e.g., electric_heat_pump_1_indoor)
            const m = key.match(/^(electric_heat_pump|gas_ac|electric_ac|dual_fuel)_(\d+)_(indoor|outdoor)$/);
            if (m) {
                const sysType = m[1];
                const unitNum = m[2];
                const section = m[3];
                const prefix = `${sysType}_${unitNum}`;
                const systemData = d[key];
                const fieldPrefix = section === 'indoor' ?
                    (sysType === 'electric_heat_pump' || sysType === 'electric_ac' ? `${prefix}_i` : `${prefix}_g`) :
                    (sysType === 'electric_heat_pump' || sysType === 'electric_ac' ? `${prefix}_ie` : `${prefix}_go`);

                // Populate all fields for this system instance
                // Pass 1: radios first (they trigger show/hide of dependent fields)
                for (const fieldName in systemData) {
                    const value = systemData[fieldName];
                    if (value === null || value === undefined) continue;
                    if (fieldName === 'designation') continue;
                    const fieldKey = `${fieldPrefix}_${fieldName}`;
                    if (fieldName.endsWith('_circuit') || fieldName.endsWith('_clean') || fieldName.endsWith('_action') ||
                        fieldName.endsWith('_cap_type') || fieldName === 'cap_type' || fieldName.endsWith('_motor_action') ||
                        fieldName === 'condensate') {
                        setRadio(fieldKey, value);
                    }
                }
                // Pass 2: all other values (now that dependent sections are visible)
                for (const fieldName in systemData) {
                    const value = systemData[fieldName];

                    if (fieldName === 'designation') {
                        setVal(`${prefix}_${section}_designation`, value);
                        continue;
                    }

                    const fieldKey = `${fieldPrefix}_${fieldName}`;

                    if (fieldName.endsWith('_circuit') || fieldName.endsWith('_clean') || fieldName.endsWith('_action') ||
                        fieldName.endsWith('_cap_type') || fieldName === 'cap_type' || fieldName.endsWith('_motor_action') ||
                        fieldName === 'condensate') {
                        continue; // already handled in pass 1
                    }
                    setVal(fieldKey, value);
                }
            } else if (key === `${prefix}_designation`) {
                // Handle custom designation
                setVal(key, d[key]);
            }
        }
    }

    // Populate mini split data
    const miniSplitPattern = /^mini_split_(\d+)_(.+)$/;
    for (const key in d) {
        if (typeof d[key] === 'string' || typeof d[key] === 'number' || typeof d[key] === 'boolean') {
            const m = key.match(miniSplitPattern);
            if (m) {
                setVal(key, d[key]);
            }
        }
    }

    // simple notes
    setVal('simple_notes', d.notes);

    // Set other notes
    setVal('other_notes', d.other_notes);
}

// ─────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────
const toastEl = document.getElementById('toast');
let toastTimer;
// ─────────────────────────────────────────────────
// Phone formatting — format on blur
// ─────────────────────────────────────────────────
(function setupPhoneFormat() {
    const phoneEl = document.getElementById('phone');
    if (!phoneEl) return;
    phoneEl.addEventListener('blur', () => {
        const d = (phoneEl.value || '').replace(/\D/g, '');
        if (d.length === 10) phoneEl.value = `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
        else if (d.length === 11 && d[0] === '1') phoneEl.value = `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
    });
})();

// ─────────────────────────────────────────────────
// Address autofill — lookup on blur of address line 1
// (Disabled during job creation, only on edit)
// ─────────────────────────────────────────────────
(function setupAddressLookup() {
    const addr1 = document.getElementById('address_line1');
    const addr2 = document.getElementById('address_line2');
    if (!addr1 || !addr2) return;

    let lastLookup = '';
    addr1.addEventListener('blur', () => {
        // Skip autofill during job creation
        if (isNewMode) return;

        const street = (addr1.value || '').trim();
        if (!street || street.length < 5 || street === lastLookup) return;
        lastLookup = street;

        // Build lookup query: use line 2 if already filled, otherwise just street
        const existing2 = (addr2.value || '').trim();
        const query = existing2 ? street + ', ' + existing2 : street;

        fetch(`api/county.php?address=${encodeURIComponent(query)}`)
            .then(r => r.json())
            .then(data => {
                if (!data.matchedAddress) return;

                // Parse matched address: "123 MAIN ST, NASHVILLE, TN, 37203"
                const parts = data.matchedAddress.split(',').map(p => p.trim());
                if (parts.length < 3) return;

                // parts[0] = street, rest = city, state, zip
                const cityStateZip = parts.slice(1).join(', ');

                // Autofill line 2 if empty or offer to update
                if (!existing2) {
                    addr2.value = cityStateZip;
                    showToast('Address autofilled: ' + cityStateZip);
                } else {
                    // Line 2 already has content — check if it differs significantly
                    const normalized = cityStateZip.toLowerCase().replace(/\s+/g, ' ');
                    const existingNorm = existing2.toLowerCase().replace(/\s+/g, ' ');
                    if (normalized !== existingNorm && !existingNorm.includes(parts[parts.length - 1])) {
                        // ZIP not in existing line 2 — suggest update
                        if (confirm(`Update address line 2?\n\nCurrent: ${existing2}\nSuggested: ${cityStateZip}`)) {
                            addr2.value = cityStateZip;
                        }
                    }
                }
            })
            .catch(() => {}); // silent fail
    });
})();

function showToast(msg, isError = false) {
    toastEl.textContent = msg;
    toastEl.className   = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.className = 'toast'; }, 3000);
}

// ─────────────────────────────────────────────────
// Init — set date, load existing job if editing
// ─────────────────────────────────────────────────
(function init() {
    const params    = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    const jobId     = params.get('id');

    isNewMode = !jobId;

    if (dateParam) {
        setVal('job_date', dateParam);
    } else {
        setVal('job_date', new Date().toLocaleDateString('en-CA'));
    }

    if (jobId) {
        fetch(`api/jobs.php?id=${jobId}`, { headers: sessionHeaders() })
            .then(r => r.json())
            .then(job => populateForm(job))
            .catch(() => showToast('Failed to load job', true));
    } else {
        // New job
        document.getElementById('btn-save').textContent = 'Create Job';
    }

    // DEBUG: Show form header visibility on-screen
    const debugDiv = document.createElement('div');
    debugDiv.id = 'debug-header-form';
    debugDiv.style.cssText = 'position: fixed; bottom: 80px; right: 10px; background: rgba(0,0,0,0.9); color: #0f0; font-family: monospace; font-size: 11px; padding: 8px; border-radius: 4px; z-index: 999; max-width: 200px; line-height: 1.3;';
    document.body.appendChild(debugDiv);

    window.addEventListener('scroll', () => {
        const header = document.querySelector('.form-header');
        if (!header) return;
        const headerRect = header.getBoundingClientRect();
        const headerStyles = window.getComputedStyle(header);
        const headerZIndex = headerStyles.zIndex;
        const headerPosition = headerStyles.position;
        const isVisible = headerRect.top < window.innerHeight && headerRect.bottom > 0;

        // Find elements at header position
        const elementsAtTop = document.elementsFromPoint(window.innerWidth / 2, 10);
        const coveringElement = elementsAtTop[0];
        const coveringZIndex = window.getComputedStyle(coveringElement).zIndex;

        debugDiv.innerHTML = `scroll: ${Math.round(window.scrollY)}px<br>header top: ${Math.round(headerRect.top)}px<br>header z-idx: ${headerZIndex}<br>header pos: ${headerPosition}<br>visible: ${isVisible}<br>covering: ${coveringElement.tagName}.${coveringElement.className}<br>cover z-idx: ${coveringZIndex}`;
    });
})();
