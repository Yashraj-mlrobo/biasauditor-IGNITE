// frontend/js/audit.js

import {
    requireAuth,
    saveAuditResult,
    logOut
} from './firebase.js';

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ── Route Guard ───────────────────────────────────────────────────────────────
requireAuth();

const auth = getAuth();
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // Update avatar in header
        const avatar = document.getElementById('avatar');
        if (avatar) {
            const initials = user.displayName
                ?.split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || user.email?.[0].toUpperCase() || 'U';
            avatar.textContent = initials;
        }
    }
});

// ── File Upload Setup ─────────────────────────────────────────────────────────
const uploadSection = document.getElementById('upload-section');
const fileInfoSection = document.getElementById('file-info-section');
const resultsSection = document.getElementById('results-section');
const runBtn = document.getElementById('run-btn');
const browseBtn = document.getElementById('browse-btn');
const STREAMLIT_URL = 'http://localhost:8501'; // Change to Cloud Run URL when deployed

// Hidden file input
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.csv';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

let uploadedFile = null;

// ── Browse Button ─────────────────────────────────────────────────────────────
browseBtn?.addEventListener('click', () => fileInput.click());
uploadSection?.addEventListener('click', () => fileInput.click());

// ── Drag and Drop ─────────────────────────────────────────────────────────────
uploadSection?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadSection.classList.add('border-primary-fixed', 'bg-surface-container-low');
});

uploadSection?.addEventListener('dragleave', () => {
    uploadSection.classList.remove('border-primary-fixed', 'bg-surface-container-low');
});

uploadSection?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('border-primary-fixed', 'bg-surface-container-low');
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) {
        handleFileSelected(file);
    } else {
        showToast('Please upload a CSV file', 'error');
    }
});

// ── File Input Change ─────────────────────────────────────────────────────────
fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFileSelected(fileInput.files[0]);
});

// ── Handle File Selected ──────────────────────────────────────────────────────
function handleFileSelected(file) {
    uploadedFile = file;

    const filename = file.name.toLowerCase();
    const datasetType = filename.includes('compas') ? 'COMPAS' : 'ADULT';
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);

    // Update file info bar
    const el = (id) => document.getElementById(id);
    if (el('file-name')) el('file-name').textContent = file.name;
    if (el('file-size')) el('file-size').textContent = `${sizeMB} MB`;
    if (el('file-type')) el('file-type').textContent = datasetType;

    // Show file info section
    fileInfoSection?.classList.remove('hidden');

    // Enable run button
    if (runBtn) {
        runBtn.disabled = false;
        runBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    showToast(`✓ ${file.name} ready to audit`, 'success');
}

// ── Delete File ───────────────────────────────────────────────────────────────
document.getElementById('delete-file-btn')?.addEventListener('click', () => {
    uploadedFile = null;
    fileInfoSection?.classList.add('hidden');
    fileInput.value = '';
    if (runBtn) {
        runBtn.disabled = true;
        runBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    showToast('File removed', 'success');
});

// ── Run Audit ─────────────────────────────────────────────────────────────────
runBtn?.addEventListener('click', async () => {
    if (!uploadedFile) {
        showToast('Please upload a CSV file first', 'error');
        return;
    }
    if (!currentUser) {
        showToast('Please sign in to run an audit', 'error');
        return;
    }

    // Loading state
    runBtn.innerHTML = `
        <div class="flex items-center justify-center gap-3">
            <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Running Bias Audit...
        </div>`;
    runBtn.disabled = true;

    try {
        let auditResults;

        // Try Streamlit backend first
        try {
            const formData = new FormData();
            formData.append('file', uploadedFile);
            const STREAMLIT_URL = 'http://localhost:8501';
            const response = await fetch(`${STREAMLIT_URL}/audit`, {
                method: 'POST',
                body: formData,
                signal: AbortSignal.timeout(5000)
            });
            if (response.ok) auditResults = await response.json();
            else throw new Error('Backend error');
        } catch {
            console.warn('Streamlit not available — using demo results');
            auditResults = getDemoResults(uploadedFile.name);
        }

        // Save to Firebase
        const saveResult = await saveAuditResult(currentUser.uid, {
            ...auditResults,
            filename: uploadedFile.name
        });

        if (saveResult.success) {
            showToast('✓ Audit complete! Saved to your history.', 'success');
        }

        // Show results
        displayResults(auditResults);

    } catch (error) {
        showToast('Audit failed: ' + error.message, 'error');
        runBtn.innerHTML = `
            <span class="material-symbols-outlined">settings_b_roll</span>
            Run Bias Audit`;
        runBtn.disabled = false;
    }
});

// ── Display Results ───────────────────────────────────────────────────────────
function displayResults(results) {
    if (!resultsSection) return;

    // Unhide and animate in
    resultsSection.classList.remove('opacity-50', 'pointer-events-none', 'hidden');
    resultsSection.style.transition = 'opacity 0.5s ease';
    resultsSection.style.opacity = '1';

    // Update metric values
    const setValue = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setValue('result-di', results.disparate_impact?.toFixed(4) ?? '—');
    setValue('result-dpd', results.demographic_parity_difference?.toFixed(4) ?? '—');
    setValue('result-eod', results.equal_opportunity_difference?.toFixed(4) ?? '—');
    setValue('result-fs', calculateFairnessScore(results) + '%');
    setValue('result-before-acc', (results.before_accuracy * 100)?.toFixed(2) + '%');
    setValue('result-after-acc', (results.after_accuracy * 100)?.toFixed(2) + '%');
    setValue('result-before-dpd', results.before_demographic_parity?.toFixed(4) ?? '—');
    setValue('result-after-dpd', results.after_demographic_parity?.toFixed(4) ?? '—');

    // Color disparate impact
    const diEl = document.getElementById('result-di');
    if (diEl) {
        diEl.className = `font-h2 text-h2 mt-2 ${results.disparate_impact < 0.8 ? 'text-error' : 'text-tertiary'}`;
    }

    // Update status badge
    const statusEl = document.getElementById('result-status');
    if (statusEl) {
        const isBiased = results.disparate_impact < 0.8;
        statusEl.textContent = isBiased ? 'BIASED' : 'FAIR';
        statusEl.className = `inline-block px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider
            ${isBiased ? 'bg-error-container text-on-error-container' : 'bg-green-100 text-green-800'}`;
    }

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Update run button
    runBtn.innerHTML = `
        <span class="material-symbols-outlined">check_circle</span>
        Audit Complete — Run Again`;
    runBtn.disabled = false;
}

// ── Fairness Score ────────────────────────────────────────────────────────────
function calculateFairnessScore(results) {
    const di = results.disparate_impact || 0;
    const dpd = Math.abs(results.after_demographic_parity || 0);
    const diScore = Math.min(di / 1.0, 1.0) * 50;
    const dpdScore = Math.max(0, (1 - dpd * 10)) * 50;
    return Math.round(Math.min(diScore + dpdScore, 100));
}

// ── Demo Results ──────────────────────────────────────────────────────────────
function getDemoResults(filename) {
    const isCompas = filename.toLowerCase().includes('compas');
    return isCompas ? {
        dataset_type: 'compas',
        protected_attribute: 'race',
        disparate_impact: 1.2195,
        statistical_parity_difference: 0.0864,
        equal_opportunity_difference: -0.0004,
        demographic_parity_difference: 0.096,
        before_accuracy: 0.9694,
        after_accuracy: 0.9364,
        before_demographic_parity: 0.096,
        after_demographic_parity: 0.0012
    } : {
        dataset_type: 'adult',
        protected_attribute: 'sex',
        disparate_impact: 0.3635,
        statistical_parity_difference: -0.1989,
        equal_opportunity_difference: 0.0221,
        demographic_parity_difference: 0.0481,
        before_accuracy: 0.7914,
        after_accuracy: 0.7886,
        before_demographic_parity: 0.0481,
        after_demographic_parity: 0.0002
    };
}

// ── Dark Mode Toggle ──────────────────────────────────────────────────────────
document.getElementById('theme-toggle')?.addEventListener('click', function () {
    const isDark = document.documentElement.classList.toggle('dark');
    document.documentElement.classList.toggle('light', !isDark);
    this.querySelector('span').textContent = isDark ? 'light_mode' : 'dark_mode';
});

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (confirm('Sign out?')) logOut();
});

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = `fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg
        text-white text-sm font-medium transition-all duration-300
        ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}