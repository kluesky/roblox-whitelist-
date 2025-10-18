const SECRET_KEY = "LYO-RPQS-5CWD-6D5J";
const ADMIN_PASSWORD = "KYL-DW3X-EGE4-2MTP";

// GOOGLE SHEETS CONFIG - PAKAI SHEET ID ANDA
const SHEET_ID = "1tV-M9MK9bC7HvIrK9VUIW6fNLg2koSbIvTbVQ784yEw";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

// Google Sheets functions
async function fetchFromSheet() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        
        const users = {};
        if (json.table.rows.length > 1) {
            for (let i = 1; i < json.table.rows.length; i++) {
                const row = json.table.rows[i].c;
                const username = row[0]?.v;
                if (username) {
                    users[username.toLowerCase()] = {
                        username: username,
                        discord: row[1]?.v || 'Not provided',
                        status: row[2]?.v || 'approved',
                        registered_at: row[3]?.v || new Date().toISOString(),
                        usage_count: parseInt(row[4]?.v) || 0,
                        last_active: row[5]?.v || null
                    };
                }
            }
        }
        
        return { users, settings: { auto_approve: true } };
    } catch (error) {
        console.log('Sheet fetch error, using default data');
        return { users: {}, settings: { auto_approve: true } };
    }
}

module.exports = async (req, res) => {
    // CORS headers
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
        
        // Get data from Sheet
        const whitelistData = await fetchFromSheet();
        
        if (action === 'check') {
            if (!username) return res.json({ success: false, message: "Username required" });
            
            const userKey = username.toLowerCase();
            const user = whitelistData.users[userKey];
            
            if (!user) return res.json({ success: false, message: "User not whitelisted" });
            if (user.status !== 'approved') return res.json({ success: false, message: "User pending approval" });
            
            return res.json({ 
                success: true, 
                data: user, 
                message: "Access granted" 
            });
        }
        
        if (action === 'register') {
            if (!username) return res.json({ success: false, message: "Username required" });
            
            const userKey = username.toLowerCase();
            if (whitelistData.users[userKey]) {
                return res.json({ success: false, message: "Username already registered" });
            }
            
            const userData = {
                username: username,
                discord: discord || 'Not provided',
                registered_at: new Date().toISOString(),
                status: 'approved',
                last_active: null,
                usage_count: 0
            };
            
            return res.json({ 
                success: true, 
                data: userData, 
                message: "✅ Registration successful! Add this user manually to Google Sheets." 
            });
        }
        
        if (action === 'admin_stats') {
            if (admin_password !== ADMIN_PASSWORD) {
                return res.json({ success: false, message: "Invalid admin password" });
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
        
        return res.json({ success: false, message: "Unknown action" });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.json({ success: false, message: "Server error: " + error.message });
    }
};
