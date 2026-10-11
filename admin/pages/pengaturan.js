// Pengaturan toko (buka/tutup, pengumuman, pajak, ongkir, metode bayar) + import data awal
import { db } from "../../firebase-config.js";
import {
    doc, setDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { KATEGORI_AWAL, MENU_AWAL, OUTLET_AWAL, PENGATURAN_AWAL } from "../../data-awal.js";
import { toast, toastError, konfirmasi } from "../ui.js";
import { importDataAwal } from "../seed.js";

export async function render(el) {
    el.innerHTML = `
        <div class="judul-halaman">
            <div>
                <h1>Pengaturan</h1>
                <p>Berlaku langsung di website user.</p>
            </div>
        </div>

        <div class="grid-2">
            <div class="kartu">
                <h2>Toko</h2>
                <form id="formToko">
                    <div class="form-group" style="display:flex;align-items:center;gap:12px">
                        <label class="switch"><input type="checkbox" id="tokoBuka"><span></span></label>
                        <div>
                            <strong id="labelBuka">Toko buka</strong>
                            <div class="bantuan" style="margin:0">Jika tutup, pelanggan tidak bisa memesan.</div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="pengumuman">Pengumuman / Promo (tampil di atas halaman menu)</label>
                        <textarea id="pengumuman" rows="2" placeholder="Contoh: Diskon 20% setiap Jumat!"></textarea>
                    </div>
                    <div class="form-baris">
                        <div class="form-group">
                            <label for="pajak">Pajak (%)</label>
                            <input type="number" id="pajak" min="0" max="100" step="0.5">
                        </div>
                        <div class="form-group">
                            <label for="ongkir">Ongkir Delivery (Rp)</label>
                            <input type="number" id="ongkir" min="0" step="1000">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="metode">Metode Pembayaran (satu per baris)</label>
                        <textarea id="metode" rows="6"></textarea>
                    </div>
                    <button type="submit" class="btn">Simpan Pengaturan</button>
                </form>
            </div>

            <div class="kartu">
                <h2>Import Data Awal</h2>
                <p style="color:#666;margin-bottom:12px">
                    Menyalin data bawaan website (${MENU_AWAL.length} menu, ${KATEGORI_AWAL.length} kategori,
                    ${OUTLET_AWAL.length} outlet, dan pengaturan) ke database.
                </p>
                <p style="color:#666;margin-bottom:16px">
                    Aman dijalankan berulang: data yang <strong>sudah ada tidak akan ditimpa</strong>, hanya yang belum ada yang ditambahkan.
                </p>
                <button id="tombolImport" class="btn btn-garis">Import Data Awal</button>
                <p id="hasilImport" style="margin-top:12px;color:#2f855a;font-weight:600"></p>
            </div>
        </div>
    `;

    const f = (id) => el.querySelector("#" + id);
    const ref = doc(db, "pengaturan", "toko");
    let sudahIsi = false;

    f("tokoBuka").addEventListener("change", () => {
        f("labelBuka").textContent = f("tokoBuka").checked ? "Toko buka" : "Toko tutup";
    });

    const berhenti = onSnapshot(ref, (snap) => {
        // Isi form sekali saja agar tidak menimpa ketikan admin
        if (sudahIsi) return;
        sudahIsi = true;
        const p = { ...PENGATURAN_AWAL, ...(snap.exists() ? snap.data() : {}) };
        f("tokoBuka").checked = p.tokoBuka !== false;
        f("labelBuka").textContent = p.tokoBuka !== false ? "Toko buka" : "Toko tutup";
        f("pengumuman").value = p.pengumuman || "";
        f("pajak").value = p.pajakPersen ?? 0;
        f("ongkir").value = p.ongkirDelivery ?? 0;
        f("metode").value = (p.metodePembayaran || []).join("\n");
    }, (err) => toastError(err, "Gagal memuat pengaturan"));

    f("formToko").addEventListener("submit", async (e) => {
        e.preventDefault();
        const metode = f("metode").value.split("\n").map(s => s.trim()).filter(Boolean);
        if (metode.length === 0) return toast("Minimal satu metode pembayaran.", "error");

        try {
            await setDoc(ref, {
                tokoBuka: f("tokoBuka").checked,
                pengumuman: f("pengumuman").value.trim(),
                pajakPersen: Math.max(0, Number(f("pajak").value) || 0),
                ongkirDelivery: Math.max(0, Math.round(Number(f("ongkir").value) || 0)),
                metodePembayaran: metode,
                updatedAt: serverTimestamp()
            }, { merge: true });
            toast("Pengaturan disimpan.");
        } catch (err) { toastError(err); }
    });

    f("tombolImport").addEventListener("click", async () => {
        if (!await konfirmasi("Import Data Awal", "Tambahkan data bawaan yang belum ada ke database?", "Import", "btn")) return;

        const tombol = f("tombolImport");
        tombol.disabled = true;
        tombol.textContent = "Mengimport...";

        try {
            const { ditambah, total } = await importDataAwal();

            f("hasilImport").textContent = ditambah
                ? `✓ ${ditambah} data ditambahkan, ${total - ditambah} sudah ada (dilewati).`
                : "✓ Semua data awal sudah ada di database.";
            toast("Import selesai.");
            sudahIsi = false;
        } catch (err) {
            toastError(err, "Import gagal");
        } finally {
            tombol.disabled = false;
            tombol.textContent = "Import Data Awal";
        }
    });

    return berhenti;
}
