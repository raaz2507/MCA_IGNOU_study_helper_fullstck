import {
	contributorInitials,
	createId,
	getContributors,
	removeContributor,
	saveContributor
} from "../utils/contributors-store.js";

import { showToast } from "../utils/toast.js";

const form = document.getElementById("contributorForm");
const list = document.getElementById("contributorAdminList");
const idInput = document.getElementById("contributorId");
const nameInput = document.getElementById("contributorName");
const infoInput = document.getElementById("contributorInfo");
const contributionsInput = document.getElementById("contributorContributions");
const avatarInput = document.getElementById("contributorAvatar");
const preview = document.getElementById("contributorAvatarPreview");
const cancelButton = document.getElementById("cancelContributorEdit");
const message = document.getElementById("contributorMessage");
let contributors = await getContributors();
let pendingAvatar = "";

function showMessage(text, type = "") {
	message.textContent = text;
	message.className = `contributor-message ${type}`.trim();
	if (["success", "error", "warning", "info"].includes(type) && text) {
		showToast(text, type);
	}
}

function renderAvatarPreview(name, avatar) {
	preview.replaceChildren();
	if (avatar) {
		const image = document.createElement("img");
		image.src = avatar;
		image.alt = "Contributor avatar preview";
		preview.append(image);
	} else {
		preview.textContent = contributorInitials(name);
	}
}

function resetForm() {
	form.reset();
	idInput.value = "";
	pendingAvatar = "";
	cancelButton.hidden = true;
	renderAvatarPreview("", "");
	showMessage("");
}

function editContributor(contributor) {
	idInput.value = contributor.id;
	nameInput.value = contributor.name;
	infoInput.value = contributor.info;
	contributionsInput.value = contributor.contributions.join("\n");
	pendingAvatar = contributor.avatar;
	cancelButton.hidden = false;
	renderAvatarPreview(contributor.name, pendingAvatar);
	form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderList() {
	list.replaceChildren();
	contributors.forEach((contributor) => {
		const item = document.createElement("article");
		item.className = "contributor-admin-item";

		const identity = document.createElement("div");
		identity.className = "contributor-admin-identity";
		const avatar = document.createElement("div");
		avatar.className = "contributor-avatar contributor-avatar-small";
		if (contributor.avatar) {
			const image = document.createElement("img");
			image.src = contributor.avatar;
			image.alt = "";
			avatar.append(image);
		} else {
			avatar.textContent = contributorInitials(contributor.name);
		}
		const text = document.createElement("div");
		const name = document.createElement("strong");
		name.textContent = contributor.name;
		const info = document.createElement("p");
		info.textContent = contributor.info;
		text.append(name, info);
		identity.append(avatar, text);

		const actions = document.createElement("div");
		actions.className = "contributor-admin-actions";
		const edit = document.createElement("button");
		edit.type = "button";
		edit.textContent = "Edit";
		edit.addEventListener("click", () => editContributor(contributor));
		const remove = document.createElement("button");
		remove.type = "button";
		remove.className = "danger-button";
		remove.textContent = "Delete";
		remove.addEventListener("click", async () => {
			if (!window.confirm(`Delete contributor "${contributor.name}"?`)) return;
			await removeContributor(contributor.id);
			contributors = contributors.filter((item) => item.id !== contributor.id);
			renderList();
			if (idInput.value === contributor.id) resetForm();
		});
		actions.append(edit, remove);
		item.append(identity, actions);
		list.append(item);
	});
}

function resizeAvatar(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error("Image could not be read."));
		reader.onload = () => {
			const image = new Image();
			image.onerror = () => reject(new Error("Invalid image file."));
			image.onload = () => {
				const size = 360;
				const canvas = document.createElement("canvas");
				canvas.width = size;
				canvas.height = size;
				const context = canvas.getContext("2d");
				const sourceSize = Math.min(image.width, image.height);
				const sourceX = (image.width - sourceSize) / 2;
				const sourceY = (image.height - sourceSize) / 2;
				context.drawImage(
					image,
					sourceX,
					sourceY,
					sourceSize,
					sourceSize,
					0,
					0,
					size,
					size
				);
				resolve(canvas.toDataURL("image/jpeg", 0.82));
			};
			image.src = reader.result;
		};
		reader.readAsDataURL(file);
	});
}

avatarInput.addEventListener("change", async () => {
	const file = avatarInput.files[0];
	if (!file) return;
	if (!file.type.startsWith("image/")) {
		showMessage("Please select an image file.", "error");
		avatarInput.value = "";
		return;
	}
	try {
		pendingAvatar = await resizeAvatar(file);
		renderAvatarPreview(nameInput.value, pendingAvatar);
		showMessage("Avatar ready.", "success");
	} catch (error) {
		showMessage(error.message, "error");
	}
});

nameInput.addEventListener("input", () => {
	if (!pendingAvatar) renderAvatarPreview(nameInput.value, "");
});

cancelButton.addEventListener("click", resetForm);

form.addEventListener("submit", async (event) => {
	event.preventDefault();
	const name = nameInput.value.trim();
	const info = infoInput.value.trim();
	const contributions = contributionsInput.value
		.split(/\r?\n/)
		.map((entry) => entry.replace(/^[â€¢*-]\s*/, "").trim())
		.filter(Boolean);

	if (!name || !info || !contributions.length) {
		showMessage(
			"Name, general information and at least one contribution are required.",
			"error"
		);
		return;
	}

	const contributor = {
		id: idInput.value || createId(),
		name,
		info,
		avatar: pendingAvatar,
		contributions
	};
	const saved = await saveContributor(contributor);
	const existingIndex = contributors.findIndex((item) => item.id === saved.id);
	if (existingIndex >= 0) contributors[existingIndex] = saved;
	else contributors.push(saved);
	renderList();
	resetForm();
	showMessage("Contributor saved successfully.", "success");
});

renderAvatarPreview("", "");
renderList();

