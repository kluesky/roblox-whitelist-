const SECRET_KEY = "LYO-RPQS-5CWD-6D5J";
const ADMIN_PASSWORD = "KYL-DW3X-EGE4-2MTP";

// PAKAI BIN ID ANDA
const JSONBIN_BIN_ID = "68f3b6d5d0ea88ff4baa39c3";

// Untuk free tier, kita coba tanpa key dulu
async function fetchFromJSONBin() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`);
        
        if (response.ok) {
            const data = await response.json();
            return data.record;
        }
        // Jika error, return default
        console.log('Fetch failed, using default data');
        return { 
            users: {}, 
            settings: { auto_approve: true } 
        };
    } catch (error) {
        console.log('Fetch error, using default data');
        return { 
            users: {}, 
            settings: { auto_approve: true } 
        };
    }
}

async function saveToJSONBin(data) {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        return response.ok;
    } catch (error) {
        console.log('Save error');
        return false;
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
        
        // Get data from JSONBin
        const whitelistData = await fetchFromJSONBin();
        
        if (action === 'check') {
            if (!username) return res.json({ success: false, message: "Username required" });
            
            const userKey = username.toLowerCase();
            const user = whitelistData.users[userKey];
            
            if (!user) return res.json({ success: false, message: "User not whitelisted" });
            if (user.status !== 'approved') return res.json({ success: false, message: "User pending approval" });
            
            // Update usage
            whitelistData.users[userKey].last_active = new Date().toISOString();
            whitelistData.users[userKey].usage_count = (whitelistData.users[userKey].usage_count || 0) + 1;
            await saveToJSONBin(whitelistData);
            
            return res.json({ success: true, data: user, message: "Access granted" });
        }
        
        if (action === 'register') {
            if (!username) return res.json({ success: false, message: "Username required" });
            
            const userKey = username.toLowerCase();
            if (whitelistData.users[userKey]) return res.json({ success: false, message: "Username already registered" });
            
            const userData = {
                username: username,
                discord: discord || 'Not provided',
                registered_at: new Date().toISOString(),
                status: whitelistData.settings.auto_approve ? 'approved' : 'pending',
                last_active: null,
                usage_count: 0
            };
            
            whitelistData.users[userKey] = userData;
            const saved = await saveToJSONBin(whitelistData);
            
            if (saved) {
                return res.json({ success: true, data: userData, message: "Registration successful" });
            } else {
                return res.json({ success: false, message: "Registration failed - try again" });
            }
        }
        
        if (action === 'admin_stats') {
            if (admin_password !== ADMIN_PASSWORD) return res.json({ success: false, message: "Invalid admin password" });
            return res.json({ success: true, data: whitelistData, message: "Admin stats" });
        }
        
        return res.json({ success: false, message: "Unknown action" });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.json({ success: false, message: "Server error" });
    }
};
