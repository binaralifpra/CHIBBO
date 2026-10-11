// Dashboard: ringkasan hari ini, pesanan terbaru, stok menipis
import { db } from "../../firebase-config.js";
import {
    collection, query, where, orderBy, limit, onSnapshot, Timestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { rupiah, esc, formatWaktu, awalHari, srcGambar, kosong } from "../ui.js";
import { badgeStatus, tombolAksi, pasangAksiStatus, bukaDetailPesanan } from "../pesanan-aksi.js";

export async function render(el, ctx) {
    el.innerHTML = `
        <div class="judul-halaman">
            <div>
                <h1>Dashboard</h1>
                <p>Halo, ${esc(ctx.admin.nama || ctx.user.displayName || ctx.user.email)}. Ini ringkasan hari ini.</p>
            </div>
            <a href="#pesanan" class="btn">Kelola Pesanan</a>
        </div>

        <div id="infoKosong"></div>

        <div class="grid-stat">
            <div class="stat"><div class="label">Pendapatan Hari Ini</div><div class="nilai" id="sPendapatan">-</div><div class="ket">tidak termasuk pesanan batal</div></div>
            <div class="stat"><div class="label">Pesanan Hari Ini</div><div class="nilai" id="sPesanan">-</div><div class="ket" id="sPesananKet">&nbsp;</div></div>
            <div class="stat" style="border-left-color:var(--oranye)"><div class="label">Menunggu Konfirmasi</div><div class="nilai" id="sMenunggu">-</div><div class="ket">perlu ditindaklanjuti</div></div>
            <div class="stat" style="border-left-color:#555"><div class="label">Stok Menipis / Habis</div><div class="nilai" id="sStok">-</div><div class="ket">stok ≤ 5</div></div>
        </div>

        <div class="grid-2">
            <div class="kartu">
                <div class="kartu-head">
                    <h2>Pesanan Terbaru</h2>
                    <a href="#pesanan">Lihat semua →</a>
                </div>
                <div class="tabel-wadah">
                    <table class="tabel">
                        <thead><tr><th>Kode</th><th>Pelanggan</th><th>Status</th><th class="angka">Total</th><th></th></tr></thead>
                        <tbody id="tbTerbaru"><tr><td colspan="5" class="memuat">Memuat...</td></tr></tbody>
                    </table>
                </div>
            </div>

            <div class="kartu">
                <div class="kartu-head">
                    <h2>Stok Menipis</h2>
                    <a href="#menu">Kelola stok →</a>
                </div>
                <div id="daftarStok" class="memuat">Memuat...</div>
            </div>
        </div>
    `;

    const unsub = [];
    let terbaru = [];

    // Pesanan hari ini
    const qHariIni = query(collection(db, "orders"), where("createdAt", ">=", Timestamp.fromDate(awalHari())));
    unsub.push(onSnapshot(qHariIni, (snap) => {
        const list = snap.docs.map(d => d.data());
        const valid = list.filter(o => o.status !== "dibatalkan");
        el.querySelector("#sPendapatan").textContent = rupiah(valid.reduce((t, o) => t + (o.total || 0), 0));
        el.querySelector("#sPesanan").textContent = list.length;
        const selesai = list.filter(o => o.status === "selesai").length;
        const batal = list.length - valid.length;
        el.querySelector("#sPesananKet").textContent = `${selesai} selesai · ${batal} batal`;
    }));

    // Menunggu konfirmasi (semua tanggal)
    unsub.push(onSnapshot(query(collection(db, "orders"), where("status", "==", "menunggu")), (snap) => {
        el.querySelector("#sMenunggu").textContent = snap.size;
    }));

    // 8 pesanan terbaru
    const tb = el.querySelector("#tbTerbaru");
    unsub.push(onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(8)), (snap) => {
        terbaru = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (terbaru.length === 0) {
            tb.innerHTML = `<tr><td colspan="5">${kosong("Belum ada pesanan.")}</td></tr>`;
            return;
        }
        tb.innerHTML = terbaru.map(o => `
            <tr data-id="${o.id}" style="cursor:pointer">
                <td><strong>${esc(o.kode)}</strong><br><small style="color:#999">${formatWaktu(o.createdAt)}</small></td>
                <td>${esc(o.userNama)}<br><small style="color:#999">${esc(o.outlet)}</small></td>
                <td>${badgeStatus(o)}</td>
                <td class="angka">${rupiah(o.total)}</td>
                <td class="aksi">${tombolAksi(o)}</td>
            </tr>`).join("");
    }, (err) => { tb.innerHTML = `<tr><td colspan="5">${kosong(err.message)}</td></tr>`; }));

    pasangAksiStatus(tb, id => terbaru.find(o => o.id === id));
    tb.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        const tr = e.target.closest("tr[data-id]");
        const o = tr && terbaru.find(x => x.id === tr.dataset.id);
        if (o) bukaDetailPesanan(o);
    });

    // Stok menipis
    unsub.push(onSnapshot(collection(db, "menu"), (snap) => {
        const menu = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const info = el.querySelector("#infoKosong");
        info.innerHTML = menu.length === 0 ? `
            <div class="info-box">
                <strong>Database menu masih kosong.</strong>
                Website user saat ini menampilkan data cadangan.
                Buka <a href="#pengaturan">Pengaturan → Import Data Awal</a> untuk memindahkan semua menu, kategori, dan outlet ke database.
            </div>` : "";

        const tipis = menu.filter(m => m.aktif !== false && Number(m.stok) <= 5).sort((a, b) => a.stok - b.stok);
        el.querySelector("#sStok").textContent = tipis.length;
        const wadah = el.querySelector("#daftarStok");
        wadah.className = "";
        wadah.innerHTML = tipis.length === 0 ? kosong("Semua stok aman 👍") : `
            <div class="tabel-wadah"><table class="tabel"><tbody>
            ${tipis.slice(0, 10).map(m => `
                <tr>
                    <td style="width:60px"><img class="thumb" src="${esc(srcGambar(m.gambar))}" alt=""></td>
                    <td class="nama-sel"><strong>${esc(m.nama)}</strong></td>
                    <td class="angka">${Number(m.stok) <= 0
                        ? `<span class="badge badge-merah">Habis</span>`
                        : `<span class="badge badge-oranye">Sisa ${m.stok}</span>`}</td>
                </tr>`).join("")}
            </tbody></table></div>`;
    }));

    return () => unsub.forEach(u => u());
}
