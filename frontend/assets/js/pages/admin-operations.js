import {
	deleteAdminAssignment,
	deleteAdminSemester,
	deleteAdminSubject,
	getAdminAssignments,
	getAdminAuditLogs,
	getAdminReports,
	getAdminSemesters,
	getAdminSubjects,
	reviewAdminReport,
	saveAdminAssignment,
	saveAdminSemester,
	saveAdminSubject,
	syncGitHubAcademicContent
} from "../api/admin.api.js";
import { showToast } from "../utils/toast.js";

const operationsMessage = document.getElementById("adminOperationsMessage");
const subjectSort = document.getElementById("subjectSort");
let adminSubjects = [];

function setMessage(element, text, type = "") {
	if (!element) return;
	element.textContent = text;
	element.className = `admin-message ${type}`.trim();
	if (["success", "error", "warning", "info"].includes(type) && text) {
		showToast(text, type);
	}
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
	button.addEventListener("click", () => {
		Promise.resolve(handler()).catch((error) => setMessage(operationsMessage, error.message, "error"));
	});
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
	if (!target) return;
	target.replaceChildren(...(items.length ? items.map(renderer) : [emptyCard(emptyText)]));
}

function sortedSubjects() {
	const sort = subjectSort?.value || "semester";
	return [...adminSubjects].sort((a, b) => {
		if (sort === "semester") return a.semester - b.semester || a.code.localeCompare(b.code);
		if (sort === "code") return a.code.localeCompare(b.code);
		if (sort === "name") return a.title.localeCompare(b.title);
		return a.type.localeCompare(b.type) || a.code.localeCompare(b.code);
	});
}

function renderSubjectRows() {
	const target = document.getElementById("adminSubjects");
	if (!target) return;
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
			actionButton("Delete", async () => {
				await deleteAdminSubject(item.id);
				await loadOperations();
				setMessage(operationsMessage, "Subject deleted.", "success");
			}, true)
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
			actionButton("Delete", async () => {
				await deleteAdminSemester(item.id);
				await loadOperations();
				setMessage(operationsMessage, "Semester deleted.", "success");
			}, true)
		]));
	renderSubjectRows();
	renderCards("adminAssignments", assignments, "No assignments added yet.", (item) =>
		itemCard(`${item.subject.code}: ${item.title}`, `${item.status}${item.dueDate ? ` · Due ${new Date(item.dueDate).toLocaleDateString()}` : ""}`, [
			actionButton("Edit", () => editAssignment(item)),
			actionButton("Delete", async () => {
				await deleteAdminAssignment(item.id);
				await loadOperations();
				setMessage(operationsMessage, "Assignment deleted.", "success");
			}, true)
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
			setMessage(operationsMessage, "Report review saved.", "success");
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

document.getElementById("semesterForm")?.addEventListener("submit", async (event) => {
	event.preventDefault();
	const id = document.getElementById("semesterEditId").value;
	try {
		await saveAdminSemester({
			number: Number(document.getElementById("semesterNumber").value),
			title: document.getElementById("semesterTitle").value,
			active: true,
			status: "PUBLISHED"
		}, id);
		resetSemesterForm();
		setMessage(operationsMessage, id ? "Semester updated." : "Semester created.", "success");
		await loadOperations();
	} catch (error) {
		setMessage(operationsMessage, error.message, "error");
	}
});

document.getElementById("subjectForm")?.addEventListener("submit", async (event) => {
	event.preventDefault();
	const id = document.getElementById("subjectEditId").value;
	const folderPath = document.getElementById("subjectFolderInput").value.trim();
	try {
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
	} catch (error) {
		setMessage(operationsMessage, error.message, "error");
	}
});

document.getElementById("assignmentForm")?.addEventListener("submit", async (event) => {
	event.preventDefault();
	const id = document.getElementById("assignmentEditId").value;
	const dueDate = document.getElementById("assignmentDueDate").value;
	try {
		await saveAdminAssignment({
			subjectId: document.getElementById("assignmentSubject").value,
			title: document.getElementById("assignmentTitle").value,
			dueDate: dueDate ? new Date(dueDate).toISOString() : null,
			status: document.getElementById("assignmentStatus").value
		}, id);
		resetAssignmentForm();
		setMessage(operationsMessage, id ? "Assignment updated." : "Assignment created.", "success");
		await loadOperations();
	} catch (error) {
		setMessage(operationsMessage, error.message, "error");
	}
});

document.getElementById("cancelSemesterEdit")?.addEventListener("click", resetSemesterForm);
document.getElementById("cancelSubjectEdit")?.addEventListener("click", resetSubjectForm);
document.getElementById("cancelAssignmentEdit")?.addEventListener("click", resetAssignmentForm);
subjectSort?.addEventListener("change", renderSubjectRows);

document.getElementById("syncGitHubContent")?.addEventListener("click", async (event) => {
	const button = event.currentTarget;
	const message = document.getElementById("githubContentSyncMessage");
	button.disabled = true;
	setMessage(message, "GitHub repository scan and database sync is running…", "info");
	try {
		const result = await syncGitHubAcademicContent();
		setMessage(message, `Sync complete: ${result.subjects} subjects, ${result.papers} papers and ${result.studyMaterials} study materials found.`, "success");
		await loadOperations();
	} catch (error) {
		setMessage(message, error.message, "error");
	} finally {
		button.disabled = false;
	}
});

if (document.getElementById("adminOperations")) {
	loadOperations().catch((error) => {
		setMessage(operationsMessage, `Admin operations could not be loaded: ${error.message}`, "error");
	});
}
