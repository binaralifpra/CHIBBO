// Kelola menu: tambah / edit / hapus, stok, harga, ketersediaan, gambar, info gizi
import { db } from "../../firebase-config.js";
import {
    collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { slug } from "../../data-awal.js";
import {
    rupiah, esc, srcGambar, kosong, toast, toastError, bukaModal, konfirmasi, kompresGambar, unduhCSV, isoTanggal
} from "../ui.js";

export async function render(el) {
    el.innerHTML = `
        <div class="judul-halaman">
            <div>
                <h1>Menu & Stok</h1>
                <p>Perubahan langsung tampil di website user.</p>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
                <button id="tombolStokMassal" class="btn btn-garis">Atur Stok Massal</button>
                <button id="tombolCSV" class="btn btn-garis">⬇ CSV</button>
                <button id="tombolTambah" class="btn">+ Tambah Menu</button>
            </div>
        </div>

        <div class="kartu">
            <div class="toolbar">
                <input type="search" id="cari" class="input cari" placeholder="Cari menu...">
                <select id="fKategori" class="input"><option value="">Semua kategori</option></select>
                <select id="fStatus" class="input">
                    <option value="">Semua status</option>
                    <option value="aktif">Tampil</option>
                    <option value="nonaktif">Disembunyikan</option>
                    <option value="tipis">Stok menipis (≤ 5)</option>
                    <option value="habis">Stok habis</option>
                </select>
            </div>
            <div class="tabel-wadah">
                <table class="tabel">
                    <thead>
                        <tr>
                            <th></th><th>Menu</th><th>Kategori</th><th class="angka">Harga</th>
                            <th>Stok</th><th>Tampil</th><th></th>
                        </tr>
                    </thead>
                    <tbody id="tbMenu"><tr><td colspan="7" class="memuat">Memuat...</td></tr></tbody>
                </table>
            </div>
            <p id="ringkasan" style="color:#999;font-size:0.85rem;margin-top:12px;"></p>
        </div>
    `;

    let MENU = [];
    let KATEGORI = [];
    const unsub = [];

    const tb = el.querySelector("#tbMenu");
    const cari = el.querySelector("#cari");
    const fKategori = el.querySelector("#fKategori");
    const fStatus = el.querySelector("#fStatus");

    const namaKategori = (id) => KATEGORI.find(k => k.id === id)?.nama || id || "-";

    function terfilter() {
        const kata = cari.value.trim().toLowerCase();
        return MENU.filter(m => {
            if (kata && !m.nama.toLowerCase().includes(kata)) return false;
            if (fKategori.value && m.kategori !== fKategori.value) return false;
            const stok = Number(m.stok) || 0;
            switch (fStatus.value) {
                case "aktif": return m.aktif !== false;
                case "nonaktif": return m.aktif === false;
                case "tipis": return stok > 0 && stok <= 5;
                case "habis": return stok <= 0;
            }
            return true;
        });
    }

    function renderTabel() {
        const list = terfilter();
        el.querySelector("#ringkasan").textContent =
            `${list.length} dari ${MENU.length} menu · ${MENU.filter(m => Number(m.stok) <= 0).length} habis · ${MENU.filter(m => m.aktif === false).length} disembunyikan`;

        // Jangan render ulang saat admin sedang mengetik di input stok
        if (tb.contains(document.activeElement) && document.activeElement.matches("input[data-stok]")) return;

        if (list.length === 0) {
            tb.innerHTML = `<tr><td colspan="7">${kosong(MENU.length ? "Tidak ada menu yang cocok." : "Belum ada menu. Klik + Tambah Menu atau Import Data Awal di Pengaturan.")}</td></tr>`;
            return;
        }

        tb.innerHTML = list.map(m => {
            const stok = Number(m.stok) || 0;
            const kelasStok = stok <= 0 ? "habis" : stok <= 5 ? "rendah" : "";
            return `
            <tr data-id="${esc(m.id)}" class="${m.aktif === false ? "baris-nonaktif" : ""}">
                <td style="width:64px"><img class="thumb" src="${esc(srcGambar(m.gambar))}" alt="" loading="lazy"></td>
                <td class="nama-sel"><strong>${esc(m.nama)}</strong><small>${esc((m.deskripsi || "").slice(0, 60))}${(m.deskripsi || "").length > 60 ? "…" : ""}</small></td>
                <td><span class="badge badge-abu">${esc(namaKategori(m.kategori))}</span></td>
                <td class="angka">${rupiah(m.harga)}</td>
                <td>
                    <div class="stok-kontrol ${kelasStok}">
                        <button data-stok-ubah="-1" aria-label="Kurangi stok">−</button>
                        <input type="number" min="0" value="${stok}" data-stok aria-label="Stok ${esc(m.nama)}">
                        <button data-stok-ubah="1" aria-label="Tambah stok">+</button>
                    </div>
                </td>
                <td>
                    <label class="switch" title="Tampilkan di website user">
                        <input type="checkbox" data-aktif ${m.aktif !== false ? "checked" : ""}>
                        <span></span>
                    </label>
                </td>
                <td class="aksi">
                    <button class="btn-ikon" data-edit title="Edit">✏️</button>
                    <button class="btn-ikon" data-hapus title="Hapus">🗑️</button>
                </td>
            </tr>`;
        }).join("");
    }

    async function simpanStok(id, nilai) {
        nilai = Math.max(0, Math.floor(Number(nilai) || 0));
        try {
            await updateDoc(doc(db, "menu", id), { stok: nilai, updatedAt: serverTimestamp() });
        } catch (err) { toastError(err, "Gagal menyimpan stok"); }
    }

    // ===== EVENT TABEL =====
    tb.addEventListener("click", async (e) => {
        const tr = e.target.closest("tr[data-id]");
        if (!tr) return;
        const m = MENU.find(x => x.id === tr.dataset.id);
        if (!m) return;

        const ubah = e.target.closest("[data-stok-ubah]");
        if (ubah) {
            const input = tr.querySelector("input[data-stok]");
            input.value = Math.max(0, (Number(input.value) || 0) + Number(ubah.dataset.stokUbah));
            simpanStok(m.id, input.value);
            return;
        }
        if (e.target.closest("[data-edit]")) return bukaForm(m);
        if (e.target.closest("[data-hapus]")) {
            if (await konfirmasi("Hapus Menu", `Hapus "${m.nama}" secara permanen? Riwayat pesanan lama tidak terpengaruh.`, "Hapus")) {
                try {
                    await deleteDoc(doc(db, "menu", m.id));
                    toast(`${m.nama} dihapus.`);
                } catch (err) { toastError(err, "Gagal menghapus"); }
            }
        }
    });

    tb.addEventListener("change", async (e) => {
        const tr = e.target.closest("tr[data-id]");
        if (!tr) return;
        const id = tr.dataset.id;

        if (e.target.matches("input[data-stok]")) {
            await simpanStok(id, e.target.value);
            toast("Stok disimpan.");
        }
        if (e.target.matches("input[data-aktif]")) {
            try {
                await updateDoc(doc(db, "menu", id), { aktif: e.target.checked, updatedAt: serverTimestamp() });
                toast(e.target.checked ? "Menu ditampilkan." : "Menu disembunyikan dari website.");
            } catch (err) {
                e.target.checked = !e.target.checked;
                toastError(err);
            }
        }
    });

    tb.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target.matches("input[data-stok]")) e.target.blur();
    });

    // ===== FORM TAMBAH / EDIT =====
    function bukaForm(m = null) {
        const baru = !m;
        const d = m || { nama: "", harga: "", stok: 0, kategori: KATEGORI[0]?.id || "", deskripsi: "", gambar: "", aktif: true, urutan: MENU.length + 1, gizi: {} };
        const gizi = d.gizi || {};

        const { el: modal } = bukaModal({
            judul: baru ? "Tambah Menu" : "Edit Menu",
            lebar: 640,
            isi: `
                <div id="fError" class="pesan-error" style="display:none"></div>
                <div class="form-group">
                    <label>Nama Menu</label>
                    <input id="fNama" value="${esc(d.nama)}" placeholder="Contoh: Chicken Wings">
                </div>
                <div class="form-baris">
                    <div class="form-group">
                        <label>Kategori</label>
                        <select id="fKat">${KATEGORI.map(k => `<option value="${esc(k.id)}" ${k.id === d.kategori ? "selected" : ""}>${esc(k.nama)}</option>`).join("")}</select>
                    </div>
                    <div class="form-group">
                        <label>Urutan Tampil</label>
                        <input id="fUrutan" type="number" min="1" value="${esc(d.urutan ?? "")}">
                    </div>
                </div>
                <div class="form-baris">
                    <div class="form-group">
                        <label>Harga (Rp)</label>
                        <input id="fHarga" type="number" min="0" step="500" value="${esc(d.harga)}">
                    </div>
                    <div class="form-group">
                        <label>Stok</label>
                        <input id="fStok" type="number" min="0" value="${esc(d.stok ?? 0)}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Deskripsi</label>
                    <textarea id="fDesk" rows="3">${esc(d.deskripsi)}</textarea>
                </div>
                <div class="form-group">
                    <label>Gambar</label>
                    <div class="gambar-baris">
                        <img id="fPreview" class="preview-gambar" src="${esc(srcGambar(d.gambar))}" alt="">
                        <div>
                            <input id="fGambar" value="${esc(d.gambar && d.gambar.startsWith("data:") ? "" : d.gambar)}" placeholder="images/ayam/nama.png atau https://...">
                            <div class="bantuan">Isi path gambar di folder website / URL, atau upload:</div>
                            <input id="fFile" type="file" accept="image/*" style="margin-top:8px">
                            <div class="bantuan">Gambar upload otomatis diperkecil (maks 600px) lalu disimpan di database.</div>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>Informasi Gizi (opsional)</label>
                    <div class="form-baris-4">
                        <input id="gProtein" placeholder="Protein" value="${esc(gizi.protein)}">
                        <input id="gKarbo" placeholder="Karbo" value="${esc(gizi.karbo)}">
                        <input id="gLemak" placeholder="Lemak" value="${esc(gizi.lemak)}">
                        <input id="gKalori" placeholder="Kalori" value="${esc(gizi.kalori)}">
                    </div>
                </div>
                <label class="cek"><input type="checkbox" id="fAktif" ${d.aktif !== false ? "checked" : ""}> Tampilkan di website user</label>
            `,
            tombol: [
                { label: "Batal", kelas: "btn-abu" },
                { label: baru ? "Tambah Menu" : "Simpan Perubahan", aksi: (mdl) => simpan(mdl) }
            ]
        });

        let gambarUpload = d.gambar && d.gambar.startsWith("data:") ? d.gambar : "";
        const preview = modal.querySelector("#fPreview");

        modal.querySelector("#fGambar").addEventListener("input", (e) => {
            gambarUpload = "";
            modal.querySelector("#fFile").value = "";
            preview.src = srcGambar(e.target.value.trim());
        });

        modal.querySelector("#fFile").addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                gambarUpload = await kompresGambar(file);
                preview.src = gambarUpload;
                modal.querySelector("#fGambar").value = "";
            } catch { toast("Gagal membaca gambar.", "error"); }
        });

        async function simpan(mdl) {
            const v = (id) => mdl.querySelector(id).value.trim();
            const err = mdl.querySelector("#fError");
            const nama = v("#fNama");
            const harga = Number(v("#fHarga"));
            const stok = Number(v("#fStok"));

            const salah = !nama ? "Nama wajib diisi."
                : !(harga >= 0) || v("#fHarga") === "" ? "Harga tidak valid."
                : !(stok >= 0) ? "Stok tidak valid."
                : !v("#fKat") ? "Buat kategori terlebih dahulu di menu Kategori."
                : null;
            if (salah) {
                err.textContent = salah;
                err.style.display = "block";
                return false;
            }

            const data = {
                nama,
                kategori: v("#fKat"),
                harga: Math.round(harga),
                stok: Math.floor(stok),
                urutan: Number(v("#fUrutan")) || 999,
                deskripsi: v("#fDesk"),
                gambar: gambarUpload || v("#fGambar"),
                gizi: { protein: v("#gProtein"), karbo: v("#gKarbo"), lemak: v("#gLemak"), kalori: v("#gKalori") },
                aktif: mdl.querySelector("#fAktif").checked,
                updatedAt: serverTimestamp()
            };

            try {
                if (baru) {
                    // id = slug nama; tambahkan angka jika sudah dipakai
                    let id = slug(nama) || "menu";
                    let n = 2;
                    while ((await getDoc(doc(db, "menu", id))).exists()) id = `${slug(nama)}-${n++}`;
                    await setDoc(doc(db, "menu", id), { ...data, createdAt: serverTimestamp() });
                    toast(`${nama} ditambahkan.`);
                } else {
                    await updateDoc(doc(db, "menu", m.id), data);
                    toast(`${nama} disimpan.`);
                }
            } catch (e) {
                err.textContent = e.code === "permission-denied" ? "Akses ditolak (cek Firestore Rules)." : e.message;
                err.style.display = "block";
                return false;
            }
        }
    }

    // ===== STOK MASSAL =====
    function bukaStokMassal() {
        bukaModal({
            judul: "Atur Stok Massal",
            lebar: 460,
            isi: `
                <p style="margin-bottom:16px;color:#666">Berguna untuk mengisi ulang stok harian sekaligus.</p>
                <div class="form-group">
                    <label>Kategori</label>
                    <select id="mKat">
                        <option value="">Semua kategori</option>
                        ${KATEGORI.map(k => `<option value="${esc(k.id)}">${esc(k.nama)}</option>`).join("")}
                    </select>
                </div>
                <div class="form-baris">
                    <div class="form-group">
                        <label>Aksi</label>
                        <select id="mMode">
                            <option value="set">Jadikan stok =</option>
                            <option value="tambah">Tambah stok +</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Jumlah</label>
                        <input id="mJumlah" type="number" min="0" value="50">
                    </div>
                </div>
            `,
            tombol: [
                { label: "Batal", kelas: "btn-abu" },
                {
                    label: "Terapkan", aksi: async (mdl) => {
                        const kat = mdl.querySelector("#mKat").value;
                        const mode = mdl.querySelector("#mMode").value;
                        const jumlah = Math.max(0, Math.floor(Number(mdl.querySelector("#mJumlah").value) || 0));
                        const target = MENU.filter(m => !kat || m.kategori === kat);
                        try {
                            for (let i = 0; i < target.length; i += 450) {
                                const batch = writeBatch(db);
                                target.slice(i, i + 450).forEach(m => {
                                    const stok = mode === "set" ? jumlah : (Number(m.stok) || 0) + jumlah;
                                    batch.update(doc(db, "menu", m.id), { stok, updatedAt: serverTimestamp() });
                                });
                                await batch.commit();
                            }
                            toast(`Stok ${target.length} menu diperbarui.`);
                        } catch (err) {
                            toastError(err);
                            return false;
                        }
                    }
                }
            ]
        });
    }

    el.querySelector("#tombolTambah").onclick = () => bukaForm();
    el.querySelector("#tombolStokMassal").onclick = bukaStokMassal;
    el.querySelector("#tombolCSV").onclick = () => unduhCSV(`menu-chibbo-${isoTanggal(new Date())}.csv`, [
        ["ID", "Nama", "Kategori", "Harga", "Stok", "Tampil"],
        ...MENU.map(m => [m.id, m.nama, namaKategori(m.kategori), m.harga, m.stok, m.aktif !== false ? "Ya" : "Tidak"])
    ]);
    [cari, fKategori, fStatus].forEach(i => i.addEventListener("input", renderTabel));

    // ===== DATA REALTIME =====
    unsub.push(onSnapshot(collection(db, "kategori"), (snap) => {
        KATEGORI = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.urutan ?? 999) - (b.urutan ?? 999));
        const dipilih = fKategori.value;
        fKategori.innerHTML = `<option value="">Semua kategori</option>` +
            KATEGORI.map(k => `<option value="${esc(k.id)}" ${k.id === dipilih ? "selected" : ""}>${esc(k.nama)}</option>`).join("");
        renderTabel();
    }));

    unsub.push(onSnapshot(collection(db, "menu"), (snap) => {
        MENU = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.urutan ?? 999) - (b.urutan ?? 999) || a.nama.localeCompare(b.nama));
        renderTabel();
    }, (err) => { tb.innerHTML = `<tr><td colspan="7">${kosong("Gagal memuat: " + err.message)}</td></tr>`; }));

    return () => unsub.forEach(u => u());
}
