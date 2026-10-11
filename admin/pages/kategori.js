// Kelola kategori menu (menjadi tombol filter di halaman menu user)
import { db } from "../../firebase-config.js";
import {
    collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { slug } from "../../data-awal.js";
import { esc, kosong, toast, toastError, bukaModal, konfirmasi } from "../ui.js";

export async function render(el) {
    el.innerHTML = `
        <div class="judul-halaman">
            <div>
                <h1>Kategori</h1>
                <p>Kategori tampil sebagai filter di halaman menu website user.</p>
            </div>
            <button id="tombolTambah" class="btn">+ Tambah Kategori</button>
        </div>
        <div class="kartu">
            <div class="tabel-wadah">
                <table class="tabel">
                    <thead><tr><th class="angka">Urutan</th><th>Nama</th><th>ID (untuk link)</th><th class="angka">Jumlah Menu</th><th></th></tr></thead>
                    <tbody id="tb"><tr><td colspan="5" class="memuat">Memuat...</td></tr></tbody>
                </table>
            </div>
            <p style="color:#999;font-size:0.85rem;margin-top:12px">
                Link langsung ke kategori: <code>menu.html?kategori=ID</code>
            </p>
        </div>
    `;

    let KATEGORI = [];
    let MENU = [];
    const tb = el.querySelector("#tb");
    const unsub = [];

    function renderTabel() {
        if (KATEGORI.length === 0) {
            tb.innerHTML = `<tr><td colspan="5">${kosong("Belum ada kategori.")}</td></tr>`;
            return;
        }
        tb.innerHTML = KATEGORI.map(k => `
            <tr data-id="${esc(k.id)}">
                <td class="angka">${esc(k.urutan ?? "-")}</td>
                <td><strong>${esc(k.nama)}</strong></td>
                <td><code>${esc(k.id)}</code></td>
                <td class="angka">${MENU.filter(m => m.kategori === k.id).length}</td>
                <td class="aksi">
                    <button class="btn-ikon" data-edit title="Edit">✏️</button>
                    <button class="btn-ikon" data-hapus title="Hapus">🗑️</button>
                </td>
            </tr>`).join("");
    }

    function bukaForm(k = null) {
        const baru = !k;
        bukaModal({
            judul: baru ? "Tambah Kategori" : "Edit Kategori",
            lebar: 440,
            isi: `
                <div id="fError" class="pesan-error" style="display:none"></div>
                <div class="form-group">
                    <label>Nama Kategori</label>
                    <input id="fNama" value="${esc(k?.nama || "")}" placeholder="Contoh: Rice Bowl">
                </div>
                <div class="form-group">
                    <label>Urutan</label>
                    <input id="fUrutan" type="number" min="1" value="${esc(k?.urutan ?? KATEGORI.length + 1)}">
                </div>
            `,
            tombol: [
                { label: "Batal", kelas: "btn-abu" },
                {
                    label: "Simpan", aksi: async (mdl) => {
                        const nama = mdl.querySelector("#fNama").value.trim();
                        const urutan = Number(mdl.querySelector("#fUrutan").value) || 999;
                        const err = mdl.querySelector("#fError");
                        if (!nama) {
                            err.textContent = "Nama wajib diisi.";
                            err.style.display = "block";
                            return false;
                        }
                        try {
                            if (baru) {
                                const id = slug(nama);
                                if ((await getDoc(doc(db, "kategori", id))).exists()) {
                                    err.textContent = "Kategori dengan nama ini sudah ada.";
                                    err.style.display = "block";
                                    return false;
                                }
                                await setDoc(doc(db, "kategori", id), { nama, urutan });
                            } else {
                                await updateDoc(doc(db, "kategori", k.id), { nama, urutan });
                            }
                            toast("Kategori disimpan.");
                        } catch (e) {
                            toastError(e);
                            return false;
                        }
                    }
                }
            ]
        });
    }

    tb.addEventListener("click", async (e) => {
        const tr = e.target.closest("tr[data-id]");
        const k = tr && KATEGORI.find(x => x.id === tr.dataset.id);
        if (!k) return;

        if (e.target.closest("[data-edit]")) bukaForm(k);
        if (e.target.closest("[data-hapus]")) {
            const dipakai = MENU.filter(m => m.kategori === k.id).length;
            if (dipakai > 0) {
                toast(`Tidak bisa dihapus: masih dipakai ${dipakai} menu. Pindahkan menunya dulu.`, "error");
                return;
            }
            if (await konfirmasi("Hapus Kategori", `Hapus kategori "${k.nama}"?`, "Hapus")) {
                try {
                    await deleteDoc(doc(db, "kategori", k.id));
                    toast("Kategori dihapus.");
                } catch (err) { toastError(err); }
            }
        }
    });

    el.querySelector("#tombolTambah").onclick = () => bukaForm();

    unsub.push(onSnapshot(collection(db, "kategori"), (snap) => {
        KATEGORI = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.urutan ?? 999) - (b.urutan ?? 999));
        renderTabel();
    }, (err) => { tb.innerHTML = `<tr><td colspan="5">${kosong(err.message)}</td></tr>`; }));

    unsub.push(onSnapshot(collection(db, "menu"), (snap) => {
        MENU = snap.docs.map(d => d.data());
        renderTabel();
    }));

    return () => unsub.forEach(u => u());
}
