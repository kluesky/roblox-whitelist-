// Configuration
const API_URL = 'https://register-your-account.vercel.app/api/check';
const SECRET_KEY = 'LYO-RPQS-5CWD-6D5J';

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
    const btn = document.querySelector('.btn-primary');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    
    try {
        // Show loading state
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        btn.disabled = true;
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                ...data,
                secret: SECRET_KEY,
                timestamp: Date.now()
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
        
    } catch (error) {
        console.error('API Call Error:', error);
        return { 
            success: false, 
            message: 'Network error: ' + error.message 
        };
    } finally {
        // Hide loading state
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
        btn.disabled = false;
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
    
    if (username.length < 3 || username.length > 20) {
        showResult('regResult', 'Username must be between 3-20 characters', 'error');
        return;
    }
    
    const result = await apiCall({
        action: 'register',
        username: username,
        discord: discord || 'Not provided'
    });
    
    if (result.success) {
        showResult('regResult', 
            `✅ Registration Successful!<br><br>
            <strong>Username:</strong> ${result.data.username}<br>
            <strong>Status:</strong> <span style="color: #10b981">${result.data.status.toUpperCase()}</span><br>
            <strong>Registered:</strong> ${new Date(result.data.registered_at).toLocaleDateString()}`,
            'success'
        );
        
        // Clear form
        document.getElementById('regUsername').value = '';
        document.getElementById('regDiscord').value = '';
        
        // Reload stats
        loadStats();
    } else {
        showResult('regResult', `❌ ${result.message}`, 'error');
    }
}

// Check Status
async function checkStatus() {
    const username = document.getElementById('checkUsername').value.trim().toLowerCase();
    
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
            <strong>Status:</strong> <span style="color: #10b981">${result.data.status.toUpperCase()}</span><br>
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
                Approved: ${result.data.approved_users}<br>
                Pending: ${result.data.pending_users}
            </div>
            <strong>👥 Registered Users:</strong>
            <div class="user-list">
        `;
        
        const users = Object.values(result.data.users).sort((a, b) => 
            new Date(b.registered_at) - new Date(a.registered_at)
        );
        
        users.forEach(user => {
            const statusClass = user.status === 'approved' ? 'status-approved' : 'status-pending';
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
                    <div class="user-status ${statusClass}">
                        ${user.status.toUpperCase()}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        showResult('adminResult', html, 'success');
        
        // Clear password field
        document.getElementById('adminPass').value = '';
    } else {
        showResult('adminResult', `❌ ${result.message}`, 'error');
    }
}

// Load Statistics
async function loadStats() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'admin_stats',
                admin_password: 'LyoraAdmin2024!',
                secret: SECRET_KEY
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                totalUsersEl.textContent = result.data.total_users;
                approvedUsersEl.textContent = result.data.approved_users;
                pendingUsersEl.textContent = result.data.pending_users;
            }
        }
    } catch (error) {
        console.log('Stats load failed (normal for non-admin users)');
    }
}

// Show Result
function showResult(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.innerHTML = message;
    element.className = `result ${type}`;
    
    // Auto-hide success messages after 8 seconds
    if (type === 'success') {
        setTimeout(() => {
            if (element.innerHTML === message) {
                element.innerHTML = '';
                element.className = 'result';
            }
        }, 8000);
    }
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
