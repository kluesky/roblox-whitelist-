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
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal'
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, options);
        
        if (response.status === 409) {
            return { error: 'ALREADY_EXISTS' };
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            return { error: `HTTP ${response.status}: ${errorText}` };
        }
        
        if (method === 'POST' || method === 'PATCH') {
            return { success: true };
        }
        
        return await response.json();
    } catch (error) {
        return { error: error.message };
    }
}

async function fetchFromSupabase() {
    try {
        const data = await supabaseRequest('whitelist?select=*');
        
        if (data && data.error) {
            return { users: {}, settings: { auto_approve: true } };
        }
        
        const users = {};
        if (data && Array.isArray(data)) {
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
        }
        
        return { users, settings: { auto_approve: true } };
    } catch (error) {
        return { users: {}, settings: { auto_approve: true } };
    }
}

async function registerToSupabase(userData) {
    try {
        const result = await supabaseRequest('whitelist', 'POST', {
            username: userData.username,
            discord: userData.discord || 'Not provided',
            status: 'approved',
            registered_at: new Date().toISOString(),
            usage_count: 0,
            last_active: null
        });
        
        return !result.error;
    } catch (error) {
        return false;
    }
}

// ... rest of the functions sama

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: "Method not allowed" });
    
    try {
        let body = '';
        for await (const chunk of req) body += chunk;
        const input = JSON.parse(body);
        
        const { action, secret, username, admin_password, discord } = input;
        
        if (secret !== SECRET_KEY) {
            return res.json({ success: false, message: "Invalid secret key" });
        }
        
        if (action === 'register') {
            if (!username) return res.json({ success: false, message: "Username required" });
            
            const whitelistData = await fetchFromSupabase();
            const userKey = username.toLowerCase();
            
            if (whitelistData.users[userKey]) {
                return res.json({ success: false, message: "Username already registered" });
            }
            
            const userData = {
                username: username,
                discord: discord || 'Not provided'
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
                    message: "❌ Database error - check Supabase permissions" 
                });
            }
        }
        
        // ... rest of actions
        
    } catch (error) {
        return res.json({ success: false, message: "Server error" });
    }
};
