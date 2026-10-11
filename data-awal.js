// Data awal CHIBBO.
// - Dipakai admin untuk "Import Data Awal" ke Firestore.
// - Dipakai website user sebagai cadangan jika Firestore belum diisi / tidak bisa diakses.

export function slug(teks) {
    return teks.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const KATEGORI_AWAL = [
    { id: "chicken", nama: "Chicken",    urutan: 1 },
    { id: "snack",   nama: "Snack",      urutan: 2 },
    { id: "dessert", nama: "Dessert",    urutan: 3 },
    { id: "drink",   nama: "Drink",      urutan: 4 },
    { id: "combo",   nama: "Combo Meal", urutan: 5 },
    { id: "burger",  nama: "Burger",     urutan: 6 }
];

const STOK_AWAL = 50;

const MENU_MENTAH = [
    // Chicken
    { nama: "Chicken Bucket 8 Pcs", harga: 130000, kategori: "chicken", gambar: "images/ayam/ChickenBucket8Pcs.png", deskripsi: "Delapan potong ayam crispy berbumbu khas dengan tekstur renyah dan daging yang juicy, ideal untuk berbagi bersama keluarga atau teman.", gizi: { protein: "5g", karbo: "40g", lemak: "8g", kalori: "250 kcal" } },
    { nama: "Chicken Crispy Breast", harga: 25000, kategori: "chicken", gambar: "images/ayam/Chicken Crispy Breast .png", deskripsi: "Dada ayam crispy dengan daging lebih tebal.", gizi: { protein: "3g", karbo: "42g", lemak: "12g", kalori: "310 kcal" } },
    { nama: "Crispy Chicken Drumstick", harga: 22000, kategori: "chicken", gambar: "images/ayam/Crispy Chicken Drumstick.png", deskripsi: "Paha bawah ayam crispy yang gurih." },
    { nama: "Crispy Chicken Thight", harga: 25000, kategori: "chicken", gambar: "images/ayam/Crispy Chicken Thight .png", deskripsi: "Paha atas ayam crispy dengan daging lebih juicy." },
    { nama: "Honey Garlic Chicken", harga: 26000, kategori: "chicken", gambar: "images/ayam/Honey Garlic Chicken .png", deskripsi: "Ayam crispy dengan saus madu bawang putih manis-gurih." },
    { nama: "Korean Spicy Chicken", harga: 26000, kategori: "chicken", gambar: "images/ayam/Korean Spicy Chicken.png", deskripsi: "Ayam crispy dengan saus pedas ala Korea." },

    // Snack
    { nama: "Chicken Nugget", harga: 20000, kategori: "snack", gambar: "images/camilan/Chicken Nugget .png", deskripsi: "Potongan nugget ayam renyah dan praktis." },
    { nama: "Chicken Nugget With Cheese", harga: 22000, kategori: "snack", gambar: "images/camilan/Chicken nugget with cheese .png", deskripsi: "Potongan nugget ayam premium berlapis tepung krispi dengan keju mozzarella lumer yang gurih di setiap gigitan.", gizi: { protein: "4g", karbo: "38g", lemak: "7g", kalori: "220 kcal" } },
    { nama: "Crispy Popcorn Chicken", harga: 22000, kategori: "snack", gambar: "images/camilan/Crispy Popcorn Chicken .jpg", deskripsi: "Potongan ayam mini crispy, pas untuk camilan." },
    { nama: "French Fries", harga: 17000, kategori: "snack", gambar: "images/camilan/kentang_goreng.jpg", deskripsi: "Kentang goreng renyah dengan taburan garam gurih." },
    { nama: "Mashed Potato", harga: 20000, kategori: "snack", gambar: "images/camilan/Mashed Potato .png", deskripsi: "Kentang tumbuk lembut dengan saus gravy hangat." },
    { nama: "Mozarella Stick", harga: 21000, kategori: "snack", gambar: "images/camilan/Mozarella stick .png", deskripsi: "Stik keju mozzarella crispy yang lumer di dalam." },
    { nama: "Onion Ring", harga: 20000, kategori: "snack", gambar: "images/camilan/Onion Ring.png", deskripsi: "Bawang bombay goreng tepung yang renyah." },

    // Dessert
    { nama: "Apple Pie and Cheese", harga: 22000, kategori: "dessert", gambar: "images/makanan_penutup/Apple pie and cheese .png", deskripsi: "Pai renyah berisi apel manis dan keju lembut." },
    { nama: "Brownies Cube", harga: 21000, kategori: "dessert", gambar: "images/makanan_penutup/Brownies cube .png", deskripsi: "Potongan brownies cokelat padat dan fudgy." },
    { nama: "Caramel Sundae", harga: 18000, kategori: "dessert", gambar: "images/makanan_penutup/Caramel Sundae .png", deskripsi: "Es krim vanilla dengan siraman saus karamel." },
    { nama: "Chocolate Sundae", harga: 20000, kategori: "dessert", gambar: "images/makanan_penutup/Chocolate Sundae.png", deskripsi: "Es krim vanilla dengan siraman saus cokelat." },
    { nama: "Chocolate Pie", harga: 23000, kategori: "dessert", gambar: "images/makanan_penutup/Chocolate Pie .png", deskripsi: "Pai renyah dengan isian cokelat lumer." },
    { nama: "Chocolate Waffle", harga: 25000, kategori: "dessert", gambar: "images/makanan_penutup/Chocolate Waffle .png", deskripsi: "Waffle hangat dengan saus cokelat." },
    { nama: "Churros", harga: 20000, kategori: "dessert", gambar: "images/makanan_penutup/Churros .png", deskripsi: "Churros renyah bertabur gula kayu manis." },
    { nama: "Silky Puding Caramel", harga: 22000, kategori: "dessert", gambar: "images/makanan_penutup/Silky Puding Caramel .png", deskripsi: "Puding lembut dengan saus karamel." },
    { nama: "Cupcake Blueberry", harga: 24000, kategori: "dessert", gambar: "images/makanan_penutup/Cupcake Blueberry.png", deskripsi: "Cupcake lembut dengan topping blueberry." },
    { nama: "Cupcake Chocolate", harga: 24000, kategori: "dessert", gambar: "images/makanan_penutup/Cupcake Chocolate.png", deskripsi: "Cupcake cokelat dengan krim cokelat." },
    { nama: "Cupcake Oreo", harga: 24000, kategori: "dessert", gambar: "images/makanan_penutup/Cupcake Oreo.png", deskripsi: "Cupcake dengan krim dan remahan Oreo." },
    { nama: "Ice Cream Twist", harga: 15000, kategori: "dessert", gambar: "images/makanan_penutup/Ice cream twist .png", deskripsi: "Es krim twist cokelat dan vanilla." },
    { nama: "Ice Cream Vanilla", harga: 15000, kategori: "dessert", gambar: "images/makanan_penutup/Ice Cream Vanilla .png", deskripsi: "Es krim vanilla lembut dan creamy." },

    // Drink
    { nama: "Air Mineral", harga: 10000, kategori: "drink", gambar: "images/minuman/Air Mineral .png", deskripsi: "Air mineral dingin yang menyegarkan." },
    { nama: "Chocolate Milkshake", harga: 15000, kategori: "drink", gambar: "images/minuman/Chocolate Milkshake.png", deskripsi: "Milkshake cokelat yang creamy." },
    { nama: "Coca Cola", harga: 13000, kategori: "drink", gambar: "images/minuman/Coca Cola.png", deskripsi: "Minuman bersoda dingin." },
    { nama: "Fruit Tea", harga: 11000, kategori: "drink", gambar: "images/minuman/Fruit tea .png", deskripsi: "Teh rasa buah yang segar." },
    { nama: "Iced Lemon Tea", harga: 10000, kategori: "drink", gambar: "images/minuman/Iced Lemon Tea .png", deskripsi: "Es teh dengan perasan lemon." },
    { nama: "Matcha Milkshake", harga: 17000, kategori: "drink", gambar: "images/minuman/Matcha Milkshake.png", deskripsi: "Milkshake matcha yang lembut." },
    { nama: "Milo", harga: 11000, kategori: "drink", gambar: "images/minuman/Milo .png", deskripsi: "Minuman cokelat malt dingin." },
    { nama: "Pepsi", harga: 14000, kategori: "drink", gambar: "images/minuman/Pepsi.png", deskripsi: "Minuman bersoda dingin." },
    { nama: "Sprite", harga: 11000, kategori: "drink", gambar: "images/minuman/Sprite.png", deskripsi: "Minuman bersoda rasa lemon-lime." },

    // Combo Meal
    { nama: "Paket Chibbo Deluxe Meal", harga: 63000, kategori: "combo", gambar: "images/paket_hemat/Paket Chibbo Deluxe Meal .png", deskripsi: "Paket lengkap ayam, burger, snack, dan minuman." },
    { nama: "Paket Chibbo Double Meal", harga: 60000, kategori: "combo", gambar: "images/paket_hemat/Paket Chibbo Double Meal .png", deskripsi: "Paket hemat untuk berdua." },
    { nama: "Paket Chibbo Drum Meal", harga: 30000, kategori: "combo", gambar: "images/paket_hemat/Paket Chibbo Drum Meal .png", deskripsi: "Drumstick crispy dengan nasi dan minuman." },
    { nama: "Paket Chibbo Family Feast", harga: 110000, kategori: "combo", gambar: "images/paket_hemat/Paket Chibbo Family Feast .png", deskripsi: "Paket besar untuk makan bersama keluarga." },
    { nama: "Paket Chibbo Nugget Meal", harga: 28000, kategori: "combo", gambar: "images/paket_hemat/Paket Chibbo Nugget Meal .png", deskripsi: "Nugget ayam dengan nasi dan minuman." },
    { nama: "Paket Chibbo Power Meal", harga: 35000, kategori: "combo", gambar: "images/paket_hemat/Paket Chibbo Power Meal .png", deskripsi: "Porsi kenyang untuk energi seharian." },

    // Burger
    { nama: "Beef Burger", harga: 24000, kategori: "burger", gambar: "images/burger/beef_burger.jpg", deskripsi: "Burger dengan patty daging sapi juicy." },
    { nama: "Cheese Burger", harga: 23000, kategori: "burger", gambar: "images/burger/cheese_burger.jpg", deskripsi: "Burger daging dengan lelehan keju." },
    { nama: "Chicken Burger", harga: 23000, kategori: "burger", gambar: "images/burger/chicken_burger.jpg", deskripsi: "Burger dengan ayam crispy." },
    { nama: "Classic Burger", harga: 20000, kategori: "burger", gambar: "images/burger/classic_burger.jpg", deskripsi: "Burger klasik dengan sayuran segar." },
    { nama: "Egg Burger", harga: 22000, kategori: "burger", gambar: "images/burger/egg_burger.jpg", deskripsi: "Burger dengan telur goreng." },
    { nama: "Spicy Burger", harga: 25000, kategori: "burger", gambar: "images/burger/Spicy Burger .png", deskripsi: "Burger dengan saus pedas." },
    { nama: "Hotdog", harga: 18000, kategori: "burger", gambar: "images/burger/hotdog.jpg", deskripsi: "Roti hotdog dengan sosis dan saus." }
];

export const MENU_AWAL = MENU_MENTAH.map((m, i) => ({
    id: slug(m.nama),
    nama: m.nama,
    harga: m.harga,
    kategori: m.kategori,
    gambar: m.gambar,
    deskripsi: m.deskripsi,
    gizi: m.gizi || { protein: "", karbo: "", lemak: "", kalori: "" },
    stok: STOK_AWAL,
    aktif: true,
    urutan: i + 1
}));

export const OUTLET_AWAL = [
    {
        id: "pondok-chandra",
        nama: "Chibbo Pondok Chandra",
        alamat: "Jl. Raya Rungkut Menanggal No.65, Rungkut Menanggal, Kec. Gn. Anyar, Surabaya, Jawa Timur 60293",
        gambar: "images/outlet/outlet1.jpg",
        fitur: ["Parking", "WiFi", "AC"],
        buka: true,
        layanan: { dinein: true, takeaway: true, delivery: true }
    },
    {
        id: "raya-darmo",
        nama: "Chibbo Raya Darmo",
        alamat: "Jl. Raya Darmo No.101, Darmo, Kec. Wonokromo, Surabaya, Jawa Timur 60241",
        gambar: "images/outlet/outlet2.jpg",
        fitur: ["Parking", "WiFi", "AC", "24 Hours"],
        buka: true,
        layanan: { dinein: true, takeaway: true, delivery: true }
    },
    {
        id: "tunjungan",
        nama: "Chibbo Tunjungan",
        alamat: "Jl. Basuki Rahmat No.08 - 12, Kedungdoro, Kec. Tegalsari, Surabaya, Jawa Timur 60261",
        gambar: "images/outlet/outlet3.jpg",
        fitur: ["Parking", "WiFi", "AC", "Mall"],
        buka: true,
        layanan: { dinein: true, takeaway: true, delivery: true }
    }
];

export const PENGATURAN_AWAL = {
    tokoBuka: true,
    pengumuman: "",
    pajakPersen: 10,
    ongkirDelivery: 10000,
    metodePembayaran: ["QRIS", "Virtual Account BCA", "Virtual Account BNI", "Virtual Account Mandiri", "GoPay", "OVO"]
};

export const NAMA_LAYANAN = { dinein: "Dine In", takeaway: "Take Away", delivery: "Delivery" };

export const STATUS_PESANAN = {
    menunggu:   { label: "Menunggu Konfirmasi", warna: "#b7791f" },
    diproses:   { label: "Sedang Diproses",     warna: "#2b6cb0" },
    siap:       { label: "Siap Diambil",        warna: "#2f855a" },
    dikirim:    { label: "Sedang Dikirim",      warna: "#2f855a" },
    selesai:    { label: "Selesai",             warna: "#4a5568" },
    dibatalkan: { label: "Dibatalkan",          warna: "#c80909" }
};
