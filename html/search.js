let currentUserLocation = null;
let pendingRequestTarget = null;

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("searchForm");
    const detectButton = document.getElementById("detectLocationBtn");
    const confirmButton = document.getElementById("confirmRequestBtn");

    if (form) form.addEventListener("submit", handleSearch);
    if (detectButton) detectButton.addEventListener("click", detectUserLocation);
    if (confirmButton) confirmButton.addEventListener("click", confirmSendRequest);

    bindModalControls();
    renderMySentRequests();
    updateNotificationBadge();
});

function bindModalControls() {
    const requestModal = document.getElementById("requestModal");
    const mapModal = document.getElementById("mapModal");

    document.getElementById("closeRequestModalBtn")?.addEventListener("click", closeRequestModal);
    document.getElementById("cancelRequestBtn")?.addEventListener("click", closeRequestModal);
    document.getElementById("closeMapModalBtn")?.addEventListener("click", closeMapModal);

    [requestModal, mapModal].forEach(modal => {
        if (!modal) return;
        modal.addEventListener("click", function (event) {
            if (event.target === modal) {
                modal.id === "requestModal" ? closeRequestModal() : closeMapModal();
            }
        });
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function detectUserLocation() {
    const alertBox = document.getElementById("searchAlert");
    const button = document.getElementById("detectLocationBtn");
    const loading = document.getElementById("locationLoading");
    const info = document.getElementById("detectedLocation");
    const text = document.getElementById("locationText");

    hideAlert(alertBox);

    if (!navigator.geolocation) {
        showAlert(alertBox, "Geolocation is not supported by your browser.", "warning");
        return;
    }

    button.disabled = true;
    button.textContent = "Detecting...";
    loading.classList.remove("hidden");

    navigator.geolocation.getCurrentPosition(
        function (position) {
            currentUserLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            text.textContent = `Lat: ${currentUserLocation.latitude.toFixed(5)}, Lng: ${currentUserLocation.longitude.toFixed(5)}`;
            info.classList.remove("hidden");
            loading.classList.add("hidden");
            button.disabled = false;
            button.textContent = "Location Detected";
        },
        function () {
            loading.classList.add("hidden");
            button.disabled = false;
            button.textContent = "Detect My Location";
            showAlert(alertBox, "Could not detect location. Search will still work without distance sorting.", "warning");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

function handleSearch(event) {
    event.preventDefault();

    const bloodGroup = document.getElementById("bloodGroup").value;
    const resultsSection = document.getElementById("resultsSection");
    const loading = document.getElementById("searchLoading");

    if (!bloodGroup) {
        showAlert(document.getElementById("searchAlert"), "Please select a blood group.", "danger");
        return;
    }

    resultsSection.classList.remove("hidden");
    loading.classList.remove("hidden");
    document.getElementById("noResults").classList.add("hidden");

    setTimeout(function () {
        performSearch(bloodGroup);
        loading.classList.add("hidden");
    }, 250);
}

function performSearch(bloodGroup) {
    const myPhone = getLoggedDonorPhone();
    const donors = appStore.getDonors().filter(donor => donor.blood === bloodGroup && donor.phone !== myPhone);

    const normalized = donors.map(donor => {
        const lat = parseFloat(donor.lat);
        const lng = parseFloat(donor.lng);
        const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
        let distance = null;

        if (currentUserLocation && hasCoords) {
            distance = calculateDistance(
                currentUserLocation.latitude,
                currentUserLocation.longitude,
                lat,
                lng
            );
        }

        return { ...donor, lat, lng, hasCoords, distance };
    });

    normalized.sort(function (a, b) {
        if (a.distance == null && b.distance == null) return a.name.localeCompare(b.name);
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
    });

    displaySearchResults(normalized);
}

function displaySearchResults(donors) {
    const table = document.getElementById("donorsTable");
    const body = document.getElementById("donorsTableBody");
    const noResults = document.getElementById("noResults");
    body.innerHTML = "";

    if (!donors.length) {
        table.classList.add("hidden");
        noResults.classList.remove("hidden");
        return;
    }

    table.classList.remove("hidden");
    noResults.classList.add("hidden");

    donors.forEach(donor => {
        const row = document.createElement("tr");
        const distanceText = donor.distance == null ? "N/A" : `${donor.distance.toFixed(2)} km`;

        row.innerHTML = `
            <td><strong>${escapeHtml(donor.name)}</strong></td>
            <td><span class="badge badge-danger">${escapeHtml(donor.blood)}</span></td>
            <td>${escapeHtml(donor.city)}${donor.area ? " / " + escapeHtml(donor.area) : ""}</td>
            <td>${distanceText}</td>
            <td class="result-actions"></td>
        `;

        const actionCell = row.querySelector(".result-actions");

        const requestButton = document.createElement("button");
        requestButton.className = "btn btn-primary btn-small";
        requestButton.type = "button";
        requestButton.textContent = "Send Request";
        requestButton.addEventListener("click", function () {
            openRequestModal(donor);
        });
        actionCell.appendChild(requestButton);

        const mapButton = document.createElement("button");
        mapButton.className = "btn btn-secondary btn-small";
        mapButton.type = "button";
        mapButton.style.marginLeft = "0.5rem";
        mapButton.textContent = donor.hasCoords ? "View Map" : "Map N/A";
        mapButton.disabled = !donor.hasCoords;
        if (donor.hasCoords) {
            mapButton.addEventListener("click", function () {
                viewDonorMap(donor);
            });
        }
        actionCell.appendChild(mapButton);

        body.appendChild(row);
    });
}

function openRequestModal(donor) {
    pendingRequestTarget = donor;
    document.getElementById("requestModalDonorInfo").textContent = `${donor.name} • ${donor.city}`;
    document.getElementById("requestEmergencyCheckbox").checked = false;

    const modal = document.getElementById("requestModal");
    modal.classList.remove("hidden");
    modal.classList.add("show");
}

function closeRequestModal() {
    const modal = document.getElementById("requestModal");
    modal.classList.add("hidden");
    modal.classList.remove("show");
    pendingRequestTarget = null;
}

function confirmSendRequest() {
    const requester = getLoggedInDonor();
    const alertBox = document.getElementById("searchAlert");

    if (!requester) {
        showAlert(alertBox, "Login required.", "danger");
        closeRequestModal();
        return;
    }

    if (!pendingRequestTarget) return;

    const requests = appStore.updateExpiredRequests();
    const emergency = document.getElementById("requestEmergencyCheckbox").checked;

    const duplicatePending = requests.find(request =>
        request.fromPhone === requester.phone &&
        request.toPhone === pendingRequestTarget.phone &&
        request.status === "pending"
    );

    if (duplicatePending) {
        showAlert(alertBox, "You already have a pending request for this donor.", "warning");
        closeRequestModal();
        return;
    }

    requests.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fromName: requester.name,
        fromPhone: requester.phone,
        fromCity: requester.city,
        toName: pendingRequestTarget.name,
        toPhone: pendingRequestTarget.phone,
        toCity: pendingRequestTarget.city,
        time: new Date().toISOString(),
        emergency,
        status: "pending"
    });

    appStore.saveRequests(requests);
    closeRequestModal();
    renderMySentRequests();
    updateNotificationBadge();
    showAlert(alertBox, `Request sent to ${pendingRequestTarget?.name || "donor"}.`, "success");
}

function renderMySentRequests() {
    const section = document.getElementById("mySentRequestsSection");
    const noData = document.getElementById("noSentRequests");
    const container = document.getElementById("sentRequestsContainer");
    const body = document.getElementById("sentRequestsTableBody");
    const myPhone = getLoggedDonorPhone();

    if (!myPhone || !section || !body) return;

    const requests = appStore.updateExpiredRequests().filter(request => request.fromPhone === myPhone);
    body.innerHTML = "";

    if (!requests.length) {
        section.classList.remove("hidden");
        noData.classList.remove("hidden");
        container.classList.add("hidden");
        return;
    }

    section.classList.remove("hidden");
    noData.classList.add("hidden");
    container.classList.remove("hidden");

    requests.sort((a, b) => new Date(b.time) - new Date(a.time));

    requests.forEach(request => {
        const row = document.createElement("tr");
        const typeHtml = request.emergency
            ? '<span class="badge badge-danger">Emergency</span>'
            : '<span class="badge badge-info">Normal</span>';

        let statusHtml = '<span class="badge badge-muted">Pending</span>';
        if (request.status === "accepted") statusHtml = '<span class="badge badge-success">Accepted</span>';
        if (request.status === "rejected") statusHtml = '<span class="badge badge-danger">Rejected</span>';
        if (request.status === "denied") statusHtml = '<span class="badge badge-warning">Auto-denied</span>';

        row.innerHTML = `
            <td><strong>${escapeHtml(request.toName)}</strong></td>
            <td>${escapeHtml(request.toCity || "N/A")}</td>
            <td>${getTimeAgo(request.time)}<br><small class="text-muted">${formatDateTime(request.time)}</small></td>
            <td>${typeHtml}</td>
            <td>${statusHtml}</td>
        `;
        body.appendChild(row);
    });
}

function viewDonorMap(donor) {
    const mapContainer = document.getElementById("mapContainer");
    const modal = document.getElementById("mapModal");
    const title = document.getElementById("mapTitle");
    title.textContent = `${donor.name} - Location`;

    const bbox = `${donor.lng - 0.01},${donor.lat - 0.01},${donor.lng + 0.01},${donor.lat + 0.01}`;
    mapContainer.innerHTML = `
        <iframe
            src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${donor.lat},${donor.lng}"
            width="100%" height="320" style="border:0;">
        </iframe>
    `;

    modal.classList.remove("hidden");
    modal.classList.add("show");
}

function closeMapModal() {
    const modal = document.getElementById("mapModal");
    modal.classList.add("hidden");
    modal.classList.remove("show");
}

setInterval(function () {
    renderMySentRequests();
    updateNotificationBadge();
}, 10000);
