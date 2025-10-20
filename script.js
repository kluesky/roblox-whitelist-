// Configuration
const API_URL = 'https://register-your-account.vercel.app/api/check';
const SECRET_KEY = 'LYORA_SECRET_2024';

// Multi-language support
const translations = {
    en: {
        title: "Lyora",
        subtitle: "Whitelist System",
        registerTitle: "📝 Register Whitelist",
        checkTitle: "🔍 Check Status", 
        adminTitle: "⚙️ Admin Panel",
        usernamePlaceholder: "Enter your Roblox username",
        discordPlaceholder: "Discord ID (optional)",
        checkPlaceholder: "Enter username to check",
        adminPlaceholder: "Enter admin password",
        usernameHint: "Make sure it matches your exact Roblox username",
        registerBtn: "Register Account",
        checkBtn: "Check Whitelist",
        adminBtn: "Access Panel",
        totalUsers: "Total Users",
        approvedUsers: "Approved", 
        pendingUsers: "Pending",
        popupTitle: "Please Wait",
        popupMessage: "admin will manually confirm your registration for security reasons. If it takes too long, send a message on TikTok @shikimori_md. If you’re tired of waiting, join the Discord and tag the server moderator or admin here: https://discord.gg/QPGBzAMzeg",
        popupBtn: "Understood"
    },
    id: {
        title: "Lyora", 
        subtitle: "Sistem Whitelist",
        registerTitle: "📝 Daftar Whitelist",
        checkTitle: "🔍 Cek Status",
        adminTitle: "⚙️ Panel Admin",
        usernamePlaceholder: "Masukkan username Roblox Anda",
        discordPlaceholder: "Discord ID (opsional)",
        checkPlaceholder: "Masukkan username untuk dicek",
        adminPlaceholder: "Masukkan password admin",
        usernameHint: "Pastikan sesuai dengan username Roblox Anda",
        registerBtn: "Daftar Akun",
        checkBtn: "Cek Whitelist", 
        adminBtn: "Akses Panel",
        totalUsers: "Total Pengguna",
        approvedUsers: "Disetujui",
        pendingUsers: "Menunggu",
        popupTitle: "Harap Tunggu",
        popupMessage: "Admin akan mengonfirmasi pendaftaranmu secara manual demi keamanan. Jika prosesnya terlalu lama, kirim pesan di TikTok @shikimori_md. Kalau kamu lelah menunggu, bergabunglah ke Discord dan tag server moderator atau admin di sini: https://discord.gg/QPGBzAMzeg",
        popupBtn: "Mengerti"
    }
};

let currentLang = 'en';

// DOM Elements
let totalUsersEl, approvedUsersEl, pendingUsersEl;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    totalUsersEl = document.getElementById('totalUsers');
    approvedUsersEl = document.getElementById('approvedUsers');
    pendingUsersEl = document.getElementById('pendingUsers');
    
    initLanguage();
    loadStats();
    console.log('⚡ Lyora Whitelist System Loaded');
});

// Language System - FIXED VERSION
function initLanguage() {
    // Immediately apply translations when page loads
    applyTranslations('en');
    
    const langButtons = document.querySelectorAll('.lang-btn');
    
    langButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            applyTranslations(lang);
            
            // Update active state
            langButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentLang = lang;
        });
    });
}

function applyTranslations(lang) {
    // Update all text elements
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });
    
    // Update all placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (translations[lang] && translations[lang][key]) {
            element.placeholder = translations[lang][key];
        }
    });
}

// API Call Function
async function apiCall(data) {
    try {
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
        showResult('regResult', currentLang === 'en' ? 'Please enter a Roblox username' : 'Harap masukkan username Roblox', 'error');
        return;
    }
    
    const btn = document.querySelector('.btn-primary');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    
    // Show loading
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    btn.disabled = true;
    
    const result = await apiCall({
        action: 'register',
        username: username,
        discord: discord
    });
    
    // Hide loading
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
    btn.disabled = false;
    
    if (result.success) {
        // Show wait popup ONLY after successful registration
        showWaitPopup();
        
        showResult('regResult', 
            currentLang === 'en' 
                ? `✅ Registration Successful!<br><br>
                   <strong>Username:</strong> ${result.data.username}<br>
                   <strong>Status:</strong> <span style="color: #10b981">${result.data.status}</span><br>
                   <strong>Registered:</strong> ${new Date(result.data.registered_at).toLocaleDateString()}`
                : `✅ Pendaftaran Berhasil!<br><br>
                   <strong>Username:</strong> ${result.data.username}<br>
                   <strong>Status:</strong> <span style="color: #10b981">${result.data.status}</span><br>
                   <strong>Terdaftar:</strong> ${new Date(result.data.registered_at).toLocaleDateString('id-ID')}`,
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
        showResult('checkResult', currentLang === 'en' ? 'Please enter a username to check' : 'Harap masukkan username untuk dicek', 'error');
        return;
    }
    
    const result = await apiCall({
        action: 'check',
        username: username
    });
    
    if (result.success) {
        showResult('checkResult', 
            currentLang === 'en'
                ? `✅ <strong>WHITELISTED</strong><br><br>
                   <strong>Username:</strong> ${result.data.username}<br>
                   <strong>Status:</strong> <span style="color: #10b981">${result.data.status}</span><br>
                   <strong>Discord:</strong> ${result.data.discord}<br>
                   <strong>Registered:</strong> ${new Date(result.data.registered_at).toLocaleDateString()}<br>
                   <strong>Usage Count:</strong> ${result.data.usage_count}`
                : `✅ <strong>TERDAFTAR</strong><br><br>
                   <strong>Username:</strong> ${result.data.username}<br>
                   <strong>Status:</strong> <span style="color: #10b981">${result.data.status}</span><br>
                   <strong>Discord:</strong> ${result.data.discord}<br>
                   <strong>Terdaftar:</strong> ${new Date(result.data.registered_at).toLocaleDateString('id-ID')}<br>
                   <strong>Digunakan:</strong> ${result.data.usage_count}x`,
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
        showResult('adminResult', currentLang === 'en' ? 'Please enter admin password' : 'Harap masukkan password admin', 'error');
        return;
    }
    
    const result = await apiCall({
        action: 'admin_stats',
        admin_password: adminPass
    });
    
    if (result.success) {
        let html = currentLang === 'en'
            ? `<div style="margin-bottom: 15px;">
                  <strong>📊 Statistics</strong><br>
                  Total Users: ${result.data.total_users}<br>
               </div>
               <strong>👥 Registered Users:</strong>
               <div class="user-list">`
            : `<div style="margin-bottom: 15px;">
                  <strong>📊 Statistik</strong><br>
                  Total Pengguna: ${result.data.total_users}<br>
               </div>
               <strong>👥 Pengguna Terdaftar:</strong>
               <div class="user-list">`;
        
        if (result.data.users && result.data.users.length > 0) {
            result.data.users.forEach(user => {
                html += `
                    <div class="user-item">
                        <div class="user-info">
                            <div class="user-name">${user.username}</div>
                            <div class="user-details">
                                Discord: ${user.discord} | 
                                ${currentLang === 'en' ? 'Registered' : 'Terdaftar'}: ${new Date(user.registered_at).toLocaleDateString()} |
                                ${currentLang === 'en' ? 'Used' : 'Digunakan'}: ${user.usage_count || 0}x
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            html += currentLang === 'en' 
                ? '<div style="text-align: center; color: #888; padding: 20px;">No users registered yet</div>'
                : '<div style="text-align: center; color: #888; padding: 20px;">Belum ada pengguna terdaftar</div>';
        }
        
        html += '</div>';
        showResult('adminResult', html, 'success');
        
        document.getElementById('adminPass').value = '';
    } else {
        showResult('adminResult', `❌ ${result.message}`, 'error');
    }
}

// Wait Popup Functions
function showWaitPopup() {
    const popup = document.getElementById('waitPopup');
    popup.classList.remove('hidden');
    
    // Reset and start loading animation
    const loadingBar = popup.querySelector('.loading-progress');
    loadingBar.style.animation = 'none';
    setTimeout(() => {
        loadingBar.style.animation = 'loading 4s linear';
    }, 10);
}

function closePopup() {
    const popup = document.getElementById('waitPopup');
    popup.classList.add('hidden');
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
            approvedUsersEl.textContent = result.data.total_users;
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

// Close popup when clicking outside
document.getElementById('waitPopup').addEventListener('click', function(e) {
    if (e.target === this) {
        closePopup();
    }
});