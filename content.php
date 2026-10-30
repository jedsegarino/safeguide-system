<?php
require 'config.php';
require_login();

$uid    = (int)$_SESSION['user_id'];
$action = $_GET['action'] ?? '';

function rows($result) {
    $out = [];
    while ($r = $result->fetch_assoc()) $out[] = $r;
    return $out;
}

if ($action === 'guides') {
    $s = $conn->prepare('SELECT g.id, g.title, g.category, g.description,
        (SELECT COUNT(*) FROM saved_guides sg WHERE sg.guide_id = g.id AND sg.user_id = ?) AS saved
        FROM guides g ORDER BY g.id');
    $s->bind_param('i', $uid);
    $s->execute();
    respond(['success' => true, 'data' => rows($s->get_result())]);
}

if ($action === 'guide') {
    $id = (int)($_GET['id'] ?? 0);
    $s = $conn->prepare('SELECT g.*,
        (SELECT COUNT(*) FROM saved_guides sg WHERE sg.guide_id = g.id AND sg.user_id = ?) AS saved
        FROM guides g WHERE g.id = ?');
    $s->bind_param('ii', $uid, $id);
    $s->execute();
    $g = $s->get_result()->fetch_assoc();
    if (!$g) respond(['success' => false, 'message' => 'Guide not found.'], 404);
    respond(['success' => true, 'data' => $g]);
}

if ($action === 'procedures') {
    respond(['success' => true, 'data' => rows($conn->query('SELECT * FROM procedures ORDER BY id'))]);
}

if ($action === 'hotlines') {
    respond(['success' => true, 'data' => rows($conn->query('SELECT * FROM hotlines ORDER BY id'))]);
}

if ($action === 'checklist') {
    $s = $conn->prepare('SELECT i.id, i.label, COALESCE(u.checked, 0) AS checked
        FROM checklist_items i
        LEFT JOIN user_checklist u ON u.item_id = i.id AND u.user_id = ?
        ORDER BY i.id');
    $s->bind_param('i', $uid);
    $s->execute();
    respond(['success' => true, 'data' => rows($s->get_result())]);
}

if ($action === 'save_checklist') {
    $d = input();
    $checked = array_map('intval', $d['checked'] ?? []);
    $all = rows($conn->query('SELECT id FROM checklist_items'));
    $s = $conn->prepare('INSERT INTO user_checklist (user_id, item_id, checked) VALUES (?,?,?)
                         ON DUPLICATE KEY UPDATE checked = VALUES(checked)');
    foreach ($all as $item) {
        $iid = (int)$item['id'];
        $val = in_array($iid, $checked, true) ? 1 : 0;
        $s->bind_param('iii', $uid, $iid, $val);
        $s->execute();
    }
    respond(['success' => true, 'message' => 'Checklist saved.']);
}

if ($action === 'saved') {
    $s = $conn->prepare('SELECT g.id, g.title, g.category, g.description, 1 AS saved
        FROM saved_guides sg JOIN guides g ON g.id = sg.guide_id
        WHERE sg.user_id = ? ORDER BY g.id');
    $s->bind_param('i', $uid);
    $s->execute();
    respond(['success' => true, 'data' => rows($s->get_result())]);
}

if ($action === 'toggle_save') {
    $d = input();
    $gid = (int)($d['guide_id'] ?? 0);
    $s = $conn->prepare('SELECT 1 FROM saved_guides WHERE user_id = ? AND guide_id = ?');
    $s->bind_param('ii', $uid, $gid);
    $s->execute();
    if ($s->get_result()->num_rows > 0) {
        $s = $conn->prepare('DELETE FROM saved_guides WHERE user_id = ? AND guide_id = ?');
        $saved = false;
    } else {
        $s = $conn->prepare('INSERT INTO saved_guides (user_id, guide_id) VALUES (?,?)');
        $saved = true;
    }
    $s->bind_param('ii', $uid, $gid);
    $s->execute();
    respond(['success' => true, 'saved' => $saved]);
}

if ($action === 'profile') {
    $s = $conn->prepare('SELECT full_name, username, email, role, created_at FROM users WHERE id = ?');
    $s->bind_param('i', $uid);
    $s->execute();
    respond(['success' => true, 'data' => $s->get_result()->fetch_assoc()]);
}

respond(['success' => false, 'message' => 'Unknown action.'], 400);