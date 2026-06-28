import { getPapers } from "../api/papers.api.js";
import { getSubjects } from "../api/subjects.api.js";

(async () => {
	"use strict";

	const semesters = await getSubjects();
	const galleryData = await getPapers();
	const container = document.getElementById("semesterContainer");
	if (!container || !Array.isArray(semesters)) return;

	function button(label, href) {
		if (!href) return null;
		const link = document.createElement("a");
		link.className = "btn";
		link.href = href;
		link.textContent = label;
		return link;
	}

	function studyLink(file) {
		const params = new URLSearchParams({ en: file.path, title: file.title });
		const link = document.createElement("a");
		link.href = `/pdf-viewer?${params.toString()}`;
		link.target = "_blank";
		link.rel = "noopener";
		link.textContent = `${file.title}.pdf`;
		return link;
	}

	function studyMaterial(groups) {
		if (!groups.length) return null;
		const books = document.createElement("section");
		books.className = "books";

		groups.forEach((group, index) => {
			const block = document.createElement("section");
			block.className = `block${index + 1}`;
			const heading = document.createElement("h6");
			heading.className = "block-title";
			heading.textContent = group.title;
			block.append(heading);
			group.files.forEach((file) => block.append(studyLink(file)));
			books.append(block);
		});
		return books;
	}

	function shortSession(value) {
		const text = String(value || "").trim();
		const monthYear = text.match(/\b(June|December|Dec)\s+(\d{4})\b/i);
		if (monthYear) {
			return `${monthYear[2]} ${monthYear[1].toLowerCase().startsWith("dec") ? "Dec" : "June"}`;
		}
		const yearMonth = text.match(/\b(\d{4})\s+(June|December|Dec)\b/i);
		if (yearMonth) {
			return `${yearMonth[1]} ${yearMonth[2].toLowerCase().startsWith("dec") ? "Dec" : "June"}`;
		}
		return text;
	}

	function questionPaperSessions(subjectCode) {
		const sessions = galleryData
			.filter((paper) => paper.subject === subjectCode)
			.map((paper) => {
				const savedSession = shortSession(paper.session);
				if (savedSession && savedSession !== "Question Paper") return savedSession;
				const fileName = String(paper.fileName || paper.title || "");
				const fileSession = shortSession(fileName);
				if (fileSession && fileSession !== fileName) return fileSession;
				const setMatch = fileName.match(/\bSet[-\s]*(\d+)\b/i);
				return setMatch ? `Set ${setMatch[1]}` : savedSession;
			})
			.filter(Boolean);
		return [...new Set(sessions)];
	}

	function questionPaperPanel(subject) {
		if (!subject.questionPaperCount) return null;

		const panel = document.createElement("section");
		panel.className = "questionPapers";
		const count = document.createElement("span");
		count.textContent = `${subject.questionPaperCount} Question Paper${subject.questionPaperCount === 1 ? "" : "s"}`;

		const overview = document.createElement("div");
		overview.className = "question-paper-overview";
		const pdfButton = button("📂 Question Papers PDF's", subject.galleryPage);
		if (pdfButton) {
			const buttonBox = document.createElement("div");
			buttonBox.className = "question-paper-main-action";
			buttonBox.append(pdfButton);
			overview.append(buttonBox);
		}

		const sessions = questionPaperSessions(subject.code);
		if (sessions.length) {
			const sessionList = document.createElement("div");
			sessionList.className = "question-paper-session-list";
			sessionList.setAttribute("aria-label", "Available question paper sessions");
			sessions.forEach((session) => {
				const tag = document.createElement("span");
				tag.className = "question-paper-session-tag";
				tag.textContent = session;
				sessionList.append(tag);
			});
			overview.append(sessionList);
		}

		const secondaryButtons = document.createElement("div");
		secondaryButtons.className = "cardButtons question-paper-secondary-actions";
		[
			button("📄 Question Paper in HTML", subject.htmlViewer),
			button("📄 Question Bank", subject.questionBank)
		].filter(Boolean).forEach((link) => secondaryButtons.append(link));

		panel.append(count, overview);
		if (secondaryButtons.childElementCount) panel.append(secondaryButtons);
		return panel;
	}

	function subjectCard(subject) {
		const card = document.createElement("article");
		card.className = "card tilt-card";

		const title = document.createElement("h3");
		title.textContent = subject.code;
		const description = document.createElement("p");
		description.textContent = subject.name;
		card.append(title, description);

		const paperPanel = questionPaperPanel(subject);
		if (paperPanel) card.append(paperPanel);

		const lectureLink = button(
			"▶ Video Lectures",
			`/video-lectures?subject=${encodeURIComponent(subject.code)}`
		);
		lectureLink.classList.add("video-lecture-button");
		card.append(lectureLink);

		const books = studyMaterial(subject.studyGroups);
		if (books) card.append(books);
		return card;
	}

	function subjectSection(title, className, subjects) {
		const section = document.createElement("section");
		section.className = className;
		const heading = document.createElement("h2");
		heading.textContent = title;
		const cards = document.createElement("div");
		cards.className = "cardContainer";
		subjects.forEach((subject) => cards.append(subjectCard(subject)));
		section.append(heading, cards);
		return section;
	}

	semesters.forEach((semester) => {
		const section = document.createElement("section");
		section.className = "semester";
		const heading = document.createElement("h2");
		heading.textContent = `Semester ${semester.number}`;
		section.append(heading);

		const theory = semester.subjects.filter((subject) => subject.type === "theory");
		const practical = semester.subjects.filter((subject) => subject.type === "practical");
		if (theory.length) section.append(subjectSection("📖 Theory Papers", "theory", theory));
		if (practical.length) {
			section.append(subjectSection("📖 Practical Papers", "prectical", practical));
		}
		container.append(section);
	});

	await import("../utils/page-preferences.js?v=6");
	document.dispatchEvent(new CustomEvent("study-helper:subjects-rendered"));
})();
