<?php
/**
 * County lookup proxy using the US Census Bureau Geocoder API.
 * Accepts: ?street=...&zip=...
 * Returns: { county: "Example County" } or { error: "..." }
 */
header('Content-Type: application/json');

$street = trim($_GET['street'] ?? '');
$zip    = trim($_GET['zip']    ?? '');

if (!$street || !$zip) {
    http_response_code(400);
    echo json_encode(['error' => 'street and zip are required']);
    exit;
}

// Validate zip is 5 digits
if (!preg_match('/^\d{5}/', $zip, $m)) {
    echo json_encode(['error' => 'No valid ZIP code found']);
    exit;
}
$zip = $m[0]; // use only the 5-digit portion

$url = 'https://geocoding.geo.census.gov/geocoder/geographies/address?'
     . http_build_query([
         'street'    => $street,
         'zip'       => $zip,
         'benchmark' => 'Public_AR_Current',
         'vintage'   => 'Current_Current',
         'layers'    => 'Counties',
         'format'    => 'json',
     ]);

$ctx = stream_context_create([
    'http' => [
        'timeout'       => 10,
        'ignore_errors' => true,
        'header'        => "User-Agent: HVACApp/1.0\r\n",
    ],
]);

$raw = @file_get_contents($url, false, $ctx);

if ($raw === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Could not reach Census API']);
    exit;
}

$data = json_decode($raw, true);
$matches = $data['result']['addressMatches'] ?? [];

if (empty($matches)) {
    echo json_encode(['error' => 'Address not found']);
    exit;
}

$counties = $matches[0]['geographies']['Counties'] ?? [];

if (empty($counties)) {
    echo json_encode(['error' => 'County data unavailable']);
    exit;
}

echo json_encode(['county' => $counties[0]['NAME']]);
