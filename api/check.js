const SECRET_KEY = "LYO-RPQS-5CWD-6D5J";
const ADMIN_PASSWORD = "KYL-DW3X-EGE4-2MTP";

const SUPABASE_URL = "https://zkasatfmcsiffjgpsdzj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprYXNhdGZtY3NpZmZqZ3BzZHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NzgyODUsImV4cCI6MjA3NjM1NDI4NX0.9JnTK17_hPjuZZa0BcL09CfB_1OzSm1AY0x9ff5OKrU";

async function supabaseRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('Supabase error:', response.status, errorText);
            return null;
        }
        
        if (method === 'POST' || method === 'PATCH') {
            return true;
        }
        
        return await response.json();
    } catch (error) {
        console.error('Supabase request failed:', error);
        return null;
    }
}

async function fetchFromSupabase() {
    try {
        const data = await supabaseRequest('whitelist?select=*');
        
        if (!data) {
            return { users: {}, settings: { auto_approve: true } };
        }
        
        const users = {};
        data.forEach(user => {
            users[user.username.toLowerCase()] = {
                username: user.username,
                discord: user.discord || 'Not provided',
                status: user.status || 'approved',
                registered_at: user.registered_at || new Date().toISOString(),
                usage_count: user.usage_count || 0,
                last_active: user.last_active || null
            };
        });
        
        return { users, settings: { auto_approve: true } };
    } catch (error) {
        return { users: {}, settings: { auto_approve: true } };
    }
}

async function registerToSupabase(userData) {
    try {
        const success = await supabaseRequest('whitelist', 'POST', {
            username: userData.username,
            discord: userData.discord,
            status: 'approved',
            registered_at: new Date().toISOString(),
            usage_count: 0,
            last_active: null
        });
        return success;
    } catch (error) {
        return false;
    }
}

async function updateUsageInSupabase(username) {
    try {
        const success = await supabaseRequest(`whitelist?username=eq.${encodeURIComponent(username)}`, 'PATCH', {
            last_active: new Date().toISOString()
        });
        return success;
    } catch (error) {
        return false;
    }
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: "Method not allowed" });
    }
    
    try {
        let body = '';
        for await (const chunk of req) {
            body += chunk;
        }
        const input = JSON.parse(body);
        
        const { action, secret, username, admin_password, discord } = input;
        
        if (secret !== SECRET_KEY) {
            return res.json({ success: false, message: "Invalid secret key" });
        }
        
        if (action === 'check') {
            if (!username) {
                return res.json({ success: false, message: "Username required" });
            }
            
            const whitelistData = await fetchFromSupabase();
            const userKey = username.toLowerCase();
            const user = whitelistData.users[userKey];
            
            if (!user) {
                return res.json({ success: false, message: "User not whitelisted" });
            }
            
            if (user.status !== 'approved') {
                return res.json({ success: false, message: "User pending approval" });
            }
            
            await updateUsageInSupabase(username);
            
            return res.json({ 
                success: true, 
                data: user, 
                message: "Access granted" 
            });
        }
        
        if (action === 'register') {
            if (!username) {
                return res.json({ success: false, message: "Username required" });
            }
            
            const whitelistData = await fetchFromSupabase();
            const userKey = username.toLowerCase();
            
            if (whitelistData.users[userKey]) {
                return res.json({ success: false, message: "Username already registered" });
            }
            
            const userData = {
                username: username,
                discord: discord || 'Not provided',
                status: 'approved',
                registered_at: new Date().toISOString(),
                usage_count: 0,
                last_active: null
            };
            
            const registered = await registerToSupabase(userData);
            
            if (registered) {
                return res.json({ 
                    success: true, 
                    data: userData, 
                    message: "✅ Registration successful!" 
                });
            } else {
                return res.json({ 
                    success: false, 
                    message: "Registration failed - please try again" 
                });
            }
        }
        
        if (action === 'admin_stats') {
            if (admin_password !== ADMIN_PASSWORD) {
                return res.json({ success: false, message: "Invalid admin password" });
            }
            
            const whitelistData = await fetchFromSupabase();
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
        
        return res.json({ success: false, message: "Unknown action" });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.json({ success: false, message: "Server error" });
    }
};
