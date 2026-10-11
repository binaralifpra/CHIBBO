// Akses data untuk website user.
// Semua data (menu, kategori, outlet, pengaturan) diambil dari Firestore yang dikelola admin.
// Jika Firestore kosong / tidak bisa diakses, dipakai data cadangan dari data-awal.js.
import { db } from "./firebase-config.js";
import {
    collection, doc, getDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { KATEGORI_AWAL, MENU_AWAL, OUTLET_AWAL, PENGATURAN_AWAL } from "./data-awal.js";

function urutkan(list) {
    return list.sort((a, b) => (a.urutan ?? 999) - (b.urutan ?? 999) || a.nama.localeCompare(b.nama));
}

// Dengarkan perubahan sebuah koleksi secara realtime. callback(list, dariCadangan)
function dengarKoleksi(nama, cadangan, callback) {
    return onSnapshot(collection(db, nama), (snap) => {
        if (snap.empty) {
            callback(urutkan(cadangan.map(x => ({ ...x }))), true);
            return;
        }
        callback(urutkan(snap.docs.map(d => ({ id: d.id, ...d.data() }))), false);
    }, (err) => {
        console.warn(`Gagal membaca "${nama}" dari Firestore, memakai data cadangan:`, err.message);
        callback(urutkan(cadangan.map(x => ({ ...x }))), true);
    });
}

export const dengarMenu     = (cb) => dengarKoleksi("menu", MENU_AWAL, cb);
export const dengarKategori = (cb) => dengarKoleksi("kategori", KATEGORI_AWAL, cb);
export const dengarOutlet   = (cb) => dengarKoleksi("outlets", OUTLET_AWAL, cb);

export function dengarPengaturan(callback) {
    return onSnapshot(doc(db, "pengaturan", "toko"), (snap) => {
        callback({ ...PENGATURAN_AWAL, ...(snap.exists() ? snap.data() : {}) });
    }, () => callback({ ...PENGATURAN_AWAL }));
}

export async function ambilMenu(id) {
    try {
        const snap = await getDoc(doc(db, "menu", id));
        if (snap.exists()) return { id: snap.id, ...snap.data() };
    } catch (err) {
        console.warn("Gagal membaca menu:", err.message);
    }
    return MENU_AWAL.find(m => m.id === id) || null;
}

export function rupiah(angka) {
    return "Rp " + Number(angka || 0).toLocaleString("id-ID");
}

// Hindari HTML injection dari data yang diisi admin
export function esc(teks) {
    return String(teks ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}
