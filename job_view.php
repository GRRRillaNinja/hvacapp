<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="theme-color" content="#0d1f3c">
    <title>Job Detail - HVAC Tech</title>
    <link rel="icon" type="image/svg+xml" href="assets/img/favicon.svg">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<?php
require_once 'config.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if (!$id) { header('Location: index.php'); exit; }

$db   = getDB();
$stmt = $db->prepare('SELECT * FROM jobs WHERE id = ?');
$stmt->bind_param('i', $id);
$stmt->execute();
$job  = $stmt->get_result()->fetch_assoc();
if (!$job) { header('Location: index.php'); exit; }

$data        = $job['job_data'] ? json_decode($job['job_data'], true) : [];
$sys         = $job['system_type'] ?? '';

$isMaint     = str_starts_with($job['job_type'], 'maintenance_');

// Extract system instances from data keys (format: systype_unitnum_indoor/outdoor)
// e.g., electric_heat_pump_1_indoor, gas_ac_2_outdoor
$systemInstances = [];
$sysTypePattern = '/^(electric_heat_pump|gas_ac|electric_ac|dual_fuel)_(\d+)_(indoor|outdoor)$/';
foreach ($data as $key => $val) {
    if (is_array($val) && preg_match($sysTypePattern, $key, $m)) {
        $sysType = $m[1];
        $unitNum = $m[2];
        $section = $m[3];
        $instance = "${sysType}_${unitNum}";
        if (!isset($systemInstances[$instance])) {
            $systemInstances[$instance] = ['sysType' => $sysType, 'unitNum' => $unitNum];
        }
        // Store section data with designation
        $systemInstances[$instance]["{$section}_data"] = $val;
        $systemInstances[$instance]["{$section}_designation"] = $val['designation'] ?? '';
    }
}
$isMaintData = !empty($systemInstances);

$typLabels = [
    'maintenance_first_time' => 'Maintenance · First Time',
    'maintenance_renewal'    => 'Maintenance · Renewal',
    'maintenance_check'      => 'Maintenance · Check',
    'filter_change'          => 'Filter Change',
    'service_call'           => 'Service Call',
];
$sysLabels = [
    'electric_heat_pump' => 'Electric Heat Pump',
    'gas_ac'             => 'Gas / AC',
    'electric_ac'        => 'Electric / AC',
    'dual_fuel'          => 'Dual Fuel',
];
$statusLabels = ['pending' => 'Pending', 'in_progress' => 'In Progress', 'complete' => 'Complete'];

function row(string $label, $value, string $cls = ''): string {
    if ($value === null || $value === '' || $value === false) return '';
    $v = htmlspecialchars((string)$value);
    $c = $cls ? " class=\"view-row-value $cls\"" : ' class="view-row-value"';
    return "<div class=\"view-row\"><span class=\"view-row-label\">" . htmlspecialchars($label) . "</span><span$c>$v</span></div>";
}
function yesNo($val): string {
    if ($val === null || $val === '') return '';
    return $val ? '✔ Yes' : 'No';
}
function naVal($val, $na, string $unit = ''): string {
    if ($na) return 'N/A';
    if ($val === null || $val === '') return '';
    return $val . ($unit ? ' ' . $unit : '');
}

$addr = trim($job['address_line1'] . ' ' . $job['address_line2']);
$mapsUrl = 'https://maps.google.com/?q=' . urlencode($addr);
$telUrl  = 'tel:' . preg_replace('/\D/', '', $job['phone']);
?>

<header class="form-header">
    <a href="index.php" class="back-btn" title="Back">&#8592;</a>
    <h1>Job Detail</h1>
</header>

<!-- Hero block -->
<div class="view-hero">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem">
        <div>
            <div class="view-hero-name"><?= htmlspecialchars($job['customer_name']) ?></div>
            <?php if ($addr): ?>
            <div class="view-hero-addr"><?= htmlspecialchars($addr) ?></div>
            <?php endif; ?>
        </div>
        <a href="job_form.php?id=<?= $id ?>" class="btn btn-ghost btn-sm">&#9998; Edit</a>
    </div>
    <div class="view-hero-actions">
        <?php if ($job['phone']): ?>
        <a href="<?= $telUrl ?>" class="btn btn-call">&#128222; Call</a>
        <?php endif; ?>
        <?php if ($addr): ?>
        <a href="<?= $mapsUrl ?>" target="_blank" class="btn btn-map">&#128205; Maps</a>
        <?php endif; ?>
    </div>
</div>

<!-- Customer Info -->
<div class="view-section">
    <div class="section-title">Customer Information</div>
    <?= row('Name', $job['customer_name']) ?>
    <?= row('Address Line 1', $job['address_line1']) ?>
    <?= row('Address Line 2', $job['address_line2']) ?>
    <?= row('Phone', $job['phone']) ?>
    <?php if ($job['address_line1'] && $job['address_line2']): ?>
    <div class="view-row" id="county-row">
        <span class="view-row-label">County</span>
        <span class="view-row-value" id="county-value" style="color:var(--text-muted);font-style:italic">Looking up...</span>
    </div>
    <?php endif; ?>
</div>

<!-- Tax Calculator (shown after county resolves) -->
<div class="view-section" id="tax-calculator" style="display:none">
    <div class="section-title">&#128181; Tax Calculator</div>
    <div class="field-group">
        <label class="field-label">Bill Amount</label>
        <div class="input-row">
            <span class="input-unit">$</span>
            <input class="field-input" type="number" id="tax-bill" step="0.01" min="0" placeholder="0.00" oninput="calcTax()">
        </div>
    </div>
    <div class="field-group">
        <label class="field-label">Tax Rate <span id="tax-county-label" style="font-weight:400;color:var(--text-muted)"></span></label>
        <div class="input-row">
            <input class="field-input" type="number" id="tax-rate" step="0.001" min="0" placeholder="0.000" oninput="calcTax()" style="max-width:120px">
            <span class="input-unit">%</span>
            <button class="btn btn-sm" style="background:var(--blue-dim);color:var(--blue);white-space:nowrap" onclick="saveRate()">Save Rate</button>
        </div>
    </div>
    <div class="view-row">
        <span class="view-row-label">Tax Amount</span>
        <span class="view-row-value" id="tax-amount" style="font-size:1rem">—</span>
    </div>
    <div class="view-row">
        <span class="view-row-label" style="font-weight:700">Total</span>
        <span class="view-row-value" id="tax-total">—</span>
    </div>
</div>

<script>
let _county = null;

(function lookupCounty() {
    const street = <?= json_encode($job['address_line1']) ?>;
    const addr2  = <?= json_encode($job['address_line2']) ?>;

    const countyEl = document.getElementById('county-value');

    <?php if (!$job['address_line1'] || !$job['address_line2']): ?>
    return; // no address to look up
    <?php endif; ?>

    // Extract ZIP — first 5-digit sequence found in address line 2
    const zipMatch = addr2.match(/\b(\d{5})\b/);
    if (!zipMatch) {
        countyEl.textContent = 'No ZIP found in Address Line 2';
        return;
    }

    fetch(`api/county.php?street=${encodeURIComponent(street)}&zip=${encodeURIComponent(zipMatch[1])}`)
        .then(r => r.json())
        .then(data => {
            if (data.county) {
                countyEl.textContent = data.county;
                countyEl.style.color = '';
                countyEl.style.fontStyle = '';
                _county = data.county;
                loadTaxRate(data.county);
            } else {
                countyEl.textContent = data.error ?? 'Not found';
                countyEl.style.color = 'var(--text-muted)';
                // Still show calculator so user can enter rate manually
                showCalculator('');
            }
        })
        .catch(() => {
            countyEl.textContent = 'Lookup failed';
        });
})();

function loadTaxRate(county) {
    fetch(`api/tax_rates.php?county=${encodeURIComponent(county)}`)
        .then(r => r.json())
        .then(data => {
            showCalculator(county, data.rate);
        })
        .catch(() => showCalculator(county, null));
}

function showCalculator(county, rate) {
    const calc = document.getElementById('tax-calculator');
    calc.style.display = '';
    document.getElementById('tax-county-label').textContent = county ? `(${county})` : '';
    if (rate !== null && rate !== undefined) {
        document.getElementById('tax-rate').value = rate;
        calcTax();
    }
}

function calcTax() {
    const bill = parseFloat(document.getElementById('tax-bill').value) || 0;
    const rate = parseFloat(document.getElementById('tax-rate').value) || 0;
    const tax  = bill * (rate / 100);
    const total = bill + tax;
    document.getElementById('tax-amount').textContent = bill > 0 ? '$' + tax.toFixed(2) : '—';
    document.getElementById('tax-total').textContent  = bill > 0 ? '$' + total.toFixed(2) : '—';
}

function saveRate() {
    const rate = parseFloat(document.getElementById('tax-rate').value);
    if (!_county || isNaN(rate) || rate <= 0) return;
    fetch('api/tax_rates.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ county: _county, rate }),
    }).then(() => {
        const btn = document.querySelector('#tax-calculator .btn');
        const orig = btn.textContent;
        btn.textContent = 'Saved ✔';
        setTimeout(() => btn.textContent = orig, 2000);
    });
}
</script>

<!-- Job Info -->
<div class="view-section">
    <div class="section-title">Job Info</div>
    <?= row('Date', date('M j, Y', strtotime($job['job_date']))) ?>
    <?= row('Type', $typLabels[$job['job_type']] ?? $job['job_type']) ?>
    <?php if (!empty($selectedSystems)): ?>
    <?php
        $sysLabelsArr = array_map(function($s) use ($sysLabels) { return $sysLabels[$s] ?? $s; }, $selectedSystems);
        echo row('System Type(s)', implode(', ', $sysLabelsArr));
    ?>
    <?php endif; ?>
    <?= row('Status', $statusLabels[$job['status']] ?? $job['status']) ?>
</div>

<?php if (!$isMaint && isset($data['notes'])): ?>
<!-- Notes (filter / service call) -->
<div class="view-section">
    <div class="section-title notes-title">Notes</div>
    <?= row('Notes', $data['notes']) ?>
</div>
<?php endif; ?>

<?php if ($isMaint && $isMaintData): ?>
<?php foreach ($systemInstances as $instance => $sysInfo): ?>
<?php
    $sysType = $sysInfo['sysType'];
    $unitNum = $sysInfo['unitNum'];
    $isElectric = in_array($sysType, ['electric_heat_pump', 'electric_ac']);
    $isGas = in_array($sysType, ['gas_ac', 'dual_fuel']);
    $isHeatPump = $sysType === 'electric_heat_pump';
    $baseLabel = $sysLabels[$sysType] . ' - Unit ' . $unitNum;
?>

<?php if ($isElectric): ?>
<!-- Electric Indoor -->
<div class="view-section">
    <?php
        $indoorDesignation = $sysInfo['indoor_designation'] ?? '';
        $indoorLabel = $baseLabel . ' (Indoor)';
        if ($indoorDesignation) $indoorLabel .= ' — ' . htmlspecialchars($indoorDesignation);
    ?>
    <div class="section-title indoor-title"><?= $indoorLabel ?></div>
    <?php
    $iPrefix = "${instance}_i";
    $indoorData = $data["${instance}_indoor"] ?? [];
    $circuit = $indoorData['heat_strip_circuit'] ?? null;
    if ($circuit === 'single') {
        echo row('Heat Strip Amps', ($indoorData['heat_strip_amps'] ?? '') . ' A (Single Circuit)');
    } elseif ($circuit === 'double') {
        echo row('Heat Strip Amps', ($indoorData['heat_strip_amps_1'] ?? '') . ' A + ' . ($indoorData['heat_strip_amps_2'] ?? '') . ' A (Double Circuit)');
    }
    ?>
    <?= row('Blower Amps', isset($indoorData['blower_amps']) ? $indoorData['blower_amps'] . ' A' : '') ?>
    <?= row('Blower Capacitor', naVal($indoorData['blower_cap'] ?? null, $indoorData['blower_cap_na'] ?? false, 'uf')) ?>
    <?php if (!empty($indoorData['replaced_blower_cap'])): ?>
    <?= row('Replaced Blower Cap', ($indoorData['replaced_blower_cap_uf'] ?? '') . ' uf') ?>
    <?php endif; ?>

    <?php
    $evap = $indoorData['evap_coil_clean'] ?? null;
    if ($evap === 'yes') echo row('Evap Coil Clean', '✔ Yes', 'yes');
    elseif ($evap === 'no') {
        $acts = [];
        if (!empty($indoorData['evap_brushed']))       $acts[] = 'Brushed';
        if (!empty($indoorData['evap_sprayed']))        $acts[] = 'Sprayed';
        if (!empty($indoorData['evap_pulled_cleaned'])) $acts[] = 'Pulled & Cleaned';
        echo row('Evap Coil Clean', 'No — ' . implode(', ', $acts), 'no');
    }

    $bmc = $indoorData['blower_motor_clean'] ?? null;
    if ($bmc === 'yes') echo row('Blower Motor Clean', '✔ Yes', 'yes');
    elseif ($bmc === 'no') {
        $act = $indoorData['blower_motor_action'] ?? '';
        $reason = $indoorData['blower_motor_reason'] ?? '';
        $actionLabel = $act === 'pulled_cleaned' ? 'Pulled & Cleaned Blower Wheel' : 'Could Not Pull & Clean' . ($reason ? ': ' . $reason : '');
        echo row('Blower Motor Clean', 'No — ' . $actionLabel, 'no');
    }

    $cond = $indoorData['condensate'] ?? null;
    if ($cond === 'yes') echo row('Condensate Drain', '✔ Cleared', 'yes');
    elseif ($cond === 'no') {
        $r = $indoorData['condensate_reason'] ?? '';
        echo row('Condensate Drain', 'Could Not Clear' . ($r ? ': ' . $r : ''), 'no');
    }
    ?>
    <?= !empty($indoorData['insulated_condensate']) ? row('Insulated Condensate Drain', '✔') : '' ?>
    <?= !empty($indoorData['insulated_suction'])    ? row('Insulated Suction Line', '✔') : '' ?>
    <?= !empty($indoorData['reglued_cabinet'])       ? row('Reglued Cabinet Insulation', '✔') : '' ?>
    <?= row('Other', $indoorData['electric_other'] ?? '') ?>
</div>
<?php endif; ?>

<?php if ($isElectric): ?>
<!-- Electric Outdoor -->
<div class="view-section">
    <?php
        $outdoorDesignation = $sysInfo['outdoor_designation'] ?? '';
        $outdoorLabel = $baseLabel . ' (Outdoor)';
        if ($outdoorDesignation) $outdoorLabel .= ' — ' . htmlspecialchars($outdoorDesignation);
    ?>
    <div class="section-title outdoor-title"><?= $outdoorLabel ?></div>
    <?php
    $outdoorData = $data["${instance}_outdoor"] ?? [];
    $cc = $outdoorData['condenser_clean'] ?? null;
    if ($cc === 'yes') echo row('Condenser Coil Clean', '✔ Yes', 'yes');
    elseif ($cc === 'no') echo row('Condenser Coil Clean', 'No — ' . (!empty($outdoorData['condenser_cleaned']) ? 'Cleaned' : ''), 'no');
    ?>
    <?php if (($outdoorData['cap_type'] ?? '') === 'dual'): ?>
    <?= row('Dual Cap — Compressor', naVal($outdoorData['dual_cap_comp'] ?? null, $outdoorData['dual_cap_na'] ?? false, 'uf')) ?>
    <?= row('Dual Cap — Fan', naVal($outdoorData['dual_cap_fan'] ?? null, $outdoorData['dual_cap_na'] ?? false, 'uf')) ?>
    <?php if (!empty($outdoorData['replaced_dual_cap'])): ?>
    <?= row('Replaced Dual Cap', ($outdoorData['replaced_dual_cap_uf'] ?? '') . ' uf') ?>
    <?php endif; ?>
    <?php elseif (($outdoorData['cap_type'] ?? '') === 'run'): ?>
    <?= row('Compressor Run Cap', naVal($outdoorData['comp_run_cap'] ?? null, $outdoorData['comp_run_cap_na'] ?? false, 'uf')) ?>
    <?php if (!empty($outdoorData['replaced_comp_run_cap'])): ?>
    <?= row('Replaced Comp Run Cap', ($outdoorData['replaced_comp_run_cap_uf'] ?? '') . ' uf') ?>
    <?php endif; ?>
    <?= row('Fan Run Cap', naVal($outdoorData['fan_run_cap'] ?? null, $outdoorData['fan_run_cap_na'] ?? false, 'uf')) ?>
    <?php if (!empty($outdoorData['replaced_fan_run_cap'])): ?>
    <?= row('Replaced Fan Run Cap', ($outdoorData['replaced_fan_run_cap_uf'] ?? '') . ' uf') ?>
    <?php endif; ?>
    <?php endif; ?>
    <?= row('Compressor Amps', isset($outdoorData['comp_amps']) ? $outdoorData['comp_amps'] . ' A' : '') ?>
    <?= row('Fan Amps', isset($outdoorData['fan_amps']) ? $outdoorData['fan_amps'] . ' A' : '') ?>
    <?php
    $pl = $outdoorData['pressure_low'] ?? null;
    $ph = $outdoorData['pressure_high'] ?? null;
    if ($pl !== null || $ph !== null) echo row('Operating Pressures', $pl . ' / ' . $ph . ' PSI');
    ?>
    <?= row('Refrigerant Type', $outdoorData['refrigerant'] ?? '') ?>
    <?= row('Superheat', naVal($outdoorData['superheat'] ?? null, $outdoorData['superheat_na'] ?? false, '°F')) ?>
    <?= row('Subcool', naVal($outdoorData['subcool'] ?? null, $outdoorData['subcool_na'] ?? false, '°F')) ?>
    <?= row('Suction Line Temp', isset($outdoorData['suction_temp']) ? $outdoorData['suction_temp'] . ' °F' : '') ?>
    <?= row('Liquid Line Temp', isset($outdoorData['liquid_temp']) ? $outdoorData['liquid_temp'] . ' °F' : '') ?>
    <?= row('Indoor Ambient Temp', isset($outdoorData['indoor_ambient']) ? $outdoorData['indoor_ambient'] . ' °F' : '') ?>
    <?= row('Outdoor Ambient Temp', isset($outdoorData['outdoor_ambient']) ? $outdoorData['outdoor_ambient'] . ' °F' : '') ?>
</div>
<?php endif; ?>

<?php if ($isGas): ?>
<!-- Gas/Dual Fuel Indoor -->
<div class="view-section">
    <?php
        $gasIndoorDesignation = $sysInfo['indoor_designation'] ?? '';
        $gasIndoorLabel = $baseLabel . ' (Indoor)';
        if ($gasIndoorDesignation) $gasIndoorLabel .= ' — ' . htmlspecialchars($gasIndoorDesignation);
    ?>
    <div class="section-title indoor-title"><?= $gasIndoorLabel ?></div>
    <?php
    $gasIndoorData = $data["${instance}_indoor"] ?? [];
    ?>
    <?= !empty($gasIndoorData['cleaned_flame_sensor']) ? row('Cleaned Flame Sensor', '✔') : '' ?>
    <?= row('Gas Pressure In', isset($gasIndoorData['gas_pressure_in']) ? $gasIndoorData['gas_pressure_in'] . ' in wc' : '') ?>
    <?= row('Gas Pressure Out', isset($gasIndoorData['gas_pressure_out']) ? $gasIndoorData['gas_pressure_out'] . ' in wc' : '') ?>
    <?= row('Inducer Motor Amps', isset($gasIndoorData['inducer_amps']) ? $gasIndoorData['inducer_amps'] . ' A' : '') ?>
    <?php if (!empty($gasIndoorData['replaced_inducer_cap'])): ?>
    <?= row('Replaced Inducer Cap', ($gasIndoorData['replaced_inducer_cap_uf'] ?? '') . ' uf') ?>
    <?php endif; ?>
    <?= row('Blower Amps', isset($gasIndoorData['blower_amps']) ? $gasIndoorData['blower_amps'] . ' A' : '') ?>
    <?= row('Blower Capacitor', naVal($gasIndoorData['blower_cap'] ?? null, $gasIndoorData['blower_cap_na'] ?? false, 'uf')) ?>
    <?php if (!empty($gasIndoorData['replaced_blower_cap'])): ?>
    <?= row('Replaced Blower Cap', ($gasIndoorData['replaced_blower_cap_uf'] ?? '') . ' uf') ?>
    <?php endif; ?>

    <?php
    $evap = $gasIndoorData['evap_coil_clean'] ?? null;
    if ($evap === 'yes') echo row('Evap Coil Clean', '✔ Yes', 'yes');
    elseif ($evap === 'no') {
        $acts = [];
        if (!empty($gasIndoorData['evap_brushed']))       $acts[] = 'Brushed';
        if (!empty($gasIndoorData['evap_sprayed']))        $acts[] = 'Sprayed';
        if (!empty($gasIndoorData['evap_pulled_cleaned'])) $acts[] = 'Pulled & Cleaned';
        echo row('Evap Coil Clean', 'No — ' . implode(', ', $acts), 'no');
    }

    $bmc = $gasIndoorData['blower_motor_clean'] ?? null;
    if ($bmc === 'yes') echo row('Blower Motor Clean', '✔ Yes', 'yes');
    elseif ($bmc === 'no') {
        $act = $gasIndoorData['blower_motor_action'] ?? '';
        $reason = $gasIndoorData['blower_motor_reason'] ?? '';
        $actionLabel = $act === 'pulled_cleaned' ? 'Pulled & Cleaned Blower Wheel' : 'Could Not Pull & Clean' . ($reason ? ': ' . $reason : '');
        echo row('Blower Motor Clean', 'No — ' . $actionLabel, 'no');
    }

    $cond = $gasIndoorData['condensate'] ?? null;
    if ($cond === 'yes') echo row('Condensate Drain', '✔ Cleared', 'yes');
    elseif ($cond === 'no') {
        $r = $gasIndoorData['condensate_reason'] ?? '';
        echo row('Condensate Drain', 'Could Not Clear' . ($r ? ': ' . $r : ''), 'no');
    }
    ?>
    <?= !empty($gasIndoorData['insulated_condensate']) ? row('Insulated Condensate Drain', '✔') : '' ?>
    <?= !empty($gasIndoorData['insulated_suction'])    ? row('Insulated Suction Line', '✔') : '' ?>
    <?= !empty($gasIndoorData['reglued_cabinet'])       ? row('Reglued Cabinet Insulation', '✔') : '' ?>
    <?= row('Other', $gasIndoorData['indoor_other'] ?? '') ?>
</div>

<!-- Gas/Dual Fuel Outdoor -->
<div class="view-section">
    <?php
        $gasOutdoorDesignation = $sysInfo['outdoor_designation'] ?? '';
        $gasOutdoorLabel = $baseLabel . ' (Outdoor)';
        if ($gasOutdoorDesignation) $gasOutdoorLabel .= ' — ' . htmlspecialchars($gasOutdoorDesignation);
    ?>
    <div class="section-title outdoor-title"><?= $gasOutdoorLabel ?></div>
    <?php
    $gasOutdoorData = $data["${instance}_outdoor"] ?? [];
    $cc = $gasOutdoorData['condenser_clean'] ?? null;
    if ($cc === 'yes') echo row('Condenser Coil Clean', '✔ Yes', 'yes');
    elseif ($cc === 'no') echo row('Condenser Coil Clean', 'No — ' . (!empty($gasOutdoorData['condenser_cleaned']) ? 'Cleaned' : ''), 'no');
    ?>
    <?php if (($gasOutdoorData['cap_type'] ?? '') === 'dual'): ?>
    <?= row('Dual Cap — Compressor', isset($gasOutdoorData['dual_cap_comp']) ? $gasOutdoorData['dual_cap_comp'] . ' uf' : '') ?>
    <?= row('Dual Cap — Fan', isset($gasOutdoorData['dual_cap_fan']) ? $gasOutdoorData['dual_cap_fan'] . ' uf' : '') ?>
    <?php if (!empty($gasOutdoorData['replaced_dual_cap'])): ?>
    <?= row('Replaced Dual Cap', ($gasOutdoorData['replaced_dual_cap_uf'] ?? '') . ' uf') ?>
    <?php endif; ?>
    <?php elseif (($gasOutdoorData['cap_type'] ?? '') === 'run'): ?>
    <?= row('Compressor Run Cap', naVal($gasOutdoorData['comp_run_cap'] ?? null, $gasOutdoorData['comp_run_cap_na'] ?? false, 'uf')) ?>
    <?php if (!empty($gasOutdoorData['replaced_comp_run_cap'])): ?>
    <?= row('Replaced Comp Run Cap', ($gasOutdoorData['replaced_comp_run_cap_uf'] ?? '') . ' uf') ?>
    <?php endif; ?>
    <?= row('Fan Run Cap', naVal($gasOutdoorData['fan_run_cap'] ?? null, $gasOutdoorData['fan_run_cap_na'] ?? false, 'uf')) ?>
    <?php if (!empty($gasOutdoorData['replaced_fan_run_cap'])): ?>
    <?= row('Replaced Fan Run Cap', ($gasOutdoorData['replaced_fan_run_cap_uf'] ?? '') . ' uf') ?>
    <?php endif; ?>
    <?php endif; ?>
    <?= row('Compressor Amps', isset($gasOutdoorData['comp_amps']) ? $gasOutdoorData['comp_amps'] . ' A' : '') ?>
    <?= row('Fan Amps', isset($gasOutdoorData['fan_amps']) ? $gasOutdoorData['fan_amps'] . ' A' : '') ?>
    <?php
    $pl = $gasOutdoorData['pressure_low'] ?? null;
    $ph = $gasOutdoorData['pressure_high'] ?? null;
    if ($pl !== null || $ph !== null) echo row('Operating Pressures', $pl . ' / ' . $ph . ' PSI');
    ?>
    <?= row('Refrigerant Type', $gasOutdoorData['refrigerant'] ?? '') ?>
    <?= row('Superheat', naVal($gasOutdoorData['superheat'] ?? null, $gasOutdoorData['superheat_na'] ?? false, '°F')) ?>
    <?= row('Subcool', naVal($gasOutdoorData['subcool'] ?? null, $gasOutdoorData['subcool_na'] ?? false, '°F')) ?>
    <?= row('Suction Line Temp', isset($gasOutdoorData['suction_temp']) ? $gasOutdoorData['suction_temp'] . ' °F' : '') ?>
    <?= row('Liquid Line Temp', isset($gasOutdoorData['liquid_temp']) ? $gasOutdoorData['liquid_temp'] . ' °F' : '') ?>
    <?= row('Indoor Ambient Temp', isset($gasOutdoorData['indoor_ambient']) ? $gasOutdoorData['indoor_ambient'] . ' °F' : '') ?>
    <?= row('Outdoor Ambient Temp', isset($gasOutdoorData['outdoor_ambient']) ? $gasOutdoorData['outdoor_ambient'] . ' °F' : '') ?>
</div>
<?php endif; ?>
<?php endforeach; ?>
<?php endif; ?>

<?php if ($isMaint && !empty($data['other_notes'])): ?>
<div class="view-section">
    <div class="section-title notes-title">Other Notes</div>
    <?= row('Notes', $data['other_notes']) ?>
</div>
<?php endif; ?>

<div style="height:1.5rem"></div>

</body>
</html>
