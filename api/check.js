const fs = require('fs');
const path = require('path');

// Konfigurasi
const SECRET_KEY = "LYO-RPQS-5CWD-6D5J";
const ADMIN_PASSWORD = "KYL-DW3X-EGE4-2MTP!";
const DB_FILE = path.join(process.cwd(), 'whitelist.json');

// Helper functions
function initializeDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            users: {},
            settings: {
                secret: SECRET_KEY,
                auto_approve: true,
                created_at: new Date().toISOString()
            }
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    }
}

function readDatabase() {
    initializeDatabase();
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { users: {}, settings: {} };
    }
}

function saveDatabase(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function jsonResponse(success, data = null, message = "") {
    return {
        success,
        data,
        message,
        timestamp: new Date().toISOString()
    };
}

// Main handler
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json(jsonResponse(false, null, "Method not allowed"));
    }
    
    try {
        const input = req.body;
        
        if (!input) {
            return res.status(400).json(jsonResponse(false, null, "Invalid JSON input"));
        }
        
        const action = input.action || 'check';
        const secret = input.secret || '';
        const username = input.username ? input.username.toLowerCase().trim() : '';
        
        // Verifikasi secret key
        if (secret !== SECRET_KEY) {
            return res.status(401).json(jsonResponse(false, null, "Invalid secret key"));
        }
        
        const db = readDatabase();
        
        switch (action) {
            case 'check':
                if (!username) {
                    return res.status(400).json(jsonResponse(false, null, "Username is required"));
                }
                
                const user = db.users[username];
                
                if (!user) {
                    return res.status(404).json(jsonResponse(false, null, "User not whitelisted"));
                }
                
                if (user.status !== 'approved') {
                    return res.status(403).json(jsonResponse(false, null, "User pending approval"));
                }
                
                // Update last active
                db.users[username].last_active = new Date().toISOString();
                db.users[username].usage_count = (db.users[username].usage_count || 0) + 1;
                saveDatabase(db);
                
                return res.json(jsonResponse(true, {
                    username: user.username,
                    status: user.status,
                    discord: user.discord || 'Not provided',
                    registered_at: user.registered_at,
                    usage_count: db.users[username].usage_count
                }, "Access granted"));
                
            case 'register':
                if (!username) {
                    return res.status(400).json(jsonResponse(false, null, "Username is required"));
                }
                
                if (db.users[username]) {
                    return res.status(409).json(jsonResponse(false, null, "Username already registered"));
                }
                
                const userData = {
                    username: input.username,
                    discord: input.discord || 'Not provided',
                    registered_at: new Date().toISOString(),
                    status: db.settings.auto_approve ? 'approved' : 'pending',
                    last_active: null,
                    usage_count: 0
                };
                
                db.users[username] = userData;
                saveDatabase(db);
                
                return res.json(jsonResponse(true, userData, "Registration successful"));
                
            case 'admin_stats':
                const adminPass = input.admin_password || '';
                if (adminPass !== ADMIN_PASSWORD) {
                    return res.status(401).json(jsonResponse(false, null, "Invalid admin password"));
                }
                
                const users = db.users;
                const totalUsers = Object.keys(users).length;
                const approvedUsers = Object.values(users).filter(user => user.status === 'approved').length;
                const pendingUsers = Object.values(users).filter(user => user.status === 'pending').length;
                
                const stats = {
                    total_users: totalUsers,
                    approved_users: approvedUsers,
                    pending_users: pendingUsers,
                    users: users
                };
                
                return res.json(jsonResponse(true, stats, "Admin statistics"));
                
            default:
                return res.status(400).json(jsonResponse(false, null, "Unknown action"));
        }
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json(jsonResponse(false, null, "Internal server error"));
    }
};