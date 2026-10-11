// Home admin: tampilan seperti home website user + ringkasan live + akses cepat + status sinkronisasi
import { db } from "../../firebase-config.js";
import {
    collection, doc, query, where, onSnapshot, Timestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { rupiah, esc, srcGambar, awalHari, toast, toastError } from "../ui.js";
import { importDataAwal } from "../seed.js";

function sapaan() {
    const jam = new Date().getHours();
    if (jam < 11) return "Selamat pagi";
    if (jam < 15) return "Selamat siang";
    if (jam < 18) return "Selamat sore";
    return "Selamat malam";
}

export async function render(el, ctx) {
    const tanggal = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    el.innerHTML = `
        <section class="home-hero">
            <span class="sapaan">📅 ${tanggal}</span>
            <h1>${sapaan()}, <span class="oranye">${esc(ctx.nama.split(" ")[0])}</span>!<br>Siap Melayani CHIBBO Lovers?</h1>
            <p id="heroTeks">Memuat ringkasan hari ini...</p>
            <div class="hero-aksi">
                <a href="#pesanan" class="hero-btn">Proses Pesanan</a>
                <a href="#menu" class="hero-btn garis">Kelola Menu & Stok</a>
            </div>
        </section>

        <div class="home-isi">
            <div class="home-stat">
                <a href="#laporan" class="stat-kaca">
                    <div class="stat-ikon">💰</div>
                    <div><div class="label">Pendapatan Hari Ini</div><div class="nilai" id="hPendapatan">-</div></div>
                </a>
                <a href="#pesanan" class="stat-kaca">
                    <div class="stat-ikon gelap">🧾</div>
                    <div><div class="label">Pesanan Hari Ini</div><div class="nilai" id="hPesanan">-</div></div>
                </a>
                <a href="#pesanan" class="stat-kaca">
                    <div class="stat-ikon oranye">⏳</div>
                    <div><div class="label">Menunggu Konfirmasi</div><div class="nilai" id="hMenunggu">-</div></div>
                </a>
                <a href="#menu" class="stat-kaca">
                    <div class="stat-ikon">🍗</div>
                    <div><div class="label">Menu Tersedia</div><div class="nilai" id="hMenu">-</div></div>
                </a>
            </div>

            <section class="seksi">
                <div id="statusSinkron"></div>
            </section>

            <section class="seksi">
                <div class="seksi-judul">
                    <h2><span class="merah">AKSES</span> <span class="oranye">CEPAT</span></h2>
                    <p>Semua tugas admin dalam satu tempat.</p>
                </div>
                <div class="grid-akses">
                    ${kartuAkses("pesanan", "🧾", "Pesanan", "Terima, proses, dan selesaikan pesanan pelanggan secara realtime.", "aMenunggu")}
                    ${kartuAkses("menu", "🍗", "Menu & Stok", "Tambah menu baru, ubah harga, atur stok, dan sembunyikan menu.", "aStok")}
                    ${kartuAkses("kategori", "🏷️", "Kategori", "Atur kategori yang menjadi filter di halaman menu pelanggan.", "aKategori")}
                    ${kartuAkses("outlet", "📍", "Outlet", "Kelola kedai, jam buka/tutup, dan layanan yang tersedia.", "aOutlet")}
                    ${kartuAkses("laporan", "📈", "Laporan", "Lihat pendapatan, menu terlaris, dan export data penjualan.", null)}
                    ${kartuAkses("pengaturan", "⚙️", "Pengaturan", "Buka/tutup toko, promo, pajak, ongkir, dan metode bayar.", "aToko")}
                </div>
            </section>

            <section class="seksi">
                <div class="seksi-judul">
                    <h2><span class="merah">MENU DI</span> <span class="oranye">WEBSITE</span></h2>
                    <p id="etalaseKet">Menu yang sedang dilihat pelanggan.</p>
                </div>
                <div id="etalase" class="etalase"></div>
                <div style="text-align:center;margin-top:24px">
                    <a href="#menu" class="btn btn-garis">Lihat & kelola semua menu →</a>
                </div>
            </section>

            <section class="seksi">
                <div class="seksi-judul">
                    <h2><span class="merah">KEDAI</span> <span class="oranye">CHIBBO</span></h2>
                    <p>Status outlet saat ini.</p>
                </div>
                <div id="gridOutlet" class="grid-outlet"></div>
            </section>
        </div>
    `;

    function kartuAkses(hal, ikon, judul, desk, idChip) {
        return `
            <a href="#${hal}" class="kartu-akses">
                <div class="atas">
                    <div class="ikon-besar">${ikon}</div>
                    ${idChip ? `<span class="chip-info" id="${idChip}">…</span>` : ""}
                </div>
                <h3>${judul}</h3>
                <p>${desk}</p>
                <span class="lanjut">Buka →</span>
            </a>`;
    }

    const $ = (id) => el.querySelector("#" + id);
    const unsub = [];
    const status = { menu: null, kategori: null, outlet: null, error: ctx.statusDb && !ctx.statusDb.ok ? ctx.statusDb : null };
    let terjualHariIni = new Map();
    let MENU = [];

    // ===== Status sinkronisasi database =====
    function renderSinkron() {
        const wadah = $("statusSinkron");
        if (status.error) {
            const ditolak = status.error.kode === "permission-denied";
            wadah.innerHTML = `
                <div class="sinkron gagal">
                    <div class="ikon-besar">!</div>
                    <div>
                        <h3>Data belum tersinkron dengan website user</h3>
                        <p>${ditolak
                            ? "Database menolak akses. Yang perlu dicek di Firebase Console:"
                            : "Database tidak bisa diakses: " + esc(status.error.pesan || status.error.kode)}</p>
                        ${ditolak ? `<ol>
                            <li>Firestore Database → tab <strong>Rules</strong> → tempel isi file <code>firestore.rules</code> → <strong>Publish</strong>.</li>
                            <li>Koleksi <code>admins</code> berisi dokumen dengan ID email Anda (huruf kecil).</li>
                        </ol>` : ""}
                    </div>
                    <div class="aksi-sinkron"><button class="btn" id="cobaSinkron">Coba Lagi</button></div>
                </div>`;
        } else if (status.menu === null) {
            wadah.innerHTML = "";
            return;
        } else if (status.menu === 0 || status.kategori === 0 || status.outlet === 0) {
            wadah.innerHTML = `
                <div class="sinkron gagal">
                    <div class="ikon-besar">!</div>
                    <div>
                        <h3>Sebagian data masih kosong</h3>
                        <p>${status.menu} menu · ${status.kategori} kategori · ${status.outlet} outlet di database.
                        Klik sinkronkan untuk menyalin data bawaan website user.</p>
                    </div>
                    <div class="aksi-sinkron"><button class="btn" id="cobaSinkron">Sinkronkan Sekarang</button></div>
                </div>`;
        } else {
            wadah.innerHTML = `
                <div class="sinkron">
                    <div class="ikon-besar">✓</div>
                    <div>
                        <h3>Tersinkron dengan website user</h3>
                        <p>${status.menu} menu · ${status.kategori} kategori · ${status.outlet} outlet.
                        Setiap perubahan di panel admin langsung tampil di website pelanggan.</p>
                    </div>
                    <div class="aksi-sinkron"><a class="btn btn-garis" href="../menu.html" target="_blank">Lihat Website ↗</a></div>
                </div>`;
        }

        const tombol = $("cobaSinkron");
        if (tombol) tombol.onclick = async () => {
            tombol.disabled = true;
            tombol.textContent = "Menyinkronkan...";
            try {
                const { ditambah } = await importDataAwal();
                status.error = null;
                toast(ditambah ? `✓ ${ditambah} data disinkronkan.` : "Data sudah lengkap.");
                dengarData();
            } catch (err) {
                status.error = { ok: false, kode: err.code, pesan: err.message };
                toastError(err, "Sinkronisasi gagal");
            }
            renderSinkron();
        };
    }

    function gagal(err) {
        status.error = { ok: false, kode: err.code, pesan: err.message };
        renderSinkron();
    }

    // ===== Etalase menu =====
    function renderEtalase() {
        const aktif = MENU.filter(m => m.aktif !== false);
        let tampil;
        if (terjualHariIni.size > 0) {
            tampil = aktif.filter(m => terjualHariIni.has(m.id))
                .sort((a, b) => terjualHariIni.get(b.id) - terjualHariIni.get(a.id));
            $("etalaseKet").textContent = "Menu terlaris hari ini.";
            if (tampil.length < 8) tampil = [...tampil, ...aktif.filter(m => !terjualHariIni.has(m.id))];
        } else {
            tampil = aktif;
            $("etalaseKet").textContent = "Menu yang sedang dilihat pelanggan.";
        }

        const wadah = $("etalase");
        if (tampil.length === 0) {
            wadah.innerHTML = `<div class="kosong" style="grid-column:1/-1">Belum ada menu di database.</div>`;
            return;
        }
        wadah.innerHTML = tampil.slice(0, 8).map(m => {
            const stok = Number(m.stok) || 0;
            const terjual = terjualHariIni.get(m.id);
            return `
            <a href="#menu" class="produk">
                <div class="produk-gambar">
                    <img src="${esc(srcGambar(m.gambar))}" alt="${esc(m.nama)}" loading="lazy">
                    ${stok <= 0 ? `<span class="badge" style="background:#555">Habis</span>`
                      : stok <= 5 ? `<span class="badge" style="background:var(--oranye)">Sisa ${stok}</span>` : ""}
                </div>
                <div class="produk-info">
                    <h3>${esc(m.nama)}</h3>
                    <small>${terjual ? `🔥 ${terjual} terjual hari ini` : `Stok ${stok}`}</small>
                    <div class="produk-bawah">
                        <span class="produk-harga">${rupiah(m.harga)}</span>
                    </div>
                </div>
            </a>`;
        }).join("");
    }

    function dengarData() {
        unsub.forEach(u => u());
        unsub.length = 0;

        // Pesanan hari ini
        unsub.push(onSnapshot(query(collection(db, "orders"), where("createdAt", ">=", Timestamp.fromDate(awalHari()))), (snap) => {
            const list = snap.docs.map(d => d.data());
            const valid = list.filter(o => o.status !== "dibatalkan");
            $("hPendapatan").textContent = rupiah(valid.reduce((t, o) => t + (o.total || 0), 0));
            $("hPesanan").textContent = list.length;

            terjualHariIni = new Map();
            valid.forEach(o => (o.items || []).forEach(i => {
                terjualHariIni.set(i.id, (terjualHariIni.get(i.id) || 0) + i.qty);
            }));
            renderEtalase();
        }, gagal));

        // Menunggu konfirmasi
        unsub.push(onSnapshot(query(collection(db, "orders"), where("status", "==", "menunggu")), (snap) => {
            const n = snap.size;
            $("hMenunggu").textContent = n;
            $("aMenunggu").textContent = n ? `${n} menunggu` : "Semua beres";
            $("aMenunggu").className = "chip-info" + (n ? " oranye" : "");
            $("heroTeks").textContent = n
                ? `Ada ${n} pesanan yang menunggu konfirmasi. Yuk segera diproses agar pelanggan tidak menunggu lama!`
                : "Belum ada pesanan yang menunggu. Pastikan stok menu siap untuk pesanan berikutnya.";
        }, gagal));

        // Menu
        unsub.push(onSnapshot(collection(db, "menu"), (snap) => {
            MENU = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.urutan ?? 999) - (b.urutan ?? 999));
            const aktif = MENU.filter(m => m.aktif !== false);
            const tipis = aktif.filter(m => Number(m.stok) <= 5).length;
            $("hMenu").textContent = `${aktif.filter(m => Number(m.stok) > 0).length} / ${MENU.length}`;
            $("aStok").textContent = tipis ? `${tipis} stok menipis` : `${MENU.length} menu`;
            $("aStok").className = "chip-info" + (tipis ? " oranye" : "");
            status.menu = MENU.length;
            renderSinkron();
            renderEtalase();
        }, gagal));

        // Kategori
        unsub.push(onSnapshot(collection(db, "kategori"), (snap) => {
            status.kategori = snap.size;
            $("aKategori").textContent = `${snap.size} kategori`;
            renderSinkron();
        }, gagal));

        // Outlet
        unsub.push(onSnapshot(collection(db, "outlets"), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.urutan ?? 999) - (b.urutan ?? 999));
            status.outlet = list.length;
            const buka = list.filter(o => o.buka !== false).length;
            $("aOutlet").textContent = `${buka}/${list.length} buka`;
            $("gridOutlet").innerHTML = list.length === 0
                ? `<div class="kosong" style="grid-column:1/-1">Belum ada outlet.</div>`
                : list.map(o => `
                    <a href="#outlet" class="kartu-outlet" style="background-image:url('${esc(srcGambar(o.gambar))}')">
                        <span class="status-outlet ${o.buka === false ? "tutup" : ""}">${o.buka === false ? "Tutup" : "● Buka"}</span>
                        <div class="isi">
                            <h3>${esc(o.nama)}</h3>
                            <small>${esc(o.alamat)}</small>
                        </div>
                    </a>`).join("");
            renderSinkron();
        }, gagal));

        // Status toko
        unsub.push(onSnapshot(doc(db, "pengaturan", "toko"), (snap) => {
            const buka = !snap.exists() || snap.data().tokoBuka !== false;
            $("aToko").textContent = buka ? "Toko buka" : "Toko tutup";
            $("aToko").className = "chip-info" + (buka ? "" : " oranye");
        }, gagal));
    }

    renderSinkron();
    dengarData();
    return () => unsub.forEach(u => u());
}
