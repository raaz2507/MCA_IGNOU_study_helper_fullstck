import { renderFooter } from "./footer.js";
import { renderHeader } from "./header.js";
import { AccessController, AuthService } from "../utils/auth.js";
import { renderBreadcrumb } from "./breadcrumb.js";
import { recordPageVisit } from "../utils/analytics.js";
import { consumeFlash, initToasts } from "../utils/toast.js";

const body = document.body;

renderHeader(document.getElementById("app-header"), {
	activePage: body.dataset.page || "",
	title: body.dataset.headerTitle || "GyanPath",
	subtitle: body.dataset.headerSubtitle || "IGNOU MCA study resources",
	label: body.dataset.headerLabel || "",
	variant: body.dataset.headerVariant || "",
	action: body.dataset.headerAction || ""
});

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
const session = await authService.getSession();

if (session) {
	document.querySelectorAll("[data-account-guest]").forEach((element) => { element.hidden = true; });
	document.querySelectorAll("[data-account-user]").forEach((element) => { element.hidden = false; });
	accessController.renderSession(session);
	accessController.applyRoleVisibility(session.role);
	accessController.bindLogout("/");
}
