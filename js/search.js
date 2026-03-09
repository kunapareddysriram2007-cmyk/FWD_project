let currentUserLocation = null;

document.addEventListener("DOMContentLoaded", function () {
    setupEventHandlers();
    updateNotificationBadge();
});

function setupEventHandlers() {
    const form = document.getElementById("searchForm");
    if (form) form.addEventListener("submit", handleSearch);

    const detectBtn = document.getElementById("detectLocationBtn");
    if (detectBtn) detectBtn.addEventListener("click", detectUserLocation);
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
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    const btn = document.getElementById("detectLocationBtn");
    const loading = document.getElementById("locationLoading");
    const info = document.getElementById("detectedLocation");

    btn.disabled = true;
    btn.textContent = "Detecting...";
    loading.classList.remove("hidden");

    navigator.geolocation.getCurrentPosition(
        function (pos) {
            currentUserLocation = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude
            };

            document.getElementById("locationText").textContent =
                `Lat: ${currentUserLocation.latitude.toFixed(5)}, Lng: ${currentUserLocation.longitude.toFixed(5)}`;

            loading.classList.add("hidden");
            info.classList.remove("hidden");
            btn.disabled = false;
            btn.textContent = "Location Detected";
        },
        function () {
            alert("Could not detect location. You can still search without distance sorting.");
            loading.classList.add("hidden");
            btn.disabled = false;
            btn.textContent = "Detect My Location";
        }
    );
}

function handleSearch(e) {
    e.preventDefault();
    const bloodGroup = document.getElementById("bloodGroup").value;

    if (!bloodGroup) {
        alert("Select blood group.");
        return;
    }

    document.getElementById("resultsSection").classList.remove("hidden");
    document.getElementById("searchLoading").classList.remove("hidden");
    document.getElementById("noResults").classList.add("hidden");

    setTimeout(function () {
        performSearch(bloodGroup);
        document.getElementById("searchLoading").classList.add("hidden");
    }, 250);
}

function performSearch(bloodGroup) {
    const donors = JSON.parse(localStorage.getItem("donors")) || [];
    const myPhone = getLoggedDonorPhone();
    // make sure expired requests are reflected before any actions
    const allReqs = JSON.parse(localStorage.getItem("requests")) || [];
    updateExpiredRequests(allReqs);
    updateExpiredRequests(allReqs);

    const matches = donors.filter(d => d.blood === bloodGroup && d.phone !== myPhone);

    if (matches.length === 0) {
        document.getElementById("noResults").classList.remove("hidden");
        document.getElementById("donorsTable").style.display = "none";
        return;
    }

    const withDistance = matches.map(function (d) {
        const lat = parseFloat(d.lat);
        const lng = parseFloat(d.lng);
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

        return {
            ...d,
            hasCoords,
            lat,
            lng,
            distance
        };
    });

    withDistance.sort(function (a, b) {
        if (a.distance == null && b.distance == null) return 0;
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
    });

    displaySearchResults(withDistance);
}

function displaySearchResults(donors) {
    const body = document.getElementById("donorsTableBody");
    body.innerHTML = "";

    donors.forEach(function (d) {
        const row = document.createElement("tr");
        const distanceText = d.distance == null ? "N/A" : `${d.distance.toFixed(2)} km`;
        row.innerHTML = `
            <td><strong>${escapeHtml(d.name)}</strong></td>
            <td><strong>${escapeHtml(d.blood)}</strong></td>
            <td>${escapeHtml(d.city)}, ${escapeHtml(d.area || "")}</td>
            <td><strong>${distanceText}</strong></td>
            <td class="result-actions"></td>
        `;

        const actionsCell = row.querySelector(".result-actions");
        const requestBtn = document.createElement("button");
        requestBtn.className = "btn btn-primary btn-small";
        requestBtn.textContent = "Send Request";
        requestBtn.addEventListener("click", function () {
            sendRequest(d.phone, d.city, d.name);
        });
        actionsCell.appendChild(requestBtn);

        const mapBtn = document.createElement("button");
        mapBtn.className = "btn btn-secondary btn-small";
        mapBtn.style.marginLeft = "0.5rem";
        if (d.hasCoords) {
            mapBtn.textContent = "View Map";
            mapBtn.addEventListener("click", function () {
                viewDonorMap(d.city, d.lat, d.lng);
            });
        } else {
            mapBtn.textContent = "Map N/A";
            mapBtn.disabled = true;
        }
        actionsCell.appendChild(mapBtn);

        body.appendChild(row);
    });

    document.getElementById("donorsTable").style.display = "table";
    document.getElementById("noResults").classList.add("hidden");
}

function sendRequest(toPhone, donorCity, donorName) {
    // open modal to confirm emergency and send
    const loggedPhone = getLoggedDonorPhone();
    if (!loggedPhone) {
        alert("Login required.");
        return;
    }

    // store pending target info on window for modal confirmation
    window.__pendingRequestTarget = { toPhone: toPhone, toCity: donorCity, toName: donorName };
    const info = document.getElementById("requestModalDonorInfo");
    info.textContent = `Requesting from ${donorName} (${donorCity})`;
    const modal = document.getElementById("requestModal");
    modal.classList.remove("hidden");
    modal.style.display = "flex";
}

function closeRequestModal() {
    const modal = document.getElementById("requestModal");
    modal.classList.add("hidden");
    modal.style.display = "none";
}

document.addEventListener("DOMContentLoaded", function () {
    const confirmBtn = document.getElementById("confirmRequestBtn");
    if (confirmBtn) {
        confirmBtn.addEventListener("click", function () {
            const pending = window.__pendingRequestTarget;
            if (!pending) return;
            const emergency = !!document.getElementById("requestEmergencyCheckbox").checked;
            const fromPhone = getLoggedDonorPhone();
            if (!fromPhone) {
                alert("Login required.");
                closeRequestModal();
                return;
            }

            // attempt to get requester name and city from donors list
            const donors = JSON.parse(localStorage.getItem("donors")) || [];
            const requester = donors.find(d => d.phone === fromPhone) || {};

            const newRequest = {
                id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9),
                fromName: requester.name || "",
                fromPhone: fromPhone,
                fromCity: requester.city || "",
                toName: pending.toName || "",
                toPhone: pending.toPhone,
                toCity: pending.toCity || "",
                time: new Date().toISOString(),
                emergency: emergency,
                status: "pending"
            };

            const requests = JSON.parse(localStorage.getItem("requests")) || [];
            requests.push(newRequest);
            localStorage.setItem("requests", JSON.stringify(requests));

            closeRequestModal();
            document.getElementById("requestEmergencyCheckbox").checked = false;
            window.__pendingRequestTarget = null;
            alert(`Request sent to ${newRequest.toName}`);
            renderMySentRequests();
            updateNotificationBadge();
        });
    }

    // initial render of sent requests
    renderMySentRequests();
});

function formatDateTime(dateString) {
    const d = new Date(dateString);
    return d.toLocaleString();
}

function getTimeAgo(dateString) {
    const now = new Date();
    const time = new Date(dateString);
    const diff = now - time;

    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    if (hrs < 24) return `${hrs} hr ago`;
    if (days < 7) return `${days} day ago`;
    return "Older";
}

function renderMySentRequests() {
    const loggedPhone = getLoggedDonorPhone();
    if (!loggedPhone) return;

    const all = JSON.parse(localStorage.getItem("requests")) || [];

    // update expiration before filtering
    updateExpiredRequests(all);

    let mine = all.filter(r => r.fromPhone === loggedPhone);

    const section = document.getElementById("mySentRequestsSection");
    const noSent = document.getElementById("noSentRequests");
    const container = document.getElementById("sentRequestsContainer");
    const body = document.getElementById("sentRequestsTableBody");

    if (!mine || mine.length === 0) {
        section.classList.add("hidden");
        noSent.classList.remove("hidden");
        container.classList.add("hidden");
        return;
    }

    section.classList.remove("hidden");
    noSent.classList.add("hidden");
    container.classList.remove("hidden");
    body.innerHTML = "";

    mine.sort((a,b) => new Date(b.time) - new Date(a.time));

    mine.forEach(function (r) {
        const tr = document.createElement("tr");
        const emergencyHtml = r.emergency ? '<span class="badge badge-danger">Emergency</span>' : '<span class="badge badge-info">Normal</span>';
        let statusHtml = '';
        if (r.status === 'accepted') {
            statusHtml = `<span class="badge badge-success">Accepted</span><br><small>Donor: ${escapeHtml(r.toName)} (${escapeHtml(r.toPhone)})</small>`;
        } else if (r.status === 'pending') {
            statusHtml = '<span class="text-muted">Pending</span>';
        } else if (r.status === 'rejected') {
            statusHtml = `<span class="badge badge-danger">Rejected</span><br><small>Donor: ${escapeHtml(r.toName)} (${escapeHtml(r.toPhone)})</small>`;
        } else if (r.status === 'denied') {
            statusHtml = `<span class="badge badge-warning">Denied (offline)</span><br><small>Donor: ${escapeHtml(r.toName)} (${escapeHtml(r.toPhone)})</small>`;
        }

        tr.innerHTML = `
            <td><strong>${escapeHtml(r.toName)}</strong></td>
            <td>${escapeHtml(r.toCity || '')}</td>
            <td>${getTimeAgo(r.time)}<br><small style="color:#999">${formatDateTime(r.time)}</small></td>
            <td>${emergencyHtml}</td>
            <td>${statusHtml}</td>
        `;

        body.appendChild(tr);
    });
}

function viewDonorMap(city, lat, lng) {
    const modal = document.getElementById("mapModal");
    const container = document.getElementById("mapContainer");
    const title = document.getElementById("mapTitle");

    title.textContent = `${city} - Donor Location`;

    container.innerHTML = `
        <iframe
            src="https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}"
            width="100%" height="300"
            style="border:0;border-radius:6px">
        </iframe>
        <p style="margin-top:10px">
            <a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}" target="_blank" rel="noopener noreferrer">
                Open in Maps
            </a>
        </p>
    `;

    modal.classList.remove("hidden");
    modal.style.display = "flex";
}

function closeMapModal() {
    const modal = document.getElementById("mapModal");
    modal.classList.add("hidden");
    modal.style.display = "none";
}

document.addEventListener("click", function (event) {
    const modal = document.getElementById("mapModal");
    if (event.target === modal) {
        closeMapModal();
    }
});

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// iterate through provided request list and mark emergency pending items older than 15 minutes as denied
function updateExpiredRequests(allReqs) {
    let changed = false;
    const now = Date.now();
    allReqs.forEach(r => {
        if (r.status === 'pending' && r.emergency) {
            const sentTime = new Date(r.time).getTime();
            if (now - sentTime > 15 * 60000) {
                r.status = 'denied';
                changed = true;
            }
        }
    });
    if (changed) {
        localStorage.setItem("requests", JSON.stringify(allReqs));
    }
}

// keep view up to date in case timeouts occur while the user is on the page
setInterval(function () {
    renderMySentRequests();
    updateNotificationBadge();
}, 10000);
