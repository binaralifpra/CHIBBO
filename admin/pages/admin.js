// Kelola akun admin (koleksi "admins", id dokumen = email huruf kecil)
import { db } from "../../firebase-config.js";
import {
    collection, doc, getDoc, setDoc, deleteDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { esc, kosong, toast, toastError, bukaModal, konfirmasi, formatWaktu } from "../ui.js";

export async function render(el, ctx) {
    const emailSaya = ctx.user.email.toLowerCase();

    el.innerHTML = `
        <div class="judul-halaman">
            <div>
                <h1>Kelola Admin</h1>
                <p>Admin login dengan email / Google yang sama dengan email terdaftar di sini.</p>
            </div>
            <button id="tombolTambah" class="btn">+ Tambah Admin</button>
        </div>
        <div class="kartu">
            <div class="tabel-wadah">
                <table class="tabel">
                    <thead><tr><th>Nama</th><th>Email</th><th>Ditambahkan</th><th></th></tr></thead>
                    <tbody id="tb"><tr><td colspan="4" class="memuat">Memuat...</td></tr></tbody>
                </table>
            </div>
        </div>
    `;

    let ADMIN = [];
    const tb = el.querySelector("#tb");

    function renderTabel() {
        if (ADMIN.length === 0) {
            tb.innerHTML = `<tr><td colspan="4">${kosong("Belum ada admin.")}</td></tr>`;
            return;
        }
        tb.innerHTML = ADMIN.map(a => `
            <tr data-id="${esc(a.id)}">
                <td><strong>${esc(a.nama || "-")}</strong> ${a.id === emailSaya ? `<span class="badge badge-hijau">Anda</span>` : ""}</td>
                <td>${esc(a.id)}</td>
                <td>${formatWaktu(a.createdAt)}${a.dibuatOleh ? `<br><small style="color:#999">oleh ${esc(a.dibuatOleh)}</small>` : ""}</td>
                <td class="aksi">${a.id === emailSaya ? "" : `<button class="btn-ikon" data-hapus title="Hapus akses admin">🗑️</button>`}</td>
            </tr>`).join("");
    }

    el.querySelector("#tombolTambah").onclick = () => bukaModal({
        judul: "Tambah Admin",
        lebar: 440,
        isi: `
            <div id="fError" class="pesan-error" style="display:none"></div>
            <div class="form-group">
                <label>Email</label>
                <input id="fEmail" type="email" placeholder="admin@email.com">
                <div class="bantuan">Orang ini harus login dengan email tersebut (email+password atau Google).</div>
            </div>
            <div class="form-group">
                <label>Nama</label>
                <input id="fNama" placeholder="Nama admin">
            </div>
        `,
        tombol: [
            { label: "Batal", kelas: "btn-abu" },
            {
                label: "Tambah", aksi: async (mdl) => {
                    const email = mdl.querySelector("#fEmail").value.trim().toLowerCase();
                    const nama = mdl.querySelector("#fNama").value.trim();
                    const err = mdl.querySelector("#fError");
                    if (!/^\S+@\S+\.\S+$/.test(email)) {
                        err.textContent = "Email tidak valid.";
                        err.style.display = "block";
                        return false;
                    }
                    try {
                        if ((await getDoc(doc(db, "admins", email))).exists()) {
                            err.textContent = "Email ini sudah menjadi admin.";
                            err.style.display = "block";
                            return false;
                        }
                        await setDoc(doc(db, "admins", email), {
                            email, nama, dibuatOleh: emailSaya, createdAt: serverTimestamp()
                        });
                        toast(`${email} sekarang admin.`);
                    } catch (e) {
                        toastError(e);
                        return false;
                    }
                }
            }
        ]
    });

    tb.addEventListener("click", async (e) => {
        if (!e.target.closest("[data-hapus]")) return;
        const id = e.target.closest("tr").dataset.id;
        if (await konfirmasi("Hapus Admin", `Cabut akses admin untuk ${id}?`, "Cabut Akses")) {
            try {
                await deleteDoc(doc(db, "admins", id));
                toast("Akses admin dicabut.");
            } catch (err) { toastError(err); }
        }
    });

    return onSnapshot(collection(db, "admins"), (snap) => {
        ADMIN = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTabel();
    }, (err) => { tb.innerHTML = `<tr><td colspan="4">${kosong(err.message)}</td></tr>`; });
}
