(() => {
	"use strict";

	const themes = Array.isArray(window.STUDY_HELPER_THEMES)
		? window.STUDY_HELPER_THEMES
		: [{ id: "sepia", label: "◐ Sepia" }];
	const allowedThemes = themes.map((theme) => theme.id);
	const savedTheme = localStorage.getItem("study-helper-theme");
	const initialTheme = allowedThemes.includes(savedTheme) ? savedTheme : "sepia";
	const themeSwitcher = document.querySelector(".theme-switcher");

	if (themeSwitcher) {
		themeSwitcher.replaceChildren();
		themes.forEach((theme) => {
			const button = document.createElement("button");
			button.type = "button";
			button.className = "theme-option";
			button.dataset.theme = theme.id;
			button.textContent = theme.label;
			themeSwitcher.append(button);
		});
	}

	function setTheme(theme) {
		const selectedTheme = allowedThemes.includes(theme) ? theme : "sepia";
		document.documentElement.dataset.theme = selectedTheme;
		localStorage.setItem("study-helper-theme", selectedTheme);
		document.querySelectorAll(".theme-option").forEach((button) => {
			const isActive = button.dataset.theme === selectedTheme;
			button.classList.toggle("active", isActive);
			button.setAttribute("aria-pressed", String(isActive));
		});
	}

	document.querySelectorAll(".theme-option").forEach((button) => {
		button.addEventListener("click", () => setTheme(button.dataset.theme));
	});
	setTheme(initialTheme);

	document.querySelectorAll("a[data-pdf-en]").forEach((link) => {
		const params = new URLSearchParams({
			en: link.dataset.pdfEn,
			title: link.dataset.title || link.textContent.trim()
		});

		if (link.dataset.pdfHi) {
			params.set("hi", link.dataset.pdfHi);
		}

		link.href = `/pdf-viewer?${params.toString()}`;
		link.target = "_blank";
		link.rel = "noopener";
	});

	document.querySelectorAll(".books").forEach((books, index) => {
		if (books.querySelector(":scope > .books-toggle")) return;

		const blocks = [...books.querySelectorAll(":scope > section")];
		if (!blocks.length) return;

		const unitCount = blocks.reduce(
			(total, block) => total + block.querySelectorAll("a").length,
			0
		);
		const contentId = `bookBlocks-${index + 1}`;
		const content = document.createElement("div");
		content.id = contentId;
		content.className = "book-blocks";
		content.hidden = true;
		blocks.forEach((block) => content.append(block));

		const button = document.createElement("button");
		button.className = "books-toggle";
		button.type = "button";
		button.setAttribute("aria-expanded", "false");
		button.setAttribute("aria-controls", contentId);
		button.innerHTML = `
			<span>
				<strong>📚 Study Material</strong>
				<small>${blocks.length} Blocks • ${unitCount} Units</small>
			</span>
			<span class="toggle-label">Expand</span>
			<span class="toggle-icon" aria-hidden="true"></span>
		`;

		button.addEventListener("click", () => {
			const willExpand = button.getAttribute("aria-expanded") !== "true";
			button.setAttribute("aria-expanded", String(willExpand));
			content.hidden = !willExpand;
			button.querySelector(".toggle-label").textContent =
				willExpand ? "Collapse" : "Expand";
		});

		books.classList.add("is-collapsible");
		books.prepend(button);
		books.append(content);
	});

	function createSectionId(text, fallback) {
		const slug = text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");

		return slug || fallback;
	}

	function buildSidebar() {
		if (document.getElementById("pageSidebar")) return;
		const pageSections = [
			...document.querySelectorAll(
				"#semesterContainer > section.semester, main > section.program-guide, main > section.assignments"
			)
		];

		if (!pageSections.length) return;

		const menuButton = document.createElement("button");
		menuButton.type = "button";
		menuButton.className = "sidebar-toggle";
		menuButton.setAttribute("aria-label", "Open section menu");
		menuButton.setAttribute("aria-expanded", "false");
		menuButton.setAttribute("aria-controls", "pageSidebar");
		menuButton.innerHTML =
			'<span class="sidebar-menu-icon" aria-hidden="true"><i></i><i></i><i></i></span><span>Sections</span>';

		const overlay = document.createElement("button");
		overlay.type = "button";
		overlay.className = "sidebar-overlay";
		overlay.setAttribute("aria-label", "Close section menu");

		const sidebar = document.createElement("aside");
		sidebar.id = "pageSidebar";
		sidebar.className = "page-sidebar";
		sidebar.setAttribute("aria-label", "Page sections");
		sidebar.innerHTML = `
			<div class="sidebar-heading">
				<strong>Contents</strong>
				<button type="button" class="sidebar-close" aria-label="Close section menu"><span aria-hidden="true"></span></button>
			</div>
			<nav class="sidebar-nav"></nav>
		`;

		const nav = sidebar.querySelector(".sidebar-nav");
		const observedSections = [];

		pageSections.forEach((section, sectionIndex) => {
			const heading = section.querySelector(":scope > h2");
			if (!heading) return;

			const title = heading.textContent.trim();
			section.id ||= createSectionId(title, `section-${sectionIndex + 1}`);

			const group = document.createElement("div");
			group.className = "sidebar-group";

			const mainLink = document.createElement("a");
			mainLink.className = "sidebar-link sidebar-main-link";
			mainLink.href = `#${section.id}`;
			mainLink.textContent = title;
			const mainRow = document.createElement("div");
			mainRow.className = "sidebar-disclosure-row";
			mainRow.append(mainLink);
			group.append(mainRow);
			observedSections.push(section);

			const childSections = [
				...section.querySelectorAll(
					":scope > section.theory, :scope > section.prectical, :scope > section.practical, :scope > section.assignments"
				)
			];

			if (childSections.length) {
				const childNav = document.createElement("div");
				childNav.className = "sidebar-subnav";
				childNav.id = `${section.id}-sidebar-items`;

				const semesterToggle = document.createElement("button");
				semesterToggle.type = "button";
				semesterToggle.className = "sidebar-disclosure-toggle";
				semesterToggle.setAttribute("aria-label", `Collapse ${title}`);
				semesterToggle.setAttribute("aria-expanded", "true");
				semesterToggle.setAttribute("aria-controls", childNav.id);
				semesterToggle.innerHTML = '<span aria-hidden="true"></span>';
				mainRow.append(semesterToggle);

				childSections.forEach((child, childIndex) => {
					const childHeading = child.querySelector(":scope > h2");
					const className = child.classList.contains("assignments")
						? "Assignments"
						: child.classList.contains("theory")
							? "Theory Papers"
							: "Practical Papers";
					const childTitle = childHeading?.textContent.trim() || className;

					child.id ||= `${section.id}-${createSectionId(
						className,
						`part-${childIndex + 1}`
					)}`;

					const childLink = document.createElement("a");
					childLink.className = "sidebar-link sidebar-sub-link";
					childLink.href = `#${child.id}`;
					childLink.textContent = childTitle;
					const childRow = document.createElement("div");
					childRow.className = "sidebar-disclosure-row sidebar-category-row";
					childRow.append(childLink);
					childNav.append(childRow);
					observedSections.push(child);

					const subjectCards = [
						...child.querySelectorAll(":scope > .cardContainer > .card")
					];

					if (subjectCards.length) {
						const subjectNav = document.createElement("div");
						subjectNav.className = "sidebar-subnav sidebar-subject-nav";
						subjectNav.id = `${child.id}-sidebar-subjects`;

						const categoryToggle = document.createElement("button");
						categoryToggle.type = "button";
						categoryToggle.className = "sidebar-disclosure-toggle";
						categoryToggle.setAttribute("aria-label", `Collapse ${childTitle}`);
						categoryToggle.setAttribute("aria-expanded", "true");
						categoryToggle.setAttribute("aria-controls", subjectNav.id);
						categoryToggle.innerHTML = '<span aria-hidden="true"></span>';
						childRow.append(categoryToggle);

						subjectCards.forEach((card, cardIndex) => {
							const code = card.querySelector(":scope > h3")?.textContent.trim();
							const name = card.querySelector(":scope > p")?.textContent.trim();
							const labels = [code, name].filter(Boolean);
							const subjectTitle = [...new Set(labels)].join(" — ");
							if (!subjectTitle) return;

							card.id ||= `${child.id}-${createSectionId(
								code || name,
								`subject-${cardIndex + 1}`
							)}`;

							const subjectLink = document.createElement("a");
							subjectLink.className =
								"sidebar-link sidebar-sub-link sidebar-subject-link";
							subjectLink.href = `#${card.id}`;
							subjectLink.textContent = subjectTitle;
							subjectNav.append(subjectLink);
							observedSections.push(card);
						});

						childNav.append(subjectNav);
					}
				});

				group.append(childNav);
			}

			nav.append(group);
		});

		const semesterContainer = document.getElementById("semesterContainer");
		const programGuide = document.querySelector("main > .program-guide");
		const assignments = document.querySelector("main > .assignments");
		const contentLayout = document.createElement("div");
		contentLayout.className = "page-content-layout";
		const contentColumn = document.createElement("div");
		contentColumn.className = "page-content-column";

		semesterContainer.before(menuButton, contentLayout);
		contentLayout.append(sidebar, contentColumn);
		contentColumn.append(semesterContainer);
		if (programGuide) contentColumn.append(programGuide);
		if (assignments) contentColumn.append(assignments);
		document.body.append(overlay);
		document.body.classList.add("has-page-sidebar");

		const closeSidebar = () => {
			document.body.classList.remove("sidebar-open");
			document.body.classList.remove("sidebar-scroll-locked");
			menuButton.setAttribute("aria-expanded", "false");
			menuButton.setAttribute("aria-label", "Open section menu");
		};

		const openSidebar = () => {
			document.body.classList.add("sidebar-open");
			if (window.innerWidth <= 900) {
				document.body.classList.add("sidebar-scroll-locked");
			}
			menuButton.setAttribute("aria-expanded", "true");
			menuButton.setAttribute("aria-label", "Close section menu");
		};

		menuButton.addEventListener("click", () => {
			document.body.classList.contains("sidebar-open")
				? closeSidebar()
				: openSidebar();
		});
		overlay.addEventListener("click", closeSidebar);
		sidebar.querySelector(".sidebar-close").addEventListener("click", closeSidebar);
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && document.body.classList.contains("sidebar-open")) {
				closeSidebar();
				menuButton.focus();
			}
		});

		sidebar.querySelectorAll(".sidebar-disclosure-toggle").forEach((toggle) => {
			toggle.addEventListener("click", () => {
				const target = document.getElementById(toggle.getAttribute("aria-controls"));
				if (!target) return;
				const willExpand = toggle.getAttribute("aria-expanded") !== "true";
				toggle.setAttribute("aria-expanded", String(willExpand));
				toggle.setAttribute(
					"aria-label",
					`${willExpand ? "Collapse" : "Expand"} ${toggle
						.closest(".sidebar-disclosure-row")
						?.querySelector(".sidebar-link")
						?.textContent.trim() || "section"}`
				);
				target.hidden = !willExpand;
			});
		});

		const sidebarLinks = [...nav.querySelectorAll(".sidebar-link")];
		sidebarLinks.forEach((link) => link.addEventListener("click", closeSidebar));

		const updateActiveLink = () => {
			const scrollPosition = window.scrollY + 150;
			let currentSection = observedSections[0];

			observedSections.forEach((section) => {
				if (section.offsetTop <= scrollPosition) currentSection = section;
			});

			sidebarLinks.forEach((link) => {
				const isActive = link.getAttribute("href") === `#${currentSection?.id}`;
				link.classList.toggle("active", isActive);
				if (isActive) link.setAttribute("aria-current", "location");
				else link.removeAttribute("aria-current");
			});
		};

		window.addEventListener("scroll", updateActiveLink, { passive: true });
		window.addEventListener("resize", () => {
			if (window.innerWidth > 900) closeSidebar();
		});
		updateActiveLink();
	}

	if (document.querySelector("#semesterContainer > section.semester")) {
		buildSidebar();
	} else {
		document.addEventListener("study-helper:subjects-rendered", buildSidebar, { once: true });
	}
})();
