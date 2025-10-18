// Configuration
const API_URL = 'https://register-your-account.vercel.app/api/check';
const SECRET_KEY = 'LYORA_SECRET_2024';

// DOM Elements
let totalUsersEl, approvedUsersEl, pendingUsersEl;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    totalUsersEl = document.getElementById('totalUsers');
    approvedUsersEl = document.getElementById('approvedUsers');
    pendingUsersEl = document.getElementById('pendingUsers');
    
    loadStats();
    console.log('⚡ Lyora Whitelist System Loaded');
});

// API Call Function
async function apiCall(data) {
    try {
        // Use GET request for all actions
        const params = new URLSearchParams({
            ...data,
            secret: SECRET_KEY,
            timestamp: Date.now()
        });
        
        const response = await fetch(`${API_URL}?${params}`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Call Error:', error);
        return { 
            success: false, 
            message: 'Network error: ' + error.message 
        };
    }
}

// Register User
async function registerUser() {
    const username = document.getElementById('regUsername').value.trim();
    const discord = document.getElementById('regDiscord').value.trim();
    
    if (!username) {
        showResult('regResult', 'Please enter a Roblox username', 'error');
        return;
    }
    
    const result = await apiCall({
        action: 'register',
        username: username,
        discord: discord
    });
    
    if (result.success) {
        showResult('regResult', 
            `✅ Registration Successful!<br><br>
            <strong>Username:</strong> ${result.data.username}<br>
            <strong>Status:</strong> <span style="color: #10b981">${result.data.status}</span><br>
            <strong>Registered:</strong> ${new Date(result.data.registered_at).toLocaleDateString()}`,
            'success'
        );
        
        document.getElementById('regUsername').value = '';
        document.getElementById('regDiscord').value = '';
        loadStats();
    } else {
        showResult('regResult', `❌ ${result.message}`, 'error');
    }
}

// Check Status
async function checkStatus() {
    const username = document.getElementById('checkUsername').value.trim();
    
    if (!username) {
        showResult('checkResult', 'Please enter a username to check', 'error');
        return;
    }
    
    const result = await apiCall({
        action: 'check',
        username: username
    });
    
    if (result.success) {
        showResult('checkResult', 
            `✅ <strong>WHITELISTED</strong><br><br>
            <strong>Username:</strong> ${result.data.username}<br>
            <strong>Status:</strong> <span style="color: #10b981">${result.data.status}</span><br>
            <strong>Discord:</strong> ${result.data.discord}<br>
            <strong>Registered:</strong> ${new Date(result.data.registered_at).toLocaleDateString()}<br>
            <strong>Usage Count:</strong> ${result.data.usage_count}`,
            'success'
        );
    } else {
        showResult('checkResult', `❌ ${result.message}`, 'error');
    }
}

// Admin Panel
async function getStats() {
    const adminPass = document.getElementById('adminPass').value;
    
    if (!adminPass) {
        showResult('adminResult', 'Please enter admin password', 'error');
        return;
    }
    
    const result = await apiCall({
        action: 'admin_stats',
        admin_password: adminPass
    });
    
    if (result.success) {
        let html = `
            <div style="margin-bottom: 15px;">
                <strong>📊 Statistics</strong><br>
                Total Users: ${result.data.total_users}<br>
            </div>
            <strong>👥 Registered Users:</strong>
            <div class="user-list">
        `;
        
        if (result.data.users && result.data.users.length > 0) {
            result.data.users.forEach(user => {
                html += `
                    <div class="user-item">
                        <div class="user-info">
                            <div class="user-name">${user.username}</div>
                            <div class="user-details">
                                Discord: ${user.discord} | 
                                Registered: ${new Date(user.registered_at).toLocaleDateString()} |
                                Used: ${user.usage_count || 0}x
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            html += '<div style="text-align: center; color: #888; padding: 20px;">No users registered yet</div>';
        }
        
        html += '</div>';
        showResult('adminResult', html, 'success');
        
        document.getElementById('adminPass').value = '';
    } else {
        showResult('adminResult', `❌ ${result.message}`, 'error');
    }
}

// Load Statistics
async function loadStats() {
    try {
        const result = await apiCall({
            action: 'admin_stats',
            admin_password: 'LyoraAdmin2024!'
        });
        
        if (result.success) {
            totalUsersEl.textContent = result.data.total_users;
            approvedUsersEl.textContent = result.data.total_users; // Since all are approved
            pendingUsersEl.textContent = '0';
        }
    } catch (error) {
        console.log('Stats load failed');
    }
}

// Show Result
function showResult(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.innerHTML = message;
    element.className = `result ${type}`;
}

// Enter key support
document.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        const focused = document.activeElement;
        if (focused.id === 'regUsername' || focused.id === 'regDiscord') {
            registerUser();
        } else if (focused.id === 'checkUsername') {
            checkStatus();
        } else if (focused.id === 'adminPass') {
            getStats();
        }
    }
});
