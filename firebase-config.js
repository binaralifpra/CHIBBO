// Konfigurasi Firebase CHIBBO (Firebase JS SDK via CDN, modular)
// Dipakai bersama oleh website user dan website admin.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCxS-mSO-mzyC5jEsld3y7znnMOxWzLX28",
    authDomain: "mytest-7fe3c.firebaseapp.com",
    projectId: "mytest-7fe3c",
    storageBucket: "mytest-7fe3c.firebasestorage.app",
    messagingSenderId: "996991431453",
    appId: "1:996991431453:web:1ced2385c4f7b49f4be7f4",
    measurementId: "G-DMTTNJC2R9"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics hanya jalan di browser yang mendukung
isSupported().then((ok) => {
    if (ok) getAnalytics(app);
});

// Simpan / perbarui profil user di koleksi "users" (dipakai admin di halaman Pelanggan)
export async function simpanProfilUser(user) {
    try {
        await setDoc(doc(db, "users", user.uid), {
            nama: user.displayName || user.email.split("@")[0],
            email: user.email,
            foto: user.photoURL || "",
            provider: user.providerData[0]?.providerId || "password",
            terakhirLogin: serverTimestamp()
        }, { merge: true });
    } catch (err) {
        console.warn("Gagal menyimpan profil user:", err.message);
    }
}
