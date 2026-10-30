<?php
require 'config.php';

$action = $_GET['action'] ?? '';

if ($action === 'register') {
    $d = input();
    $name  = trim($d['full_name'] ?? '');
    $user  = trim($d['username'] ?? '');
    $email = trim($d['email'] ?? '');
    $pass  = $d['password'] ?? '';
    $conf  = $d['confirm_password'] ?? '';

    if ($name === '' || $user === '' || $email === '' || $pass === '') {
        respond(['success' => false, 'message' => 'Please fill in all fields.'], 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(['success' => false, 'message' => 'Enter a valid email address.'], 400);
    }
    if (strlen($pass) < 6) {
        respond(['success' => false, 'message' => 'Password must be at least 6 characters.'], 400);
    }
    if ($pass !== $conf) {
        respond(['success' => false, 'message' => 'Passwords do not match.'], 400);
    }

    $s = $conn->prepare('SELECT id FROM users WHERE username = ? OR email = ?');
    $s->bind_param('ss', $user, $email);
    $s->execute();
    if ($s->get_result()->num_rows > 0) {
        respond(['success' => false, 'message' => 'Username or email is already taken.'], 409);
    }

    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $s = $conn->prepare("INSERT INTO users (full_name, username, email, password, role) VALUES (?,?,?,?, 'user')");
    $s->bind_param('ssss', $name, $user, $email, $hash);
    $s->execute();
    log_activity($conn, "New user registered: $email");
    respond(['success' => true, 'message' => 'Account created. You can now log in.']);
}

if ($action === 'login') {
    $d = input();
    $user = trim($d['username'] ?? '');
    $pass = $d['password'] ?? '';

    $s = $conn->prepare('SELECT id, full_name, username, password, role FROM users WHERE username = ?');
    $s->bind_param('s', $user);
    $s->execute();
    $row = $s->get_result()->fetch_assoc();

    if (!$row || !password_verify($pass, $row['password'])) {
        respond(['success' => false, 'message' => 'Wrong username or password.'], 401);
    }

    session_regenerate_id(true);
    $_SESSION['user_id']   = $row['id'];
    $_SESSION['full_name'] = $row['full_name'];
    $_SESSION['username']  = $row['username'];
    $_SESSION['role']      = $row['role'];
    log_activity($conn, "{$row['username']} logged in");

    respond([
        'success'  => true,
        'role'     => $row['role'],
        'redirect' => $row['role'] === 'admin' ? 'admin.html' : 'dashboard.html'
    ]);
}

if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
    respond(['success' => true]);
}

if ($action === 'me') {
    if (empty($_SESSION['user_id'])) {
        respond(['success' => false, 'logged_in' => false], 401);
    }
    respond([
        'success'   => true,
        'logged_in' => true,
        'id'        => $_SESSION['user_id'],
        'full_name' => $_SESSION['full_name'],
        'username'  => $_SESSION['username'],
        'role'      => $_SESSION['role']
    ]);
}

respond(['success' => false, 'message' => 'Unknown action.'], 400);