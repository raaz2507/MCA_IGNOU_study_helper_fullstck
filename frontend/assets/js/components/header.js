const NAV_ITEMS = [
	{ id: "home", label: "Home", href: "/" },
	{ id: "resources", label: "Resources", href: "/resources" },
	{ id: "about", label: "About", href: "/about" },
	{ id: "guide", label: "User Guide", href: "/user-guide" }
];

function navigation(activePage) {
	return NAV_ITEMS.map((item) => {
		const active = item.id === activePage;
		return `<a href="${item.href}"${active ? ' class="active" aria-current="page"' : ""}>${item.label}</a>`;
	}).join("");
}

function themedActionsMarkup(content = "") {
	return `
		<div class="header-actions">
			<div class="theme-switcher" role="group" aria-label="Choose page theme"></div>
			${content}
		</div>`;
}

function actionMarkup(action, variant) {
	if (action === "dashboard") {
		return themedActionsMarkup(`
			<div class="protected-actions">
				<a href="/admin" data-visible-for="admin">Admin Page</a>
				<button type="button" class="logout-button" data-logout>Logout</button>
			</div>`);
	}

	if (action === "logout") {
		return themedActionsMarkup(`
			<div class="protected-actions">
				<a href="/dashboard">Dashboard</a>
				<button type="button" class="logout-button" data-logout>Logout</button>
			</div>`);
	}

	if (action === "subjects") {
		return themedActionsMarkup('<a class="primary-link" href="/resources">&larr; Back to Subjects</a>');
	}

	if (variant === "dashboard") return themedActionsMarkup();

	return themedActionsMarkup(`
		<div class="header-account" data-account-guest>
			<span>Welcome, <strong>Guest</strong></span>
			<a class="primary-link" href="/login">Login</a>
		</div>
		<div class="header-account" data-account-user hidden>
			<a class="header-profile-link" href="/profile">
				<span class="header-avatar" aria-hidden="true" data-user-initial></span>
				<span><small>Welcome</small><strong data-user-name></strong><em data-user-role></em></span>
			</a>
			<a href="/admin" data-visible-for="admin" hidden>Admin</a>
			<button type="button" class="logout-button" data-logout>Logout</button>
		</div>`);
}
function titleMarkup(title) {
	if (title !== "GyanPath") return title;

	return `
		<span class="brand-wordmark" aria-label="GyanPath">
			<span class="brand-icon" aria-hidden="true">📚</span>
			<span class="brand-gyan">Gyan</span><span class="brand-path">Path</span>
		</span>`;
}

export function renderHeader(container, options = {}) {
	if (!container) return;

	const {
		activePage = "",
		title = "GyanPath",
		subtitle = "IGNOU MCA study resources",
		label = "",
		variant = "",
		action = ""
	} = options;
	const subtitleMarkup = action === "dashboard"
		? 'Welcome <strong data-user-name></strong> (<span data-user-role></span>).'
		: action === "logout"
			? 'Signed in as <strong data-user-name></strong> (<span data-user-role></span>).'
			: subtitle;

	container.innerHTML = `
		<header class="site-header${variant ? ` ${variant}-header` : ""}">
			${variant === "dashboard" ? "" : `<nav class="top-navigation" aria-label="Main navigation">${navigation(activePage)}</nav>`}
			<div class="header-content">
				<div class="header-title">
					${label ? `<p class="dashboard-label">${label}</p>` : ""}
					<h1>${titleMarkup(title)}</h1>
					<p>${subtitleMarkup}</p>
				</div>
				${actionMarkup(action, variant)}
			</div>
		</header>`;
}
