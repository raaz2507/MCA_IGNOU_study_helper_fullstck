import {
	deleteAdminUser,
	getAdminAuditLogs,
	getAdminUsers,
	getNewUserDefaultStatus,
	resetAdminUserPassword,
	saveNewUserDefaultStatus,
	updateAdminUser
} from "../api/admin.api.js";
import { showToast } from "../utils/toast.js";

const usersBody = document.getElementById("adminUsersBody");
const searchInput = document.getElementById("adminUserSearch");
const roleFilter = document.getElementById("adminRoleFilter");
const statusFilter = document.getElementById("adminStatusFilter");
const message = document.getElementById("adminUserMessage");
const auditTarget = document.getElementById("adminUserAuditLogs");
const detailDialog = document.getElementById("userDetailsDialog");
const detailTitle = document.getElementById("userDetailsTitle");
const detailBody = document.getElementById("userDetailsBody");
const bulkSummary = document.getElementById("bulkActionSummary");

const roles = ["ADMIN", "EDITOR", "MODERATOR", "USER"];
const statuses = ["PENDING", "ACTIVE", "SUSPENDED", "BANNED"];
let users = [];
let audits = [];

function setMessage(text, type = "") {
	message.textContent = text;
	message.className = `admin-message ${type}`.trim();
	if (["success", "error", "warning", "info"].includes(type) && text) {
		showToast(text, type);
	}
}

function lastVisit(user) {
	return user.analyticsVisits?.[0] || null;
}

function formatDate(value) {
	return value ? new Date(value).toLocaleString() : "No activity";
}

function filteredUsers() {
	const query = searchInput.value.trim().toLowerCase();
	return users.filter((user) => {
		const text = `${user.displayName} ${user.username} ${user.email || ""}`.toLowerCase();
		return (!query || text.includes(query))
			&& (!roleFilter.value || user.role === roleFilter.value)
			&& (!statusFilter.value || user.status === statusFilter.value);
	});
}

function selectedIds() {
	return [...document.querySelectorAll(".user-select:checked")].map((input) => input.value);
}

function updateBulkSummary() {
	const count = selectedIds().length;
	const role = document.getElementById("bulkRole").value;
	const status = document.getElementById("bulkStatus").value;
	const actions = [
		role ? `role to ${role}` : "",
		status ? `status to ${status}` : ""
	].filter(Boolean);
	if (!bulkSummary) return;
	if (!count) {
		bulkSummary.textContent = "Select users, then choose a bulk role or status to apply.";
		return;
	}
	if (!actions.length) {
		bulkSummary.innerHTML = `<strong>${count}</strong> user${count === 1 ? "" : "s"} selected. Choose a bulk role or status.`;
		return;
	}
	bulkSummary.innerHTML = `<strong>${count}</strong> user${count === 1 ? "" : "s"} selected. Action: ${actions.join(" and ")}.`;
}

function selectFor(values, selected) {
	const select = document.createElement("select");
	select.className = "admin-role-select";
	values.forEach((value) => select.add(new Option(value, value, false, value === selected)));
	return select;
}

function actionButton(label, handler, danger = false) {
	const button = document.createElement("button");
	button.type = "button";
	button.className = danger ? "admin-danger-button admin-mini-button" : "secondary-button admin-mini-button";
	button.textContent = label;
	button.addEventListener("click", handler);
	return button;
}

async function applyUserUpdate(user, role, status) {
	const updated = await updateAdminUser(user.id, { role, status });
	Object.assign(user, updated);
	renderUsers();
}

function userAuditMatches(user) {
	return audits.filter((item) =>
		item.entityType === "User"
		&& (item.entityId === user.id || item.actor?.username === user.username)
	);
}

function showDetails(user) {
	const visit = lastVisit(user);
	const details = [
		["Display name", user.displayName],
		["Username", `@${user.username}`],
		["Email", user.email || "No email"],
		["Role", user.role],
		["Status", user.status],
		["Joined", formatDate(user.createdAt)],
		["Last active", formatDate(visit?.createdAt)],
		["Last page", visit?.pagePath || "No activity"],
		["Device", [visit?.deviceType, visit?.browser].filter(Boolean).join(" / ") || "No activity"],
		["Progress", user._count.progress],
		["Discussions", user._count.discussions],
		["Comments", user._count.comments],
		["Assignments", user._count.assignments],
		["Reports made", user._count.reportsMade],
		["Reports about user", user._count.reportsAbout],
		["Audit matches", userAuditMatches(user).length]
	];
	detailTitle.textContent = `${user.displayName} (@${user.username})`;
	detailBody.replaceChildren(...details.map(([label, value]) => {
		const item = document.createElement("div");
		item.className = "admin-detail-item";
		item.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
		return item;
	}));
	detailDialog.showModal();
}

function renderAudit(items = audits.slice(0, 40)) {
	if (!items.length) {
		auditTarget.replaceChildren(emptyCard("No user audit activity yet."));
		return;
	}
	auditTarget.replaceChildren(...items.map((item) => {
		const row = document.createElement("div");
		row.className = "admin-system-item";
		const actor = item.actor?.displayName || item.actor?.username || "System";
		row.innerHTML = `<span>${new Date(item.createdAt).toLocaleString()} | ${actor}</span><strong>${item.action} | ${item.entityType}</strong>`;
		return row;
	}));
}

function emptyCard(text) {
	const empty = document.createElement("div");
	empty.className = "admin-empty-card";
	empty.textContent = text;
	return empty;
}

function renderUsers() {
	const rows = filteredUsers().map((user) => {
		const row = document.createElement("tr");
		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.className = "user-select";
		checkbox.value = user.id;
		checkbox.addEventListener("change", updateBulkSummary);

		const roleSelect = selectFor(roles, user.role);
		const statusSelect = selectFor(statuses, user.status);
		const apply = actionButton("Apply", async () => {
			try {
				await applyUserUpdate(user, roleSelect.value, statusSelect.value);
				setMessage(`${user.displayName}'s changes were applied.`, "success");
			} catch (error) {
				setMessage(error.message, "error");
			}
		});

		const quickActions = document.createElement("div");
		quickActions.className = "admin-table-actions";
		quickActions.append(
			actionButton("Details", () => showDetails(user)),
			actionButton("Audit", () => renderAudit(userAuditMatches(user))),
			actionButton("Approve", async () => {
				try {
					await applyUserUpdate(user, user.role, "ACTIVE");
					setMessage(`${user.displayName} approved.`, "success");
				} catch (error) {
					setMessage(error.message, "error");
				}
			}),
			actionButton("Suspend", async () => {
				try {
					await applyUserUpdate(user, user.role, "SUSPENDED");
					setMessage(`${user.displayName} suspended.`, "success");
				} catch (error) {
					setMessage(error.message, "error");
				}
			}),
			actionButton("Reset Password", async () => {
				if (!confirm(`Reset password for ${user.displayName}?`)) return;
				try {
					const result = await resetAdminUserPassword(user.id);
					setMessage(`Temporary password for ${user.username}: ${result.temporaryPassword}`, "success");
				} catch (error) {
					setMessage(error.message, "error");
				}
			}),
			actionButton("Force Change", () => {
				setMessage("Force password change needs a database flag before it can be enforced at login.", "error");
			}),
			actionButton("Verify Email", () => {
				setMessage("Email verification is handled through the Resend link sent to the user.", "info");
			}),
			actionButton("Delete", async () => {
				if (!confirm(`Delete ${user.displayName}? This cannot be undone.`)) return;
				try {
					await deleteAdminUser(user.id);
					users = users.filter((item) => item.id !== user.id);
					renderUsers();
					setMessage(`${user.displayName} deleted.`, "success");
				} catch (error) {
					setMessage(error.message, "error");
				}
			}, true)
		);

		const visit = lastVisit(user);
		row.append(
			cell(checkbox),
			cell(identity(user)),
			cell(roleStatus(roleSelect, statusSelect, apply)),
			cell(`${user._count.progress} progress | ${user._count.discussions} posts | ${user._count.comments} comments`),
			cell(formatDate(visit?.createdAt)),
			cell(new Date(user.createdAt).toLocaleDateString()),
			cell(quickActions)
		);
		return row;
	});
	usersBody.replaceChildren(...rows);
	if (!rows.length) usersBody.append(emptyRow("No matching users found."));
	updateBulkSummary();
}

function cell(content) {
	const td = document.createElement("td");
	if (content instanceof Node) td.append(content);
	else td.textContent = content;
	return td;
}

function identity(user) {
	const wrap = document.createElement("div");
	wrap.innerHTML = `<strong>${user.displayName}</strong><small>@${user.username}${user.email ? ` | ${user.email}` : ""}</small>`;
	return wrap;
}

function roleStatus(roleSelect, statusSelect, apply) {
	const wrap = document.createElement("div");
	wrap.className = "admin-role-stack";
	wrap.append(roleSelect, statusSelect, apply);
	return wrap;
}

function emptyRow(text) {
	const row = document.createElement("tr");
	row.innerHTML = `<td colspan="7" class="admin-empty">${text}</td>`;
	return row;
}

function exportData(format) {
	const data = filteredUsers();
	if (!data.length) {
		setMessage("No matching users to export.", "warning");
		return;
	}
	const rows = data.map((user) => ({
		id: user.id,
		username: user.username,
		displayName: user.displayName,
		email: user.email || "",
		role: user.role,
		status: user.status,
		joined: user.createdAt,
		lastActive: lastVisit(user)?.createdAt || "",
		progress: user._count.progress,
		discussions: user._count.discussions,
		comments: user._count.comments
	}));
	const blob = format === "json"
		? new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" })
		: new Blob([csv(rows)], { type: "text/csv" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `gyanpath-users.${format}`;
	document.body.append(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
	setMessage(`${rows.length} user record(s) exported as ${format.toUpperCase()}.`, "success");
}

function csv(rows) {
	const headers = Object.keys(rows[0] || { id: "", username: "", displayName: "", email: "", role: "", status: "" });
	return [
		headers.join(","),
		...rows.map((row) => headers.map((key) => `"${String(row[key] ?? "").replaceAll('"', '""')}"`).join(","))
	].join("\n");
}

async function applyBulkChanges() {
	const ids = selectedIds();
	const role = document.getElementById("bulkRole").value;
	const status = document.getElementById("bulkStatus").value;
	if (!ids.length) {
		setMessage("Select at least one user for bulk update.", "warning");
		return;
	}
	if (!role && !status) {
		setMessage("Choose a bulk role or status before applying.", "warning");
		return;
	}
	for (const id of ids) {
		const user = users.find((item) => item.id === id);
		if (user) await applyUserUpdate(user, role || user.role, status || user.status);
	}
	setMessage(`${ids.length} user account(s) updated.`, "success");
}

async function initialize() {
	try {
		const [userList, newDefault, auditList] = await Promise.all([
			getAdminUsers(),
			getNewUserDefaultStatus(),
			getAdminAuditLogs()
		]);
		users = userList;
		audits = auditList.filter((item) => item.entityType === "User" || item.action.includes("USER"));
		document.getElementById("newUserDefaultStatus").value = newDefault.status;
		renderUsers();
		renderAudit();
	} catch (error) {
		setMessage(error.message, "error");
	}
}

searchInput.addEventListener("input", renderUsers);
roleFilter.addEventListener("change", renderUsers);
statusFilter.addEventListener("change", renderUsers);
document.getElementById("selectAllUsers").addEventListener("change", (event) => {
	document.querySelectorAll(".user-select").forEach((input) => {
		input.checked = event.target.checked;
	});
	updateBulkSummary();
});
document.getElementById("bulkRole").addEventListener("change", updateBulkSummary);
document.getElementById("bulkStatus").addEventListener("change", updateBulkSummary);
document.getElementById("saveNewUserDefaultStatus").addEventListener("click", async () => {
	try {
		await saveNewUserDefaultStatus(document.getElementById("newUserDefaultStatus").value);
		setMessage("New account default saved.", "success");
	} catch (error) {
		setMessage(error.message, "error");
	}
});
document.getElementById("applyBulkChanges").addEventListener("click", () => {
	applyBulkChanges().catch((error) => setMessage(error.message, "error"));
});
document.getElementById("exportUsersCsv").addEventListener("click", () => exportData("csv"));
document.getElementById("exportUsersJson").addEventListener("click", () => exportData("json"));
document.getElementById("closeUserDetails").addEventListener("click", () => detailDialog.close());

initialize();
