document.addEventListener("DOMContentLoaded", function () {
    loadRequestsForLoggedInDonor();
    updateNotificationBadge();
});

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function loadRequestsForLoggedInDonor() {
    try {
        const loggedDonorPhone = getLoggedDonorPhone();
        if (!loggedDonorPhone) return;

        const allRequests = JSON.parse(localStorage.getItem("requests")) || [];
        const donorRequests = allRequests.filter(req => req.toPhone === loggedDonorPhone);

        if (donorRequests.length === 0) {
            document.getElementById("noRequestsMessage").classList.remove("hidden");
            document.getElementById("requestsContainer").classList.add("hidden");
            return;
        }

        displayRequests(donorRequests);
    } catch (err) {
        console.error("Request load error:", err);
    }
}

function displayRequests(requests) {
    const tableBody = document.getElementById("requestsTableBody");
    tableBody.innerHTML = "";

    requests.sort((a, b) => new Date(b.time) - new Date(a.time));

    requests.forEach(function (req) {
        const row = document.createElement("tr");

        const emergencyHtml = req.emergency ? '<span class="badge badge-danger">Emergency</span>' : '<span class="badge badge-info">Normal</span>';

        let actionHtml = '';
        let statusHtml = '';

        if (req.status === 'pending') {
            actionHtml = `<button class="btn btn-primary btn-small" onclick="acceptRequest('${req.id}')">Accept</button> ` +
                         `<button class="btn btn-danger btn-small" onclick="rejectRequest('${req.id}')">Reject</button>`;
            statusHtml = '<span class="text-muted">Pending</span>';
        } else if (req.status === 'accepted') {
            actionHtml = '';
            statusHtml = `<span class="badge badge-success">Accepted</span><br><small>Requester: ${escapeHtml(req.fromPhone)}</small>`;
        } else if (req.status === 'rejected') {
            actionHtml = '';
            statusHtml = `<span class="badge badge-danger">Rejected</span><br><small>Requester: ${escapeHtml(req.fromPhone)}</small>`;
        } else if (req.status === 'denied') {
            actionHtml = '';
            statusHtml = `<span class="badge badge-warning">Auto-denied</span><br><small>Requester: ${escapeHtml(req.fromPhone)}</small>`;
        }

        row.innerHTML = `
            <td><strong>${escapeHtml(req.fromName || req.fromPhone)}</strong></td>
            <td>${escapeHtml(req.fromCity || 'N/A')}</td>
            <td>${getTimeAgo(req.time)}<br><small style="color:#999">${formatDateTime(req.time)}</small></td>
            <td>${emergencyHtml}</td>
            <td>${actionHtml}</td>
            <td>${statusHtml}</td>
        `;

        tableBody.appendChild(row);
    });

    document.getElementById("noRequestsMessage").classList.add("hidden");
    document.getElementById("requestsContainer").classList.remove("hidden");
}

function acceptRequest(id) {
    const all = JSON.parse(localStorage.getItem("requests")) || [];
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return;
    all[idx].status = 'accepted';
    localStorage.setItem("requests", JSON.stringify(all));
    updateNotificationBadge();
    loadRequestsForLoggedInDonor();
}

function rejectRequest(id) {
    const all = JSON.parse(localStorage.getItem("requests")) || [];
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return;
    all[idx].status = 'rejected';
    localStorage.setItem("requests", JSON.stringify(all));
    updateNotificationBadge();
    loadRequestsForLoggedInDonor();
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

function formatDateTime(dateString) {
    const d = new Date(dateString);
    return d.toLocaleString();
}

setInterval(function () {
    loadRequestsForLoggedInDonor();
    updateNotificationBadge();
}, 10000);
