// Daftar pelanggan (akun yang pernah login di website user) + statistik belanja
import { db } from "../../firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { rupiah, esc, formatWaktu, kosong, bukaModal, unduhCSV, isoTanggal, keDate } from "../ui.js";
import { badgeStatus, bukaDetailPesanan } from "../pesanan-aksi.js";

export async function render(el) {
    el.innerHTML = `
        <div class="judul-halaman">
            <div>
                <h1>Pelanggan</h1>
                <p>Akun yang pernah login di website user.</p>
            </div>
            <div style="display:flex;gap:10px">
                <button id="tombolMuat" class="btn btn-garis">↻ Muat Ulang</button>
                <button id="tombolCSV" class="btn btn-garis">⬇ CSV</button>
            </div>
        </div>
        <div class="kartu">
            <div class="toolbar">
                <input type="search" id="cari" class="input cari" placeholder="Cari nama / email...">
                <select id="urut" class="input">
                    <option value="belanja">Urut: total belanja</option>
                    <option value="pesanan">Urut: jumlah pesanan</option>
                    <option value="login">Urut: login terakhir</option>
                </select>
            </div>
            <div class="tabel-wadah">
                <table class="tabel">
                    <thead><tr><th>Pelanggan</th><th>Login via</th><th>Login Terakhir</th><th class="angka">Pesanan</th><th class="angka">Total Belanja</th></tr></thead>
                    <tbody id="tb"><tr><td colspan="5" class="memuat">Memuat...</td></tr></tbody>
                </table>
            </div>
        </div>
    `;

    const tb = el.querySelector("#tb");
    let PELANGGAN = [];
    let ORDERS = [];

    async function muat() {
        tb.innerHTML = `<tr><td colspan="5" class="memuat">Memuat...</td></tr>`;
        try {
            const [snapUser, snapOrder] = await Promise.all([
                getDocs(collection(db, "users")),
                getDocs(collection(db, "orders"))
            ]);
            ORDERS = snapOrder.docs.map(d => ({ id: d.id, ...d.data() }));

            const peta = new Map();
            snapUser.docs.forEach(d => peta.set(d.id, { uid: d.id, ...d.data(), pesanan: 0, belanja: 0 }));

            // Pelanggan yang punya pesanan tapi belum ada profil
            ORDERS.forEach(o => {
                if (!peta.has(o.userId)) {
                    peta.set(o.userId, { uid: o.userId, nama: o.userNama, email: o.userEmail, pesanan: 0, belanja: 0 });
                }
                const p = peta.get(o.userId);
                p.pesanan++;
                if (o.status !== "dibatalkan") p.belanja += o.total || 0;
            });

            PELANGGAN = [...peta.values()];
            renderTabel();
        } catch (err) {
            tb.innerHTML = `<tr><td colspan="5">${kosong("Gagal memuat: " + err.message)}</td></tr>`;
        }
    }

    function terfilter() {
        const kata = el.querySelector("#cari").value.trim().toLowerCase();
        const urut = el.querySelector("#urut").value;
        return PELANGGAN
            .filter(p => !kata || `${p.nama} ${p.email}`.toLowerCase().includes(kata))
            .sort((a, b) =>
                urut === "pesanan" ? b.pesanan - a.pesanan :
                urut === "login" ? (keDate(b.terakhirLogin)?.getTime() || 0) - (keDate(a.terakhirLogin)?.getTime() || 0) :
                b.belanja - a.belanja);
    }

    function renderTabel() {
        const list = terfilter();
        if (list.length === 0) {
            tb.innerHTML = `<tr><td colspan="5">${kosong("Belum ada pelanggan.")}</td></tr>`;
            return;
        }
        tb.innerHTML = list.map(p => `
            <tr data-uid="${esc(p.uid)}" style="cursor:pointer">
                <td class="nama-sel"><strong>${esc(p.nama || "-")}</strong><small>${esc(p.email || "")}</small></td>
                <td>${p.provider === "google.com" ? "Google" : p.provider ? "Email" : "-"}</td>
                <td>${formatWaktu(p.terakhirLogin)}</td>
                <td class="angka">${p.pesanan}</td>
                <td class="angka">${rupiah(p.belanja)}</td>
            </tr>`).join("");
    }

    tb.addEventListener("click", (e) => {
        const tr = e.target.closest("tr[data-uid]");
        const p = tr && PELANGGAN.find(x => x.uid === tr.dataset.uid);
        if (!p) return;
        const pesanan = ORDERS.filter(o => o.userId === p.uid)
            .sort((a, b) => (keDate(b.createdAt)?.getTime() || 0) - (keDate(a.createdAt)?.getTime() || 0));

        const { el: modal, tutup } = bukaModal({
            judul: p.nama || p.email,
            lebar: 640,
            isi: `
                <p style="color:#666;margin-bottom:12px">${esc(p.email)} · ${p.pesanan} pesanan · ${rupiah(p.belanja)}</p>
                ${pesanan.length === 0 ? kosong("Belum pernah memesan.") : `
                <div class="tabel-wadah"><table class="tabel">
                    <thead><tr><th>Kode</th><th>Waktu</th><th>Status</th><th class="angka">Total</th></tr></thead>
                    <tbody>${pesanan.map(o => `
                        <tr data-id="${o.id}" style="cursor:pointer">
                            <td><strong>${esc(o.kode)}</strong></td><td>${formatWaktu(o.createdAt)}</td>
                            <td>${badgeStatus(o)}</td><td class="angka">${rupiah(o.total)}</td>
                        </tr>`).join("")}
                    </tbody>
                </table></div>`}
            `
        });
        modal.addEventListener("click", (ev) => {
            const r = ev.target.closest("tr[data-id]");
            const o = r && pesanan.find(x => x.id === r.dataset.id);
            if (o) { tutup(); bukaDetailPesanan(o); }
        });
    });

    el.querySelector("#cari").addEventListener("input", renderTabel);
    el.querySelector("#urut").addEventListener("change", renderTabel);
    el.querySelector("#tombolMuat").onclick = muat;
    el.querySelector("#tombolCSV").onclick = () => unduhCSV(`pelanggan-chibbo-${isoTanggal(new Date())}.csv`, [
        ["Nama", "Email", "Login Terakhir", "Jumlah Pesanan", "Total Belanja"],
        ...terfilter().map(p => [p.nama, p.email, formatWaktu(p.terakhirLogin), p.pesanan, p.belanja])
    ]);

    await muat();
}
