<?php
ob_start();
/**
 * Tax rates API
 * GET  ?county=...   → { rate: 8.5 }
 * POST { county, rate } → saves/updates rate
 */
require_once 'config.php';
ob_end_clean();
header('Content-Type: application/json; charset=utf-8');

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $county = trim($_GET['county'] ?? '');
        if (!$county) {
            http_response_code(400);
            echo json_encode(['error' => 'county required']);
            exit;
        }
        $stmt = $db->prepare('SELECT rate FROM tax_rates WHERE county = ?');
        $stmt->execute([$county]);
        $row = $stmt->fetch();
        echo json_encode(['rate' => $row ? (float)$row['rate'] : null]);

    } elseif ($method === 'POST') {
        $input  = json_decode(file_get_contents('php://input'), true) ?? [];
        $county = trim($input['county'] ?? '');
        $rate   = (float)($input['rate'] ?? 0);
        if (!$county || $rate <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'county and rate required']);
            exit;
        }
        $stmt = $db->prepare(
            'INSERT INTO tax_rates (county, rate) VALUES (?, ?)
             ON CONFLICT (county) DO UPDATE SET rate = EXCLUDED.rate, updated_at = NOW()'
        );
        $stmt->execute([$county, $rate]);
        echo json_encode(['success' => true]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
