document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("contactForm");
    const alertBox = document.getElementById("contactAlert");

    if (!form) return;

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const message = document.getElementById("message").value.trim();

        if (name.length < 2) {
            showAlert(alertBox, "Please enter a valid name.", "danger");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showAlert(alertBox, "Please enter a valid email address.", "danger");
            return;
        }

        if (message.length < 10) {
            showAlert(alertBox, "Message should be at least 10 characters long.", "danger");
            return;
        }

        showAlert(alertBox, "Message received successfully. We will get back to you soon.", "success");
        form.reset();
    });
});
