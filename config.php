<?php
// Prevent direct HTTP access
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    http_response_code(403);
    exit;
}

function getDB(): PDO {
    static $conn = null;
    if ($conn === null) {
        $host = getenv('DB_HOST') ?: 'db.vaohzyyphdcdzavzpyns.supabase.co';
        $user = getenv('DB_USER') ?: 'postgres';
        $pass = getenv('DB_PASSWORD') ?: '';
        $name = getenv('DB_NAME') ?: 'postgres';

        try {
            $conn = new PDO(
                "pgsql:host={$host};port=5432;dbname={$name};sslmode=require;application_name=hvacapp",
                $user,
                $pass,
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_TIMEOUT            => 10,
                ]
            );
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            die(json_encode(['error' => 'Database connection failed']));
        }
    }
    return $conn;
}
