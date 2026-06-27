import { AuthService, ROLE_LEVELS } from "../utils/auth.js";
import { apiRequest } from "../api/client.js";
import { setFlash, showToast } from "../utils/toast.js";

const tabs = [...document.querySelectorAll("[data-account-tab]")];
const panels = [...document.querySelectorAll("[data-account-panel]")];
const message = document.getElementById("homeAccountMessage");
const signupForm = document.getElementById("homeSignupForm");
const signupEmail = signupForm.elements.email;
const resendButton = document.getElementById("homeResendVerification");
const resendCooldown = document.getElementById("homeResendCooldown");
const auth = new AuthService();
const RESEND_COOLDOWN_SECONDS = 60;
const RESEND_COOLDOWN_KEY = "emailVerificationResendAvailableAt";
let resendTimer;

function getResendAvailableAt() {
	const saved = JSON.parse(localStorage.getItem(RESEND_COOLDOWN_KEY) || "null");
	return saved?.email === signupEmail.value.trim().toLowerCase() ? Number(saved.availableAt) : 0;
}

function updateResendCooldown() {
	const secondsLeft = Math.max(0, Math.ceil((getResendAvailableAt() - Date.now()) / 1000));
	resendButton.disabled = secondsLeft > 0;
	resendButton.textContent = secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend Verification";
	resendCooldown.textContent = secondsLeft > 0 ? `You can request another email in ${secondsLeft} seconds.` : "";
	if (!secondsLeft && resendTimer) {
		clearInterval(resendTimer);
		resendTimer = undefined;
	}
}

function startResendCooldown(email) {
	localStorage.setItem(RESEND_COOLDOWN_KEY, JSON.stringify({
		email: email.trim().toLowerCase(),
		availableAt: Date.now() + RESEND_COOLDOWN_SECONDS * 1000
	}));
	clearInterval(resendTimer);
	resendTimer = setInterval(updateResendCooldown, 1000);
	updateResendCooldown();
}

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
if (window.location.hash === "#verify") {
	showPanel("signup");
}

const verificationToken = new URLSearchParams(window.location.search).get("verifyEmailToken");
if (verificationToken) {
	showPanel("login");
	apiRequest("/auth/verify-email", {
		method: "POST",
		body: JSON.stringify({ token: verificationToken })
	}).then(() => {
		window.history.replaceState({}, "", "/");
		setInlineMessage("Email verified successfully. You can login now.", "success");
	}).catch((error) => {
		window.history.replaceState({}, "", "/#signup");
		showPanel("signup");
		setInlineMessage(error.message, "error");
	});
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

signupForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	const form = event.currentTarget;
	const data = Object.fromEntries(new FormData(form));
	try {
		const result = await apiRequest("/auth/register", {
			method: "POST",
			body: JSON.stringify(data)
		});
		const successMessage = result.verificationRequired
			? result.emailSent
				? "Account created. Check your inbox and verify your email before login."
				: "Account created, but the verification email could not be sent. Use Resend Verification below."
			: result.status === "ACTIVE"
				? "Account created. You can login now."
				: "Account created and sent for Admin approval.";
		setInlineMessage(successMessage, "success");
		form.reset();
		signupEmail.value = data.email;
		if (result.verificationRequired && result.emailSent) startResendCooldown(data.email);
	} catch (error) {
		setInlineMessage(error.message, "error");
	}
});

document.getElementById("homeForgotForm").addEventListener("submit", (event) => {
	event.preventDefault();
	setInlineMessage("Password reset email service is not enabled yet. Please contact the Admin.", "info");
});

resendButton.addEventListener("click", async () => {
	if (!signupEmail.checkValidity()) {
		signupEmail.reportValidity();
		return;
	}
	const email = signupEmail.value.trim();
	resendButton.disabled = true;
	try {
		await apiRequest("/auth/resend-verification", {
			method: "POST",
			body: JSON.stringify({ email })
		});
		setInlineMessage("If that account needs verification, a new email has been sent.", "success");
		startResendCooldown(email);
	} catch (error) {
		setInlineMessage(error.message, "error");
		updateResendCooldown();
	}
});

signupEmail.addEventListener("input", updateResendCooldown);
updateResendCooldown();
