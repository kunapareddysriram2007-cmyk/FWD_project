document.addEventListener("DOMContentLoaded", function () {
    checkLoginProtection();
    setupNavbar();
    updateNotificationBadge();
    setActiveNavLink();
});

function checkLoginProtection() {
    const currentPage = window.location.pathname.split("/").pop() || "home.html";
    const loginRequiredPages = ["home.html", "search.html", "requests.html", "contact.html"];

    if (loginRequiredPages.includes(currentPage) && !isLoggedIn()) {
        window.location.href = "login.html";
    }
}

function setupNavbar() {
    const loggedPhone = getLoggedDonorPhone();
    if (!loggedPhone) return;

    const donors = JSON.parse(localStorage.getItem("donors")) || [];
    const donor = donors.find(d => d.phone === loggedPhone);
    const displayName = donor ? donor.name : loggedPhone;

    let navWrapper = document.querySelector("nav .nav-wrapper");
    if (navWrapper) return;

    const nav = document.querySelector("nav");
    if (!nav) return;

    navWrapper = document.createElement("div");
    navWrapper.className = "nav-wrapper";

    const container = nav.querySelector(".container");
    if (container) {
        nav.removeChild(container);
        navWrapper.appendChild(container);
    }

    const userProfile = document.createElement("div");
    userProfile.className = "user-profile";
    userProfile.innerHTML = `
        <div class="user-info">
            <span class="user-name">${displayName}</span>
            <button class="btn-logout" onclick="logout()">Logout</button>
        </div>
    `;
    navWrapper.appendChild(userProfile);
    nav.appendChild(navWrapper);

    if (!document.querySelector("style[data-navbar]")) {
        const style = document.createElement("style");
        style.setAttribute("data-navbar", "true");
        style.textContent = `
            nav .nav-wrapper {
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
                gap: 1.5rem;
            }
            nav .user-profile {
                display: flex;
                align-items: center;
                white-space: nowrap;
            }
            nav .user-info {
                display: flex;
                align-items: center;
                gap: 0.7rem;
                background-color: rgba(255,255,255,0.15);
                padding: 0.35rem 0.7rem;
                border-radius: 6px;
            }
            nav .user-name {
                color: white;
                font-size: 0.9rem;
            }
            nav .btn-logout {
                background-color: #ff4757;
                color: white;
                border: none;
                padding: 0.3rem 0.7rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
            }
        `;
        document.head.appendChild(style);
    }
}

function updateNotificationBadge() {
    const loggedPhone = getLoggedDonorPhone();
    if (!loggedPhone) return;

    const requests = JSON.parse(localStorage.getItem("requests")) || [];
    // only consider pending requests for notification count
    const unresolvedRequests = requests.filter(r => r.toPhone === loggedPhone && r.status === 'pending');
    const requestLink = document.querySelector('nav ul li a[href="requests.html"]');
    if (!requestLink) return;

    const existingBadge = requestLink.querySelector(".notification-badge");
    if (existingBadge) {
        existingBadge.remove();
    }

    if (unresolvedRequests.length > 0) {
        const badge = document.createElement("span");
        badge.className = "notification-badge";
        badge.textContent = unresolvedRequests.length;
        requestLink.style.position = "relative";
        requestLink.appendChild(badge);

        if (!document.querySelector("style[data-badge]")) {
            const style = document.createElement("style");
            style.setAttribute("data-badge", "true");
            style.textContent = `
                .notification-badge {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background-color: #dc3545;
                    color: white;
                    border-radius: 50%;
                    min-width: 20px;
                    height: 20px;
                    padding: 0 5px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.72rem;
                    font-weight: bold;
                }
            `;
            document.head.appendChild(style);
        }
    }
}

function setActiveNavLink() {
    const currentPage = window.location.pathname.split("/").pop() || "home.html";
    document.querySelectorAll("nav a").forEach(function (link) {
        if (link.getAttribute("href") === currentPage) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
}

setInterval(updateNotificationBadge, 5000);
