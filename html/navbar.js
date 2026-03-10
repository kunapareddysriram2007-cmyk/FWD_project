document.addEventListener("DOMContentLoaded", function () {
    protectPage();
    setupNavbar();
    setActiveNavLink();
    updateNotificationBadge();
    window.addEventListener("storage", updateNotificationBadge);
});

const PUBLIC_PAGES = ["login.html", "register.html"];
const NAV_ITEMS = [
    { page: "home.html", label: "Home" },
    { page: "register.html", label: "Register" },
    { page: "search.html", label: "Search Donor" },
    { page: "requests.html", label: "Requests" },
    { page: "contact.html", label: "Contact" }
];

function getCurrentPage() {
    return window.location.pathname.split("/").pop() || "home.html";
}

function protectPage() {
    const currentPage = getCurrentPage();
    if (!PUBLIC_PAGES.includes(currentPage) && !isLoggedIn()) {
        window.location.href = "login.html";
    }
}

function setupNavbar() {
    const nav = document.querySelector("nav");
    if (!nav || nav.dataset.ready === "true") return;

    const donor = getLoggedInDonor();
    const currentPage = getCurrentPage();

    const linksHtml = NAV_ITEMS.map(item => {
        const activeClass = item.page === currentPage ? "active" : "";
        const extraAttr = item.page === "requests.html" ? 'data-nav="requests"' : "";
        return `<li><a href="${item.page}" class="${activeClass}" ${extraAttr}>${item.label}</a></li>`;
    }).join("");

    nav.innerHTML = `
        <div class="container">
            <a class="logo" href="home.html">Blood Donation Network</a>
            <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation">☰</button>
            <div class="nav-collapse" id="navCollapse">
                <ul class="nav-links">${linksHtml}</ul>
                <div class="nav-actions">
                    ${donor ? `<div class="user-chip">👤 <span>${escapeHtml(donor.name)}</span></div>
                    <button class="btn btn-secondary btn-small" id="logoutBtn" type="button">Logout</button>` : ""}
                </div>
            </div>
        </div>
    `;

    nav.dataset.ready = "true";

    const toggleButton = document.getElementById("navToggle");
    const collapse = document.getElementById("navCollapse");
    if (toggleButton && collapse) {
        toggleButton.addEventListener("click", function () {
            collapse.classList.toggle("open");
        });
    }

    const logoutButton = document.getElementById("logoutBtn");
    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }
}

function setActiveNavLink() {
    const currentPage = getCurrentPage();
    document.querySelectorAll("nav a[href]").forEach(link => {
        const page = link.getAttribute("href").split("/").pop();
        link.classList.toggle("active", page === currentPage);
    });
}

function updateNotificationBadge() {
    const requestsLink = document.querySelector('a[data-nav="requests"]');
    if (!requestsLink || !isLoggedIn()) return;

    const requests = appStore.updateExpiredRequests();
    const myPhone = getLoggedDonorPhone();
    const pendingCount = requests.filter(item => item.toPhone === myPhone && item.status === "pending").length;

    let badge = requestsLink.querySelector(".notification-badge");
    if (badge) badge.remove();

    if (pendingCount > 0) {
        requestsLink.style.position = "relative";
        badge = document.createElement("span");
        badge.className = "notification-badge";
        badge.textContent = pendingCount > 99 ? "99+" : String(pendingCount);
        requestsLink.appendChild(badge);
    }
}

setInterval(updateNotificationBadge, 5000);
