// frontend/js/dashboard.js
// Handles all dashboard page logic — user profile, audit history, stats

import {
    requireAuth,
    getUserProfile,
    getUserAudits,
    logOut
} from './firebase.js';

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ── Route Guard ───────────────────────────────────────────────────────────────
requireAuth();

const auth = getAuth();

// ── On Auth State Change ──────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    // ── Load User Profile ─────────────────────────────────────────────────
    const profileResult = await getUserProfile(user.uid);

    if (profileResult.success) {
        const profile = profileResult.data;
        const firstName = profile.full_name?.split(' ')[0] || 'there';

        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning'
            : hour < 17 ? 'Good afternoon'
            : 'Good evening';

        // Update welcome banner
        const welcomeEl = document.getElementById('welcome-name');
        const emailEl = document.getElementById('user-email');
        const avatarEl = document.getElementById('avatar');

        if (welcomeEl) welcomeEl.textContent = `${greeting}, ${firstName}`;
        if (emailEl) emailEl.textContent =
            `${profile.email} · Member since ${formatDate(profile.created_at?.toDate())}`;

        // Avatar initials
        if (avatarEl) {
            const initials = profile.full_name
                ?.split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || 'U';
            avatarEl.textContent = initials;
        }
    } else {
        // Profile not found in Firestore — create it
        const { updateUserProfile } = await import('./firebase.js');
        await updateUserProfile(user.uid, {
            full_name: user.displayName || user.email.split('@')[0],
            email: user.email,
            auth_provider: user.providerData[0]?.providerId || 'email',
            theme_preference: 'light',
            created_at: new Date(),
            last_login: new Date()
        });
        // Reload page to show profile
        window.location.reload();
    }

    // ── Load Audit History ────────────────────────────────────────────────
    const auditsResult = await getUserAudits(user.uid);
    const tbody = document.getElementById('audit-tbody');

    if (auditsResult.success) {
        const audits = auditsResult.data;

        // Update stat cards
        const totalEl = document.getElementById('total-audits');
        const datasetsEl = document.getElementById('datasets-uploaded');
        const lastActiveEl = document.getElementById('last-active');

        if (totalEl) totalEl.textContent = audits.length;
        if (datasetsEl) datasetsEl.textContent = audits.length;
        if (lastActiveEl) lastActiveEl.textContent =
            audits.length > 0
                ? timeAgo(audits[0].created_at?.toDate())
                : 'Never';

        // Render table
        if (!tbody) return;

        if (audits.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="py-16 text-center">
                        <div class="flex flex-col items-center gap-4">
                            <span class="material-symbols-outlined text-5xl opacity-30">history</span>
                            <p class="text-sm text-on-surface-variant">No audits yet.</p>
                            <button onclick="window.location.href='audit-tool.html'"
                                class="bg-primary-container text-on-primary-container px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                                Start Your First Audit
                            </button>
                        </div>
                    </td>
                </tr>`;
        } else {
            tbody.innerHTML = audits.map(audit => `
                <tr class="border-b border-surface-variant hover:bg-surface-container-low transition-colors duration-200">
                    <td class="py-3 px-6 font-medium text-on-surface">
                        ${escapeHtml(audit.filename || 'Unknown')}
                    </td>
                    <td class="py-3 px-6 text-on-surface-variant uppercase text-xs font-mono">
                        ${escapeHtml(audit.dataset_type || '—')}
                    </td>
                    <td class="py-3 px-6 capitalize text-on-surface">
                        ${escapeHtml(audit.protected_attribute || '—')}
                    </td>
                    <td class="py-3 px-6 font-mono text-sm
                        ${audit.disparate_impact < 0.8 ? 'text-error' : 'text-tertiary'}">
                        ${audit.disparate_impact?.toFixed(4) ?? '—'}
                    </td>
                    <td class="py-3 px-6">
                        <span class="text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-medium
                            ${audit.status === 'BIASED'
                                ? 'bg-error-container text-on-error-container'
                                : 'bg-surface-container-high text-on-surface'}">
                            ${escapeHtml(audit.status || '—')}
                        </span>
                    </td>
                    <td class="py-3 px-6 text-on-surface-variant text-sm">
                        ${formatDate(audit.created_at?.toDate())}
                    </td>
                    <td class="py-3 px-6 text-right">
                        <button class="text-primary-fixed-dim hover:text-primary transition-colors"
                            title="PDF download coming soon">
                            <span class="material-symbols-outlined text-xl">download</span>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } else {
        if (tbody) tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-8 text-center text-sm text-error">
                    Failed to load audit history. Please refresh.
                </td>
            </tr>`;

        // Reset stats to 0
        ['total-audits', 'datasets-uploaded', 'last-active'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
    }
});

// ── Theme Toggle ──────────────────────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
themeToggle?.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    document.documentElement.classList.toggle('light', !isDark);
    const icon = themeToggle.querySelector('span');
    if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
});

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to sign out?')) logOut();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(date) {
    if (!date) return '—';
    return date.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

function timeAgo(date) {
    if (!date) return '—';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    return formatDate(date);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}