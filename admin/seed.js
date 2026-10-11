// Import data bawaan website user (data-awal.js) ke Firestore.
// Hanya menambah dokumen yang belum ada — data yang sudah diubah admin tidak pernah ditimpa.
import { db } from "../firebase-config.js";
import {
    collection, doc, getDoc, getDocs, query, limit, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { KATEGORI_AWAL, MENU_AWAL, OUTLET_AWAL, PENGATURAN_AWAL } from "../data-awal.js";

export async function importDataAwal() {
    const tugas = [
        ...KATEGORI_AWAL.map(({ id, ...d }) => ({ ref: doc(db, "kategori", id), data: d })),
        ...MENU_AWAL.map(({ id, ...d }) => ({ ref: doc(db, "menu", id), data: { ...d, createdAt: serverTimestamp() } })),
        ...OUTLET_AWAL.map(({ id, ...d }, i) => ({ ref: doc(db, "outlets", id), data: { ...d, urutan: i + 1 } })),
        { ref: doc(db, "pengaturan", "toko"), data: PENGATURAN_AWAL }
    ];

    const ada = await Promise.all(tugas.map(t => getDoc(t.ref).then(s => s.exists())));
    const baru = tugas.filter((_, i) => !ada[i]);

    for (let i = 0; i < baru.length; i += 450) {
        const batch = writeBatch(db);
        baru.slice(i, i + 450).forEach(t => batch.set(t.ref, t.data));
        await batch.commit();
    }

    return { ditambah: baru.length, total: tugas.length };
}

// true jika belum ada satu pun menu / kategori / outlet di database
export async function databaseKosong() {
    const cek = await Promise.all(["menu", "kategori", "outlets"].map(
        nama => getDocs(query(collection(db, nama), limit(1))).then(s => s.empty)
    ));
    return cek.some(Boolean);
}
