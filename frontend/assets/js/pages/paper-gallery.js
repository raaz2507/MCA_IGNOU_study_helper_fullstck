import { createPaperCard } from "../components/paper-card.js";
import { getPapers } from "../api/papers.api.js";

(async () => {
	"use strict";

	const savedTheme = localStorage.getItem("study-helper-theme");
	const allowedThemes = Array.isArray(window.STUDY_HELPER_THEMES)
		? window.STUDY_HELPER_THEMES.map((theme) => theme.id)
		: ["light"];
	if (allowedThemes.includes(savedTheme)) {
		document.documentElement.dataset.theme = savedTheme;
	} else {
		document.documentElement.dataset.theme = "sepia";
	}

	const subject = new URLSearchParams(window.location.search).get("subject") || "";
	const subjectFiles = await getPapers(subject);
	const grid = document.getElementById("pdfGrid");
	const emptyLibrary = document.getElementById("emptyLibrary");
	const template = document.getElementById("pdfCardTemplate");
	const searchInput = document.getElementById("searchInput");
	const fileCount = document.getElementById("fileCount");
	const galleryTitle = document.getElementById("galleryTitle");
	const viewerPath = document.body.dataset.viewerPath || "/pdf-viewer";

	if (galleryTitle) {
		galleryTitle.textContent = subject ? `${subject} Question Papers` : "Question Papers";
	}
	document.title = subject
		? `${subject} Question Papers | PDF Library`
		: "Question Paper Library";

	function formatBytes(bytes) {
		if (!Number.isFinite(bytes) || bytes <= 0) return "—";
		const units = ["B", "KB", "MB", "GB"];
		const unitIndex = Math.min(
			Math.floor(Math.log(bytes) / Math.log(1024)),
			units.length - 1
		);
		return `${(bytes / (1024 ** unitIndex)).toFixed(unitIndex ? 1 : 0)} ${units[unitIndex]}`;
	}

	function viewerUrl(file) {
		const params = new URLSearchParams({ title: file.title });
		if (file.english) params.set("en", file.english);
		if (file.hindi) params.set("hi", file.hindi);
		return `${viewerPath}?${params.toString()}`;
	}

	function render(items) {
		grid.replaceChildren();
		fileCount.textContent = String(items.length);
		emptyLibrary.hidden = items.length !== 0;

		items.forEach((file) => {
			grid.append(createPaperCard({
				file,
				template,
				viewerUrl,
				formatBytes
			}));
		});
	}

	searchInput.addEventListener("input", () => {
		const query = searchInput.value.trim().toLowerCase();
		const filtered = subjectFiles.filter((file) =>
			[file.title, file.fileName, file.session, file.subject]
				.some((value) => String(value).toLowerCase().includes(query))
		);
		render(filtered);
	});

	render(subjectFiles);
})();
