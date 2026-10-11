// Navbar user: mengganti link "Login" dengan nama user + Keluar, dan menambah link "Pesanan Saya"
import { auth, simpanProfilUser } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const loginLink = document.querySelector('.nav-menu a[href="login.html"]');
let pesananItem = null;

onAuthStateChanged(auth, (user) => {
    if (!loginLink) return;

    if (user) {
        simpanProfilUser(user);

        const nama = user.displayName || user.email.split("@")[0];
        loginLink.textContent = "Hai, " + nama.split(" ")[0] + " (Keluar)";
        loginLink.href = "#";
        loginLink.onclick = (e) => {
            e.preventDefault();
            if (confirm("Keluar dari akun?")) {
                signOut(auth).then(() => location.reload());
            }
        };

        if (!pesananItem) {
            pesananItem = document.createElement("li");
            pesananItem.innerHTML = '<a href="pesanan-saya.html">Pesanan Saya</a>';
            loginLink.parentElement.before(pesananItem);
        }
    } else {
        loginLink.textContent = "Login";
        loginLink.href = "login.html";
        loginLink.onclick = null;
        pesananItem?.remove();
        pesananItem = null;
    }
});
