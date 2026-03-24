<?php
ob_start();
require_once 'config.php';
ob_end_clean();
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {

    case 'GET':
        try {
            if (isset($_GET['id'])) {
                $id = (int)$_GET['id'];
                $stmt = $db->prepare('SELECT * FROM jobs WHERE id = ?');
                $stmt->execute([$id]);
                $row = $stmt->fetch();
                if ($row) {
                    $row['job_data'] = is_string($row['job_data'])
                        ? (json_decode($row['job_data'], true) ?? [])
                        : ($row['job_data'] ?? []);
                    echo json_encode($row);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Job not found']);
                }
            } else {
                $date = $_GET['date'] ?? date('Y-m-d');

                // Auto-delete jobs from before today
                $yesterday = date('Y-m-d', strtotime('-1 day'));
                $cleanup = $db->prepare('DELETE FROM jobs WHERE job_date < ?');
                $cleanup->execute([$yesterday]);

                $stmt = $db->prepare('SELECT * FROM jobs WHERE job_date = ? ORDER BY sort_order, id');
                $stmt->execute([$date]);
                $jobs = [];
                while ($row = $stmt->fetch()) {
                    $row['job_data'] = is_string($row['job_data'])
                        ? (json_decode($row['job_data'], true) ?? [])
                        : ($row['job_data'] ?? []);
                    $jobs[] = $row;
                }
                echo json_encode($jobs);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'POST':
        try {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];

            $job_date    = $input['job_date']      ?? date('Y-m-d');
            $job_type    = $input['job_type']      ?? '';
            $cust_name   = $input['customer_name'] ?? '';
            $addr1       = $input['address_line1'] ?? '';
            $addr2       = $input['address_line2'] ?? '';
            $phone       = $input['phone']         ?? '';
            $system_type = $input['system_type']   ?? null;
            $job_data    = json_encode($input['job_data'] ?? []);
            $status      = $input['status']        ?? 'pending';

            $stmt = $db->prepare(
                'INSERT INTO jobs (job_date, job_type, customer_name, address_line1, address_line2, phone, system_type, job_data, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?) RETURNING id'
            );
            $stmt->execute([$job_date, $job_type, $cust_name, $addr1, $addr2, $phone, $system_type, $job_data, $status]);
            $row = $stmt->fetch();
            echo json_encode(['id' => $row['id'], 'success' => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'PUT':
        try {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $id = (int)($input['id'] ?? 0);

            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing id']);
                break;
            }

            // Status-only patch
            if (isset($input['status']) && count($input) === 2) {
                $stmt = $db->prepare('UPDATE jobs SET status = ? WHERE id = ?');
                $stmt->execute([$input['status'], $id]);
            } else {
                $job_date    = $input['job_date']      ?? date('Y-m-d');
                $job_type    = $input['job_type']      ?? '';
                $cust_name   = $input['customer_name'] ?? '';
                $addr1       = $input['address_line1'] ?? '';
                $addr2       = $input['address_line2'] ?? '';
                $phone       = $input['phone']         ?? '';
                $system_type = $input['system_type']   ?? null;
                $job_data    = json_encode($input['job_data'] ?? []);
                $status      = $input['status']        ?? 'pending';

                $stmt = $db->prepare(
                    'UPDATE jobs SET job_date=?, job_type=?, customer_name=?, address_line1=?, address_line2=?,
                     phone=?, system_type=?, job_data=?::jsonb, status=? WHERE id=?'
                );
                $stmt->execute([$job_date, $job_type, $cust_name, $addr1, $addr2, $phone, $system_type, $job_data, $status, $id]);
            }

            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        try {
            $id = (int)($_GET['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing id']);
                break;
            }
            $stmt = $db->prepare('DELETE FROM jobs WHERE id = ?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
