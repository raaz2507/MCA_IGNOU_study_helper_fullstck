import { AuthService, ROLE_LEVELS } from "../utils/auth.js";

import { setFlash, showToast } from "../utils/toast.js";

class LoginPage {
	constructor(authService = new AuthService()) {
		this.authService = authService;
		this.form = document.getElementById("loginForm");
		this.message = document.getElementById("loginMessage");
		this.passwordInput = document.getElementById("password");
		this.passwordToggle = document.getElementById("passwordToggle");
		this.initialize();
	}

	async initialize() {
		if (!this.form) return;

		const session = await this.authService.getSession();
		if (session) {
			this.redirectAfterLogin(session);
			return;
		}

		this.form.addEventListener("submit", (event) => this.handleSubmit(event));
		this.passwordToggle?.addEventListener("click", () => this.togglePassword());
	}

	togglePassword() {
		const willShow = this.passwordInput.type === "password";
		this.passwordInput.type = willShow ? "text" : "password";
		this.passwordToggle.setAttribute("aria-pressed", String(willShow));
		this.passwordToggle.setAttribute(
			"aria-label",
			willShow ? "Hide password" : "Show password"
		);
		this.passwordInput.focus({ preventScroll: true });
	}

	async handleSubmit(event) {
		event.preventDefault();
		const formData = new FormData(this.form);
		try {
			const session = await this.authService.login(
				formData.get("username"),
				formData.get("password")
			);
			setFlash("Login successful.", "success");
			this.redirectAfterLogin(session);
		} catch (error) {
			this.showMessage(error.message, "error");
		}
	}

	redirectAfterLogin(session) {
		const requestedPage = new URLSearchParams(window.location.search).get("return");

		if (requestedPage && /^\/[a-z0-9-]*(?:\?[^#]*)?$/i.test(requestedPage)) {
			window.location.replace(requestedPage);
			return;
		}

		const destination =
			ROLE_LEVELS[session.role] >= ROLE_LEVELS.editor
				? "/dashboard"
				: "/resources";
		window.location.replace(destination);
	}

	showMessage(text, type) {
		this.message.textContent = text;
		this.message.className = `login-message ${type}`;
		if (type) showToast(text, type);
	}
}

new LoginPage();

