import {
	deleteAdminAssignment,
	deleteAdminSemester,
	deleteAdminSubject,
	deleteShareSettings,
	getAnalyticsRetention,
	getAdminAssignments,
	getAdminAuditLogs,
	getAdminOverview,
	getAdminReports,
	getAdminSemesters,
	getAdminSubjects,
	getAdminSystemStatus,
	getAdminUsers,
	getNewUserDefaultStatus,
	getShareSettings,
	reviewAdminReport,
	saveAdminAssignment,
	saveAdminSemester,
	saveAdminSubject,
	saveAnalyticsRetention,
	saveNewUserDefaultStatus,
	saveShareSettings,
	updateAdminUser
} from "../api/admin.api.js";
import { getAnalyticsSummary } from "../api/analytics.api.js";

const statGrid = document.getElementById("adminStats");
const analyticsStats = document.getElementById("adminAnalyticsStats");
const usersBody = document.getElementById("adminUsersBody");
const userSearch = document.getElementById("adminUserSearch");
const roleFilter = document.getElementById("adminRoleFilter");
const userMessage = document.getElementById("adminUserMessage");
const operationsMessage = document.getElementById("adminOperationsMessage");
const systemGrid = document.getElementById("adminSystemStatus");
const retentionForm = document.getElementById("analyticsRetentionForm");
const cleanupEnabled = document.getElementById("analyticsCleanupEnabled");
const retentionDays = document.getElementById("analyticsRetentionDays");
const cleanupAction = document.getElementById("analyticsCleanupAction");
const retentionMessage = document.getElementById("analyticsRetentionMessage");
const subjectSort = document.getElementById("subjectSort");
const shareSettingsForm = document.getElementById("shareSettingsForm");
const shareSettingsMessage = document.getElementById("shareSettingsMessage");

const defaultShareSettings = {
	title: "Share GyanPath",
	description: "Scan the QR code or share it with another MCA student.",
	shareText: "GyanPath - IGNOU MCA study resources",
	url: "https://mcaignoustudyhelperfullstck-production.up.railway.app/"
};

let users = [];
let adminSubjects = [];

const roleLabels = {
	USER: "User",
	EDITOR: "Editor",
	MODERATOR: "Moderator",
	ADMIN: "Admin"
};

function setMessage(element, text, type = "") {
	element.textContent = text;
	element.className = `admin-message ${type}`.trim();
}

function renderStats(data) {
	const stats = [
		["Users", data.users],
		["Subjects", data.subjects],
		["Question Papers", data.papers],
		["Study Materials", data.studyMaterials],
		["Questions", data.questions],
		["Discussions", data.discussions],
		["Banners", data.banners],
		["Video Lectures", data.lectures]
	];
	statGrid.replaceChildren(...stats.map(([label, value]) => {
		const card = document.createElement("article");
		card.className = "admin-stat-card";
		card.innerHTML = `<span aria-hidden="true">•</span><div><strong>${value}</strong><p>${label}</p></div>`;
		return card;
	}));
}

function renderAnalytics(data) {
	const stats = [
		["Total visits", data.totalVisits],
		["Today", data.todayVisits],
		["Unique visitors", data.uniqueVisitors],
		["Online now", data.onlineNow]
	];
	analyticsStats.replaceChildren(...stats.map(([label, value]) => {
		const card = document.createElement("article");
		card.className = "admin-stat-card";
		card.innerHTML = `<span aria-hidden="true">•</span><div><strong>${value}</strong><p>${label}</p></div>`;
		return card;
	}));

	const renderList = (targetId, items, emptyText) => {
		const target = document.getElementById(targetId);
		if (!items.length) {
			target.replaceChildren(emptyCard(emptyText));
			return;
		}
		target.replaceChildren(...items.map((item) => {
			const row = document.createElement("div");
			row.className = "admin-system-item";
			row.innerHTML = `<span>${item.label}</span><strong>${item.count}</strong>`;
			return row;
		}));
	};
	const renderUserActivity = (items) => {
		const target = document.getElementById("analyticsUserActivity");
		if (!items.length) {
			target.replaceChildren(emptyCard("No logged-in user visits recorded yet."));
			return;
		}
		target.replaceChildren(...items.map((item) => {
			const row = document.createElement("div");
			row.className = "admin-system-item admin-user-activity-item";
			const lastActive = item.lastActive ? new Date(item.lastActive).toLocaleString() : "No activity";
			const meta = document.createElement("span");
			meta.textContent = `${item.role || "USER"} · ${item.visits} visits`;
			const name = document.createElement("strong");
			name.textContent = `${item.displayName}${item.username ? ` (@${item.username})` : ""}`;
			const active = document.createElement("small");
			active.textContent = `Last active: ${lastActive}`;
			row.append(meta, name, active);
			return row;
		}));
	};

	const maxVisits = Math.max(1, ...data.last7Days.map((item) => item.visits));
	document.getElementById("analyticsSevenDays").replaceChildren(...data.last7Days.map((item) => {
		const row = document.createElement("div");
		row.className = "admin-chart-row";
		row.innerHTML = `<span>${item.date.slice(5)}</span><div><i style="width:${Math.max(4, (item.visits / maxVisits) * 100)}%"></i></div><strong>${item.visits}</strong>`;
		return row;
	}));
	renderList("analyticsTopPages", data.topPages, "No page visits recorded yet.");
	renderList("analyticsDevices", data.devices, "No device data yet.");
	renderList("analyticsReferrers", data.referrers, "No referrer data yet.");
	renderUserActivity(data.userActivity || []);
}

function filteredUsers() {
	const query = userSearch.value.trim().toLowerCase();
	const role = roleFilter.value;
	return users.filter((user) => {
		const text = `${user.displayName} ${user.username} ${user.email || ""}`.toLowerCase();
		return (!query || text.includes(query)) && (!role || user.role === role);
	});
}

function renderUsers() {
	usersBody.replaceChildren();
	for (const user of filteredUsers()) {
		const row = document.createElement("tr");
		const identity = document.createElement("td");
		identity.innerHTML = `<strong>${user.displayName}</strong><small>@${user.username}${user.email ? ` · ${user.email}` : ""}</small>`;

		const roleCell = document.createElement("td");
		const select = document.createElement("select");
		select.className = "admin-role-select";
		for (const role of Object.keys(roleLabels)) {
			select.add(new Option(roleLabels[role], role, false, user.role === role));
		}
		const statusSelect = document.createElement("select");
		statusSelect.className = "admin-role-select";
		for (const status of ["PENDING", "ACTIVE", "SUSPENDED", "BANNED"]) {
			statusSelect.add(new Option(status, status, false, user.status === status));
		}
		const applyButton = document.createElement("button");
		applyButton.type = "button";
		applyButton.className = "logout-button";
		applyButton.textContent = "Apply";
		applyButton.addEventListener("click", async () => {
			const previousRole = user.role;
			const previousStatus = user.status;
			applyButton.disabled = true;
			try {
				const updated = await updateAdminUser(user.id, {
					role: select.value,
					status: statusSelect.value
				});
				user.role = updated.role;
				user.status = updated.status;
				setMessage(userMessage, `${user.displayName}'s changes were applied.`, "success");
			} catch (error) {
				select.value = previousRole;
				statusSelect.value = previousStatus;
				setMessage(userMessage, error.message, "error");
			} finally {
				applyButton.disabled = false;
			}
		});
		roleCell.append(select, statusSelect, applyButton);

		const activity = document.createElement("td");
		activity.textContent = `${user._count.progress} progress · ${user._count.discussions} posts`;
		const joined = document.createElement("td");
		joined.textContent = new Date(user.createdAt).toLocaleDateString();

		row.append(identity, roleCell, activity, joined);
		usersBody.append(row);
	}

	if (!usersBody.childElementCount) {
		const row = document.createElement("tr");
		row.innerHTML = '<td colspan="4" class="admin-empty">No matching users found.</td>';
		usersBody.append(row);
	}
}

function renderSystem(data) {
	const entries = [
		["API Server", data.api],
		["PostgreSQL", data.database],
		["Architecture", data.architecture],
		["Database Layer", data.databaseEngine],
		["Node.js", data.nodeVersion],
		["Redis", data.redis]
	];
	systemGrid.replaceChildren(...entries.map(([label, value]) => {
		const item = document.createElement("div");
		item.className = "admin-system-item";
		item.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
		return item;
	}));
}

function fillShareSettings(setting = defaultShareSettings) {
	document.getElementById("shareTitle").value = setting.title;
	document.getElementById("shareDescription").value = setting.description;
	document.getElementById("shareText").value = setting.shareText;
	document.getElementById("shareUrl").value = setting.url;
}

function emptyCard(text) {
	const empty = document.createElement("div");
	empty.className = "admin-empty-card";
	empty.textContent = text;
	return empty;
}

function actionButton(label, handler, danger = false) {
	const button = document.createElement("button");
	button.type = "button";
	button.className = danger ? "button button-danger" : "button";
	button.textContent = label;
	button.addEventListener("click", handler);
	return button;
}

function tableCell(content, options = {}) {
	const cell = document.createElement("td");
	if (options.className) cell.className = options.className;
	if (options.colSpan) cell.colSpan = options.colSpan;
	if (content instanceof Node) {
		cell.append(content);
	} else {
		cell.textContent = content;
	}
	return cell;
}

function strongText(text) {
	const strong = document.createElement("strong");
	strong.textContent = text;
	return strong;
}

function emptyTableRow(message, columns) {
	const row = document.createElement("tr");
	row.append(tableCell(message, { className: "admin-empty", colSpan: columns }));
	return row;
}

function itemCard(title, meta, actions = []) {
	const card = document.createElement("article");
	card.className = "admin-list-card admin-crud-card";
	const content = document.createElement("div");
	content.innerHTML = `<strong>${title}</strong><small>${meta}</small>`;
	const actionWrap = document.createElement("div");
	actionWrap.className = "admin-card-actions";
	actionWrap.append(...actions);
	card.append(content, actionWrap);
	return card;
}

function renderCards(targetId, items, emptyText, renderer) {
	const target = document.getElementById(targetId);
	target.replaceChildren(...(items.length ? items.map(renderer) : [emptyCard(emptyText)]));
}

function sortedSubjects() {
	const sort = subjectSort.value;
	return [...adminSubjects].sort((a, b) => {
		if (sort === "semester") return a.semester - b.semester || a.code.localeCompare(b.code);
		if (sort === "code") return a.code.localeCompare(b.code);
		if (sort === "name") return a.title.localeCompare(b.title);
		return a.type.localeCompare(b.type) || a.code.localeCompare(b.code);
	});
}

function renderSubjectRows() {
	const target = document.getElementById("adminSubjects");
	const subjects = sortedSubjects();
	if (!subjects.length) {
		target.replaceChildren(emptyTableRow("No subjects found.", 6));
		return;
	}
	target.replaceChildren(...subjects.map((item) => {
		const row = document.createElement("tr");
		const actions = document.createElement("td");
		actions.className = "table-actions";
		actions.append(
			actionButton("Edit", () => editSubject(item)),
			actionButton("Delete", async () => { await deleteAdminSubject(item.id); await loadOperations(); }, true)
		);
		row.append(
			tableCell(`Sem ${item.semester}`),
			tableCell(strongText(item.code)),
			tableCell(item.title),
			tableCell(item.type),
			tableCell(item.questionBank ? "Yes" : "No"),
			actions
		);
		return row;
	}));
}

function resetSemesterForm() {
	document.getElementById("semesterEditId").value = "";
	document.getElementById("semesterFormTitle").textContent = "Add Semester";
	document.getElementById("semesterForm").reset();
	document.getElementById("cancelSemesterEdit").hidden = true;
}

function editSemester(item) {
	document.getElementById("semesterEditId").value = item.id;
	document.getElementById("semesterFormTitle").textContent = "Edit Semester";
	document.getElementById("semesterNumber").value = item.number;
	document.getElementById("semesterTitle").value = item.title;
	document.getElementById("cancelSemesterEdit").hidden = false;
	document.getElementById("semesterForm").scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetSubjectForm() {
	document.getElementById("subjectEditId").value = "";
	document.getElementById("subjectFormTitle").textContent = "Add Subject";
	document.getElementById("subjectForm").reset();
	document.getElementById("cancelSubjectEdit").hidden = true;
}

function editSubject(item) {
	document.getElementById("subjectEditId").value = item.id;
	document.getElementById("subjectFormTitle").textContent = "Edit Subject";
	document.getElementById("subjectCodeInput").value = item.code;
	document.getElementById("subjectTitleInput").value = item.title;
	document.getElementById("subjectSemesterInput").value = item.semester;
	document.getElementById("subjectTypeInput").value = item.type;
	document.getElementById("subjectFolderInput").value = item.folderPath || "";
	document.getElementById("subjectQuestionBankInput").checked = Boolean(item.questionBank);
	document.getElementById("cancelSubjectEdit").hidden = false;
	document.getElementById("subjectForm").scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetAssignmentForm() {
	document.getElementById("assignmentEditId").value = "";
	document.getElementById("assignmentFormTitle").textContent = "Add Assignment";
	document.getElementById("assignmentForm").reset();
	document.getElementById("assignmentStatus").value = "DRAFT";
	document.getElementById("cancelAssignmentEdit").hidden = true;
}

function editAssignment(item) {
	document.getElementById("assignmentEditId").value = item.id;
	document.getElementById("assignmentFormTitle").textContent = "Edit Assignment";
	document.getElementById("assignmentSubject").value = item.subjectId;
	document.getElementById("assignmentTitle").value = item.title;
	document.getElementById("assignmentDueDate").value = item.dueDate ? item.dueDate.slice(0, 16) : "";
	document.getElementById("assignmentStatus").value = item.status;
	document.getElementById("cancelAssignmentEdit").hidden = false;
	document.getElementById("assignmentForm").scrollIntoView({ behavior: "smooth", block: "center" });
}

async function loadOperations() {
	const [semesters, assignments, reports, audits, subjects] = await Promise.all([
		getAdminSemesters(), getAdminAssignments(), getAdminReports(), getAdminAuditLogs(), getAdminSubjects()
	]);
	adminSubjects = subjects;
	document.getElementById("assignmentSubject").replaceChildren(...adminSubjects.map((subject) =>
		new Option(`${subject.code} - ${subject.title}`, subject.id)
	));

	renderCards("adminSemesters", semesters, "No semesters added yet.", (item) =>
		itemCard(`${item.number}. ${item.title}`, item.status, [
			actionButton("Edit", () => editSemester(item)),
			actionButton("Delete", async () => { await deleteAdminSemester(item.id); await loadOperations(); }, true)
		]));
	renderSubjectRows();
	renderCards("adminAssignments", assignments, "No assignments added yet.", (item) =>
		itemCard(`${item.subject.code}: ${item.title}`, `${item.status}${item.dueDate ? ` · Due ${new Date(item.dueDate).toLocaleDateString()}` : ""}`, [
			actionButton("Edit", () => editAssignment(item)),
			actionButton("Delete", async () => { await deleteAdminAssignment(item.id); await loadOperations(); }, true)
		]));
	renderCards("adminReports", reports, "No reports to review.", (item) => {
		const card = itemCard(item.reason, `${item.targetType} · ${new Date(item.createdAt).toLocaleDateString()}`);
		const actions = card.querySelector(".admin-card-actions");
		const status = document.createElement("select");
		status.className = "admin-role-select";
		for (const value of ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"]) {
			status.add(new Option(value, value, false, item.status === value));
		}
		const resolution = document.createElement("input");
		resolution.className = "admin-inline-input";
		resolution.placeholder = "Resolution note";
		resolution.value = item.resolution || "";
		actions.append(status, resolution, actionButton("Save", async () => {
			await reviewAdminReport(item.id, { status: status.value, resolution: resolution.value || null });
			await loadOperations();
		}));
		return card;
	});

	const auditTarget = document.getElementById("adminAuditLogs");
	if (!audits.length) {
		auditTarget.replaceChildren(emptyCard("No audit activity yet."));
		return;
	}
	auditTarget.replaceChildren(...audits.slice(0, 20).map((item) => {
		const row = document.createElement("div");
		row.className = "admin-system-item";
		row.innerHTML = `<span>${new Date(item.createdAt).toLocaleString()}</span><strong>${item.action} · ${item.entityType}</strong>`;
		return row;
	}));
}

async function initialize() {
	try {
		const [overview, userList, system, newUserDefault] = await Promise.all([
			getAdminOverview(), getAdminUsers(), getAdminSystemStatus(), getNewUserDefaultStatus()
		]);
		users = userList;
		renderStats(overview);
		renderUsers();
		renderSystem(system);
		document.getElementById("newUserDefaultStatus").value = newUserDefault.status;
	} catch (error) {
		setMessage(userMessage, `Users and roles could not be loaded: ${error.message}`, "error");
		return;
	}

	try {
		renderAnalytics(await getAnalyticsSummary());
	} catch (error) {
		analyticsStats.replaceChildren(emptyCard(`Analytics could not be loaded: ${error.message}`));
	}

	try {
		const retention = await getAnalyticsRetention();
		cleanupEnabled.checked = retention.enabled;
		retentionDays.value = String(retention.retentionDays);
		cleanupAction.value = retention.action;
	} catch (error) {
		setMessage(retentionMessage, `Retention settings could not be loaded: ${error.message}`, "error");
	}

	try {
		fillShareSettings(await getShareSettings());
	} catch (error) {
		fillShareSettings();
		setMessage(shareSettingsMessage, `Share settings could not be loaded: ${error.message}`, "error");
	}

	try {
		await loadOperations();
	} catch (error) {
		setMessage(operationsMessage, `Admin operations could not be loaded: ${error.message}`, "error");
	}
}

userSearch.addEventListener("input", renderUsers);
roleFilter.addEventListener("change", renderUsers);
subjectSort.addEventListener("change", renderSubjectRows);
document.getElementById("saveNewUserDefaultStatus").addEventListener("click", async () => {
	const status = document.getElementById("newUserDefaultStatus").value;
	await saveNewUserDefaultStatus(status);
	setMessage(userMessage, `New accounts will default to ${status}.`, "success");
});
document.getElementById("semesterForm").addEventListener("submit", async (event) => {
	event.preventDefault();
	const id = document.getElementById("semesterEditId").value;
	await saveAdminSemester({
		number: Number(document.getElementById("semesterNumber").value),
		title: document.getElementById("semesterTitle").value,
		active: true,
		status: "PUBLISHED"
	}, id);
	resetSemesterForm();
	setMessage(operationsMessage, id ? "Semester updated." : "Semester created.", "success");
	await loadOperations();
});
document.getElementById("subjectForm").addEventListener("submit", async (event) => {
	event.preventDefault();
	const id = document.getElementById("subjectEditId").value;
	const folderPath = document.getElementById("subjectFolderInput").value.trim();
	await saveAdminSubject({
		code: document.getElementById("subjectCodeInput").value,
		title: document.getElementById("subjectTitleInput").value,
		semester: Number(document.getElementById("subjectSemesterInput").value),
		type: document.getElementById("subjectTypeInput").value,
		folderPath: folderPath || undefined,
		questionBank: document.getElementById("subjectQuestionBankInput").checked
	}, id);
	resetSubjectForm();
	setMessage(operationsMessage, id ? "Subject updated." : "Subject created.", "success");
	await loadOperations();
});
document.getElementById("assignmentForm").addEventListener("submit", async (event) => {
	event.preventDefault();
	const id = document.getElementById("assignmentEditId").value;
	const dueDate = document.getElementById("assignmentDueDate").value;
	await saveAdminAssignment({
		subjectId: document.getElementById("assignmentSubject").value,
		title: document.getElementById("assignmentTitle").value,
		dueDate: dueDate ? new Date(dueDate).toISOString() : null,
		status: document.getElementById("assignmentStatus").value
	}, id);
	resetAssignmentForm();
	setMessage(operationsMessage, id ? "Assignment updated." : "Assignment created.", "success");
	await loadOperations();
});
document.getElementById("cancelSemesterEdit").addEventListener("click", resetSemesterForm);
document.getElementById("cancelSubjectEdit").addEventListener("click", resetSubjectForm);
document.getElementById("cancelAssignmentEdit").addEventListener("click", resetAssignmentForm);
retentionForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	try {
		const saved = await saveAnalyticsRetention({
			enabled: cleanupEnabled.checked,
			retentionDays: Number(retentionDays.value),
			action: cleanupAction.value
		});
		setMessage(
			retentionMessage,
			saved.enabled ? `Automatic ${saved.action} is enabled after ${saved.retentionDays} days.` : "Automatic analytics cleanup is disabled.",
			"success"
		);
	} catch (error) {
		setMessage(retentionMessage, error.message, "error");
	}
});
shareSettingsForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	try {
		const saved = await saveShareSettings({
			title: document.getElementById("shareTitle").value,
			description: document.getElementById("shareDescription").value,
			shareText: document.getElementById("shareText").value,
			url: document.getElementById("shareUrl").value
		});
		fillShareSettings(saved);
		setMessage(shareSettingsMessage, "Share settings saved.", "success");
	} catch (error) {
		setMessage(shareSettingsMessage, error.message, "error");
	}
});
document.getElementById("resetShareSettings").addEventListener("click", async () => {
	try {
		await deleteShareSettings();
		fillShareSettings();
		setMessage(shareSettingsMessage, "Share settings reset to default.", "success");
	} catch (error) {
		setMessage(shareSettingsMessage, error.message, "error");
	}
});

initialize();
