// Helper UI untuk website admin CHIBBO

export function rupiah(angka) {
    return "Rp " + Number(angka || 0).toLocaleString("id-ID");
}

export function esc(teks) {
    return String(teks ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

// Path gambar di database relatif ke root website user; admin ada di /admin
export function srcGambar(g) {
    if (!g) return "";
    return /^(https?:|data:|\/)/.test(g) ? g : "../" + g;
}

export function keDate(ts) {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate();
    return new Date(ts);
}

export function formatWaktu(ts) {
    const d = keDate(ts);
    return d ? d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";
}

export function formatTanggal(d) {
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// "YYYY-MM-DD" waktu lokal (untuk input type=date & pengelompokan harian)
export function isoTanggal(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function awalHari(d = new Date()) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

// ===== TOAST =====
export function toast(pesan, jenis = "sukses") {
    let wadah = document.getElementById("toastWadah");
    if (!wadah) {
        wadah = document.createElement("div");
        wadah.id = "toastWadah";
        wadah.className = "toast-wadah";
        document.body.appendChild(wadah);
    }
    const el = document.createElement("div");
    el.className = "toast " + jenis;
    el.textContent = pesan;
    wadah.appendChild(el);
    setTimeout(() => el.classList.add("hilang"), 3200);
    setTimeout(() => el.remove(), 3600);
}

export function toastError(err, awalan = "Gagal") {
    console.error(err);
    const pesan = err?.code === "permission-denied"
        ? "akses ditolak. Pastikan akun Anda admin & Firestore Rules sudah dipasang."
        : (err?.message || String(err));
    toast(`${awalan}: ${pesan}`, "error");
}

// ===== MODAL =====
// bukaModal({ judul, isi (HTML), tombol: [{label, kelas, aksi(modalEl) -> false untuk tetap terbuka}] , lebar })
export function bukaModal({ judul, isi, tombol = [], lebar = 560 }) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal" style="max-width:${lebar}px">
            <div class="modal-head">
                <h3>${esc(judul)}</h3>
                <button class="modal-tutup" aria-label="Tutup">&times;</button>
            </div>
            <div class="modal-isi">${isi}</div>
            <div class="modal-aksi"></div>
        </div>
    `;
    const tutup = () => overlay.remove();
    overlay.querySelector(".modal-tutup").onclick = tutup;
    overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) tutup(); });

    const aksi = overlay.querySelector(".modal-aksi");
    tombol.forEach(t => {
        const b = document.createElement("button");
        b.className = "btn " + (t.kelas || "");
        b.textContent = t.label;
        b.onclick = async () => {
            if (!t.aksi) return tutup();
            b.disabled = true;
            try {
                const hasil = await t.aksi(overlay);
                if (hasil !== false) tutup();
            } finally {
                b.disabled = false;
            }
        };
        aksi.appendChild(b);
    });
    if (tombol.length === 0) aksi.remove();

    document.body.appendChild(overlay);
    overlay.querySelector("input, select, textarea")?.focus();
    return { el: overlay, tutup };
}

export function konfirmasi(judul, pesan, labelYa = "Ya, lanjutkan", kelas = "btn-merah") {
    return new Promise((resolve) => {
        let dijawab = false;
        const { el } = bukaModal({
            judul,
            isi: `<p>${esc(pesan)}</p>`,
            lebar: 420,
            tombol: [
                { label: "Batal", kelas: "btn-abu", aksi: () => { dijawab = true; resolve(false); } },
                { label: labelYa, kelas, aksi: () => { dijawab = true; resolve(true); } }
            ]
        });
        // ditutup lewat X / klik luar
        new MutationObserver((_, obs) => {
            if (!document.body.contains(el)) {
                obs.disconnect();
                if (!dijawab) resolve(false);
            }
        }).observe(document.body, { childList: true });
    });
}

// ===== GAMBAR: perkecil sebelum disimpan sebagai data URL di Firestore (maks ~1MB per dokumen) =====
export function kompresGambar(file, maks = 600, kualitas = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const skala = Math.min(1, maks / Math.max(img.width, img.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * skala);
                canvas.height = Math.round(img.height * skala);
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", kualitas));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

// ===== CSV =====
export function unduhCSV(namaFile, baris) {
    const isi = baris.map(r => r.map(v => {
        const s = String(v ?? "");
        return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")).join("\n");
    const blob = new Blob(["﻿" + isi], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = namaFile;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function kosong(teks) {
    return `<div class="kosong">${esc(teks)}</div>`;
}
