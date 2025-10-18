<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Konfigurasi
$SECRET_KEY = "LYO-RPQS-5CWD-6D5J";
$ADMIN_PASSWORD = "KYL-DW3X-EGE4-2MTP";

// File database
$DB_FILE = 'whitelist.json';

// Inisialisasi database jika belum ada
function initializeDatabase() {
    global $DB_FILE;
    if (!file_exists($DB_FILE)) {
        $initialData = [
            'users' => [],
            'settings' => [
                'secret' => $GLOBALS['SECRET_KEY'],
                'auto_approve' => true,
                'created_at' => date('c')
            ]
        ];
        file_put_contents($DB_FILE, json_encode($initialData, JSON_PRETTY_PRINT));
    }
}

// Baca database
function readDatabase() {
    global $DB_FILE;
    initializeDatabase();
    $data = json_decode(file_get_contents($DB_FILE), true);
    return $data ?: ['users' => [], 'settings' => []];
}

// Simpan ke database
function saveDatabase($data) {
    global $DB_FILE;
    file_put_contents($DB_FILE, json_encode($data, JSON_PRETTY_PRINT));
}

// Generate response
function jsonResponse($success, $data = null, $message = "") {
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('c')
    ];
    echo json_encode($response);
    exit;
}

// Handle POST request
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        jsonResponse(false, null, "Invalid JSON input");
    }
    
    $action = $input['action'] ?? 'check';
    $secret = $input['secret'] ?? '';
    $username = isset($input['username']) ? strtolower(trim($input['username'])) : '';
    
    // Verifikasi secret key
    if ($secret !== $SECRET_KEY) {
        jsonResponse(false, null, "Invalid secret key");
    }
    
    $db = readDatabase();
    
    switch ($action) {
        case 'check':
            // Cek status whitelist
            if (empty($username)) {
                jsonResponse(false, null, "Username is required");
            }
            
            $user = $db['users'][$username] ?? null;
            
            if (!$user) {
                jsonResponse(false, null, "User not whitelisted");
            }
            
            if ($user['status'] !== 'approved') {
                jsonResponse(false, null, "User pending approval");
            }
            
            // Update last active
            $db['users'][$username]['last_active'] = date('c');
            $db['users'][$username]['usage_count'] = ($db['users'][$username]['usage_count'] ?? 0) + 1;
            saveDatabase($db);
            
            jsonResponse(true, [
                'username' => $user['username'],
                'status' => $user['status'],
                'discord' => $user['discord'] ?? 'Not provided',
                'registered_at' => $user['registered_at'],
                'usage_count' => $db['users'][$username]['usage_count']
            ], "Access granted");
            break;
            
        case 'register':
            // Registrasi user baru
            if (empty($username)) {
                jsonResponse(false, null, "Username is required");
            }
            
            if (isset($db['users'][$username])) {
                jsonResponse(false, null, "Username already registered");
            }
            
            $userData = [
                'username' => $input['username'],
                'discord' => $input['discord'] ?? 'Not provided',
                'registered_at' => date('c'),
                'status' => $db['settings']['auto_approve'] ? 'approved' : 'pending',
                'last_active' => null,
                'usage_count' => 0
            ];
            
            $db['users'][$username] = $userData;
            saveDatabase($db);
            
            jsonResponse(true, $userData, "Registration successful");
            break;
            
        case 'admin_stats':
            // Admin: Get statistics
            $adminPass = $input['admin_password'] ?? '';
            if ($adminPass !== $ADMIN_PASSWORD) {
                jsonResponse(false, null, "Invalid admin password");
            }
            
            $users = $db['users'];
            $totalUsers = count($users);
            $approvedUsers = count(array_filter($users, function($user) {
                return $user['status'] === 'approved';
            }));
            $pendingUsers = count(array_filter($users, function($user) {
                return $user['status'] === 'pending';
            }));
            
            $stats = [
                'total_users' => $totalUsers,
                'approved_users' => $approvedUsers,
                'pending_users' => $pendingUsers,
                'users' => $users
            ];
            
            jsonResponse(true, $stats, "Admin statistics");
            break;
            
        default:
            jsonResponse(false, null, "Unknown action");
    }
} else {
    jsonResponse(false, null, "Method not allowed");
}
?>