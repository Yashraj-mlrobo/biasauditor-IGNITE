// frontend/js/firebase.example.js
// ================================================================
// SETUP INSTRUCTIONS FOR TEAM IGNITE
// ================================================================
// 1. Copy this file and rename it to firebase.js
// 2. Replace all YOUR_... placeholders with real values
// 3. Get values from Firebase Console → Project Settings → Your Apps
// 4. NEVER commit firebase.js to GitHub — it is in .gitignore
// ================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Firebase Config — replace with your real values ──────────────────────────
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// ── Initialize ────────────────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ── Sign Up ───────────────────────────────────────────────────────────────────
async function signUp(fullName, email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, "users", user.uid), {
            full_name: fullName,
            email: email,
            auth_provider: "email",
            theme_preference: "light",
            created_at: serverTimestamp(),
            last_login: serverTimestamp()
        });
        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Sign In ───────────────────────────────────────────────────────────────────
async function signIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid),
            { last_login: serverTimestamp() },
            { merge: true }
        );
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Google Sign In ────────────────────────────────────────────────────────────
async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
            await setDoc(doc(db, "users", user.uid), {
                full_name: user.displayName,
                email: user.email,
                auth_provider: "google",
                theme_preference: "light",
                created_at: serverTimestamp(),
                last_login: serverTimestamp()
            });
        } else {
            await setDoc(doc(db, "users", user.uid),
                { last_login: serverTimestamp() },
                { merge: true }
            );
        }
        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Logout ────────────────────────────────────────────────────────────────────
async function logOut() {
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Logout error:", error);
    }
}

// ── Get User Profile ──────────────────────────────────────────────────────────
async function getUserProfile(uid) {
    try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
            return { success: true, data: userDoc.data() };
        }
        return { success: false, error: "User not found" };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Update User Profile ───────────────────────────────────────────────────────
async function updateUserProfile(uid, updates) {
    try {
        await setDoc(doc(db, "users", uid), updates, { merge: true });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Save Audit Result ─────────────────────────────────────────────────────────
async function saveAuditResult(uid, auditData) {
    try {
        const docRef = await addDoc(collection(db, "audits"), {
            user_id: uid,
            filename: auditData.filename || "unknown.csv",
            dataset_type: auditData.dataset_type || "unknown",
            protected_attribute: auditData.protected_attribute || "unknown",
            disparate_impact: auditData.disparate_impact || 0,
            statistical_parity_difference: auditData.statistical_parity_difference || 0,
            equal_opportunity_difference: auditData.equal_opportunity_difference || 0,
            demographic_parity_difference: auditData.demographic_parity_difference || 0,
            before_accuracy: auditData.before_accuracy || 0,
            after_accuracy: auditData.after_accuracy || 0,
            before_demographic_parity: auditData.before_demographic_parity || 0,
            after_demographic_parity: auditData.after_demographic_parity || 0,
            status: (auditData.disparate_impact || 0) < 0.8 ? "BIASED" : "FAIR",
            created_at: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Get User Audits ───────────────────────────────────────────────────────────
async function getUserAudits(uid) {
    try {
        const q = query(
            collection(db, "audits"),
            where("user_id", "==", uid),
            orderBy("created_at", "desc")
        );
        const snapshot = await getDocs(q);
        const audits = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return { success: true, data: audits };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Delete All Audits ─────────────────────────────────────────────────────────
async function deleteAllAudits(uid) {
    try {
        const q = query(collection(db, "audits"), where("user_id", "==", uid));
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Delete User Account ───────────────────────────────────────────────────────
async function deleteUserAccount(uid) {
    try {
        await deleteAllAudits(uid);
        await deleteDoc(doc(db, "users", uid));
        await auth.currentUser.delete();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ── Auth State Observer ───────────────────────────────────────────────────────
function onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
}

// ── Route Guard ───────────────────────────────────────────────────────────────
function requireAuth() {
    let resolved = false;
    onAuthStateChanged(auth, (user) => {
        if (resolved) return;
        resolved = true;
        if (!user) {
            window.location.href = "login.html";
        }
    });
}

// ── Redirect if Already Logged In ────────────────────────────────────────────
function redirectIfLoggedIn() {
    let resolved = false;
    onAuthStateChanged(auth, (user) => {
        if (resolved) return;
        resolved = true;
        if (user) {
            window.location.href = "dashboard.html";
        }
    });
}

// ── Exports ───────────────────────────────────────────────────────────────────
export {
    auth,
    db,
    signUp,
    signIn,
    signInWithGoogle,
    logOut,
    getUserProfile,
    getUserAudits,
    saveAuditResult,
    updateUserProfile,
    deleteAllAudits,
    deleteUserAccount,
    onAuthChange,
    requireAuth,
    redirectIfLoggedIn
};