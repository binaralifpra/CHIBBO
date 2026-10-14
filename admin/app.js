// Inti website admin: login, cek hak akses admin, navigasi halaman, sidebar, notifikasi pesanan baru,
// dan import data awal otomatis agar data admin & website user langsung sinkron.
import { auth, db } from "../firebase-config.js";
import {
    onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
    doc, getDoc, collection, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { toast } from "./ui.js";
import { databaseKosong, importDataAwal } from "./seed.js";

const layar = {
    memuat: document.getElementById("layarMemuat"),
    login: document.getElementById("layarLogin"),
    ditolak: document.getElementById("layarDitolak"),
    app: document.getElementById("layarApp")
};

function tampilLayar(nama) {
    for (const k in layar) layar[k].style.display = k === nama ? "" : "none";
}

// ===== LOGIN =====
const pesanLogin = document.getElementById("pesanLogin");
function errorLogin(err) {
    const daftar = {
        "auth/invalid-credential": "Email atau password salah.",
        "auth/invalid-email": "Format email tidak valid.",
        "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
        "auth/popup-closed-by-user": "Login Google dibatalkan.",
        "auth/unauthorized-domain": "Domain ini belum diizinkan. Buka lewat http://localhost atau tambahkan domain di Firebase Authentication > Settings."
    };
    pesanLogin.textContent = daftar[err.code] || err.message;
    pesanLogin.style.display = "block";
}

document.getElementById("formLogin").addEventListener("submit", async (e) => {
    e.preventDefault();
    pesanLogin.style.display = "none";
    try {
        await signInWithEmailAndPassword(auth,
            document.getElementById("loginEmail").value.trim(),
            document.getElementById("loginPassword").value);
    } catch (err) { errorLogin(err); }
});

document.getElementById("loginGoogle").addEventListener("click", async () => {
    pesanLogin.style.display = "none";
    try {
        await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) { errorLogin(err); }
});

document.getElementById("keluarDitolak").onclick = () => signOut(auth);
document.getElementById("tombolKeluar").onclick = (e) => {
    e.preventDefault();
    if (confirm("Keluar dari panel admin?")) signOut(auth);
};

// ===== SIDEBAR: bisa disembunyikan, pilihan disimpan di browser =====
const mobile = () => window.matchMedia("(max-width: 860px)").matches;

function ambilPilihan(kunci) {
    try { return localStorage.getItem(kunci); } catch { return null; }
}
function simpanPilihan(kunci, nilai) {
    try { localStorage.setItem(kunci, nilai); } catch { /* storage diblokir */ }
}

if (ambilPilihan("chibboSidebar") === "tersembunyi") document.body.classList.add("sidebar-tersembunyi");

function toggleSidebar() {
    if (mobile()) {
        document.body.classList.toggle("sidebar-buka");
    } else {
        const sembunyi = document.body.classList.toggle("sidebar-tersembunyi");
        simpanPilihan("chibboSidebar", sembunyi ? "tersembunyi" : "tampil");
    }
}

document.getElementById("tombolSidebar").onclick = toggleSidebar;
document.getElementById("sidebarOverlay").onclick = () => document.body.classList.remove("sidebar-buka");
document.getElementById("sidebar").addEventListener("click", (e) => {
    if (e.target.closest("a[data-hal]")) document.body.classList.remove("sidebar-buka");
});

// Pintasan keyboard "[" untuk sembunyikan / tampilkan sidebar
document.addEventListener("keydown", (e) => {
    if (e.key === "[" && !e.target.closest("input, textarea, select") && layar.app.style.display !== "none") {
        toggleSidebar();
    }
});

// ===== MENU PROFIL =====
const tombolProfil = document.getElementById("tombolProfil");
const menuProfil = document.getElementById("menuProfil");
function tutupProfil() {
    menuProfil.style.display = "none";
    tombolProfil.setAttribute("aria-expanded", "false");
}
tombolProfil.onclick = (e) => {
    e.stopPropagation();
    const buka = menuProfil.style.display === "none";
    menuProfil.style.display = buka ? "" : "none";
    tombolProfil.setAttribute("aria-expanded", String(buka));
};
document.addEventListener("click", (e) => {
    if (!e.target.closest(".profil")) tutupProfil();
});
menuProfil.addEventListener("click", (e) => {
    if (e.target.closest("a")) tutupProfil();
});

// ===== ROUTER =====
const HALAMAN = ["home", "dashboard", "pesanan", "menu", "kategori", "outlet", "pelanggan", "laporan", "admin", "pengaturan"];
const konten = document.getElementById("konten");
let bersihkan = null;
let ctx = null;

async function bukaHalaman() {
    let nama = location.hash.replace("#", "").split("?")[0] || "home";
    if (!HALAMAN.includes(nama)) nama = "home";

    document.querySelectorAll(".nav-admin a").forEach(a => {
        a.classList.toggle("aktif", a.dataset.hal === nama);
    });
    document.body.dataset.halaman = nama;

    if (typeof bersihkan === "function") bersihkan();
    bersihkan = null;
    konten.innerHTML = `<div class="memuat">Memuat...</div>`;

    try {
        const modul = await import(`./pages/${nama}.js`);
        bersihkan = await modul.render(konten, ctx);
    } catch (err) {
        console.error(err);
        konten.innerHTML = `<div class="kartu"><h2>Gagal memuat halaman</h2><p>${err.message}</p></div>`;
    }
    window.scrollTo(0, 0);
}

window.addEventListener("hashchange", () => { if (ctx) bukaHalaman(); });

// ===== NOTIFIKASI PESANAN BARU =====
let berhentiNotif = null;
function bunyiNotif() {
    try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.18].forEach((t) => {
            const o = ac.createOscillator();
            const g = ac.createGain();
            o.frequency.value = 880;
            g.gain.setValueAtTime(0.15, ac.currentTime + t);
            g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + 0.15);
            o.connect(g).connect(ac.destination);
            o.start(ac.currentTime + t);
            o.stop(ac.currentTime + t + 0.16);
        });
    } catch { /* browser tidak mendukung audio */ }
}

function mulaiNotifPesanan() {
    const badges = [document.getElementById("badgePesanan"), document.getElementById("badgeNotif")];
    let pertama = true;

    berhentiNotif = onSnapshot(query(collection(db, "orders"), where("status", "==", "menunggu")), (snap) => {
        const jml = snap.size;
        badges.forEach(b => {
            b.textContent = jml;
            b.style.display = jml > 0 ? "" : "none";
        });
        document.title = (jml > 0 ? `(${jml}) ` : "") + "Admin - CHIBBO";

        if (!pertama) {
            snap.docChanges().forEach(ch => {
                if (ch.type === "added" && !ch.doc.metadata.hasPendingWrites) {
                    const o = ch.doc.data();
                    toast(`🔔 Pesanan baru ${o.kode} dari ${o.userNama}`, "info");
                    bunyiNotif();
                }
            });
        }
        pertama = false;
    }, (err) => console.warn("Notifikasi pesanan:", err.message));
}

// ===== SINKRONISASI AWAL =====
// Jika database masih kosong, salin otomatis data menu/kategori/outlet dari website user.
async function siapkanDatabase() {
    try {
        if (await databaseKosong()) {
            toast("Menyalin data menu, kategori & outlet ke database...", "info");
            const { ditambah } = await importDataAwal();
            toast(`✓ ${ditambah} data berhasil disinkronkan dengan website user.`);
        }
        return { ok: true };
    } catch (err) {
        console.warn("Sinkronisasi awal gagal:", err);
        return { ok: false, kode: err.code, pesan: err.message };
    }
}

// ===== CEK ADMIN =====
onAuthStateChanged(auth, async (user) => {
    berhentiNotif?.();
    berhentiNotif = null;
    if (typeof bersihkan === "function") bersihkan();
    bersihkan = null;
    ctx = null;

    if (!user) {
        tampilLayar("login");
        return;
    }

    tampilLayar("memuat");
    let dataAdmin = null;
    let errorCek = null;
    try {
        const snap = await getDoc(doc(db, "admins", user.email.toLowerCase()));
        if (snap.exists()) dataAdmin = snap.data();
    } catch (err) {
        errorCek = err;
        console.warn("Cek admin gagal:", err.message);
    }

    if (!dataAdmin) {
        document.getElementById("emailDitolak").textContent = user.email;
        document.getElementById("alasanDitolak").textContent = errorCek
            ? `Database tidak bisa diakses (${errorCek.code || errorCek.message}). Pastikan Firestore sudah dibuat dan Rules sudah di-Publish.`
            : "Tambahkan email ini di Firestore: koleksi \"admins\", Document ID = email (huruf kecil).";
        tampilLayar("ditolak");
        return;
    }

    window.CHIBBO_DEMO = dataAdmin.demo === true;
    document.body.classList.toggle("mode-demo", window.CHIBBO_DEMO);

    const nama = dataAdmin.nama || user.displayName || user.email.split("@")[0];
    document.getElementById("namaAdmin").textContent = nama.split(" ")[0];
    document.getElementById("namaAdmin2").textContent = nama;
    document.getElementById("emailAdmin").textContent = user.email;
    document.getElementById("avatarAdmin").textContent = nama.charAt(0).toUpperCase();

    tampilLayar("memuat");
    const statusDb = await siapkanDatabase();

    ctx = { user, admin: dataAdmin, nama, statusDb };
    tampilLayar("app");
    mulaiNotifPesanan();
    bukaHalaman();
});

// Isi otomatis akun demo di halaman login
document.getElementById("isiDemo")?.addEventListener("click", () => {
    document.getElementById("loginEmail").value = "admin@email.com";
    document.getElementById("loginPassword").value = "12345678";
});
