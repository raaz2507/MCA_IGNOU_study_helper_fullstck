import { renderFooter } from "./footer.js";
import { renderHeader } from "./header.js";
import { AccessController, AuthService } from "../utils/auth.js";
import { renderBreadcrumb } from "./breadcrumb.js";
import { recordPageVisit } from "../utils/analytics.js";
import { consumeFlash, initToasts } from "../utils/toast.js";

const body = document.body;

function ensureBrandMetadata() {
	const links = [
		{ rel: "icon", href: "/assets/images/brand/favicon.ico", type: "image/x-icon" },
		{ rel: "icon", href: "/assets/images/brand/site-icon-192.png", type: "image/png", sizes: "192x192" },
		{ rel: "apple-touch-icon", href: "/assets/images/brand/apple-touch-icon.png", sizes: "180x180" },
		{ rel: "manifest", href: "/frontend/manifest.json" }
	];

	links.forEach((attributes) => {
		if (document.head.querySelector(`link[rel="${attributes.rel}"][href="${attributes.href}"]`)) return;
		const link = document.createElement("link");
		Object.entries(attributes).forEach(([name, value]) => link.setAttribute(name, value));
		document.head.append(link);
	});
}

ensureBrandMetadata();

renderHeader(document.getElementById("app-header"), {
	activePage: body.dataset.page || "",
	title: body.dataset.headerTitle || "GyanPath",
	subtitle: body.dataset.headerSubtitle || "IGNOU MCA study resources",
	label: body.dataset.headerLabel || "",
	variant: body.dataset.headerVariant || "",
	action: body.dataset.headerAction || ""
});

if (!Array.isArray(window.STUDY_HELPER_THEMES)) {
	await import("../utils/theme.js");
}
await import("../utils/page-preferences.js?v=6");

renderFooter(document.getElementById("app-footer"));
renderBreadcrumb(body.dataset.page || "");
recordPageVisit();
initToasts();
consumeFlash();

const siteHeader = document.querySelector(".site-header");
if (siteHeader) {
	let previousScroll = window.scrollY;
	let accumulatedUp = 0;

	window.addEventListener("scroll", () => {
		const currentScroll = window.scrollY;
		const delta = currentScroll - previousScroll;

		if (currentScroll < 80) {
			siteHeader.classList.remove("header-hidden");
			accumulatedUp = 0;
		} else if (delta > 4) {
			siteHeader.classList.add("header-hidden");
			accumulatedUp = 0;
		} else if (delta < 0) {
			accumulatedUp += Math.abs(delta);
			if (accumulatedUp >= 18) {
				siteHeader.classList.remove("header-hidden");
				accumulatedUp = 0;
			}
		}

		previousScroll = currentScroll;
	}, { passive: true });
}

const authService = new AuthService();
const accessController = new AccessController(authService);

authService.getSession().then((session) => {
	if (!session) return;
	document.querySelectorAll("[data-account-guest]").forEach((element) => { element.hidden = true; });
	document.querySelectorAll("[data-account-user]").forEach((element) => { element.hidden = false; });
	accessController.renderSession(session);
	accessController.applyRoleVisibility(session.role);
	accessController.bindLogout("/");
});
