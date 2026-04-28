// frontend/js/auth.js
// Handles all auth form logic for login.html and signup.html

import {
    signUp,
    signIn,
    signInWithGoogle,
    redirectIfLoggedIn
} from './firebase.js';

// ── Detect which page we're on ────────────────────────────────────────────────
const isSignup = document.getElementById('fullName') !== null;
const isLogin = document.getElementById('email') !== null && !isSignup;

// ── Redirect if already logged in ────────────────────────────────────────────
//redirectIfLoggedIn();

// ── Dark mode toggle ──────────────────────────────────────────────────────────
const toggleBtn = document.querySelector('[aria-label="Toggle dark mode"]');
toggleBtn?.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    document.documentElement.classList.toggle('light', !isDark);
    const icon = toggleBtn.querySelector('span');
    if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
});

// ── Show error message ────────────────────────────────────────────────────────
function showError(message) {
    let errorDiv = document.getElementById('auth-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'auth-error';
        errorDiv.className = 'p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center mb-4';
        
        // Find the form to attach the error to
        const form = document.getElementById('login-form') || document.querySelector('form');
        form?.prepend(errorDiv);
    }
    
    // Safely handle cases where message might be undefined
    const errorText = message || "An unknown error occurred.";
    
    errorDiv.textContent = errorText
        .replace('Firebase: ', '')
        .replace('(auth/email-already-in-use).', 'An account with this email already exists.')
        .replace('(auth/invalid-credential).', 'Invalid email or password.')
        .replace('(auth/user-not-found).', 'No account found with this email.')
        .replace('(auth/wrong-password).', 'Incorrect password.')
        .replace('(auth/weak-password).', 'Password should be at least 6 characters.')
        .replace('(auth/invalid-email).', 'Please enter a valid email address.');
    errorDiv.style.display = 'block';
}

function clearError() {
    const errorDiv = document.getElementById('auth-error');
    if (errorDiv) errorDiv.style.display = 'none';
}

// ── SIGNUP LOGIC ──────────────────────────────────────────────────────────────
if (isSignup) {
    const createBtn = document.querySelector('button[type="button"]');
    const googleBtn = document.querySelectorAll('button[type="button"]')[1];

    // Password strength indicator
    const passwordInput = document.getElementById('password');
    passwordInput?.addEventListener('input', () => {
        const val = passwordInput.value;
        let strength = 0;
        if (val.length >= 8) strength++;
        if (/[0-9]/.test(val)) strength++;
        if (/[^a-zA-Z0-9]/.test(val)) strength++;
        if (val.length >= 12) strength++;

        const bars = document.querySelectorAll('.h-1.flex-1');
        const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
        const labels = [
            'Weak — add numbers and symbols',
            'Fair — add symbols',
            'Good — almost there',
            'Strong password ✓'
        ];

        bars.forEach((bar, i) => {
            bar.innerHTML = i < strength
                ? `<div class="h-full ${colors[strength - 1]} rounded-full transition-all duration-300"></div>`
                : '';
        });

        const hint = document.querySelector('.text-xs.mt-1');
        if (hint) hint.textContent = strength > 0 ? labels[strength - 1] : 'Enter a password';
    });

    // Create account button
    createBtn?.addEventListener('click', async () => {
        clearError();

        const fullName = document.getElementById('fullName')?.value.trim();
        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;

        // Validation
        if (!fullName) { showError('Please enter your full name.'); return; }
        if (!email) { showError('Please enter your email.'); return; }
        if (!password) { showError('Please enter a password.'); return; }
        if (password.length < 6) { showError('Password must be at least 6 characters.'); return; }
        if (password !== confirmPassword) { showError('Passwords do not match.'); return; }

        // Loading state
        createBtn.textContent = 'Creating account...';
        createBtn.disabled = true;

        console.log('Attempting signup for:', email);

        const result = await signUp(fullName, email, password);

        console.log('Signup result:', result);

        if (result.success) {
            console.log('Signup successful! Redirecting to dashboard...');
            window.location.href = 'dashboard.html';
        } else {
            createBtn.textContent = 'Create Account';
            createBtn.disabled = false;
            showError(result.error);
        }
    });

    // Google signup
    googleBtn?.addEventListener('click', async () => {
        clearError();
        const result = await signInWithGoogle();
        if (result && result.success) {
            window.location.href = 'dashboard.html';
        } else if (result) {
            showError(result.error);
        }
    });

    // Sign in link
    const signInLink = document.querySelector('a[href="#"]');
    if (signInLink) signInLink.href = 'login.html';
}

// ── LOGIN LOGIC ───────────────────────────────────────────────────────────────
if (isLogin) {
    // FORCE JavaScript to look at this specific form ID
    const form = document.getElementById('login-form'); 
    
    // Grab the SECOND button of type="button" (the first is the password eye icon)
    const googleBtn = document.querySelectorAll('button[type="button"]')[1];

    // Only run this if the form actually exists on the page
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError();

            const email = document.getElementById('email')?.value.trim();
            const password = document.getElementById('password')?.value;
            const submitBtn = form.querySelector('button[type="submit"]');

            if (!email || !password) {
                showError('Please fill in all fields.');
                return;
            }

            // Loading state
            submitBtn.textContent = 'Signing in...';
            submitBtn.disabled = true;

            console.log('Attempting login for:', email);

            // Ask Firebase to authenticate
            const result = await signIn(email, password);

            console.log('Login result:', result);

            if (result && result.success) {
                console.log('Login successful! Redirecting...');
                // Small delay to let Firebase set session before redirect
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 800);
            } else {
                // Reset button and show error
                submitBtn.textContent = 'Sign In';
                submitBtn.disabled = false;
                showError(result ? result.error : "An unknown error occurred.");
            }
        });
    } else {
        console.error("CRITICAL ERROR: Could not find <form id='login-form'> in your HTML.");
    }

    // Google login (FIXED)
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            clearError();
            console.log('Attempting Google Sign-In...');
            
            const result = await signInWithGoogle(); // <-- The missing logic has been added here
            
            if (result && result.success) {
                console.log('Google Login successful! Redirecting...');
                window.location.href = 'dashboard.html';
            } else if (result) {
                showError(result.error);
            }
        });
    }
}