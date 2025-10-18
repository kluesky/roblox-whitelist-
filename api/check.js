const SECRET_KEY = "LYO-RPQS-5CWD-6D5J";
const ADMIN_PASSWORD = "KYL-DW3X-EGE4-2MTP";

// Pakai in-memory storage (untuk sementara)
let whitelistData = {
    users: {},
    settings: {
        auto_approve: true
    }
};

// Simulate some initial data for testing
whitelistData.users['testuser'] = {
    username: 'nanaaaaaaaa_6306',
    discord: 'Kyluesku#342',
    registered_at: new Date().toISOString(),
    status: 'approved',
    last_active: null,
    usage_count: 0
};

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
        
        console.log('Received action:', input.action);
        
        const { action, secret, username, admin_password, discord } = input;
        
        if (secret !== SECRET_KEY) {
            return res.json({ 
                success: false, 
                message: "Invalid secret key" 
            });
        }
        
        if (action === 'check') {
            if (!username) {
                return res.json({ 
                    success: false, 
                    message: "Username required" 
                });
            }
            
            const userKey = username.toLowerCase();
            const user = whitelistData.users[userKey];
            
            if (!user) {
                return res.json({ 
                    success: false, 
                    message: "User not whitelisted" 
                });
            }
            
            if (user.status !== 'approved') {
                return res.json({ 
                    success: false, 
                    message: "User pending approval" 
                });
            }
            
            // Update usage
            whitelistData.users[userKey].last_active = new Date().toISOString();
            whitelistData.users[userKey].usage_count = (whitelistData.users[userKey].usage_count || 0) + 1;
            
            return res.json({
                success: true,
                data: user,
                message: "Access granted"
            });
        }
        
        if (action === 'register') {
            if (!username) {
                return res.json({ 
                    success: false, 
                    message: "Username required" 
                });
            }
            
            const userKey = username.toLowerCase();
            if (whitelistData.users[userKey]) {
                return res.json({ 
                    success: false, 
                    message: "Username already registered" 
                });
            }
            
            const userData = {
                username: username,
                discord: discord || 'Not provided',
                registered_at: new Date().toISOString(),
                status: whitelistData.settings.auto_approve ? 'approved' : 'pending',
                last_active: null,
                usage_count: 0
            };
            
            whitelistData.users[userKey] = userData;
            
            return res.json({
                success: true,
                data: userData,
                message: "Registration successful"
            });
        }
        
        if (action === 'admin_stats') {
            if (admin_password !== ADMIN_PASSWORD) {
                return res.json({ 
                    success: false, 
                    message: "Invalid admin password" 
                });
            }
            
            const users = whitelistData.users;
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
        
        return res.json({ 
            success: false, 
            message: "Unknown action" 
        });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.json({ 
            success: false, 
            message: "Server error: " + error.message 
        });
    }
};
