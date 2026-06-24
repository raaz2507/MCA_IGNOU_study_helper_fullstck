(() => {
	"use strict";

	const params = new URLSearchParams(window.location.search);
	const documents = {
		en: params.get("en") || params.get("english") || "",
		hi: params.get("hi") || params.get("hindi") || ""
	};
	const defaultPdfResourceBaseUrl = "https://raw.githubusercontent.com/raaz2507/MCA_IGNOU_Study_matarial/main/MCA_new";

	const title = params.get("title") || "PDF Reader";
	const requestedLanguage = params.get("lang") === "hi" ? "hi" : "en";
	const savedTheme =
		localStorage.getItem("study-helper-theme")
		|| localStorage.getItem("pdf-reader-theme");
	const themes = Array.isArray(window.STUDY_HELPER_THEMES)
		? window.STUDY_HELPER_THEMES
		: [{ id: "light", label: "Light" }];
	const allowedThemes = themes.map((theme) => theme.id);
	let currentLanguage = documents[requestedLanguage]
		? requestedLanguage
		: (documents.en ? "en" : "hi");

	const frame = document.getElementById("pdfFrame");
	const emptyState = document.getElementById("emptyState");
	const viewerArea = document.getElementById("viewerArea");
	const documentTitle = document.getElementById("documentTitle");
	const englishButton = document.getElementById("englishButton");
	const hindiButton = document.getElementById("hindiButton");
	const downloadButton = document.getElementById("downloadButton");
	const fullscreenButton = document.getElementById("fullscreenButton");
	const themeGroup = document.querySelector(
		'.control-group[aria-label="Reading theme"]'
	);
	if (themeGroup) {
		themeGroup.querySelectorAll(".theme-button").forEach((button) => button.remove());
		themes.forEach((theme) => {
			const button = document.createElement("button");
			button.className = "control-button theme-button";
			button.dataset.theme = theme.id;
			button.type = "button";
			button.textContent = theme.label.replace(/^[^\p{L}\p{N}]+/u, "");
			themeGroup.append(button);
		});
	}
	const themeButtons = [...document.querySelectorAll(".theme-button")];

	async function runtimePdfBaseUrl() {
		try {
			const response = await fetch("/api/runtime-config", { cache: "no-store" });
			if (!response.ok) return defaultPdfResourceBaseUrl;
			const config = await response.json();
			return String(config.pdfResourceBaseUrl || defaultPdfResourceBaseUrl).replace(/\/$/, "");
		} catch {
			return defaultPdfResourceBaseUrl;
		}
	}

	function rewriteLocalResourcePath(source, pdfBaseUrl) {
		if (!source) return "";
		const localPrefix = "/local-resources/MCA_new/";
		if (!source.startsWith(localPrefix)) return source;
		return `${pdfBaseUrl}/${source.slice(localPrefix.length)}`;
	}

	documentTitle.textContent = title;
	document.title = `${title} | PDF Reader`;
	englishButton.disabled = !documents.en;
	englishButton.title = documents.en ? "Read English PDF" : "English PDF उपलब्ध नहीं है";
	hindiButton.disabled = true;
	hindiButton.title = "हिंदी PDF खोजी जा रही है…";

	function createHindiPath(englishPath) {
		if (!englishPath) return "";

		const hashIndex = englishPath.indexOf("#");
		const queryIndex = englishPath.indexOf("?");
		const suffixIndexes = [hashIndex, queryIndex].filter((index) => index >= 0);
		const suffixIndex = suffixIndexes.length ? Math.min(...suffixIndexes) : englishPath.length;
		const cleanPath = englishPath.slice(0, suffixIndex);
		const suffix = englishPath.slice(suffixIndex);
		const extensionIndex = cleanPath.toLowerCase().lastIndexOf(".pdf");

		if (extensionIndex < 0) {
			return `${cleanPath}-hi.pdf${suffix}`;
		}

		return `${cleanPath.slice(0, extensionIndex)}-hi${cleanPath.slice(extensionIndex)}${suffix}`;
	}

	async function fileExists(path) {
		if (!path) return false;

		// Local file pages cannot reliably check sibling files because of browser security.
		if (window.location.protocol === "file:") return true;

		try {
			const response = await fetch(path, {
				method: "HEAD",
				cache: "no-store"
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	async function prepareHindiDocument() {
		const explicitHindiPath = documents.hi;
		const hindiPath = explicitHindiPath || createHindiPath(documents.en);

		if (!hindiPath) {
			hindiButton.disabled = true;
			hindiButton.title = "हिंदी PDF अभी उपलब्ध नहीं है";
			return;
		}

		const exists = explicitHindiPath ? true : await fileExists(hindiPath);
		if (exists) {
			documents.hi = hindiPath;
			hindiButton.disabled = false;
			hindiButton.title = "हिंदी PDF पढ़ें";

			if (requestedLanguage === "hi") {
				loadDocument("hi");
			}
		} else {
			documents.hi = "";
			hindiButton.disabled = true;
			hindiButton.title = "इस unit की -hi.pdf file नहीं मिली";
		}
	}

	function loadDocument(language) {
		const source = documents[language];
		if (!source) return;

		currentLanguage = language;
		frame.src = source;
		frame.hidden = false;
		emptyState.hidden = true;
		downloadButton.href = source;
		downloadButton.setAttribute("download", "");
		englishButton.classList.toggle("active", language === "en");
		hindiButton.classList.toggle("active", language === "hi");
	}

	function setTheme(theme) {
		const selectedTheme = allowedThemes.includes(theme) ? theme : "light";
		document.documentElement.dataset.theme = selectedTheme;
		localStorage.setItem("study-helper-theme", selectedTheme);
		themeButtons.forEach((button) => {
			button.classList.toggle("active", button.dataset.theme === selectedTheme);
		});
	}

	englishButton.addEventListener("click", () => loadDocument("en"));
	hindiButton.addEventListener("click", () => loadDocument("hi"));
	themeButtons.forEach((button) => {
		button.addEventListener("click", () => setTheme(button.dataset.theme));
	});

	document.getElementById("backButton").addEventListener("click", () => {
		if (history.length > 1) {
			history.back();
		} else {
			window.location.href = "/resources";
		}
	});

	fullscreenButton.addEventListener("click", async () => {
		if (!document.fullscreenElement) {
			await viewerArea.requestFullscreen();
		} else {
			await document.exitFullscreen();
		}
	});

	document.addEventListener("fullscreenchange", () => {
		const isFullscreen = Boolean(document.fullscreenElement);
		document.body.classList.toggle("is-fullscreen", isFullscreen);
		fullscreenButton.textContent = isFullscreen ? "⛶ Exit Fullscreen" : "⛶ Fullscreen";
	});

	setTheme(savedTheme || "light");

	async function initializeDocuments() {
		const pdfBaseUrl = await runtimePdfBaseUrl();
		documents.en = rewriteLocalResourcePath(documents.en, pdfBaseUrl);
		documents.hi = rewriteLocalResourcePath(documents.hi, pdfBaseUrl);

		loadDocument(currentLanguage);
		await prepareHindiDocument();
	}

	if (documents.en || documents.hi) {
		initializeDocuments();
	} else {
		frame.hidden = true;
		emptyState.hidden = false;
		downloadButton.hidden = true;
	}
})();
