import { AuthService, ROLE_LEVELS } from "../utils/auth.js";
import { apiRequest } from "../api/client.js";
import { setFlash, showToast } from "../utils/toast.js";

const tabs = [...document.querySelectorAll("[data-account-tab]")];
const panels = [...document.querySelectorAll("[data-account-panel]")];
const message = document.getElementById("homeAccountMessage");
const auth = new AuthService();

function showPanel(name) {
	tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.accountTab === name)));
	panels.forEach((panel) => {
		const isActive = panel.dataset.accountPanel === name;
		panel.hidden = !isActive;
		panel.classList.toggle("is-active", isActive);
	});
	message.textContent = "";
}

function setInlineMessage(text, type = "") {
	message.textContent = text;
	message.className = `login-message ${type}`.trim();
	if (type) showToast(text, type);
}

function initializePasswordToggles() {
	document.querySelectorAll(".password-input-wrap").forEach((wrap) => {
		const input = wrap.querySelector('input[type="password"], input[type="text"]');
		const toggle = wrap.querySelector(".password-toggle");
		if (!input || !toggle || toggle.dataset.ready === "true") return;
		toggle.dataset.ready = "true";
		toggle.addEventListener("click", () => {
			const willShow = input.type === "password";
			input.type = willShow ? "text" : "password";
			toggle.setAttribute("aria-pressed", String(willShow));
			toggle.setAttribute("aria-label", willShow ? "Hide password" : "Show password");
			input.focus({ preventScroll: true });
		});
	});
}

tabs.forEach((tab) => tab.addEventListener("click", () => showPanel(tab.dataset.accountTab)));
initializePasswordToggles();

if (window.location.hash === "#signup") {
	showPanel("signup");
}

document.getElementById("homeLoginForm").addEventListener("submit", async (event) => {
	event.preventDefault();
	const data = new FormData(event.currentTarget);
	try {
		const session = await auth.login(data.get("username"), data.get("password"));
		setFlash("Login successful.", "success");
		window.location.replace(ROLE_LEVELS[session.role] >= ROLE_LEVELS.editor ? "/dashboard" : "/resources");
	} catch (error) {
		setInlineMessage(error.message, "error");
	}
});

document.getElementById("homeSignupForm").addEventListener("submit", async (event) => {
	event.preventDefault();
	const form = event.currentTarget;
	const data = Object.fromEntries(new FormData(form));
	try {
		const result = await apiRequest("/auth/register", {
			method: "POST",
			body: JSON.stringify(data)
		});
		const successMessage = result.status === "ACTIVE"
			? "Account created. You can login now."
			: "Account created and sent for Admin approval.";
		setInlineMessage(successMessage, "success");
		form.reset();
	} catch (error) {
		setInlineMessage(error.message, "error");
	}
});

document.getElementById("homeForgotForm").addEventListener("submit", (event) => {
	event.preventDefault();
	setInlineMessage("Password reset email service is not enabled yet. Please contact the Admin.", "info");
});
