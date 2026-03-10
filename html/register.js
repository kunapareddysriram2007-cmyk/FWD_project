document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("donorForm");
    const detectButton = document.getElementById("detectLocationBtn");
    const alertBox = document.getElementById("registerAlert");
    const loadingBox = document.getElementById("locationLoading");
    const coordinatesInfo = document.getElementById("coordinatesInfo");

    if (!form) return;

    detectButton.addEventListener("click", async function () {
        hideAlert(alertBox);

        if (!navigator.geolocation) {
            showAlert(alertBox, "Geolocation is not supported by your browser.", "warning");
            return;
        }

        detectButton.disabled = true;
        loadingBox.classList.remove("hidden");

        navigator.geolocation.getCurrentPosition(
            async function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                document.getElementById("lat").value = lat.toFixed(6);
                document.getElementById("lng").value = lng.toFixed(6);
                document.getElementById("coordinatesText").textContent = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
                coordinatesInfo.classList.remove("hidden");

                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                    const data = await response.json();
                    const address = data.address || {};

                    document.getElementById("city").value = address.city || address.town || address.village || address.state_district || "";
                    document.getElementById("area").value = address.suburb || address.neighbourhood || address.county || "";
                } catch (error) {
                    showAlert(alertBox, "Location detected, but address autofill failed. You can fill city and area manually.", "warning");
                } finally {
                    loadingBox.classList.add("hidden");
                    detectButton.disabled = false;
                }
            },
            function () {
                loadingBox.classList.add("hidden");
                detectButton.disabled = false;
                showAlert(alertBox, "Could not detect your location. Please allow location access or enter details manually.", "danger");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        hideAlert(alertBox);

        const donor = {
            name: document.getElementById("name").value.trim(),
            age: Number(document.getElementById("age").value),
            blood: document.getElementById("bloodGroup").value,
            phone: String(document.getElementById("phone").value).replace(/\D/g, "").slice(-10),
            city: document.getElementById("city").value.trim(),
            area: document.getElementById("area").value.trim(),
            lat: document.getElementById("lat").value.trim(),
            lng: document.getElementById("lng").value.trim()
        };

        if (donor.name.length < 2) {
            showAlert(alertBox, "Please enter a valid full name.", "danger");
            return;
        }

        if (!Number.isInteger(donor.age) || donor.age < 18 || donor.age > 65) {
            showAlert(alertBox, "Age must be between 18 and 65.", "danger");
            return;
        }

        if (!/^\d{10}$/.test(donor.phone)) {
            showAlert(alertBox, "Please enter a valid 10-digit phone number.", "danger");
            return;
        }

        if (!donor.city || !donor.area || !donor.blood) {
            showAlert(alertBox, "Please fill all required fields.", "danger");
            return;
        }

        const donors = appStore.getDonors();
        const existingIndex = donors.findIndex(item => item.phone === donor.phone);

        if (existingIndex >= 0) {
            donors[existingIndex] = { ...donors[existingIndex], ...donor };
        } else {
            donors.push(donor);
        }

        appStore.saveDonors(donors);
        localStorage.setItem("loggedDonorPhone", donor.phone);

        showAlert(alertBox, "Registration saved successfully. Redirecting to home page...", "success");
        form.reset();
        coordinatesInfo.classList.add("hidden");

        setTimeout(function () {
            window.location.href = "home.html";
        }, 800);
    });
});
