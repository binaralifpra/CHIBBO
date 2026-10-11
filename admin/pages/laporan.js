// Laporan penjualan: pendapatan harian, menu terlaris, per outlet / layanan / metode bayar
import { db } from "../../firebase-config.js";
import {
    collection, query, where, orderBy, getDocs, Timestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { NAMA_LAYANAN } from "../../data-awal.js";
import { rupiah, esc, kosong, awalHari, isoTanggal, keDate, unduhCSV } from "../ui.js";

export async function render(el) {
    const hariIni = awalHari();
    const tujuhHari = new Date(hariIni);
    tujuhHari.setDate(tujuhHari.getDate() - 6);

    el.innerHTML = `
        <div class="judul-halaman">
            <div>
                <h1>Laporan Penjualan</h1>
                <p>Pesanan yang dibatalkan tidak dihitung sebagai pendapatan.</p>
            </div>
            <button id="tombolCSV" class="btn btn-garis">⬇ Export CSV</button>
        </div>

        <div class="kartu">
            <div class="toolbar" style="margin-bottom:0">
                <label>Dari <input type="date" id="dari" class="input" value="${isoTanggal(tujuhHari)}"></label>
                <label>Sampai <input type="date" id="sampai" class="input" value="${isoTanggal(hariIni)}"></label>
                <button class="chip" data-preset="0">Hari ini</button>
                <button class="chip" data-preset="6">7 hari</button>
                <button class="chip" data-preset="29">30 hari</button>
                <button class="chip" data-preset="bulan">Bulan ini</button>
            </div>
        </div>

        <div id="isi"><div class="memuat">Memuat...</div></div>
    `;

    const isi = el.querySelector("#isi");
    const dari = el.querySelector("#dari");
    const sampai = el.querySelector("#sampai");
    let harian = [];
    let ordersValid = [];

    el.querySelectorAll("[data-preset]").forEach(b => b.onclick = () => {
        const akhir = awalHari();
        const awal = new Date(akhir);
        if (b.dataset.preset === "bulan") awal.setDate(1);
        else awal.setDate(awal.getDate() - Number(b.dataset.preset));
        dari.value = isoTanggal(awal);
        sampai.value = isoTanggal(akhir);
        muat();
    });
    [dari, sampai].forEach(i => i.addEventListener("change", muat));

    async function muat() {
        const awal = new Date(dari.value + "T00:00:00");
        const akhir = new Date(sampai.value + "T00:00:00");
        akhir.setDate(akhir.getDate() + 1);
        if (isNaN(awal) || isNaN(akhir) || awal >= akhir) {
            isi.innerHTML = `<div class="kartu">${kosong("Rentang tanggal tidak valid.")}</div>`;
            return;
        }

        isi.innerHTML = `<div class="memuat">Memuat...</div>`;
        let orders;
        try {
            const snap = await getDocs(query(collection(db, "orders"),
                where("createdAt", ">=", Timestamp.fromDate(awal)),
                where("createdAt", "<", Timestamp.fromDate(akhir)),
                orderBy("createdAt", "asc")));
            orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (err) {
            isi.innerHTML = `<div class="kartu">${kosong("Gagal memuat: " + err.message)}</div>`;
            return;
        }

        ordersValid = orders.filter(o => o.status !== "dibatalkan");
        const batal = orders.length - ordersValid.length;
        const pendapatan = ordersValid.reduce((t, o) => t + (o.total || 0), 0);
        const itemTerjual = ordersValid.reduce((t, o) => t + (o.items || []).reduce((s, i) => s + i.qty, 0), 0);

        // Per hari
        const petaHari = new Map();
        for (let d = new Date(awal); d < akhir; d.setDate(d.getDate() + 1)) {
            petaHari.set(isoTanggal(d), { tanggal: new Date(d), pesanan: 0, pendapatan: 0 });
        }
        ordersValid.forEach(o => {
            const h = petaHari.get(isoTanggal(keDate(o.createdAt)));
            if (h) { h.pesanan++; h.pendapatan += o.total || 0; }
        });
        harian = [...petaHari.values()];

        // Menu terlaris
        const petaMenu = new Map();
        ordersValid.forEach(o => (o.items || []).forEach(i => {
            const m = petaMenu.get(i.nama) || { nama: i.nama, qty: 0, pendapatan: 0 };
            m.qty += i.qty;
            m.pendapatan += i.subtotal || i.harga * i.qty;
            petaMenu.set(i.nama, m);
        }));
        const terlaris = [...petaMenu.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);

        const kelompok = (kunci, label = (x) => x) => {
            const p = new Map();
            ordersValid.forEach(o => {
                const k = label(o[kunci] || "-");
                const v = p.get(k) || { nama: k, pesanan: 0, pendapatan: 0 };
                v.pesanan++;
                v.pendapatan += o.total || 0;
                p.set(k, v);
            });
            return [...p.values()].sort((a, b) => b.pendapatan - a.pendapatan);
        };

        isi.innerHTML = `
            <div class="grid-stat">
                <div class="stat"><div class="label">Pendapatan</div><div class="nilai">${rupiah(pendapatan)}</div><div class="ket">${harian.length} hari</div></div>
                <div class="stat"><div class="label">Pesanan</div><div class="nilai">${ordersValid.length}</div><div class="ket">${batal} dibatalkan</div></div>
                <div class="stat"><div class="label">Rata-rata per Pesanan</div><div class="nilai">${rupiah(ordersValid.length ? Math.round(pendapatan / ordersValid.length) : 0)}</div><div class="ket">&nbsp;</div></div>
                <div class="stat"><div class="label">Item Terjual</div><div class="nilai">${itemTerjual.toLocaleString("id-ID")}</div><div class="ket">porsi</div></div>
            </div>

            <div class="kartu">
                <h2>Pendapatan Harian</h2>
                ${grafikHarian(harian)}
            </div>

            <div class="grid-2" style="margin-bottom:24px">
                <div class="kartu">
                    <h2>Menu Terlaris</h2>
                    ${barList(terlaris, x => x.qty, x => `${x.qty} porsi · ${rupiah(x.pendapatan)}`)}
                </div>
                <div class="kartu">
                    <h2>Per Outlet</h2>
                    ${tabelRingkas(kelompok("outlet"))}
                    <h2 style="margin-top:20px">Per Layanan</h2>
                    ${tabelRingkas(kelompok("layanan", k => NAMA_LAYANAN[k] || k))}
                    <h2 style="margin-top:20px">Per Metode Pembayaran</h2>
                    ${tabelRingkas(kelompok("metodePembayaran"))}
                </div>
            </div>

            <div class="kartu">
                <h2>Rincian Harian</h2>
                <div class="tabel-wadah">
                    <table class="tabel">
                        <thead><tr><th>Tanggal</th><th class="angka">Pesanan</th><th class="angka">Pendapatan</th></tr></thead>
                        <tbody>${harian.slice().reverse().map(h => `
                            <tr><td>${h.tanggal.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</td>
                            <td class="angka">${h.pesanan}</td><td class="angka">${rupiah(h.pendapatan)}</td></tr>`).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function grafikHarian(data) {
        if (data.every(h => h.pendapatan === 0)) return kosong("Belum ada penjualan pada periode ini.");
        const maks = Math.max(...data.map(h => h.pendapatan));
        const langkahLabel = Math.ceil(data.length / 10);
        const fmt = (d) => d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
        return `
            <div class="grafik" role="img" aria-label="Grafik pendapatan harian">
                ${data.map(h => `
                    <div class="kolom">
                        <div class="batang" style="height:${(h.pendapatan / maks) * 100}%"></div>
                        <div class="tip">${fmt(h.tanggal)}<br><strong>${rupiah(h.pendapatan)}</strong> · ${h.pesanan} pesanan</div>
                    </div>`).join("")}
            </div>
            <div class="grafik-label">
                ${data.map((h, i) => `<span>${i % langkahLabel === 0 ? fmt(h.tanggal) : ""}</span>`).join("")}
            </div>
            <p style="color:#999;font-size:0.8rem;margin-top:8px">Puncak: ${rupiah(maks)} · arahkan kursor ke batang untuk detail.</p>`;
    }

    function barList(list, nilai, teks) {
        if (list.length === 0) return kosong("Belum ada data.");
        const maks = Math.max(...list.map(nilai));
        return `<div class="bar-list">${list.map(x => `
            <div class="bar-baris">
                <div class="atas"><span>${esc(x.nama)}</span><span>${teks(x)}</span></div>
                <div class="bar-jalur"><div class="bar-isi" style="width:${(nilai(x) / maks) * 100}%"></div></div>
            </div>`).join("")}</div>`;
    }

    function tabelRingkas(list) {
        if (list.length === 0) return kosong("Belum ada data.");
        return `<div class="tabel-wadah"><table class="tabel"><tbody>${list.map(x => `
            <tr><td>${esc(x.nama)}</td><td class="angka">${x.pesanan} pesanan</td><td class="angka">${rupiah(x.pendapatan)}</td></tr>`).join("")}
        </tbody></table></div>`;
    }

    el.querySelector("#tombolCSV").onclick = () => unduhCSV(`laporan-chibbo-${dari.value}_${sampai.value}.csv`, [
        ["Kode", "Tanggal", "Pelanggan", "Outlet", "Layanan", "Metode", "Subtotal", "Pajak", "Ongkir", "Total"],
        ...ordersValid.map(o => [
            o.kode, keDate(o.createdAt)?.toLocaleString("id-ID"), o.userNama, o.outlet,
            NAMA_LAYANAN[o.layanan] || o.layanan, o.metodePembayaran, o.subtotal, o.pajak, o.ongkir, o.total
        ])
    ]);

    await muat();
}
