const SECRET_KEY = "LYORA_SECRET_2024";
const ADMIN_PASSWORD = "LyoraAdmin2024!";
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1423615242428219485/l1t2uH19b3fFasWFucddPqSuGwjOWuEoobizwN58kQ-HJsCS-urKqE3wMgUOkl9VHgNu";

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
        
        if (data && Array.isArray(data)) {
            data.forEach(user => {
                if (user && user.username) {
                    users[user.username.toLowerCase()] = {
                        username: user.username,
                        discord: user.discord || 'Not provided',
                        registered_at: user.registered_at,
                        usage_count: user.usage_count || 0,
                        last_active: user.last_active
                    };
                }
            });
        }
        
        return { users };
    } catch (error) {
        return { users: {} };
    }
}

async function updateUsageInSupabase(username) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/whitelist?username=eq.${encodeURIComponent(username)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                last_active: new Date().toISOString()
            })
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

async function sendRegistrationNotification(username, discord) {
    try {
        const response = await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: `📝 **NEW REGISTRATION**`,
                embeds: [{
                    title: "🎭 User Mendaftar Whitelist",
                    color: 3447003,
                    fields: [
                        {
                            name: "👤 Username",
                            value: username,
                            inline: true
                        },
                        {
                            name: "💬 Discord",
                            value: discord || 'Not provided',
                            inline: true
                        },
                        {
                            name: "⏰ Waktu",
                            value: new Date().toLocaleString('id-ID'),
                            inline: false
                        }
                    ],
                    description: "**Admin:** Silakan tambahkan username ini ke GitHub Raw whitelist",
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: "Lyora Whitelist System"
                    }
                }]
            })
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    try {
        let input = {};
        
        if (req.method === 'GET') {
            input = req.query;
        } else if (req.method === 'POST') {
            let body = '';
            for await (const chunk of req) body += chunk;
            input = JSON.parse(body);
        } else {
            return res.status(405).json({ success: false, message: "Method not allowed" });
        }
        
        const { action, secret, username, admin_password, discord } = input;
        
        if (secret !== SECRET_KEY) {
            return res.json({ success: false, message: "Invalid secret key" });
        }
        
        if (action === 'check') {
            if (!username) return res.json({ success: false, message: "Username required" });
            
            const whitelistData = await fetchFromSupabase();
            const userKey = username.toLowerCase();
            const user = whitelistData.users[userKey];
            
            if (!user) {
                return res.json({ success: false, message: "User not whitelisted" });
            }
            
            await updateUsageInSupabase(username);
            
            return res.json({ 
                success: true, 
                data: {
                    username: user.username,
                    discord: user.discord,
                    status: "APPROVED",
                    registered_at: user.registered_at,
                    usage_count: user.usage_count
                },
                message: "✅ WHITELISTED - Access granted" 
            });
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
                discord: discord || 'Not provided',
                status: 'APPROVED',
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
                body: JSON.stringify({
                    username: userData.username,
                    discord: userData.discord,
                    registered_at: userData.registered_at,
                    usage_count: userData.usage_count,
                    last_active: userData.last_active
                })
            });
            
            if (response.ok) {
                // Kirim notifikasi ke Discord
                await sendRegistrationNotification(username, discord);
                
                return res.json({ 
                    success: true, 
                    data: userData,
                    message: "✅ Registration successful! Admin will review your request." 
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
            const userList = Object.values(users).map(user => ({
                username: user.username,
                discord: user.discord,
                registered_at: user.registered_at,
                usage_count: user.usage_count,
                last_active: user.last_active
            }));
            
            const stats = {
                total_users: Object.keys(users).length,
                users: userList
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
