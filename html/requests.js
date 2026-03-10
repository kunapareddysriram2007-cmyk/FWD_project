document.addEventListener("DOMContentLoaded", function () {
    loadRequestsForLoggedInDonor();
    updateNotificationBadge();
});

function loadRequestsForLoggedInDonor() {
    const myPhone = getLoggedDonorPhone();
    const noRequestsMessage = document.getElementById("noRequestsMessage");
    const requestsContainer = document.getElementById("requestsContainer");
    const body = document.getElementById("requestsTableBody");

    if (!myPhone || !body) return;

    const requests = appStore.updateExpiredRequests().filter(request => request.toPhone === myPhone);
    body.innerHTML = "";

    if (!requests.length) {
        noRequestsMessage.classList.remove("hidden");
        requestsContainer.classList.add("hidden");
        return;
    }

    noRequestsMessage.classList.add("hidden");
    requestsContainer.classList.remove("hidden");

    requests.sort((a, b) => new Date(b.time) - new Date(a.time));

    requests.forEach(request => {
        const row = document.createElement("tr");
        const typeHtml = request.emergency
            ? '<span class="badge badge-danger">Emergency</span>'
            : '<span class="badge badge-info">Normal</span>';

        let actionHtml = "";
        let statusHtml = '<span class="badge badge-muted">Pending</span>';

        if (request.status === "pending") {
            actionHtml = `
                <div class="btn-group">
                    <button type="button" class="btn btn-primary btn-small" data-action="accept" data-id="${request.id}">Accept</button>
                    <button type="button" class="btn btn-danger btn-small" data-action="reject" data-id="${request.id}">Reject</button>
                </div>
            `;
        } else if (request.status === "accepted") {
            statusHtml = `<span class="badge badge-success">Accepted</span><br><small class="text-muted">${escapeHtml(request.fromPhone)}</small>`;
        } else if (request.status === "rejected") {
            statusHtml = `<span class="badge badge-danger">Rejected</span><br><small class="text-muted">${escapeHtml(request.fromPhone)}</small>`;
        } else if (request.status === "denied") {
            statusHtml = `<span class="badge badge-warning">Auto-denied</span><br><small class="text-muted">${escapeHtml(request.fromPhone)}</small>`;
        }

        row.innerHTML = `
            <td><strong>${escapeHtml(request.fromName || request.fromPhone)}</strong></td>
            <td>${escapeHtml(request.fromCity || "N/A")}</td>
            <td>${getTimeAgo(request.time)}<br><small class="text-muted">${formatDateTime(request.time)}</small></td>
            <td>${typeHtml}</td>
            <td>${actionHtml || '<span class="text-muted">No action</span>'}</td>
            <td>${statusHtml}</td>
        `;
        body.appendChild(row);
    });

    bindRequestActionButtons();
}

function bindRequestActionButtons() {
    document.querySelectorAll("[data-action][data-id]").forEach(button => {
        button.addEventListener("click", function () {
            const action = button.dataset.action;
            const requestId = button.dataset.id;
            updateRequestStatus(requestId, action === "accept" ? "accepted" : "rejected");
        });
    });
}

function updateRequestStatus(requestId, status) {
    const requests = appStore.getRequests();
    const index = requests.findIndex(request => request.id === requestId);
    if (index === -1) return;

    requests[index].status = status;
    appStore.saveRequests(requests);
    showAlert(document.getElementById("requestsAlert"), `Request ${status}.`, "success");
    loadRequestsForLoggedInDonor();
    updateNotificationBadge();
}

setInterval(function () {
    loadRequestsForLoggedInDonor();
    updateNotificationBadge();
}, 10000);
