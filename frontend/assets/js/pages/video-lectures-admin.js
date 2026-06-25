import { AuthService } from "../utils/auth.js";
import { fetchLectureMetadata } from "../api/content.api.js";
import { getSubjects } from "../api/subjects.api.js";
import {
	createLectureId,
	getLectures,
	lectureType,
	normalizeLecture,
	removeLecture,
	saveLecture,
	youtubeEmbedUrl
} from "../utils/video-lectures-store.js";

import { showToast } from "../utils/toast.js";

const form = document.getElementById("lectureForm");
const list = document.getElementById("lectureAdminList");
const message = document.getElementById("lectureMessage");
const cancelButton = document.getElementById("cancelLectureEdit");
const fetchButton = document.getElementById("fetchLectureDetails");
const subjectSelect = document.getElementById("lectureSubject");
const session = await new AuthService().getSession();
const canDelete = session?.role === "admin";
let lectures = await getLectures();

function field(id) {
	return document.getElementById(id);
}

function subjectTitle(subject) {
	return String(subject.name || subject.title || subject.code || "").trim();
}

function showMessage(text, type = "") {
	message.textContent = text;
	message.className = `contributor-message ${type}`.trim();
	if (["success", "error", "warning", "info"].includes(type) && text) {
		showToast(text, type);
	}
}

async function populateSubjects() {
	const payload = await getSubjects();
	const semesters = Array.isArray(payload) ? payload : payload.semesters || [];
	subjectSelect.replaceChildren();

	const placeholder = document.createElement("option");
	placeholder.value = "";
	placeholder.textContent = "Select subject";
	placeholder.disabled = true;
	placeholder.selected = true;
	subjectSelect.append(placeholder);

	semesters.forEach((semester) => {
		const group = document.createElement("optgroup");
		group.label = `Semester ${semester.number}`;
		semester.subjects.forEach((subject) => {
			const code = String(subject.code || "").trim().toUpperCase();
			const title = subjectTitle(subject);
			if (!code || !title) return;
			const option = document.createElement("option");
			option.value = code;
			option.textContent = `${code} - ${title}`;
			group.append(option);
		});
		if (group.children.length) subjectSelect.append(group);
	});
}

function readForm() {
	if (!subjectSelect.value) {
		throw new Error("Please select a subject before saving.");
	}
	const lecture = normalizeLecture({
		id: field("lectureId").value || createLectureId(),
		subject: subjectSelect.value,
		type: lectureType(field("lectureUrl").value),
		title: field("lectureTitle").value,
		unit: field("lectureUnit").value,
		description: field("lectureDescription").value,
		url: field("lectureUrl").value,
		teacher: field("lectureTeacher").value,
		language: field("lectureLanguage").value,
		order: field("lectureOrder").value,
		active: field("lectureActive").checked
	});
	if (!/^https?:\/\//i.test(lecture.url)) {
		throw new Error("Please enter a complete http:// or https:// video URL.");
	}
	return lecture;
}

function resetForm() {
	form.reset();
	field("lectureId").value = "";
	field("lectureOrder").value = String(lectures.length + 1);
	field("lectureActive").checked = true;
	cancelButton.hidden = true;
	showMessage("");
}

function editLecture(lecture) {
	field("lectureId").value = lecture.id;
	subjectSelect.value = lecture.subject;
	field("lectureTitle").value = lecture.title;
	field("lectureUnit").value = lecture.unit;
	field("lectureDescription").value = lecture.description;
	field("lectureUrl").value = lecture.url;
	field("lectureTeacher").value = lecture.teacher;
	field("lectureLanguage").value = lecture.language;
	field("lectureOrder").value = lecture.order;
	field("lectureActive").checked = lecture.active;
	cancelButton.hidden = false;
	form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderList() {
	list.replaceChildren();
	const sorted = lectures
		.slice()
		.sort((a, b) => a.subject.localeCompare(b.subject) || a.order - b.order);

	if (!sorted.length) {
		const empty = document.createElement("p");
		empty.className = "contributors-empty";
		empty.textContent = "No video lectures added yet.";
		list.append(empty);
		return;
	}

	sorted.forEach((lecture) => {
		const item = document.createElement("article");
		item.className = "lecture-admin-item";

		const embedUrl = youtubeEmbedUrl(lecture.url, window.location.origin);
		const thumbnail = document.createElement("div");
		thumbnail.className = "lecture-admin-thumbnail";
		if (embedUrl) {
			const frame = document.createElement("iframe");
			frame.src = embedUrl;
			frame.title = lecture.title;
			frame.loading = "lazy";
			frame.referrerPolicy = "strict-origin-when-cross-origin";
			frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
			frame.allowFullscreen = true;
			thumbnail.append(frame);
		} else {
			thumbnail.textContent = lecture.type === "playlist" ? "Playlist" : "Play";
		}

		const content = document.createElement("div");
		content.className = "banner-admin-content";
		const heading = document.createElement("strong");
		heading.textContent = lecture.title;
		const details = document.createElement("p");
		details.textContent = `${lecture.subject} | ${lecture.type === "playlist" ? "Playlist" : "Video"} | ${lecture.language} | ${lecture.active ? "Published" : "Draft"} | Order ${lecture.order}`;
		content.append(heading, details);

		const actions = document.createElement("div");
		actions.className = "contributor-admin-actions";
		const edit = document.createElement("button");
		edit.type = "button";
		edit.textContent = "Edit";
		edit.addEventListener("click", () => editLecture(lecture));
		actions.append(edit);

		if (canDelete) {
			const remove = document.createElement("button");
			remove.type = "button";
			remove.className = "danger-button";
			remove.textContent = "Delete";
			remove.addEventListener("click", async () => {
				if (!window.confirm(`Delete lecture "${lecture.title}"?`)) return;
				await removeLecture(lecture.id);
				lectures = lectures.filter((itemLecture) => itemLecture.id !== lecture.id);
				renderList();
				if (field("lectureId").value === lecture.id) resetForm();
			});
			actions.append(remove);
		}

		item.append(thumbnail, content, actions);
		list.append(item);
	});
}

cancelButton.addEventListener("click", resetForm);
fetchButton.addEventListener("click", async () => {
	const url = field("lectureUrl").value.trim();
	if (!url) {
		showMessage("Paste a YouTube video or playlist URL first.", "error");
		return;
	}
	fetchButton.disabled = true;
	fetchButton.textContent = "Fetching...";
	try {
		const metadata = await fetchLectureMetadata(url);
		if (metadata.title) field("lectureTitle").value = metadata.title;
		if (metadata.teacher) field("lectureTeacher").value = metadata.teacher;
		if (metadata.description) field("lectureDescription").value = metadata.description.slice(0, 500);
		showMessage("Details fetched. You can edit them before saving.", "success");
	} catch (error) {
		showMessage(error.message, "error");
	} finally {
		fetchButton.disabled = false;
		fetchButton.textContent = "Fetch";
	}
});
form.addEventListener("submit", async (event) => {
	event.preventDefault();
	try {
		const lecture = readForm();
		const saved = await saveLecture(lecture);
		const existingIndex = lectures.findIndex((item) => item.id === saved.id);
		if (existingIndex >= 0) lectures[existingIndex] = saved;
		else lectures.push(saved);
		renderList();
		resetForm();
		showMessage("Video lecture saved successfully.", "success");
	} catch (error) {
		showMessage(error.message, "error");
	}
});

await populateSubjects();
field("lectureOrder").value = String(lectures.length + 1);
renderList();

