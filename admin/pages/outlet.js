// Kelola outlet: tambah / edit / hapus, buka-tutup, layanan yang tersedia
import { db } from "../../firebase-config.js";
import {
    collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { slug, NAMA_LAYANAN } from "../../data-awal.js";
import { esc, srcGambar, kosong, toast, toastError, bukaModal, konfirmasi, kompresGambar } from "../ui.js";

export async function render(el) {
    el.innerHTML = `
        <div class="judul-halaman">
            <div>
                <h1>Outlet</h1>
                <p>Outlet yang tutup atau tidak mendukung layanan tertentu tidak bisa dipilih pelanggan.</p>
            </div>
            <button id="tombolTambah" class="btn">+ Tambah Outlet</button>
        </div>
        <div class="kartu">
            <div class="tabel-wadah">
                <table class="tabel">
                    <thead><tr><th></th><th>Outlet</th><th>Layanan</th><th>Buka</th><th></th></tr></thead>
                    <tbody id="tb"><tr><td colspan="5" class="memuat">Memuat...</td></tr></tbody>
                </table>
            </div>
        </div>
    `;

    let OUTLET = [];
    const tb = el.querySelector("#tb");

    function renderTabel() {
        if (OUTLET.length === 0) {
            tb.innerHTML = `<tr><td colspan="5">${kosong("Belum ada outlet.")}</td></tr>`;
            return;
        }
        tb.innerHTML = OUTLET.map(o => `
            <tr data-id="${esc(o.id)}" class="${o.buka === false ? "baris-nonaktif" : ""}">
                <td style="width:64px"><img class="thumb" src="${esc(srcGambar(o.gambar))}" alt=""></td>
                <td class="nama-sel"><strong>${esc(o.nama)}</strong><small>${esc(o.alamat)}</small></td>
                <td>${Object.entries(NAMA_LAYANAN).map(([k, v]) =>
                    `<span class="badge ${o.layanan?.[k] !== false ? "badge-hijau" : "badge-abu"}" style="margin:2px">${v}</span>`).join("")}</td>
                <td>
                    <label class="switch" title="Buka / tutup outlet">
                        <input type="checkbox" data-buka ${o.buka !== false ? "checked" : ""}>
                        <span></span>
                    </label>
                </td>
                <td class="aksi">
                    <button class="btn-ikon" data-edit title="Edit">✏️</button>
                    <button class="btn-ikon" data-hapus title="Hapus">🗑️</button>
                </td>
            </tr>`).join("");
    }

    function bukaForm(o = null) {
        const baru = !o;
        const d = o || { nama: "", alamat: "", gambar: "", fitur: [], buka: true, layanan: { dinein: true, takeaway: true, delivery: true } };
        let gambarUpload = d.gambar?.startsWith("data:") ? d.gambar : "";

        const { el: modal } = bukaModal({
            judul: baru ? "Tambah Outlet" : "Edit Outlet",
            lebar: 600,
            isi: `
                <div id="fError" class="pesan-error" style="display:none"></div>
                <div class="form-group">
                    <label>Nama Outlet</label>
                    <input id="fNama" value="${esc(d.nama)}" placeholder="Chibbo ...">
                </div>
                <div class="form-group">
                    <label>Alamat</label>
                    <textarea id="fAlamat" rows="2">${esc(d.alamat)}</textarea>
                </div>
                <div class="form-group">
                    <label>Fasilitas (pisahkan dengan koma)</label>
                    <input id="fFitur" value="${esc((d.fitur || []).join(", "))}" placeholder="Parking, WiFi, AC">
                </div>
                <div class="form-group">
                    <label>Gambar</label>
                    <div class="gambar-baris">
                        <img id="fPreview" class="preview-gambar" src="${esc(srcGambar(d.gambar))}" alt="">
                        <div>
                            <input id="fGambar" value="${esc(gambarUpload ? "" : d.gambar)}" placeholder="images/outlet/outlet1.jpg atau URL">
                            <input id="fFile" type="file" accept="image/*" style="margin-top:8px">
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>Layanan Tersedia</label>
                    ${Object.entries(NAMA_LAYANAN).map(([k, v]) =>
                        `<label class="cek"><input type="checkbox" data-layanan="${k}" ${d.layanan?.[k] !== false ? "checked" : ""}> ${v}</label>`).join("")}
                </div>
                <label class="cek"><input type="checkbox" id="fBuka" ${d.buka !== false ? "checked" : ""}> Outlet buka</label>
            `,
            tombol: [
                { label: "Batal", kelas: "btn-abu" },
                { label: "Simpan", aksi: (mdl) => simpan(mdl) }
            ]
        });

        const preview = modal.querySelector("#fPreview");
        modal.querySelector("#fGambar").addEventListener("input", (e) => {
            gambarUpload = "";
            preview.src = srcGambar(e.target.value.trim());
        });
        modal.querySelector("#fFile").addEventListener("change", async (e) => {
            if (!e.target.files[0]) return;
            gambarUpload = await kompresGambar(e.target.files[0], 900);
            preview.src = gambarUpload;
            modal.querySelector("#fGambar").value = "";
        });

        async function simpan(mdl) {
            const err = mdl.querySelector("#fError");
            const nama = mdl.querySelector("#fNama").value.trim();
            if (!nama) {
                err.textContent = "Nama wajib diisi.";
                err.style.display = "block";
                return false;
            }
            const layanan = {};
            mdl.querySelectorAll("[data-layanan]").forEach(c => { layanan[c.dataset.layanan] = c.checked; });

            const data = {
                nama,
                alamat: mdl.querySelector("#fAlamat").value.trim(),
                fitur: mdl.querySelector("#fFitur").value.split(",").map(s => s.trim()).filter(Boolean),
                gambar: gambarUpload || mdl.querySelector("#fGambar").value.trim(),
                layanan,
                buka: mdl.querySelector("#fBuka").checked
            };

            try {
                if (baru) {
                    let id = slug(nama) || "outlet";
                    let n = 2;
                    while ((await getDoc(doc(db, "outlets", id))).exists()) id = `${slug(nama)}-${n++}`;
                    await setDoc(doc(db, "outlets", id), { ...data, urutan: OUTLET.length + 1 });
                } else {
                    await updateDoc(doc(db, "outlets", o.id), data);
                }
                toast("Outlet disimpan.");
            } catch (e) {
                toastError(e);
                return false;
            }
        }
    }

    tb.addEventListener("click", async (e) => {
        const tr = e.target.closest("tr[data-id]");
        const o = tr && OUTLET.find(x => x.id === tr.dataset.id);
        if (!o) return;
        if (e.target.closest("[data-edit]")) bukaForm(o);
        if (e.target.closest("[data-hapus]") &&
            await konfirmasi("Hapus Outlet", `Hapus "${o.nama}"? Riwayat pesanan lama tidak terpengaruh.`, "Hapus")) {
            try {
                await deleteDoc(doc(db, "outlets", o.id));
                toast("Outlet dihapus.");
            } catch (err) { toastError(err); }
        }
    });

    tb.addEventListener("change", async (e) => {
        if (!e.target.matches("[data-buka]")) return;
        const id = e.target.closest("tr").dataset.id;
        try {
            await updateDoc(doc(db, "outlets", id), { buka: e.target.checked });
            toast(e.target.checked ? "Outlet dibuka." : "Outlet ditutup.");
        } catch (err) {
            e.target.checked = !e.target.checked;
            toastError(err);
        }
    });

    el.querySelector("#tombolTambah").onclick = () => bukaForm();

    const berhenti = onSnapshot(collection(db, "outlets"), (snap) => {
        OUTLET = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.urutan ?? 999) - (b.urutan ?? 999));
        renderTabel();
    }, (err) => { tb.innerHTML = `<tr><td colspan="5">${kosong(err.message)}</td></tr>`; });

    return berhenti;
}
