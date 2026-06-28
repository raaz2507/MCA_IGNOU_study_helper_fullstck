import { getResourceCollections } from "../api/resources.api.js";

const collections = [
	{
		key: "programGuide",
		sectionId: "program-guide",
		emptyText: "Program guide PDFs will appear here when added."
	},
	{
		key: "assignments",
		sectionId: "assignments",
		emptyText: "Assignment PDFs will appear here when added."
	}
];

function formatBytes(size = 0) {
	if (!size) return "";
	const units = ["B", "KB", "MB"];
	let value = size;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

function pdfViewerUrl(file) {
	const params = new URLSearchParams({ en: file.path, title: file.title });
	return `/pdf-viewer?${params.toString()}`;
}

function resourceCard(file) {
	const card = document.createElement("article");
	card.className = "card tilt-card";

	const title = document.createElement("h3");
	title.textContent = file.title;
	const meta = document.createElement("p");
	meta.textContent = [file.group, file.updated, formatBytes(file.size)].filter(Boolean).join(" | ");
	const actions = document.createElement("div");
	actions.className = "cardButtons";

	const open = document.createElement("a");
	open.className = "btn";
	open.href = pdfViewerUrl(file);
	open.target = "_blank";
	open.rel = "noopener";
	open.textContent = "Open PDF";

	const download = document.createElement("a");
	download.className = "btn";
	download.href = file.path;
	download.target = "_blank";
	download.rel = "noopener";
	download.textContent = "Download";

	actions.append(open, download);
	card.append(title, meta, actions);
	return card;
}

function renderCollection(section, files, emptyText) {
	const existing = section.querySelector(".cardContainer");
	if (existing) existing.remove();

	const cards = document.createElement("div");
	cards.className = "cardContainer";
	if (!files.length) {
		const empty = document.createElement("p");
		empty.className = "empty-state";
		empty.textContent = emptyText;
		cards.append(empty);
	} else {
		files.forEach((file) => cards.append(resourceCard(file)));
	}
	section.append(cards);
}

(async () => {
	const data = await getResourceCollections();
	collections.forEach((collection) => {
		const section = document.getElementById(collection.sectionId);
		if (!section) return;
		renderCollection(section, data[collection.key] || [], collection.emptyText);
	});
	document.body.dataset.resourceCollectionsReady = "true";
	document.dispatchEvent(new CustomEvent("study-helper:resource-collections-rendered"));
})();
