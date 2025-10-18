const fs = require('fs');
const path = require('path');

const SECRET_KEY = "LYO-RPQS-5CWD-6D5J";
const ADMIN_PASSWORD = "KYL-DW3X-EGE4-2MTP!";

// Pastikan path yang benar untuk Vercel
const DB_FILE = path.join(process.cwd(), 'whitelist.json');

function initializeDatabase() {
    try {
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
            console.log('Database initialized');
        }
    } catch (error) {
        console.error('Init DB error:', error);
    }
}

function readDatabase() {
    try {
        initializeDatabase();
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Read DB error:', error);
        return { users: {}, settings: { auto_approve: true } };
    }
}

function saveDatabase(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Save DB error:', error);
        return false;
    }
}

module.exports = async (req, res) => {
    console.log('API Called:', req.method, req.url);
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            message: "Method not allowed" 
        });
    }
    
    try {
        let body = '';
        for await (const chunk of req) {
            body += chunk;
        }
        const input = JSON.parse(body);
        
        console.log('Received:', input.action, input.username);
        
        const { action, secret, username, admin_password, discord } = input;
        
        if (secret !== SECRET_KEY) {
            return res.status(401).json({ 
                success: false, 
                message: "Invalid secret key" 
            });
        }
        
        const db = readDatabase();
        
        if (action === 'check') {
            if (!username) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Username required" 
                });
            }
            
            const userKey = username.toLowerCase();
            const user = db.users[userKey];
            
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: "User not whitelisted" 
                });
            }
            
            if (user.status !== 'approved') {
                return res.status(403).json({ 
                    success: false, 
                    message: "User pending approval" 
                });
            }
            
            // Update usage
            db.users[userKey].last_active = new Date().toISOString();
            db.users[userKey].usage_count = (db.users[userKey].usage_count || 0) + 1;
            
            if (saveDatabase(db)) {
                return res.json({
                    success: true,
                    data: user,
                    message: "Access granted"
                });
            } else {
                return res.status(500).json({ 
                    success: false, 
                    message: "Database error" 
                });
            }
        }
        
        if (action === 'register') {
            if (!username) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Username required" 
                });
            }
            
            const userKey = username.toLowerCase();
            if (db.users[userKey]) {
                return res.status(409).json({ 
                    success: false, 
                    message: "Username already registered" 
                });
            }
            
            const userData = {
                username: username,
                discord: discord || 'Not provided',
                registered_at: new Date().toISOString(),
                status: db.settings?.auto_approve ? 'approved' : 'pending',
                last_active: null,
                usage_count: 0
            };
            
            db.users[userKey] = userData;
            
            if (saveDatabase(db)) {
                return res.json({
                    success: true,
                    data: userData,
                    message: "Registration successful"
                });
            } else {
                return res.status(500).json({ 
                    success: false, 
                    message: "Failed to save registration" 
                });
            }
        }
        
        if (action === 'admin_stats') {
            if (admin_password !== ADMIN_PASSWORD) {
                return res.status(401).json({ 
                    success: false, 
                    message: "Invalid admin password" 
                });
            }
            
            const users = db.users;
            const stats = {
                total_users: Object.keys(users).length,
                approved_users: Object.values(users).filter(u => u.status === 'approved').length,
                pending_users: Object.values(users).filter(u => u.status === 'pending').length,
                users: users
            };
            
            return res.json({ 
                success: true, 
                data: stats, 
                message: "Admin stats" 
            });
        }
        
        return res.status(400).json({ 
            success: false, 
            message: "Unknown action" 
        });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error: " + error.message 
        });
    }
};