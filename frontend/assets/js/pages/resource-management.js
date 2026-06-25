import {
	deleteAdminPaper,
	deleteAdminStudyMaterial,
	getAdminSubjects,
	getAdminPapers,
	getAdminStudyMaterials,
	saveAdminPaper,
	saveAdminStudyMaterial
} from "../api/admin.api.js";
import { showToast } from "../utils/toast.js";

let subjects = [];
let studyMaterials = [];
let papers = [];

const byId = (id) => document.getElementById(id);
const clean = (value) => String(value || "").trim();
const nullable = (value) => clean(value) || null;
const hasStudyMaterialSection = Boolean(byId("studyMaterialManagement"));
const hasPaperSection = Boolean(byId("paperManagement"));

function showMessage(id, text, type = "") {
	const message = byId(id);
	message.textContent = text;
	message.className = `contributor-message ${type}`.trim();
	if (["success", "error", "warning", "info"].includes(type) && text) {
		showToast(text, type);
	}
}

function subjectLabel(subjectId) {
	const subject = subjects.find((item) => item.id === subjectId);
	return subject ? `${subject.code} - ${subject.title}` : "Unknown subject";
}

function populateSubjectSelect(selectId, includeAll = false) {
	const select = byId(selectId);
	select.replaceChildren(new Option(includeAll ? "All subjects" : "Select subject", ""));
	for (const subject of subjects) {
		select.add(new Option(`Sem ${subject.semester} | ${subject.code} - ${subject.title}`, subject.id));
	}
}

function button(label, className, onClick) {
	const element = document.createElement("button");
	element.type = "button";
	element.className = className;
	element.textContent = label;
	element.addEventListener("click", onClick);
	return element;
}

function checksumText(...values) {
	const filled = values.filter(Boolean);
	return filled.length ? filled.join(" | ") : "Not added";
}

function sortDate(item) {
	return new Date(item.updatedAt || item.createdAt || 0).getTime();
}

function filteredStudyMaterials() {
	const subjectId = byId("studyMaterialSubjectFilter").value;
	const sort = byId("studyMaterialSort").value;
	return studyMaterials
		.filter((item) => !subjectId || item.subjectId === subjectId)
		.sort((a, b) => {
			if (sort === "date-asc") return sortDate(a) - sortDate(b);
			if (sort === "subject") return subjectLabel(a.subjectId).localeCompare(subjectLabel(b.subjectId)) || a.title.localeCompare(b.title);
			if (sort === "title") return a.title.localeCompare(b.title);
			return sortDate(b) - sortDate(a);
		});
}

function filteredPapers() {
	const subjectId = byId("paperSubjectFilter").value;
	const sort = byId("paperSort").value;
	return papers
		.filter((item) => !subjectId || item.subjectId === subjectId)
		.sort((a, b) => {
			if (sort === "date-asc") return sortDate(a) - sortDate(b);
			if (sort === "subject") return subjectLabel(a.subjectId).localeCompare(subjectLabel(b.subjectId)) || a.session.localeCompare(b.session);
			if (sort === "session") return b.session.localeCompare(a.session) || a.title.localeCompare(b.title);
			if (sort === "title") return a.title.localeCompare(b.title);
			return sortDate(b) - sortDate(a);
		});
}

function renderStudyMaterials() {
	const body = byId("studyMaterialList");
	const rows = filteredStudyMaterials();
	if (!rows.length) {
		body.innerHTML = '<tr><td colspan="5" class="admin-empty">No study materials added yet.</td></tr>';
		return;
	}
	body.replaceChildren(...rows.map((item) => {
		const row = document.createElement("tr");
		const actions = document.createElement("td");
		actions.className = "table-actions";
		actions.append(
			button("Edit", "secondary-button", () => editStudyMaterial(item)),
			button("Delete", "admin-danger-button", async () => {
				if (!window.confirm(`Delete study material "${item.title}"?`)) return;
				try {
					await deleteAdminStudyMaterial(item.id);
					await loadResources();
					showMessage("studyMaterialMessage", "Study material deleted.", "success");
				} catch (error) {
					showMessage("studyMaterialMessage", error.message, "error");
				}
			})
		);
		row.innerHTML = `
			<td><strong>${item.subject?.code || ""}</strong><small>Sem ${item.subject?.semester || ""}</small></td>
			<td><strong>${item.title}</strong><small>${item.groupName} | ${item.status}</small></td>
			<td>${item.hindiPath ? "Available" : "No"}</td>
			<td><small>${checksumText(item.englishChecksum, item.hindiChecksum)}</small></td>
		`;
		row.append(actions);
		return row;
	}));
}

function renderPapers() {
	const body = byId("paperList");
	const rows = filteredPapers();
	if (!rows.length) {
		body.innerHTML = '<tr><td colspan="5" class="admin-empty">No question papers added yet.</td></tr>';
		return;
	}
	body.replaceChildren(...rows.map((item) => {
		const row = document.createElement("tr");
		const actions = document.createElement("td");
		actions.className = "table-actions";
		actions.append(
			button("Edit", "secondary-button", () => editPaper(item)),
			button("Delete", "admin-danger-button", async () => {
				if (!window.confirm(`Delete question paper "${item.title}"?`)) return;
				try {
					await deleteAdminPaper(item.id);
					await loadResources();
					showMessage("paperMessage", "Question paper deleted.", "success");
				} catch (error) {
					showMessage("paperMessage", error.message, "error");
				}
			})
		);
		row.innerHTML = `
			<td><strong>${item.subject?.code || ""}</strong><small>Sem ${item.subject?.semester || ""}</small></td>
			<td><strong>${item.title}</strong><small>${item.session} | ${item.status}</small></td>
			<td>${item.hindiPath ? "Available" : "No"}</td>
			<td><small>${checksumText(item.englishChecksum, item.hindiChecksum)}</small></td>
		`;
		row.append(actions);
		return row;
	}));
}

async function loadResources() {
	const requests = [];
	if (hasStudyMaterialSection) requests.push(getAdminStudyMaterials().then((items) => { studyMaterials = items; }));
	if (hasPaperSection) requests.push(getAdminPapers().then((items) => { papers = items; }));
	await Promise.all(requests);
	if (hasStudyMaterialSection) renderStudyMaterials();
	if (hasPaperSection) renderPapers();
}

function resetStudyMaterialForm() {
	byId("studyMaterialForm").reset();
	byId("studyMaterialId").value = "";
	byId("studyMaterialStatus").value = "PUBLISHED";
	byId("studyMaterialHindiPathWrap").hidden = true;
	byId("cancelStudyMaterialEdit").hidden = true;
}

function editStudyMaterial(item) {
	byId("studyMaterialId").value = item.id;
	byId("studyMaterialSubject").value = item.subjectId;
	byId("studyMaterialStatus").value = item.status;
	byId("studyMaterialTitleInput").value = item.title;
	byId("studyMaterialGroup").value = item.groupName;
	byId("studyMaterialPath").value = item.filePath;
	byId("studyMaterialEnglishChecksum").value = item.englishChecksum || "";
	byId("studyMaterialHindiChecksum").value = item.hindiChecksum || "";
	byId("studyMaterialHindiAvailable").checked = Boolean(item.hindiPath);
	byId("studyMaterialHindiPath").value = item.hindiPath || "";
	byId("studyMaterialHindiPathWrap").hidden = !item.hindiPath;
	byId("cancelStudyMaterialEdit").hidden = false;
	byId("studyMaterialForm").scrollIntoView({ behavior: "smooth", block: "center" });
}

function readStudyMaterialForm() {
	const hindiAvailable = byId("studyMaterialHindiAvailable").checked;
	return {
		subjectId: byId("studyMaterialSubject").value,
		status: byId("studyMaterialStatus").value,
		title: clean(byId("studyMaterialTitleInput").value),
		groupName: clean(byId("studyMaterialGroup").value),
		filePath: clean(byId("studyMaterialPath").value),
		hindiPath: hindiAvailable ? nullable(byId("studyMaterialHindiPath").value) : null,
		englishChecksum: nullable(byId("studyMaterialEnglishChecksum").value),
		hindiChecksum: hindiAvailable ? nullable(byId("studyMaterialHindiChecksum").value) : null
	};
}

function resetPaperForm() {
	byId("paperForm").reset();
	byId("paperId").value = "";
	byId("paperStatus").value = "PUBLISHED";
	byId("paperHindiPathWrap").hidden = true;
	byId("cancelPaperEdit").hidden = true;
}

function editPaper(item) {
	byId("paperId").value = item.id;
	byId("paperSubject").value = item.subjectId;
	byId("paperStatus").value = item.status;
	byId("paperTitle").value = item.title;
	byId("paperSession").value = item.session;
	byId("paperEnglishPath").value = item.englishPath;
	byId("paperFileName").value = item.fileName || "";
	byId("paperPreviewPath").value = item.previewPath || "";
	byId("paperEnglishChecksum").value = item.englishChecksum || "";
	byId("paperHindiChecksum").value = item.hindiChecksum || "";
	byId("paperHindiAvailable").checked = Boolean(item.hindiPath);
	byId("paperHindiPath").value = item.hindiPath || "";
	byId("paperHindiPathWrap").hidden = !item.hindiPath;
	byId("cancelPaperEdit").hidden = false;
	byId("paperForm").scrollIntoView({ behavior: "smooth", block: "center" });
}

function readPaperForm() {
	const hindiAvailable = byId("paperHindiAvailable").checked;
	return {
		subjectId: byId("paperSubject").value,
		status: byId("paperStatus").value,
		title: clean(byId("paperTitle").value),
		session: clean(byId("paperSession").value),
		englishPath: clean(byId("paperEnglishPath").value),
		fileName: nullable(byId("paperFileName").value),
		previewPath: nullable(byId("paperPreviewPath").value),
		hindiPath: hindiAvailable ? nullable(byId("paperHindiPath").value) : null,
		englishChecksum: nullable(byId("paperEnglishChecksum").value),
		hindiChecksum: hindiAvailable ? nullable(byId("paperHindiChecksum").value) : null
	};
}

if (hasStudyMaterialSection) {
	byId("studyMaterialHindiAvailable").addEventListener("change", (event) => {
		byId("studyMaterialHindiPathWrap").hidden = !event.target.checked;
	});
	byId("cancelStudyMaterialEdit").addEventListener("click", resetStudyMaterialForm);
	byId("studyMaterialSubjectFilter").addEventListener("change", renderStudyMaterials);
	byId("studyMaterialSort").addEventListener("change", renderStudyMaterials);
}

if (hasPaperSection) {
	byId("paperHindiAvailable").addEventListener("change", (event) => {
		byId("paperHindiPathWrap").hidden = !event.target.checked;
	});
	byId("cancelPaperEdit").addEventListener("click", resetPaperForm);
	byId("paperSubjectFilter").addEventListener("change", renderPapers);
	byId("paperSort").addEventListener("change", renderPapers);
}

if (hasStudyMaterialSection) {
	byId("studyMaterialForm").addEventListener("submit", async (event) => {
		event.preventDefault();
		const id = byId("studyMaterialId").value;
		try {
			await saveAdminStudyMaterial(readStudyMaterialForm(), id);
			resetStudyMaterialForm();
			await loadResources();
			showMessage("studyMaterialMessage", id ? "Study material updated." : "Study material created.", "success");
		} catch (error) {
			showMessage("studyMaterialMessage", error.message, "error");
		}
	});
}

if (hasPaperSection) {
	byId("paperForm").addEventListener("submit", async (event) => {
		event.preventDefault();
		const id = byId("paperId").value;
		try {
			await saveAdminPaper(readPaperForm(), id);
			resetPaperForm();
			await loadResources();
			showMessage("paperMessage", id ? "Question paper updated." : "Question paper created.", "success");
		} catch (error) {
			showMessage("paperMessage", error.message, "error");
		}
	});
}

try {
	subjects = await getAdminSubjects();
	if (hasStudyMaterialSection) {
		populateSubjectSelect("studyMaterialSubject");
		populateSubjectSelect("studyMaterialSubjectFilter", true);
	}
	if (hasPaperSection) {
		populateSubjectSelect("paperSubject");
		populateSubjectSelect("paperSubjectFilter", true);
	}
	await loadResources();
} catch (error) {
	if (hasStudyMaterialSection) showMessage("studyMaterialMessage", `Resources could not be loaded: ${error.message}`, "error");
	if (hasPaperSection) showMessage("paperMessage", `Resources could not be loaded: ${error.message}`, "error");
}
