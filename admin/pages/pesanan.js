// Kelola pesanan: realtime, filter status/outlet/layanan/periode, ubah status, batalkan, cetak struk
import { db } from "../../firebase-config.js";
import {
    collection, query, where, orderBy, limit, onSnapshot, Timestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { NAMA_LAYANAN, STATUS_PESANAN } from "../../data-awal.js";
import { rupiah, esc, formatWaktu, awalHari, kosong, unduhCSV, isoTanggal } from "../ui.js";
import { badgeStatus, tombolAksi, pasangAksiStatus, bukaDetailPesanan, labelStatus } from "../pesanan-aksi.js";

const STATUS_CHIP = [
    { id: "aktif", label: "Perlu Diproses" },
    { id: "semua", label: "Semua" },
    ...Object.keys(STATUS_PESANAN).map(id => ({ id, label: STATUS_PESANAN[id].label }))
];

export async function render(el) {
    el.innerHTML = `
        <div class="judul-halaman">
            <div>
                <h1>Pesanan</h1>
                <p>Pesanan masuk secara realtime dari website user.</p>
            </div>
            <button id="tombolCSV" class="btn btn-garis">⬇ Export CSV</button>
        </div>

        <div class="kartu">
            <div class="toolbar">
                <input type="search" id="cari" class="input cari" placeholder="Cari kode / nama / email / HP...">
                <select id="periode" class="input">
                    <option value="0">Hari ini</option>
                    <option value="7">7 hari terakhir</option>
                    <option value="30">30 hari terakhir</option>
                    <option value="semua">Semua (300 terbaru)</option>
                </select>
                <select id="fOutlet" class="input"><option value="">Semua outlet</option></select>
                <select id="fLayanan" class="input">
                    <option value="">Semua layanan</option>
                    ${Object.entries(NAMA_LAYANAN).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}
                </select>
            </div>
            <div id="chips" class="chips"></div>
            <div id="daftar" class="daftar-order"><div class="memuat">Memuat...</div></div>
        </div>
    `;

    let semua = [];
    let statusAktif = "aktif";
    let berhenti = null;
    let idLama = new Set();
    let pertama = true;

    const daftar = el.querySelector("#daftar");
    const cari = el.querySelector("#cari");
    const periode = el.querySelector("#periode");
    const fOutlet = el.querySelector("#fOutlet");
    const fLayanan = el.querySelector("#fLayanan");

    function terfilterTanpaStatus() {
        const kata = cari.value.trim().toLowerCase();
        return semua.filter(o =>
            (!fOutlet.value || o.outlet === fOutlet.value) &&
            (!fLayanan.value || o.layanan === fLayanan.value) &&
            (!kata || [o.kode, o.userNama, o.userEmail, o.telepon].some(v => String(v || "").toLowerCase().includes(kata)))
        );
    }

    function cocokStatus(o, s) {
        if (s === "semua") return true;
        if (s === "aktif") return ["menunggu", "diproses", "siap", "dikirim"].includes(o.status);
        return o.status === s;
    }

    function renderChips(list) {
        el.querySelector("#chips").innerHTML = STATUS_CHIP.map(c => `
            <button class="chip ${c.id === statusAktif ? "aktif" : ""}" data-status="${c.id}">
                ${esc(c.label)}<span class="jml">(${list.filter(o => cocokStatus(o, c.id)).length})</span>
            </button>`).join("");
    }

    function renderDaftar() {
        const dasar = terfilterTanpaStatus();
        renderChips(dasar);
        const list = dasar.filter(o => cocokStatus(o, statusAktif));

        if (list.length === 0) {
            daftar.innerHTML = kosong("Tidak ada pesanan.");
            return;
        }

        daftar.innerHTML = list.map(o => `
            <div class="order-kartu ${!pertama && !idLama.has(o.id) ? "baru" : ""}"
                 data-id="${o.id}" style="border-top-color:${STATUS_PESANAN[o.status]?.warna || "#ddd"};cursor:pointer">
                <div class="order-kepala">
                    <div>
                        <div class="order-kode">${esc(o.kode)}</div>
                        <div class="order-meta">${formatWaktu(o.createdAt)}</div>
                    </div>
                    ${badgeStatus(o)}
                </div>
                <div style="font-size:0.9rem">
                    <strong>${esc(o.userNama)}</strong> · ${esc(o.telepon || "")}<br>
                    <span style="color:#666">${esc(o.outlet)} · ${esc(NAMA_LAYANAN[o.layanan] || o.layanan)}</span>
                    ${o.alamat ? `<br><span style="color:#666">📍 ${esc(o.alamat)}</span>` : ""}
                </div>
                <div class="order-items">
                    ${(o.items || []).map(i => `<div><span>${i.qty}x ${esc(i.nama)}</span><span>${rupiah(i.subtotal)}</span></div>`).join("")}
                </div>
                ${o.catatan ? `<div class="order-catatan">📝 ${esc(o.catatan)}</div>` : ""}
                <div class="order-kaki">
                    <span class="order-total">${rupiah(o.total)}</span>
                    <span style="display:flex;gap:6px;flex-wrap:wrap">${tombolAksi(o)}</span>
                </div>
            </div>`).join("");
    }

    function dengar() {
        berhenti?.();
        daftar.innerHTML = `<div class="memuat">Memuat...</div>`;
        pertama = true;

        let q;
        if (periode.value === "semua") {
            q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(300));
        } else {
            const mulai = awalHari();
            mulai.setDate(mulai.getDate() - Number(periode.value));
            q = query(collection(db, "orders"), where("createdAt", ">=", Timestamp.fromDate(mulai)), orderBy("createdAt", "desc"));
        }

        berhenti = onSnapshot(q, (snap) => {
            semua = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            const outlets = [...new Set(semua.map(o => o.outlet).filter(Boolean))].sort();
            const dipilih = fOutlet.value;
            fOutlet.innerHTML = `<option value="">Semua outlet</option>` +
                outlets.map(n => `<option ${n === dipilih ? "selected" : ""}>${esc(n)}</option>`).join("");

            renderDaftar();
            idLama = new Set(semua.map(o => o.id));
            pertama = false;
        }, (err) => { daftar.innerHTML = kosong("Gagal memuat: " + err.message); });
    }

    el.querySelector("#chips").addEventListener("click", (e) => {
        const c = e.target.closest("[data-status]");
        if (!c) return;
        statusAktif = c.dataset.status;
        renderDaftar();
    });

    [cari, fOutlet, fLayanan].forEach(i => i.addEventListener("input", renderDaftar));
    periode.addEventListener("change", dengar);

    pasangAksiStatus(daftar, id => semua.find(o => o.id === id));
    daftar.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        const k = e.target.closest("[data-id]");
        const o = k && semua.find(x => x.id === k.dataset.id);
        if (o) bukaDetailPesanan(o);
    });

    el.querySelector("#tombolCSV").onclick = () => {
        const list = terfilterTanpaStatus().filter(o => cocokStatus(o, statusAktif));
        unduhCSV(`pesanan-chibbo-${isoTanggal(new Date())}.csv`, [
            ["Kode", "Waktu", "Pelanggan", "Email", "HP", "Outlet", "Layanan", "Item", "Subtotal", "Pajak", "Ongkir", "Total", "Pembayaran", "Status"],
            ...list.map(o => [
                o.kode, formatWaktu(o.createdAt), o.userNama, o.userEmail, o.telepon, o.outlet,
                NAMA_LAYANAN[o.layanan] || o.layanan,
                (o.items || []).map(i => `${i.qty}x ${i.nama}`).join("; "),
                o.subtotal, o.pajak, o.ongkir, o.total, o.metodePembayaran, labelStatus(o.status, o.layanan)
            ])
        ]);
    };

    dengar();
    return () => berhenti?.();
}
