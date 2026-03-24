<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#0d1f3c">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>Job Form - HVAC Tech</title>
    <link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg">
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body class="form-page">

<header class="form-header">
    <button class="back-btn" onclick="history.back()" title="Back">&#8592;</button>
    <h1 id="form-title">New Job</h1>
</header>

<form id="job-form" novalidate autocomplete="off">
    <input type="hidden" id="job-id" name="id" value="">

    <!-- ── CUSTOMER INFORMATION ── -->
    <div class="form-section">
        <div class="section-title">Customer Information</div>

        <div class="field-group">
            <label class="field-label required" for="customer_name">Name</label>
            <input class="field-input" type="text" id="customer_name" name="customer_name" placeholder="Customer name" autocomplete="off">
        </div>
        <div class="field-group">
            <label class="field-label" for="address_line1">Address Line 1</label>
            <input class="field-input" type="text" id="address_line1" name="address_line1" placeholder="Street address" autocomplete="off">
        </div>
        <div class="field-group">
            <label class="field-label" for="address_line2">Address Line 2</label>
            <input class="field-input" type="text" id="address_line2" name="address_line2" placeholder="Apt, City, State, ZIP" autocomplete="off">
        </div>
        <div class="field-group">
            <label class="field-label" for="phone">Phone Number</label>
            <input class="field-input" type="tel" id="phone" name="phone" placeholder="(555) 555-5555" autocomplete="off">
        </div>
    </div>

    <!-- ── JOB DETAILS ── -->
    <div class="form-section" id="section-job-details">
        <div class="section-title">Job Details</div>

        <div class="field-group">
            <label class="field-label required" for="job_date">Date</label>
            <input class="field-input" type="date" id="job_date" name="job_date">
        </div>
        <div class="field-group">
            <label class="field-label required" for="job_type">Job Type</label>
            <select class="field-input" id="job_type" name="job_type">
                <option value="">-- Select Type --</option>
                <option value="maintenance_first_time">Maintenance &gt; First Time</option>
                <option value="maintenance_renewal">Maintenance &gt; Renewal</option>
                <option value="maintenance_check">Maintenance &gt; Check</option>
                <option value="filter_change">Filter Change</option>
                <option value="service_call">Service Call</option>
            </select>
        </div>
        <div class="field-group" id="system-type-group" style="display:none">
            <label class="field-label required">Systems in Home</label>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <label style="flex: 1;">Electric Heat Pump</label>
                    <input type="number" name="system_count_electric_heat_pump" value="0" min="0" max="10" style="width: 60px; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;" onchange="onSystemCountChange()">
                    <span style="width: 30px; text-align: center;">unit(s)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <label style="flex: 1;">Gas / AC</label>
                    <input type="number" name="system_count_gas_ac" value="0" min="0" max="10" style="width: 60px; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;" onchange="onSystemCountChange()">
                    <span style="width: 30px; text-align: center;">unit(s)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <label style="flex: 1;">Electric / AC</label>
                    <input type="number" name="system_count_electric_ac" value="0" min="0" max="10" style="width: 60px; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;" onchange="onSystemCountChange()">
                    <span style="width: 30px; text-align: center;">unit(s)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <label style="flex: 1;">Dual Fuel</label>
                    <input type="number" name="system_count_dual_fuel" value="0" min="0" max="10" style="width: 60px; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;" onchange="onSystemCountChange()">
                    <span style="width: 30px; text-align: center;">unit(s)</span>
                </div>
            </div>
        </div>
        <div class="field-group">
            <label class="field-label" for="status">Status</label>
            <select class="field-input" id="status" name="status">
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="complete">Complete</option>
            </select>
        </div>
    </div>

    <!-- ────────────────────────────────────────────────
         DYNAMIC MAINTENANCE SECTIONS (generated by JS)
    ──────────────────────────────────────────────── -->
    <div id="maintenance-sections-container"></div>

    <!-- ────────────────────────────────────────────────
         FILTER CHANGE / SERVICE CALL SECTION
    ──────────────────────────────────────────────── -->
    <div class="form-section" id="section-simple" style="display:none">
        <div class="section-title notes-title">Notes</div>
        <div class="field-group">
            <label class="field-label" for="simple_notes">Notes</label>
            <textarea class="field-input" id="simple_notes" name="simple_notes" rows="4" placeholder="Enter notes..."></textarea>
        </div>
    </div>

    <!-- ────────────────────────────────────────────────
         INDOOR — ELECTRIC (Heat Pump + Electric/AC)
    ──────────────────────────────────────────────── -->
    <div class="form-section" id="section-indoor-electric" style="display:none">
        <div class="section-title indoor-title">Indoor</div>

        <!-- Heat Strip Amps (Heat Pump only) -->
        <div class="field-group" id="field-heat-strip" style="display:none">
            <label class="field-label">Heat Strip Amps</label>
            <div class="yn-row">
                <label class="yn-option">
                    <input type="radio" name="i_heat_strip_circuit" value="single" onchange="onHeatStripCircuit(this)"> Single Circuit
                </label>
                <label class="yn-option">
                    <input type="radio" name="i_heat_strip_circuit" value="double" onchange="onHeatStripCircuit(this)"> Double Circuit
                </label>
            </div>
            <div id="heat-strip-single" style="display:none">
                <div class="input-row">
                    <input class="field-input" type="number" id="i_heat_strip_amps" name="i_heat_strip_amps" step="0.1" min="0" placeholder="0.0">
                    <span class="input-unit">A</span>
                </div>
            </div>
            <div id="heat-strip-double" style="display:none">
                <div class="input-row">
                    <input class="field-input" type="number" id="i_heat_strip_amps_1" name="i_heat_strip_amps_1" step="0.1" min="0" placeholder="0.0">
                    <span class="input-unit">A</span>
                    <span style="font-weight:700;font-size:1.1rem;color:var(--text-muted)">+</span>
                    <input class="field-input" type="number" id="i_heat_strip_amps_2" name="i_heat_strip_amps_2" step="0.1" min="0" placeholder="0.0">
                    <span class="input-unit">A</span>
                </div>
            </div>
        </div>

        <!-- Blower Amps -->
        <div class="field-group">
            <label class="field-label" for="i_blower_amps">Blower Amps</label>
            <div class="input-row">
                <input class="field-input" type="number" id="i_blower_amps" name="i_blower_amps" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">A</span>
            </div>
        </div>

        <!-- Blower Capacitor -->
        <div class="field-group">
            <label class="field-label">Blower Capacitor</label>
            <div class="na-row">
                <input class="field-input" type="number" id="i_blower_cap" name="i_blower_cap" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">uf</span>
                <label class="na-check-label">
                    <input type="checkbox" id="i_blower_cap_na" name="i_blower_cap_na" onchange="toggleNA(this,'i_blower_cap')"> N/A
                </label>
            </div>
        </div>

        <!-- Replaced Blower Capacitor -->
        <div class="field-group">
            <div class="replaced-row">
                <label class="replaced-label">
                    <input type="checkbox" name="i_replaced_blower_cap" id="i_replaced_blower_cap" onchange="toggleReplaced(this,'i_replaced_blower_cap_uf_row')">
                    Replaced Blower Capacitor
                </label>
                <div class="replaced-val" id="i_replaced_blower_cap_uf_row">
                    <input type="number" name="i_replaced_blower_cap_uf" step="0.1" min="0" placeholder="uf">
                    <span class="input-unit">uf</span>
                </div>
            </div>
        </div>

        <!-- Evap Coil Clean -->
        <div class="field-group">
            <label class="field-label">Evap Coil Clean</label>
            <div class="yn-row">
                <label class="yn-option">
                    <input type="radio" name="i_evap_coil_clean" value="yes" onchange="onYN(this)"> Yes &#10004;
                </label>
                <label class="yn-option">
                    <input type="radio" name="i_evap_coil_clean" value="no" onchange="onYN(this)"> No
                </label>
            </div>
            <div class="sub-fields" id="i_evap_coil_clean_no">
                <label class="check-label"><input type="checkbox" name="i_evap_brushed"> Brushed Evap Coil</label>
                <label class="check-label"><input type="checkbox" name="i_evap_sprayed"> Sprayed Evap Coil</label>
                <label class="check-label"><input type="checkbox" name="i_evap_pulled_cleaned"> Pulled And Cleaned Evap Coil</label>
            </div>
        </div>

        <!-- Blower Motor Clean -->
        <div class="field-group">
            <label class="field-label">Blower Motor Clean</label>
            <div class="yn-row">
                <label class="yn-option">
                    <input type="radio" name="i_blower_motor_clean" value="yes" onchange="onYN(this)"> Yes &#10004;
                </label>
                <label class="yn-option">
                    <input type="radio" name="i_blower_motor_clean" value="no" onchange="onYN(this)"> No
                </label>
            </div>
            <div class="sub-fields" id="i_blower_motor_clean_no">
                <label class="check-label">
                    <input type="radio" name="i_blower_motor_action" value="pulled_cleaned"> Pulled And Cleaned Blower Wheel
                </label>
                <label class="check-label">
                    <input type="radio" name="i_blower_motor_action" value="could_not" onchange="toggleReasonInput(this,'i_blower_motor_reason')"> Could Not Pull And Clean Blower Wheel
                </label>
                <input type="text" class="reason-input" id="i_blower_motor_reason" name="i_blower_motor_reason" placeholder="Reason...">
            </div>
        </div>

        <!-- Cleared Condensate Drain -->
        <div class="field-group">
            <label class="field-label">Cleared Condensate Drain</label>
            <div class="yn-row">
                <label class="yn-option">
                    <input type="radio" name="i_condensate" value="yes" onchange="onYN(this)"> Yes &#10004;
                </label>
                <label class="yn-option">
                    <input type="radio" name="i_condensate" value="no" onchange="onYN(this)"> No
                </label>
            </div>
            <div class="sub-fields" id="i_condensate_no">
                <span style="font-size:0.85rem;font-weight:600;color:var(--red)">Could Not Clear Condensate Drain</span>
                <input type="text" class="reason-input visible" name="i_condensate_reason" placeholder="Reason...">
            </div>
        </div>

        <!-- Standalone checkboxes -->
        <div class="field-group">
            <label class="check-field-label">
                <input type="checkbox" name="i_insulated_condensate"> Insulated Condensate Drain
            </label>
        </div>
        <div class="field-group">
            <label class="check-field-label">
                <input type="checkbox" name="i_insulated_suction"> Insulated Suction Line
            </label>
        </div>
        <div class="field-group">
            <label class="check-field-label">
                <input type="checkbox" name="i_reglued_cabinet"> Reglued Cabinet Door Insulation
            </label>
        </div>

        <!-- Other -->
        <div class="field-group">
            <label class="field-label" for="i_electric_other">Other</label>
            <textarea class="field-input" id="i_electric_other" name="i_electric_other" rows="2" placeholder="Other notes..."></textarea>
        </div>
    </div>

    <!-- ────────────────────────────────────────────────
         INDOOR — GAS (Gas/AC + Dual Fuel)
    ──────────────────────────────────────────────── -->
    <div class="form-section" id="section-indoor-gas" style="display:none">
        <div class="section-title indoor-title">Indoor</div>

        <!-- Cleaned Flame Sensor -->
        <div class="field-group">
            <label class="check-field-label">
                <input type="checkbox" name="g_cleaned_flame_sensor"> Cleaned Flame Sensor &#10004;
            </label>
        </div>

        <!-- Gas Pressure In -->
        <div class="field-group">
            <label class="field-label" for="g_gas_pressure_in">Gas Pressure In</label>
            <div class="input-row">
                <input class="field-input" type="number" id="g_gas_pressure_in" name="g_gas_pressure_in" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">in wc</span>
            </div>
        </div>

        <!-- Gas Pressure Out -->
        <div class="field-group">
            <label class="field-label" for="g_gas_pressure_out">Gas Pressure Out</label>
            <div class="input-row">
                <input class="field-input" type="number" id="g_gas_pressure_out" name="g_gas_pressure_out" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">in wc</span>
            </div>
        </div>

        <!-- Inducer Motor Amps -->
        <div class="field-group">
            <label class="field-label" for="g_inducer_amps">Inducer Motor Amps</label>
            <div class="input-row">
                <input class="field-input" type="number" id="g_inducer_amps" name="g_inducer_amps" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">A</span>
            </div>
        </div>

        <!-- Replaced Inducer Motor Capacitor -->
        <div class="field-group">
            <div class="replaced-row">
                <label class="replaced-label">
                    <input type="checkbox" name="g_replaced_inducer_cap" id="g_replaced_inducer_cap" onchange="toggleReplaced(this,'g_replaced_inducer_cap_uf_row')">
                    Replaced Inducer Motor Capacitor
                </label>
                <div class="replaced-val" id="g_replaced_inducer_cap_uf_row">
                    <input type="number" name="g_replaced_inducer_cap_uf" step="0.1" min="0" placeholder="uf">
                    <span class="input-unit">uf</span>
                </div>
            </div>
        </div>

        <!-- Blower Amps -->
        <div class="field-group">
            <label class="field-label" for="g_blower_amps">Blower Amps</label>
            <div class="input-row">
                <input class="field-input" type="number" id="g_blower_amps" name="g_blower_amps" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">A</span>
            </div>
        </div>

        <!-- Blower Capacitor -->
        <div class="field-group">
            <label class="field-label">Blower Capacitor</label>
            <div class="na-row">
                <input class="field-input" type="number" id="g_blower_cap" name="g_blower_cap" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">uf</span>
                <label class="na-check-label">
                    <input type="checkbox" id="g_blower_cap_na" name="g_blower_cap_na" onchange="toggleNA(this,'g_blower_cap')"> N/A
                </label>
            </div>
        </div>

        <!-- Replaced Blower Capacitor -->
        <div class="field-group">
            <div class="replaced-row">
                <label class="replaced-label">
                    <input type="checkbox" name="g_replaced_blower_cap" id="g_replaced_blower_cap" onchange="toggleReplaced(this,'g_replaced_blower_cap_uf_row')">
                    Replaced Blower Capacitor
                </label>
                <div class="replaced-val" id="g_replaced_blower_cap_uf_row">
                    <input type="number" name="g_replaced_blower_cap_uf" step="0.1" min="0" placeholder="uf">
                    <span class="input-unit">uf</span>
                </div>
            </div>
        </div>

        <!-- Evap Coil Clean -->
        <div class="field-group">
            <label class="field-label">Evap Coil Clean</label>
            <div class="yn-row">
                <label class="yn-option">
                    <input type="radio" name="g_evap_coil_clean" value="yes" onchange="onYN(this)"> Yes &#10004;
                </label>
                <label class="yn-option">
                    <input type="radio" name="g_evap_coil_clean" value="no" onchange="onYN(this)"> No
                </label>
            </div>
            <div class="sub-fields" id="g_evap_coil_clean_no">
                <label class="check-label"><input type="checkbox" name="g_evap_brushed"> Brushed Evap Coil</label>
                <label class="check-label"><input type="checkbox" name="g_evap_sprayed"> Sprayed Evap Coil</label>
                <label class="check-label"><input type="checkbox" name="g_evap_pulled_cleaned"> Pulled And Cleaned Evap Coil</label>
            </div>
        </div>

        <!-- Blower Motor Clean -->
        <div class="field-group">
            <label class="field-label">Blower Motor Clean</label>
            <div class="yn-row">
                <label class="yn-option">
                    <input type="radio" name="g_blower_motor_clean" value="yes" onchange="onYN(this)"> Yes &#10004;
                </label>
                <label class="yn-option">
                    <input type="radio" name="g_blower_motor_clean" value="no" onchange="onYN(this)"> No
                </label>
            </div>
            <div class="sub-fields" id="g_blower_motor_clean_no">
                <label class="check-label">
                    <input type="radio" name="g_blower_motor_action" value="pulled_cleaned"> Pulled And Cleaned Blower Wheel
                </label>
                <label class="check-label">
                    <input type="radio" name="g_blower_motor_action" value="could_not" onchange="toggleReasonInput(this,'g_blower_motor_reason')"> Could Not Pull And Clean Blower Wheel
                </label>
                <input type="text" class="reason-input" id="g_blower_motor_reason" name="g_blower_motor_reason" placeholder="Reason...">
            </div>
        </div>

        <!-- Cleared Condensate Drain -->
        <div class="field-group">
            <label class="field-label">Cleared Condensate Drain</label>
            <div class="yn-row">
                <label class="yn-option">
                    <input type="radio" name="g_condensate" value="yes" onchange="onYN(this)"> Yes &#10004;
                </label>
                <label class="yn-option">
                    <input type="radio" name="g_condensate" value="no" onchange="onYN(this)"> No
                </label>
            </div>
            <div class="sub-fields" id="g_condensate_no">
                <span style="font-size:0.85rem;font-weight:600;color:var(--red)">Could Not Clear Condensate Drain</span>
                <input type="text" class="reason-input visible" name="g_condensate_reason" placeholder="Reason...">
            </div>
        </div>

        <!-- Standalone checkboxes -->
        <div class="field-group">
            <label class="check-field-label">
                <input type="checkbox" name="g_insulated_condensate"> Insulated Condensate Drain
            </label>
        </div>
        <div class="field-group">
            <label class="check-field-label">
                <input type="checkbox" name="g_insulated_suction"> Insulated Suction Line
            </label>
        </div>
        <div class="field-group">
            <label class="check-field-label">
                <input type="checkbox" name="g_reglued_cabinet"> Reglued Cabinet Door Insulation
            </label>
        </div>

        <!-- Other -->
        <div class="field-group">
            <label class="field-label" for="g_indoor_other">Other</label>
            <textarea class="field-input" id="g_indoor_other" name="g_indoor_other" rows="2" placeholder="Other notes..."></textarea>
        </div>
    </div>

    <!-- ────────────────────────────────────────────────
         OUTDOOR — ELECTRIC (Heat Pump + Electric/AC)
         (has N/A option on Dual Capacitor)
    ──────────────────────────────────────────────── -->
    <div class="form-section" id="section-outdoor-electric" style="display:none">
        <div class="section-title outdoor-title">Outdoor</div>

        <!-- Condenser Coil Clean -->
        <div class="field-group">
            <label class="field-label">Condenser Coil Clean</label>
            <div class="yn-row">
                <label class="yn-option">
                    <input type="radio" name="ie_condenser_clean" value="yes" onchange="onYN(this)"> Yes &#10004;
                </label>
                <label class="yn-option">
                    <input type="radio" name="ie_condenser_clean" value="no" onchange="onYN(this)"> No
                </label>
            </div>
            <div class="sub-fields" id="ie_condenser_clean_no">
                <label class="check-label"><input type="checkbox" name="ie_condenser_cleaned" checked> Cleaned Condenser Coil</label>
            </div>
        </div>

        <!-- Capacitor Type Toggle -->
        <div class="field-group">
            <label class="field-label">Capacitor Type</label>
            <div class="yn-row">
                <label class="yn-option">
                    <input type="radio" name="ie_cap_type" value="dual" onchange="onCapType('ie',this)"> Dual Capacitor
                </label>
                <label class="yn-option">
                    <input type="radio" name="ie_cap_type" value="run" onchange="onCapType('ie',this)"> Run Capacitors
                </label>
            </div>
        </div>

        <!-- Dual Capacitor fields -->
        <div id="ie_cap_dual_fields" style="display:none">
            <div class="field-group">
                <label class="field-label">Dual Capacitor</label>
                <div class="dual-cap-row">
                    <div class="cap-field">
                        <label>Compressor</label>
                        <div class="input-row">
                            <input class="field-input" type="number" id="ie_dual_cap_comp" name="ie_dual_cap_comp" step="0.1" min="0" placeholder="0.0">
                            <span class="input-unit">uf</span>
                        </div>
                    </div>
                    <div class="cap-field">
                        <label>Fan</label>
                        <div class="input-row">
                            <input class="field-input" type="number" id="ie_dual_cap_fan" name="ie_dual_cap_fan" step="0.1" min="0" placeholder="0.0">
                            <span class="input-unit">uf</span>
                        </div>
                    </div>
                </div>
                <div style="margin-top:0.5rem">
                    <label class="na-check-label">
                        <input type="checkbox" id="ie_dual_cap_na" name="ie_dual_cap_na" onchange="toggleNA(this,'ie_dual_cap_comp');toggleNA(this,'ie_dual_cap_fan')"> N/A
                    </label>
                </div>
            </div>
            <div class="field-group">
                <div class="replaced-row">
                    <label class="replaced-label">
                        <input type="checkbox" name="ie_replaced_dual_cap" id="ie_replaced_dual_cap" onchange="toggleReplaced(this,'ie_replaced_dual_cap_uf_row')">
                        Replaced Dual Capacitor
                    </label>
                    <div class="replaced-val" id="ie_replaced_dual_cap_uf_row">
                        <input type="number" name="ie_replaced_dual_cap_uf" step="0.1" min="0" placeholder="uf">
                        <span class="input-unit">uf</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Run Capacitor fields -->
        <div id="ie_cap_run_fields" style="display:none">
            <div class="field-group">
                <label class="field-label">Compressor Run Capacitor</label>
                <div class="na-row">
                    <input class="field-input" type="number" id="ie_comp_run_cap" name="ie_comp_run_cap" step="0.1" min="0" placeholder="0.0">
                    <span class="input-unit">uf</span>
                    <label class="na-check-label">
                        <input type="checkbox" id="ie_comp_run_cap_na" name="ie_comp_run_cap_na" onchange="toggleNA(this,'ie_comp_run_cap')"> N/A
                    </label>
                </div>
            </div>
            <div class="field-group">
                <div class="replaced-row">
                    <label class="replaced-label">
                        <input type="checkbox" name="ie_replaced_comp_run_cap" id="ie_replaced_comp_run_cap" onchange="toggleReplaced(this,'ie_replaced_comp_run_cap_uf_row')">
                        Replaced Compressor Run Capacitor
                    </label>
                    <div class="replaced-val" id="ie_replaced_comp_run_cap_uf_row">
                        <input type="number" name="ie_replaced_comp_run_cap_uf" step="0.1" min="0" placeholder="uf">
                        <span class="input-unit">uf</span>
                    </div>
                </div>
            </div>
            <div class="field-group">
                <label class="field-label">Fan Run Capacitor</label>
                <div class="na-row">
                    <input class="field-input" type="number" id="ie_fan_run_cap" name="ie_fan_run_cap" step="0.1" min="0" placeholder="0.0">
                    <span class="input-unit">uf</span>
                    <label class="na-check-label">
                        <input type="checkbox" id="ie_fan_run_cap_na" name="ie_fan_run_cap_na" onchange="toggleNA(this,'ie_fan_run_cap')"> N/A
                    </label>
                </div>
            </div>
            <div class="field-group">
                <div class="replaced-row">
                    <label class="replaced-label">
                        <input type="checkbox" name="ie_replaced_fan_run_cap" id="ie_replaced_fan_run_cap" onchange="toggleReplaced(this,'ie_replaced_fan_run_cap_uf_row')">
                        Replaced Fan Run Capacitor
                    </label>
                    <div class="replaced-val" id="ie_replaced_fan_run_cap_uf_row">
                        <input type="number" name="ie_replaced_fan_run_cap_uf" step="0.1" min="0" placeholder="uf">
                        <span class="input-unit">uf</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Compressor Amps -->
        <div class="field-group">
            <label class="field-label" for="ie_comp_amps">Compressor Amps</label>
            <div class="input-row">
                <input class="field-input" type="number" id="ie_comp_amps" name="ie_comp_amps" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">A</span>
            </div>
        </div>

        <!-- Fan Amps -->
        <div class="field-group">
            <label class="field-label" for="ie_fan_amps">Fan Amps</label>
            <div class="input-row">
                <input class="field-input" type="number" id="ie_fan_amps" name="ie_fan_amps" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">A</span>
            </div>
        </div>

        <!-- Operating Pressures -->
        <div class="field-group">
            <label class="field-label">Operating Pressures</label>
            <div class="pressures-row">
                <input class="field-input" type="number" name="ie_pressure_low" step="0.1" min="0" placeholder="Low">
                <span class="pressures-slash">/</span>
                <input class="field-input" type="number" name="ie_pressure_high" step="0.1" min="0" placeholder="High">
                <span class="input-unit">PSI</span>
            </div>
        </div>

        <!-- Refrigerant Type -->
        <div class="field-group">
            <label class="field-label" for="ie_refrigerant">Refrigerant Type</label>
            <input class="field-input" type="text" id="ie_refrigerant" name="ie_refrigerant" placeholder="e.g. R-410A">
        </div>

        <!-- Superheat -->
        <div class="field-group">
            <label class="field-label">Superheat</label>
            <div class="na-row">
                <input class="field-input" type="number" id="ie_superheat" name="ie_superheat" step="0.1" placeholder="0.0">
                <span class="input-unit">&#176;F</span>
                <label class="na-check-label">
                    <input type="checkbox" id="ie_superheat_na" name="ie_superheat_na" onchange="toggleNA(this,'ie_superheat')"> N/A
                </label>
            </div>
        </div>

        <!-- Subcool -->
        <div class="field-group">
            <label class="field-label">Subcool</label>
            <div class="na-row">
                <input class="field-input" type="number" id="ie_subcool" name="ie_subcool" step="0.1" placeholder="0.0">
                <span class="input-unit">&#176;F</span>
                <label class="na-check-label">
                    <input type="checkbox" id="ie_subcool_na" name="ie_subcool_na" onchange="toggleNA(this,'ie_subcool')"> N/A
                </label>
            </div>
        </div>

        <!-- Suction Line Temp -->
        <div class="field-group">
            <label class="field-label" for="ie_suction_temp">Suction Line Temp</label>
            <div class="input-row">
                <input class="field-input" type="number" id="ie_suction_temp" name="ie_suction_temp" step="0.1" placeholder="0.0">
                <span class="input-unit">&#176;F</span>
            </div>
        </div>

        <!-- Liquid Line Temp -->
        <div class="field-group">
            <label class="field-label" for="ie_liquid_temp">Liquid Line Temp</label>
            <div class="input-row">
                <input class="field-input" type="number" id="ie_liquid_temp" name="ie_liquid_temp" step="0.1" placeholder="0.0">
                <span class="input-unit">&#176;F</span>
            </div>
        </div>

        <!-- Indoor Ambient Temp -->
        <div class="field-group">
            <label class="field-label" for="ie_indoor_ambient">Indoor Ambient Temp</label>
            <div class="input-row">
                <input class="field-input" type="number" id="ie_indoor_ambient" name="ie_indoor_ambient" step="0.1" placeholder="0.0">
                <span class="input-unit">&#176;F</span>
            </div>
        </div>

        <!-- Outdoor Ambient Temp -->
        <div class="field-group">
            <label class="field-label" for="ie_outdoor_ambient">Outdoor Ambient Temp</label>
            <div class="input-row">
                <input class="field-input" type="number" id="ie_outdoor_ambient" name="ie_outdoor_ambient" step="0.1" placeholder="0.0">
                <span class="input-unit">&#176;F</span>
            </div>
        </div>
    </div>

    <!-- ────────────────────────────────────────────────
         OUTDOOR — GAS / DUAL FUEL
         (no N/A on Dual Capacitor)
    ──────────────────────────────────────────────── -->
    <div class="form-section" id="section-outdoor-gas" style="display:none">
        <div class="section-title outdoor-title">Outdoor</div>

        <!-- Condenser Coil Clean -->
        <div class="field-group">
            <label class="field-label">Condenser Coil Clean</label>
            <div class="yn-row">
                <label class="yn-option">
                    <input type="radio" name="go_condenser_clean" value="yes" onchange="onYN(this)"> Yes &#10004;
                </label>
                <label class="yn-option">
                    <input type="radio" name="go_condenser_clean" value="no" onchange="onYN(this)"> No
                </label>
            </div>
            <div class="sub-fields" id="go_condenser_clean_no">
                <label class="check-label"><input type="checkbox" name="go_condenser_cleaned" checked> Cleaned Condenser Coil</label>
            </div>
        </div>

        <!-- Capacitor Type Toggle -->
        <div class="field-group">
            <label class="field-label">Capacitor Type</label>
            <div class="yn-row">
                <label class="yn-option">
                    <input type="radio" name="go_cap_type" value="dual" onchange="onCapType('go',this)"> Dual Capacitor
                </label>
                <label class="yn-option">
                    <input type="radio" name="go_cap_type" value="run" onchange="onCapType('go',this)"> Run Capacitors
                </label>
            </div>
        </div>

        <!-- Dual Capacitor fields (no N/A for gas/dual fuel) -->
        <div id="go_cap_dual_fields" style="display:none">
            <div class="field-group">
                <label class="field-label">Dual Capacitor</label>
                <div class="dual-cap-row">
                    <div class="cap-field">
                        <label>Compressor</label>
                        <div class="input-row">
                            <input class="field-input" type="number" id="go_dual_cap_comp" name="go_dual_cap_comp" step="0.1" min="0" placeholder="0.0">
                            <span class="input-unit">uf</span>
                        </div>
                    </div>
                    <div class="cap-field">
                        <label>Fan</label>
                        <div class="input-row">
                            <input class="field-input" type="number" id="go_dual_cap_fan" name="go_dual_cap_fan" step="0.1" min="0" placeholder="0.0">
                            <span class="input-unit">uf</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="field-group">
                <div class="replaced-row">
                    <label class="replaced-label">
                        <input type="checkbox" name="go_replaced_dual_cap" id="go_replaced_dual_cap" onchange="toggleReplaced(this,'go_replaced_dual_cap_uf_row')">
                        Replaced Dual Capacitor
                    </label>
                    <div class="replaced-val" id="go_replaced_dual_cap_uf_row">
                        <input type="number" name="go_replaced_dual_cap_uf" step="0.1" min="0" placeholder="uf">
                        <span class="input-unit">uf</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Run Capacitor fields -->
        <div id="go_cap_run_fields" style="display:none">
            <div class="field-group">
                <label class="field-label">Compressor Run Capacitor</label>
                <div class="na-row">
                    <input class="field-input" type="number" id="go_comp_run_cap" name="go_comp_run_cap" step="0.1" min="0" placeholder="0.0">
                    <span class="input-unit">uf</span>
                    <label class="na-check-label">
                        <input type="checkbox" id="go_comp_run_cap_na" name="go_comp_run_cap_na" onchange="toggleNA(this,'go_comp_run_cap')"> N/A
                    </label>
                </div>
            </div>
            <div class="field-group">
                <div class="replaced-row">
                    <label class="replaced-label">
                        <input type="checkbox" name="go_replaced_comp_run_cap" id="go_replaced_comp_run_cap" onchange="toggleReplaced(this,'go_replaced_comp_run_cap_uf_row')">
                        Replaced Compressor Run Capacitor
                    </label>
                    <div class="replaced-val" id="go_replaced_comp_run_cap_uf_row">
                        <input type="number" name="go_replaced_comp_run_cap_uf" step="0.1" min="0" placeholder="uf">
                        <span class="input-unit">uf</span>
                    </div>
                </div>
            </div>
            <div class="field-group">
                <label class="field-label">Fan Run Capacitor</label>
                <div class="na-row">
                    <input class="field-input" type="number" id="go_fan_run_cap" name="go_fan_run_cap" step="0.1" min="0" placeholder="0.0">
                    <span class="input-unit">uf</span>
                    <label class="na-check-label">
                        <input type="checkbox" id="go_fan_run_cap_na" name="go_fan_run_cap_na" onchange="toggleNA(this,'go_fan_run_cap')"> N/A
                    </label>
                </div>
            </div>
            <div class="field-group">
                <div class="replaced-row">
                    <label class="replaced-label">
                        <input type="checkbox" name="go_replaced_fan_run_cap" id="go_replaced_fan_run_cap" onchange="toggleReplaced(this,'go_replaced_fan_run_cap_uf_row')">
                        Replaced Fan Run Capacitor
                    </label>
                    <div class="replaced-val" id="go_replaced_fan_run_cap_uf_row">
                        <input type="number" name="go_replaced_fan_run_cap_uf" step="0.1" min="0" placeholder="uf">
                        <span class="input-unit">uf</span>
                    </div>
                </div>
            </div>
        </div> <!-- /go_cap_run_fields -->

        <!-- Compressor Amps -->
        <div class="field-group">
            <label class="field-label" for="go_comp_amps">Compressor Amps</label>
            <div class="input-row">
                <input class="field-input" type="number" id="go_comp_amps" name="go_comp_amps" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">A</span>
            </div>
        </div>

        <!-- Fan Amps -->
        <div class="field-group">
            <label class="field-label" for="go_fan_amps">Fan Amps</label>
            <div class="input-row">
                <input class="field-input" type="number" id="go_fan_amps" name="go_fan_amps" step="0.1" min="0" placeholder="0.0">
                <span class="input-unit">A</span>
            </div>
        </div>

        <!-- Operating Pressures -->
        <div class="field-group">
            <label class="field-label">Operating Pressures</label>
            <div class="pressures-row">
                <input class="field-input" type="number" name="go_pressure_low" step="0.1" min="0" placeholder="Low">
                <span class="pressures-slash">/</span>
                <input class="field-input" type="number" name="go_pressure_high" step="0.1" min="0" placeholder="High">
                <span class="input-unit">PSI</span>
            </div>
        </div>

        <!-- Refrigerant Type -->
        <div class="field-group">
            <label class="field-label" for="go_refrigerant">Refrigerant Type</label>
            <input class="field-input" type="text" id="go_refrigerant" name="go_refrigerant" placeholder="e.g. R-410A">
        </div>

        <!-- Superheat -->
        <div class="field-group">
            <label class="field-label">Superheat</label>
            <div class="na-row">
                <input class="field-input" type="number" id="go_superheat" name="go_superheat" step="0.1" placeholder="0.0">
                <span class="input-unit">&#176;F</span>
                <label class="na-check-label">
                    <input type="checkbox" id="go_superheat_na" name="go_superheat_na" onchange="toggleNA(this,'go_superheat')"> N/A
                </label>
            </div>
        </div>

        <!-- Subcool -->
        <div class="field-group">
            <label class="field-label">Subcool</label>
            <div class="na-row">
                <input class="field-input" type="number" id="go_subcool" name="go_subcool" step="0.1" placeholder="0.0">
                <span class="input-unit">&#176;F</span>
                <label class="na-check-label">
                    <input type="checkbox" id="go_subcool_na" name="go_subcool_na" onchange="toggleNA(this,'go_subcool')"> N/A
                </label>
            </div>
        </div>

        <!-- Suction Line Temp -->
        <div class="field-group">
            <label class="field-label" for="go_suction_temp">Suction Line Temp</label>
            <div class="input-row">
                <input class="field-input" type="number" id="go_suction_temp" name="go_suction_temp" step="0.1" placeholder="0.0">
                <span class="input-unit">&#176;F</span>
            </div>
        </div>

        <!-- Liquid Line Temp -->
        <div class="field-group">
            <label class="field-label" for="go_liquid_temp">Liquid Line Temp</label>
            <div class="input-row">
                <input class="field-input" type="number" id="go_liquid_temp" name="go_liquid_temp" step="0.1" placeholder="0.0">
                <span class="input-unit">&#176;F</span>
            </div>
        </div>

        <!-- Indoor Ambient Temp -->
        <div class="field-group">
            <label class="field-label" for="go_indoor_ambient">Indoor Ambient Temp</label>
            <div class="input-row">
                <input class="field-input" type="number" id="go_indoor_ambient" name="go_indoor_ambient" step="0.1" placeholder="0.0">
                <span class="input-unit">&#176;F</span>
            </div>
        </div>

        <!-- Outdoor Ambient Temp -->
        <div class="field-group">
            <label class="field-label" for="go_outdoor_ambient">Outdoor Ambient Temp</label>
            <div class="input-row">
                <input class="field-input" type="number" id="go_outdoor_ambient" name="go_outdoor_ambient" step="0.1" placeholder="0.0">
                <span class="input-unit">&#176;F</span>
            </div>
        </div>
    </div>

    <!-- ── OTHER NOTES (maintenance) ── -->
    <div class="form-section" id="section-other-notes" style="display:none">
        <div class="section-title notes-title">Other Notes</div>
        <div class="field-group">
            <textarea class="field-input" id="other_notes" name="other_notes" rows="3" placeholder="Additional notes..."></textarea>
        </div>
    </div>

</form>

<!-- Fixed save bar -->
<div class="form-footer">
    <button type="button" class="btn btn-danger btn-sm" id="btn-delete" style="display:none;flex:0 0 auto" onclick="deleteJob()">Delete</button>
    <button type="button" class="btn" style="background:var(--gray-light);color:var(--text)" onclick="history.back()">Cancel</button>
    <button type="button" class="btn btn-primary" id="btn-save" onclick="saveJob()">Save Job</button>
</div>

<div class="toast" id="toast"></div>

<script src="/assets/js/form.js?v=2"></script>
</body>
</html>
