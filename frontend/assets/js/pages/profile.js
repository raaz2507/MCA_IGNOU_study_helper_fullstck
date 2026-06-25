import { changePassword, getProfile, updateProfile } from "../api/auth.api.js";
import { setFlash, showToast } from "../utils/toast.js";

const form = document.getElementById("profileForm");
const message = document.getElementById("profileMessage");
const passwordForm = document.getElementById("passwordForm");
const passwordMessage = document.getElementById("passwordMessage");

function setInlineMessage(element, text, type = "") {
	element.textContent = text;
	element.className = `login-message ${type}`.trim();
	if (type) showToast(text, type);
}

async function loadProfile() {
	const profile = await getProfile();
	document.getElementById("profileUsername").value = profile.username;
	document.getElementById("profileDisplayName").value = profile.displayName;
	document.getElementById("profileEmail").value = profile.email;
	document.getElementById("profileRole").value = profile.role;
}

form.addEventListener("submit", async (event) => {
	event.preventDefault();
	try {
		const saved = await updateProfile({
			displayName: document.getElementById("profileDisplayName").value,
			email: document.getElementById("profileEmail").value
		});
		setInlineMessage(message, "Profile saved. Reloading your updated header...", "success");
		document.querySelectorAll("[data-user-name]").forEach((element) => {
			element.textContent = saved.displayName;
		});
	} catch (error) {
		setInlineMessage(message, error.message, "error");
	}
});

loadProfile().catch((error) => {
	setInlineMessage(message, error.message, "error");
});

passwordForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	const currentPassword = document.getElementById("currentPassword").value;
	const newPassword = document.getElementById("newPassword").value;
	const confirmation = document.getElementById("confirmPassword").value;

	if (newPassword !== confirmation) {
		setInlineMessage(passwordMessage, "New password and confirmation do not match.", "error");
		return;
	}

	try {
		await changePassword({ currentPassword, newPassword });
		passwordMessage.textContent = "Password updated. Please login again.";
		passwordMessage.className = "login-message success";
		setFlash("Password updated. Please login again.", "success");
		passwordForm.reset();
		window.setTimeout(() => window.location.replace("/login"), 1000);
	} catch (error) {
		setInlineMessage(passwordMessage, error.message, "error");
	}
});
