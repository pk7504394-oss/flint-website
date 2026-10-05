// Flint Admin Portal Logic & Supabase Integration
const SUPABASE_URL = 'https://sdeixeeducyszrhscgcv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F7igwHsJ7A2Rf86tNONBRw_Nz_-gKHD';

let supabaseClient = null;
let allBookingsData = [];

function getSupabase() {
    if (!supabaseClient && window.supabase && typeof window.supabase.createClient === 'function') {
        try {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        } catch (e) {
            console.error("Supabase init error:", e);
        }
    }
    return supabaseClient;
}

// Simple hash helper for admin password security
async function hashPassword(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str + "_flint_salt_2024");
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
    const supabase = getSupabase();

    // Elements
    const authSection = document.getElementById('auth-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const setupView = document.getElementById('setup-view');
    const loginView = document.getElementById('login-view');
    const headerUserInfo = document.getElementById('header-user-info');
    const adminEmailDisplay = document.getElementById('admin-email-display');
    const logoutBtn = document.getElementById('logout-btn');

    const setupForm = document.getElementById('setup-form');
    const loginForm = document.getElementById('login-form');
    const setupFeedback = document.getElementById('setup-feedback');
    const loginFeedback = document.getElementById('login-feedback');

    const searchInput = document.getElementById('search-input');
    const refreshBtn = document.getElementById('refresh-btn');

    // 1. Check if Admin is already logged in for this session
    const currentSession = sessionStorage.getItem('flint_admin_session');
    if (currentSession) {
        try {
            const adminUser = JSON.parse(currentSession);
            showDashboard(adminUser.email);
        } catch (e) {
            sessionStorage.removeItem('flint_admin_session');
            checkAdminAccountStatus();
        }
    } else {
        checkAdminAccountStatus();
    }

    // 2. Single-Slot Check: Determine if an admin exists
    async function checkAdminAccountStatus() {
        let adminExists = false;

        // Check local storage first
        const localAdmin = localStorage.getItem('flint_admin_account');
        if (localAdmin) {
            adminExists = true;
        } else if (supabase) {
            // Check Supabase admin_users table
            try {
                const { data, error } = await supabase.from('admin_users').select('id').limit(1);
                if (!error && data && data.length > 0) {
                    adminExists = true;
                }
            } catch (err) {
                console.warn("Could not check admin_users table:", err);
            }
        }

        if (adminExists) {
            // Admin already created -> Show Login ONLY (Registration slot locked)
            setupView.classList.add('hidden');
            loginView.classList.remove('hidden');
        } else {
            // No admin created yet -> Show Single Slot Initial Setup
            setupView.classList.remove('hidden');
            loginView.classList.add('hidden');
        }
    }

    // 3. Handle Single-Slot Admin Account Creation
    if (setupForm) {
        setupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('setup-email').value.trim();
            const pass = document.getElementById('setup-password').value;
            const passConfirm = document.getElementById('setup-password-confirm').value;

            if (pass !== passConfirm) {
                showMsg(setupFeedback, 'Passwords do not match.', 'error');
                return;
            }

            const passHash = await hashPassword(pass);
            const adminData = { email, passHash, created_at: new Date().toISOString() };

            // Save in Supabase if table exists
            if (supabase) {
                try {
                    const { error } = await supabase.from('admin_users').insert([{
                        email: email,
                        password_hash: passHash,
                        created_at: new Date().toISOString()
                    }]);
                    if (error) {
                        console.warn("Supabase admin table error:", error.message);
                    }
                } catch (err) {
                    console.warn("Supabase admin insert exception:", err);
                }
            }

            // Always save to localStorage to ensure single slot is permanently locked
            localStorage.setItem('flint_admin_account', JSON.stringify(adminData));
            showMsg(setupFeedback, '✓ Admin Account Created! Logging in...', 'success');

            setTimeout(() => {
                sessionStorage.setItem('flint_admin_session', JSON.stringify({ email }));
                showDashboard(email);
            }, 800);
        });
    }

    // 4. Handle Admin Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const pass = document.getElementById('login-password').value;
            const passHash = await hashPassword(pass);

            let isValid = false;

            // Check localStorage
            const localAdminRaw = localStorage.getItem('flint_admin_account');
            if (localAdminRaw) {
                const localAdmin = JSON.parse(localAdminRaw);
                if (localAdmin.email.toLowerCase() === email.toLowerCase() && localAdmin.passHash === passHash) {
                    isValid = true;
                }
            }

            // Check Supabase if local check did not pass
            if (!isValid && supabase) {
                try {
                    const { data, error } = await supabase
                        .from('admin_users')
                        .select('*')
                        .eq('email', email)
                        .eq('password_hash', passHash);
                    
                    if (!error && data && data.length > 0) {
                        isValid = true;
                    }
                } catch (err) {
                    console.warn("Supabase login check error:", err);
                }
            }

            if (isValid) {
                showMsg(loginFeedback, '✓ Login Successful!', 'success');
                sessionStorage.setItem('flint_admin_session', JSON.stringify({ email }));
                setTimeout(() => showDashboard(email), 500);
            } else {
                showMsg(loginFeedback, 'Invalid admin email or password.', 'error');
            }
        });
    }

    // 5. Switch UI to Dashboard View
    function showDashboard(email) {
        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        headerUserInfo.classList.remove('hidden');
        adminEmailDisplay.innerText = email;

        fetchBookingsData();
    }

    // 6. Logout Handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('flint_admin_session');
            window.location.reload();
        });
    }

    // 7. Fetch Bookings from Supabase
    async function fetchBookingsData() {
        const tbody = document.getElementById('bookings-tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="p-8 text-center text-on-surface-variant">
                    <span class="material-symbols-outlined animate-spin text-2xl block mb-2 text-primary">sync</span>
                    Fetching bookings from Supabase...
                </td>
            </tr>
        `;

        let data = [];
        let errorOccurred = false;

        if (supabase) {
            const targetTables = ['appointments', 'contacts', 'requirements', 'leads', 'messages', 'queries'];
            
            for (const table of targetTables) {
                try {
                    const { data: resData, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
                    if (!error && resData && resData.length > 0) {
                        data = resData;
                        console.log(`Fetched ${data.length} records from Supabase table: ${table}`);
                        break;
                    }
                } catch (err) {
                    console.warn(`Error reading from ${table}:`, err);
                }
            }
        }

        allBookingsData = data;
        renderBookingsTable(allBookingsData);
        updateStats(allBookingsData);
    }

    // 8. Render Table Rows
    function renderBookingsTable(bookings) {
        const tbody = document.getElementById('bookings-tbody');
        if (!tbody) return;

        if (bookings.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="p-12 text-center text-on-surface-variant">
                        <span class="material-symbols-outlined text-4xl block mb-2 text-outline-variant">inbox</span>
                        No appointment bookings found in database yet.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = bookings.map((item, index) => {
            const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'Recently';

            return `
                <tr class="hover:bg-surface-container-high/40 transition-colors">
                    <td class="p-4 pl-6 text-xs text-on-surface-variant whitespace-nowrap">${dateStr}</td>
                    <td class="p-4 font-semibold text-on-surface">${escapeHtml(item.name || 'Anonymous')}</td>
                    <td class="p-4 text-xs text-secondary-container uppercase tracking-wider">${escapeHtml(item.company || '-')}</td>
                    <td class="p-4 text-xs">
                        <div class="text-on-surface">${escapeHtml(item.email || '')}</div>
                        <div class="text-on-surface-variant">${escapeHtml(item.phone || '')}</div>
                    </td>
                    <td class="p-4 text-xs text-on-surface-variant max-w-xs truncate" title="${escapeHtml(item.requirement || '')}">
                        ${escapeHtml(item.requirement || 'No notes provided')}
                    </td>
                    <td class="p-4 pr-6 text-right whitespace-nowrap">
                        <button onclick="deleteBooking(${item.id || index})" class="text-rose-400 hover:text-rose-300 p-2 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer" title="Delete record">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // 9. Update Dashboard Summary Stats
    function updateStats(bookings) {
        const statTotal = document.getElementById('stat-total-bookings');
        const statToday = document.getElementById('stat-today-bookings');
        const statCorporate = document.getElementById('stat-corporate-clients');

        if (statTotal) statTotal.innerText = bookings.length;

        const todayStr = new Date().toISOString().split('T')[0];
        const recentCount = bookings.filter(b => b.created_at && b.created_at.startsWith(todayStr)).length;
        if (statToday) statToday.innerText = recentCount;

        const corpCount = bookings.filter(b => b.company && b.company.trim() !== '').length;
        if (statCorporate) statCorporate.innerText = corpCount;
    }

    // 10. Search & Filter Input
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = allBookingsData.filter(item => {
                return (item.name && item.name.toLowerCase().includes(query)) ||
                       (item.email && item.email.toLowerCase().includes(query)) ||
                       (item.company && item.company.toLowerCase().includes(query)) ||
                       (item.phone && item.phone.includes(query)) ||
                       (item.requirement && item.requirement.toLowerCase().includes(query));
            });
            renderBookingsTable(filtered);
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchBookingsData);
    }
});

// Delete booking record helper
window.deleteBooking = async function(id) {
    if (!confirm('Are you sure you want to delete this enquiry record?')) return;

    const supabase = getSupabase();
    if (supabase && id) {
        try {
            await supabase.from('appointments').delete().eq('id', id);
        } catch (e) {
            console.warn("Delete attempt error:", e);
        }
    }
    // Refresh table locally
    allBookingsData = allBookingsData.filter(item => item.id !== id);
    const tbody = document.getElementById('bookings-tbody');
    if (allBookingsData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-12 text-center text-on-surface-variant">No appointment bookings found.</td></tr>`;
    } else {
        document.querySelector(`button[onclick="deleteBooking(${id})"]`)?.closest('tr')?.remove();
    }
};

function showMsg(el, text, type) {
    if (!el) return;
    el.className = `p-3 rounded-xl text-xs text-center ${type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`;
    el.innerText = text;
    el.classList.remove('hidden');
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
