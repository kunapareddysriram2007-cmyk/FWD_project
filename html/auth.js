(function () {
    const STORAGE_KEYS = {
        donors: "donors",
        requests: "requests",
        loggedInPhone: "loggedDonorPhone",
        loginOtp: "loginOtp"
    };

    function initializeStorage() {
        if (!localStorage.getItem(STORAGE_KEYS.donors)) {
            localStorage.setItem(STORAGE_KEYS.donors, JSON.stringify([]));
        }
        if (!localStorage.getItem(STORAGE_KEYS.requests)) {
            localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify([]));
        }
    }

    function safeJsonParse(value, fallback) {
        try {
            return JSON.parse(value);
        } catch (error) {
            return fallback;
        }
    }

    function getDonors() {
        return safeJsonParse(localStorage.getItem(STORAGE_KEYS.donors), []);
    }

    function saveDonors(donors) {
        localStorage.setItem(STORAGE_KEYS.donors, JSON.stringify(donors));
    }

    function getRequests() {
        return safeJsonParse(localStorage.getItem(STORAGE_KEYS.requests), []);
    }

    function saveRequests(requests) {
        localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(requests));
    }

    function isLoggedIn() {
        return !!localStorage.getItem(STORAGE_KEYS.loggedInPhone);
    }

    function getLoggedDonorPhone() {
        return localStorage.getItem(STORAGE_KEYS.loggedInPhone);
    }

    function getLoggedInDonor() {
        const phone = getLoggedDonorPhone();
        if (!phone) return null;
        return getDonors().find(donor => donor.phone === phone) || null;
    }

    function setLoggedInPhone(phone) {
        localStorage.setItem(STORAGE_KEYS.loggedInPhone, phone);
    }

    function logout() {
        localStorage.removeItem(STORAGE_KEYS.loggedInPhone);
        sessionStorage.removeItem(STORAGE_KEYS.loginOtp);
        window.location.href = "login.html";
    }

    function generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function showAlert(target, message, type) {
        if (!target) {
            alert(message);
            return;
        }
        target.textContent = message;
        target.className = "alert";
        target.classList.add(`alert-${type || "info"}`);
        target.classList.remove("hidden");
    }

    function hideAlert(target) {
        if (!target) return;
        target.classList.add("hidden");
        target.textContent = "";
    }

    function formatDateTime(dateString) {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? "Invalid time" : date.toLocaleString();
    }

    function getTimeAgo(dateString) {
        const now = Date.now();
        const time = new Date(dateString).getTime();
        if (Number.isNaN(time)) return "Unknown";
        const diff = now - time;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes} min ago`;
        if (hours < 24) return `${hours} hr ago`;
        return `${days} day${days === 1 ? "" : "s"} ago`;
    }

    function updateExpiredRequests(optionalList) {
        const requests = Array.isArray(optionalList) ? optionalList : getRequests();
        let changed = false;
        const now = Date.now();

        requests.forEach(request => {
            if (request.status === "pending" && request.emergency) {
                const requestedAt = new Date(request.time).getTime();
                if (!Number.isNaN(requestedAt) && now - requestedAt > 15 * 60 * 1000) {
                    request.status = "denied";
                    changed = true;
                }
            }
        });

        if (changed) {
            saveRequests(requests);
        }

        return requests;
    }

    function normalizePhone(phone) {
        return String(phone || "").replace(/\D/g, "").slice(-10);
    }

    function attachLoginHandlers() {
        const loginForm = document.getElementById("loginForm");
        const otpForm = document.getElementById("otpForm");
        const alertBox = document.getElementById("alertBox");
        const otpMessage = document.getElementById("otpSentMessage");

        if (!loginForm) return;

        loginForm.addEventListener("submit", function (event) {
            event.preventDefault();
            hideAlert(alertBox);

            const phone = normalizePhone(document.getElementById("phone").value);
            if (!/^\d{10}$/.test(phone)) {
                showAlert(alertBox, "Enter a valid 10-digit phone number.", "danger");
                return;
            }

            const donor = getDonors().find(item => item.phone === phone);
            if (!donor) {
                showAlert(alertBox, "Account not found. Please register first.", "danger");
                return;
            }

            const otp = generateOtp();
            sessionStorage.setItem(STORAGE_KEYS.loginOtp, JSON.stringify({
                phone,
                otp,
                expires: Date.now() + 5 * 60 * 1000
            }));

            loginForm.classList.add("hidden");
            otpForm.classList.remove("hidden");
            showAlert(otpMessage, `OTP sent successfully. Demo OTP: ${otp}`, "info");
        });

        if (otpForm) {
            otpForm.addEventListener("submit", function (event) {
                event.preventDefault();
                hideAlert(alertBox);

                const enteredOtp = document.getElementById("otp").value.trim();
                const storedOtp = safeJsonParse(sessionStorage.getItem(STORAGE_KEYS.loginOtp), null);

                if (!storedOtp) {
                    showAlert(alertBox, "No OTP request found. Please send OTP again.", "danger");
                    resetOtpStep();
                    return;
                }

                if (Date.now() > storedOtp.expires) {
                    showAlert(alertBox, "OTP expired. Please request a new OTP.", "danger");
                    resetOtpStep();
                    return;
                }

                if (enteredOtp !== storedOtp.otp) {
                    showAlert(alertBox, "Incorrect OTP. Please try again.", "danger");
                    return;
                }

                sessionStorage.removeItem(STORAGE_KEYS.loginOtp);
                setLoggedInPhone(storedOtp.phone);
                showAlert(alertBox, "Login successful. Redirecting...", "success");

                setTimeout(function () {
                    window.location.href = "home.html";
                }, 700);
            });
        }

        function resetOtpStep() {
            sessionStorage.removeItem(STORAGE_KEYS.loginOtp);
            loginForm.classList.remove("hidden");
            if (otpForm) otpForm.classList.add("hidden");
            if (otpMessage) otpMessage.classList.add("hidden");
        }

        const pendingOtp = safeJsonParse(sessionStorage.getItem(STORAGE_KEYS.loginOtp), null);
        if (pendingOtp && Date.now() < pendingOtp.expires) {
            loginForm.classList.add("hidden");
            if (otpForm) otpForm.classList.remove("hidden");
            showAlert(otpMessage, `OTP already sent. Demo OTP: ${pendingOtp.otp}`, "info");
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        initializeStorage();

        const currentPage = window.location.pathname.split("/").pop() || "home.html";
        if (currentPage === "login.html" && isLoggedIn()) {
            window.location.href = "home.html";
            return;
        }

        attachLoginHandlers();
    });

    window.appStore = {
        initializeStorage,
        getDonors,
        saveDonors,
        getRequests,
        saveRequests,
        updateExpiredRequests,
        getLoggedInDonor
    };

    window.escapeHtml = escapeHtml;
    window.showAlert = showAlert;
    window.hideAlert = hideAlert;
    window.formatDateTime = formatDateTime;
    window.getTimeAgo = getTimeAgo;
    window.isLoggedIn = isLoggedIn;
    window.getLoggedDonorPhone = getLoggedDonorPhone;
    window.getLoggedInDonor = getLoggedInDonor;
    window.logout = logout;
})();
