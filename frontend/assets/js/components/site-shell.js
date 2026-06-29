import { enhanceFooter } from "./footer.js";
import { AccessController, AuthService } from "../utils/auth.js";
import { renderBreadcrumb } from "./breadcrumb.js";
import { recordPageVisit } from "../utils/analytics.js";
import { consumeFlash, initToasts } from "../utils/toast.js";

const body = document.body;

if (!Array.isArray(window.STUDY_HELPER_THEMES)) {
	await import("../utils/theme.js");
}
await import("../utils/page-preferences.js?v=6");

enhanceFooter(document.getElementById("app-footer"));
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
