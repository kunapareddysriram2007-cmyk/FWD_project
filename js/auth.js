function initializeStorage() {
    if (!localStorage.getItem("donors")) {
        localStorage.setItem("donors", JSON.stringify([]));
    }
    if (!localStorage.getItem("requests")) {
        localStorage.setItem("requests", JSON.stringify([]));
    }
}

document.addEventListener("DOMContentLoaded", function () {
    initializeStorage();
    const currentPage = window.location.pathname.split("/").pop() || "";
    if (currentPage === "login.html" && isLoggedIn()) {
        window.location.href = "home.html";
        return;
    }

    const loginForm = document.getElementById("loginForm");
    const otpForm = document.getElementById("otpForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
    if (otpForm) {
        otpForm.addEventListener("submit", handleOtpSubmit);
    }

    // if there is a pending OTP and we're on the login page, restore OTP step
    if (currentPage === "login.html") {
        const pending = JSON.parse(sessionStorage.getItem("loginOtp"));
        if (pending && Date.now() < pending.expires) {
            document.getElementById("loginForm").classList.add("hidden");
            document.getElementById("otpForm").classList.remove("hidden");
            const msg = document.getElementById("otpSentMessage");
            msg.textContent = "OTP sent to your phone. (Demo code: " + pending.otp + ")";
            msg.classList.remove("hidden");
        }
    }
});

function handleLogin(event) {
    event.preventDefault();

    const phoneInput = document.getElementById("phone");
    const phone = phoneInput.value.trim();
    const alertBox = document.getElementById("alertBox");

    if (!/^[0-9]{10}$/.test(phone)) {
        showAlert(alertBox, "Enter a valid 10-digit phone number");
        return;
    }

    const donors = JSON.parse(localStorage.getItem("donors")) || [];
    const donor = donors.find(d => d.phone === phone);

    if (!donor) {
        showAlert(alertBox, "Account not found. Please register first.");
        return;
    }

    // generate and store otp
    const otp = generateOtp();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes expiration
    sessionStorage.setItem("loginOtp", JSON.stringify({ phone, otp, expires }));

    // switch UI to otp form
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("otpForm").classList.remove("hidden");
    const msg = document.getElementById("otpSentMessage");
    msg.textContent = "OTP sent to your phone. (Demo code: " + otp + ")";
    msg.classList.remove("hidden");
}

// OTP helper and handlers
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function handleOtpSubmit(event) {
    event.preventDefault();
    const otpInput = document.getElementById("otp");
    const entered = otpInput.value.trim();
    const alertBox = document.getElementById("alertBox");

    const stored = JSON.parse(sessionStorage.getItem("loginOtp"));
    if (!stored) {
        showAlert(alertBox, "No OTP request found. Please try again.");
        resetToPhoneStep();
        return;
    }

    if (Date.now() > stored.expires) {
        showAlert(alertBox, "OTP expired. Please request a new one.");
        resetToPhoneStep();
        return;
    }

    if (entered !== stored.otp) {
        showAlert(alertBox, "Incorrect OTP. Please try again.");
        return;
    }

    // success login
    sessionStorage.removeItem("loginOtp");
    localStorage.setItem("loggedDonorPhone", stored.phone);
    showAlert(alertBox, "Login successful", true);
    setTimeout(function () {
        window.location.href = "home.html";
    }, 600);
}

function resetToPhoneStep() {
    document.getElementById("otpForm").classList.add("hidden");
    document.getElementById("loginForm").classList.remove("hidden");
    document.getElementById("otpSentMessage").classList.add("hidden");
}

function showAlert(box, message, success) {
    if (!box) {
        alert(message);
        return;
    }

    box.textContent = message;
    box.className = success ? "alert alert-success" : "alert alert-danger";
    box.classList.remove("hidden");
}

function logout() {
    localStorage.removeItem("loggedDonorPhone");
    window.location.href = "login.html";
}

function isLoggedIn() {
    return !!localStorage.getItem("loggedDonorPhone");
}

function getLoggedDonorPhone() {
    return localStorage.getItem("loggedDonorPhone");
}
