const SECRET_KEY = "LYORA_SECRET_2024";
const ADMIN_PASSWORD = "LyoraAdmin2024!";

const SUPABASE_URL = "https://zkasatfmcsiffjgpsdzj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprYXNhdGZtY3NpZmZqZ3BzZHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NzgyODUsImV4cCI6MjA3NjM1NDI4NX0.9JnTK17_hPjuZZa0BcL09CfB_1OzSm1AY0x9ff5OKrU";

async function fetchFromSupabase() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/whitelist?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) return { users: {} };
        
        const data = await response.json();
        const users = {};
        
        data.forEach(user => {
            users[user.username.toLowerCase()] = {
                username: user.username,
                discord: user.discord || 'Not provided',
                registered_at: user.registered_at,
                usage_count: user.usage_count || 0,
                last_active: user.last_active
            };
        });
        
        return { users };
    } catch (error) {
        return { users: {} };
    }
}

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
        
        console.log('Received:', input); // Debug
        
        const { action, secret, username, admin_password, discord } = input;
        
        if (secret !== SECRET_KEY) {
            return res.json({ success: false, message: "Invalid secret key" });
        }
        
        if (action === 'check') {
            if (!username) return res.json({ success: false, message: "Username required" });
            
            const whitelistData = await fetchFromSupabase();
            const user = whitelistData.users[username.toLowerCase()];
            
            if (!user) return res.json({ success: false, message: "User not whitelisted" });
            
            return res.json({ 
                success: true, 
                data: user, 
                message: "✅ WHITELISTED - Access granted" 
            });
        }
        
        if (action === 'register') {
            if (!username) return res.json({ success: false, message: "Username required" });
            
            const whitelistData = await fetchFromSupabase();
            if (whitelistData.users[username.toLowerCase()]) {
                return res.json({ success: false, message: "Username already registered" });
            }
            
            const insertData = {
                username: username,
                discord: discord || 'Not provided',
                registered_at: new Date().toISOString(),
                usage_count: 0,
                last_active: null
            };
            
            const response = await fetch(`${SUPABASE_URL}/rest/v1/whitelist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(insertData)
            });
            
            if (response.ok) {
                return res.json({ 
                    success: true, 
                    message: "✅ Registration successful!" 
                });
            } else {
                return res.json({ 
                    success: false, 
                    message: `Registration failed: ${response.status}` 
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
                users: users
            };
            
            return res.json({ 
                success: true, 
                data: stats, 
                message: "Admin stats" 
            });
        }
        
        return res.json({ success: false, message: "Unknown action: " + action });
        
    } catch (error) {
        return res.json({ success: false, message: "Server error: " + error.message });
    }
};
