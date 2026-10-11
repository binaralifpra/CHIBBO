// Aksi pesanan yang dipakai halaman Dashboard & Pesanan
import { auth, db } from "../firebase-config.js";
import {
    doc, runTransaction, updateDoc, arrayUnion, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { NAMA_LAYANAN, STATUS_PESANAN } from "../data-awal.js";
import { bukaModal, esc, rupiah, formatWaktu, toast, toastError } from "./ui.js";

export function labelStatus(status, layanan) {
    if (status === "siap" && layanan === "dinein") return "Siap Disajikan";
    return STATUS_PESANAN[status]?.label || status;
}

export function badgeStatus(o) {
    const warna = STATUS_PESANAN[o.status]?.warna || "#555";
    return `<span class="badge" style="background:${warna}">${esc(labelStatus(o.status, o.layanan))}</span>`;
}

// Langkah berikutnya yang boleh dipilih admin
export function statusBerikut(o) {
    switch (o.status) {
        case "menunggu": return ["diproses", "dibatalkan"];
        case "diproses": return [o.layanan === "delivery" ? "dikirim" : "siap", "dibatalkan"];
        case "siap":
        case "dikirim":  return ["selesai"];
        default:         return [];
    }
}

const LABEL_AKSI = {
    diproses: "Terima & Proses",
    siap: "Tandai Siap",
    dikirim: "Kirim Pesanan",
    selesai: "Selesaikan",
    dibatalkan: "Batalkan"
};

export function tombolAksi(o, kecil = true) {
    return statusBerikut(o).map(s => `
        <button class="btn ${kecil ? "btn-kecil" : ""} ${s === "dibatalkan" ? "btn-abu" : s === "selesai" ? "btn-hijau" : ""}"
            data-aksi-status="${s}" data-id="${o.id}">
            ${LABEL_AKSI[s] || s}
        </button>`).join("");
}

export async function ubahStatus(o, statusBaru) {
    const oleh = auth.currentUser?.email || "admin";
    const riwayat = { status: statusBaru, waktu: Timestamp.now(), oleh };

    try {
        if (statusBaru === "dibatalkan") {
            const alasan = prompt("Alasan pembatalan (akan dilihat pelanggan):", "Stok habis");
            if (alasan === null) return false;

            // Batalkan + kembalikan stok secara atomik
            await runTransaction(db, async (tx) => {
                const orderRef = doc(db, "orders", o.id);
                const snapOrder = await tx.get(orderRef);
                if (!snapOrder.exists()) throw new Error("Pesanan tidak ditemukan.");
                if (snapOrder.data().status === "dibatalkan") throw new Error("Pesanan sudah dibatalkan.");

                const items = snapOrder.data().items || [];
                const snapMenu = await Promise.all(items.map(i => tx.get(doc(db, "menu", i.id))));

                snapMenu.forEach((s, idx) => {
                    if (s.exists()) {
                        tx.update(s.ref, { stok: Number(s.data().stok || 0) + items[idx].qty });
                    }
                });

                tx.update(orderRef, {
                    status: "dibatalkan",
                    alasanBatal: alasan.trim(),
                    statusPembayaran: "dikembalikan",
                    riwayat: arrayUnion(riwayat),
                    updatedAt: serverTimestamp()
                });
            });
            toast(`Pesanan ${o.kode} dibatalkan, stok dikembalikan.`);
        } else {
            await updateDoc(doc(db, "orders", o.id), {
                status: statusBaru,
                riwayat: arrayUnion(riwayat),
                updatedAt: serverTimestamp()
            });
            toast(`${o.kode}: ${labelStatus(statusBaru, o.layanan)}`);
        }
        return true;
    } catch (err) {
        toastError(err, "Gagal mengubah status");
        return false;
    }
}

// Pasang handler untuk semua tombol [data-aksi-status] di dalam wadah
export function pasangAksiStatus(wadah, cariOrder) {
    wadah.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-aksi-status]");
        if (!b) return;
        e.stopPropagation();
        const o = cariOrder(b.dataset.id);
        if (!o) return;
        b.disabled = true;
        await ubahStatus(o, b.dataset.aksiStatus);
        b.disabled = false;
    });
}

export function bukaDetailPesanan(o) {
    const riwayat = (o.riwayat || []).map(r => `
        <li><strong>${esc(labelStatus(r.status, o.layanan))}</strong>
        — ${formatWaktu(r.waktu)}${r.oleh ? ` <span style="color:#999">(${esc(r.oleh)})</span>` : ""}</li>`).join("");

    const { el, tutup } = bukaModal({
        judul: `Pesanan ${o.kode}`,
        lebar: 640,
        isi: `
            <p style="margin-bottom:12px;">${badgeStatus(o)}</p>
            <table class="detail-tabel">
                <tr><td>Waktu</td><td>${formatWaktu(o.createdAt)}</td></tr>
                <tr><td>Pelanggan</td><td>${esc(o.userNama)}<br><small>${esc(o.userEmail)}</small></td></tr>
                <tr><td>No. HP</td><td>${esc(o.telepon || "-")}</td></tr>
                <tr><td>Outlet</td><td>${esc(o.outlet)}</td></tr>
                <tr><td>Layanan</td><td>${esc(NAMA_LAYANAN[o.layanan] || o.layanan)}</td></tr>
                ${o.alamat ? `<tr><td>Alamat</td><td>${esc(o.alamat)}</td></tr>` : ""}
                ${o.catatan ? `<tr><td>Catatan</td><td>${esc(o.catatan)}</td></tr>` : ""}
                <tr><td>Pembayaran</td><td>${esc(o.metodePembayaran)} · ${esc(o.statusPembayaran || "-")}</td></tr>
                ${o.alasanBatal ? `<tr><td>Alasan batal</td><td>${esc(o.alasanBatal)}</td></tr>` : ""}
            </table>

            <div class="tabel-wadah" style="margin-top:16px;">
                <table class="tabel">
                    <thead><tr><th>Menu</th><th class="angka">Qty</th><th class="angka">Harga</th><th class="angka">Subtotal</th></tr></thead>
                    <tbody>
                        ${(o.items || []).map(i => `
                            <tr><td>${esc(i.nama)}</td><td class="angka">${i.qty}</td>
                            <td class="angka">${rupiah(i.harga)}</td><td class="angka">${rupiah(i.subtotal)}</td></tr>`).join("")}
                        <tr><td colspan="3">Subtotal</td><td class="angka">${rupiah(o.subtotal)}</td></tr>
                        <tr><td colspan="3">Pajak</td><td class="angka">${rupiah(o.pajak)}</td></tr>
                        ${o.ongkir ? `<tr><td colspan="3">Ongkir</td><td class="angka">${rupiah(o.ongkir)}</td></tr>` : ""}
                        <tr><td colspan="3"><strong>Total</strong></td><td class="angka"><strong>${rupiah(o.total)}</strong></td></tr>
                    </tbody>
                </table>
            </div>

            <h4 style="margin:16px 0 8px;">Riwayat Status</h4>
            <ul class="riwayat">${riwayat || "<li>-</li>"}</ul>

            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px;">
                ${tombolAksi(o, false)}
                <button class="btn btn-garis" data-cetak>🖨️ Cetak Struk</button>
            </div>
        `
    });

    el.querySelector("[data-cetak]").onclick = () => cetakStruk(o);
    el.querySelectorAll("[data-aksi-status]").forEach(b => {
        b.onclick = async () => {
            b.disabled = true;
            if (await ubahStatus(o, b.dataset.aksiStatus)) tutup();
            b.disabled = false;
        };
    });
}

export function cetakStruk(o) {
    const w = window.open("", "_blank", "width=380,height=640");
    if (!w) return toast("Popup diblokir browser.", "error");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Struk ${esc(o.kode)}</title>
        <style>
            body{font-family:'Courier New',monospace;font-size:12px;width:280px;margin:10px auto;color:#000}
            h2{text-align:center;margin:0}
            .c{text-align:center}
            hr{border:none;border-top:1px dashed #000}
            .r{display:flex;justify-content:space-between}
        </style></head><body>
        <h2>CHIBBO</h2>
        <div class="c">${esc(o.outlet)}</div>
        <hr>
        <div>No   : ${esc(o.kode)}</div>
        <div>Waktu: ${formatWaktu(o.createdAt)}</div>
        <div>Nama : ${esc(o.userNama)}</div>
        <div>Tipe : ${esc(NAMA_LAYANAN[o.layanan] || o.layanan)}</div>
        <hr>
        ${(o.items || []).map(i => `<div>${esc(i.nama)}</div><div class="r"><span>${i.qty} x ${rupiah(i.harga)}</span><span>${rupiah(i.subtotal)}</span></div>`).join("")}
        <hr>
        <div class="r"><span>Subtotal</span><span>${rupiah(o.subtotal)}</span></div>
        <div class="r"><span>Pajak</span><span>${rupiah(o.pajak)}</span></div>
        ${o.ongkir ? `<div class="r"><span>Ongkir</span><span>${rupiah(o.ongkir)}</span></div>` : ""}
        <div class="r"><strong>TOTAL</strong><strong>${rupiah(o.total)}</strong></div>
        <div class="r"><span>Bayar</span><span>${esc(o.metodePembayaran)}</span></div>
        <hr>
        <div class="c">Terima kasih!</div>
        <script>window.onload=()=>{window.print();}<\/script>
        </body></html>`);
    w.document.close();
}
