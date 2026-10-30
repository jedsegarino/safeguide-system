<?php
// XAMPP default: user "root", walang password
session_start();
header('Content-Type: application/json; charset=utf-8');

$conn = new mysqli('localhost', 'root', '', 'safeguide_db');
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    exit;
}
$conn->set_charset('utf8mb4');

function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function input() {
    $json = json_decode(file_get_contents('php://input'), true);
    return is_array($json) ? $json : $_POST;
}

function require_login() {
    if (empty($_SESSION['user_id'])) {
        respond(['success' => false, 'message' => 'Please log in first.'], 401);
    }
}

function require_admin() {
    require_login();
    if ($_SESSION['role'] !== 'admin') {
        respond(['success' => false, 'message' => 'Admins only.'], 403);
    }
}

function log_activity($conn, $msg) {
    $s = $conn->prepare('INSERT INTO activity_log (message) VALUES (?)');
    $s->bind_param('s', $msg);
    $s->execute();
}