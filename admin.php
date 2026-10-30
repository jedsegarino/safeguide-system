<?php
require 'config.php';
require_admin();

$action = $_GET['action'] ?? '';

function rows($result) {
    $out = [];
    while ($r = $result->fetch_assoc()) $out[] = $r;
    return $out;
}

if ($action === 'stats') {
    $count = fn($t) => (int)$GLOBALS['conn']->query("SELECT COUNT(*) c FROM $t")->fetch_assoc()['c'];
    respond([
        'success'    => true,
        'users'      => $count('users'),
        'guides'     => $count('guides'),
        'procedures' => $count('procedures'),
        'activity'   => rows($conn->query('SELECT message, created_at FROM activity_log ORDER BY id DESC LIMIT 6'))
    ]);
}

if ($action === 'users') {
    respond(['success' => true, 'data' => rows($conn->query('SELECT id, full_name, username, email, role FROM users ORDER BY id'))]);
}

if ($action === 'add_user') {
    $d = input();
    $name = trim($d['full_name'] ?? ''); $user = trim($d['username'] ?? '');
    $email = trim($d['email'] ?? ''); $pass = $d['password'] ?? '';
    $role = ($d['role'] ?? 'user') === 'admin' ? 'admin' : 'user';
    if ($name === '' || $user === '' || $email === '' || strlen($pass) < 6) {
        respond(['success' => false, 'message' => 'Complete all fields (password 6+ characters).'], 400);
    }
    $s = $conn->prepare('SELECT id FROM users WHERE username = ? OR email = ?');
    $s->bind_param('ss', $user, $email);
    $s->execute();
    if ($s->get_result()->num_rows > 0) respond(['success' => false, 'message' => 'Username or email is already taken.'], 409);
    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $s = $conn->prepare('INSERT INTO users (full_name, username, email, password, role) VALUES (?,?,?,?,?)');
    $s->bind_param('sssss', $name, $user, $email, $hash, $role);
    $s->execute();
    log_activity($conn, "Admin added user: $user");
    respond(['success' => true, 'message' => 'User added.']);
}

if ($action === 'delete_user') {
    $id = (int)(input()['id'] ?? 0);
    if ($id === (int)$_SESSION['user_id']) respond(['success' => false, 'message' => 'You cannot delete your own account.'], 400);
    $s = $conn->prepare('DELETE FROM users WHERE id = ?');
    $s->bind_param('i', $id);
    $s->execute();
    log_activity($conn, "Admin deleted user #$id");
    respond(['success' => true]);
}

if ($action === 'toggle_role') {
    $id = (int)(input()['id'] ?? 0);
    if ($id === (int)$_SESSION['user_id']) respond(['success' => false, 'message' => 'You cannot change your own role.'], 400);
    $conn->query("UPDATE users SET role = IF(role='admin','user','admin') WHERE id = $id");
    respond(['success' => true]);
}

if ($action === 'guides') {
    respond(['success' => true, 'data' => rows($conn->query('SELECT id, title, category FROM guides ORDER BY id'))]);
}

if ($action === 'add_guide') {
    $d = input();
    $title = trim($d['title'] ?? ''); $cat = trim($d['category'] ?? '');
    $desc = trim($d['description'] ?? ''); $steps = trim($d['steps'] ?? '');
    $warn = trim($d['warning'] ?? '');
    if ($title === '' || $cat === '' || $steps === '') respond(['success' => false, 'message' => 'Title, category and steps are required.'], 400);
    $s = $conn->prepare('INSERT INTO guides (title, category, description, steps, warning) VALUES (?,?,?,?,?)');
    $s->bind_param('sssss', $title, $cat, $desc, $steps, $warn);
    $s->execute();
    log_activity($conn, "First aid guide added: $title");
    respond(['success' => true, 'message' => 'Guide saved.']);
}

if ($action === 'delete_guide') {
    $id = (int)(input()['id'] ?? 0);
    $s = $conn->prepare('DELETE FROM guides WHERE id = ?');
    $s->bind_param('i', $id);
    $s->execute();
    log_activity($conn, "First aid guide #$id deleted");
    respond(['success' => true]);
}

if ($action === 'procedures') {
    respond(['success' => true, 'data' => rows($conn->query('SELECT id, title FROM procedures ORDER BY id'))]);
}

if ($action === 'add_procedure') {
    $d = input();
    $title = trim($d['title'] ?? '');
    $b = trim($d['before_steps'] ?? ''); $du = trim($d['during_steps'] ?? ''); $a = trim($d['after_steps'] ?? '');
    if ($title === '') respond(['success' => false, 'message' => 'Title is required.'], 400);
    $s = $conn->prepare('INSERT INTO procedures (title, before_steps, during_steps, after_steps) VALUES (?,?,?,?)');
    $s->bind_param('ssss', $title, $b, $du, $a);
    $s->execute();
    log_activity($conn, "Emergency procedure added: $title");
    respond(['success' => true, 'message' => 'Procedure saved.']);
}

if ($action === 'delete_procedure') {
    $id = (int)(input()['id'] ?? 0);
    $s = $conn->prepare('DELETE FROM procedures WHERE id = ?');
    $s->bind_param('i', $id);
    $s->execute();
    respond(['success' => true]);
}

respond(['success' => false, 'message' => 'Unknown action.'], 400);