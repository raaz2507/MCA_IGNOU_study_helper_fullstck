import { AuthService } from "../utils/auth.js";
import {
	createBannerId,
	getBanners,
	normalizeBanner,
	removeBanner,
	saveBanner
} from "../utils/banner-store.js";

import { showToast } from "../utils/toast.js";

const form = document.getElementById("bannerForm");
const list = document.getElementById("bannerAdminList");
const message = document.getElementById("bannerMessage");
const preview = document.getElementById("bannerPreview");
const cancelButton = document.getElementById("cancelBannerEdit");
const imageInput = document.getElementById("bannerImage");
const imageDataInput = document.getElementById("bannerImageData");
const session = await new AuthService().getSession();
const canDelete = session?.role === "admin";
let banners = await getBanners();

function field(id) {
	return document.getElementById(id);
}

function showMessage(text, type = "") {
	message.textContent = text;
	message.className = `contributor-message ${type}`.trim();
	if (["success", "error", "warning", "info"].includes(type) && text) {
		showToast(text, type);
	}
}

function renderPreview() {
	const banner = readForm(false);
	preview.style.backgroundImage = `linear-gradient(90deg, rgba(4, 18, 42, .92), rgba(4, 18, 42, .3)), url("${banner.image || "../assets/images/banner-exam.svg"}")`;
	preview.querySelector("[data-preview-category]").textContent = banner.category || "Category";
	preview.querySelector("[data-preview-title]").textContent = banner.title || "Banner title";
	preview.querySelector("[data-preview-description]").textContent =
		banner.description || "Banner description will appear here.";
	preview.querySelector("[data-preview-button]").textContent = banner.buttonText || "Action";
}

function readForm(validate = true) {
	const banner = normalizeBanner({
		id: field("bannerId").value || createBannerId(),
		title: field("bannerTitle").value,
		description: field("bannerDescription").value,
		category: field("bannerCategory").value,
		image: imageDataInput.value,
		buttonText: field("bannerButtonText").value,
		buttonUrl: field("bannerButtonUrl").value,
		startDate: field("bannerStartDate").value,
		endDate: field("bannerEndDate").value,
		priority: field("bannerPriority").value,
		active: field("bannerActive").checked
	});
	if (validate && banner.startDate && banner.endDate && banner.startDate > banner.endDate) {
		throw new Error("End date must be on or after the start date.");
	}
	return banner;
}

function resetForm() {
	form.reset();
	field("bannerId").value = "";
	imageDataInput.value = "";
	field("bannerPriority").value = String(banners.length + 1);
	field("bannerActive").checked = true;
	cancelButton.hidden = true;
	showMessage("");
	renderPreview();
}

function editBanner(banner) {
	field("bannerId").value = banner.id;
	field("bannerTitle").value = banner.title;
	field("bannerDescription").value = banner.description;
	field("bannerCategory").value = banner.category;
	imageDataInput.value = banner.image;
	field("bannerButtonText").value = banner.buttonText;
	field("bannerButtonUrl").value = banner.buttonUrl;
	field("bannerStartDate").value = banner.startDate;
	field("bannerEndDate").value = banner.endDate;
	field("bannerPriority").value = banner.priority;
	field("bannerActive").checked = banner.active;
	imageInput.value = "";
	cancelButton.hidden = false;
	renderPreview();
	form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function createStatus(banner) {
	if (!banner.active) return "Draft";
	const now = new Date();
	const today = [
		now.getFullYear(),
		String(now.getMonth() + 1).padStart(2, "0"),
		String(now.getDate()).padStart(2, "0")
	].join("-");
	if (banner.startDate && banner.startDate > today) return "Scheduled";
	if (banner.endDate && banner.endDate < today) return "Expired";
	return "Published";
}

function renderList() {
	list.replaceChildren();
	banners
		.slice()
		.sort((a, b) => a.priority - b.priority)
		.forEach((banner) => {
			const item = document.createElement("article");
			item.className = "banner-admin-item";
			const thumbnail = document.createElement("img");
			thumbnail.src = banner.image || "../assets/images/banner-exam.svg";
			thumbnail.alt = "";

			const content = document.createElement("div");
			content.className = "banner-admin-content";
			const heading = document.createElement("strong");
			heading.textContent = banner.title;
			const details = document.createElement("p");
			details.textContent = `${banner.category} · ${createStatus(banner)} · Priority ${banner.priority}`;
			content.append(heading, details);

			const actions = document.createElement("div");
			actions.className = "contributor-admin-actions";
			const edit = document.createElement("button");
			edit.type = "button";
			edit.textContent = "Edit";
			edit.addEventListener("click", () => editBanner(banner));
			actions.append(edit);

			if (canDelete) {
				const remove = document.createElement("button");
				remove.type = "button";
				remove.className = "danger-button";
				remove.textContent = "Delete";
				remove.addEventListener("click", async () => {
					if (!window.confirm(`Delete banner "${banner.title}"?`)) return;
					await removeBanner(banner.id);
					banners = banners.filter((itemBanner) => itemBanner.id !== banner.id);
					renderList();
					if (field("bannerId").value === banner.id) resetForm();
				});
				actions.append(remove);
			}
			item.append(thumbnail, content, actions);
			list.append(item);
		});
}

function resizeBanner(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error("Image could not be read."));
		reader.onload = () => {
			const image = new Image();
			image.onerror = () => reject(new Error("Please choose a valid image."));
			image.onload = () => {
				const canvas = document.createElement("canvas");
				canvas.width = 1200;
				canvas.height = 500;
				const context = canvas.getContext("2d");
				const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
				const width = image.width * scale;
				const height = image.height * scale;
				context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
				resolve(canvas.toDataURL("image/jpeg", 0.84));
			};
			image.src = reader.result;
		};
		reader.readAsDataURL(file);
	});
}

imageInput.addEventListener("change", async () => {
	const file = imageInput.files[0];
	if (!file) return;
	if (!file.type.startsWith("image/")) {
		showMessage("Please select an image file.", "error");
		imageInput.value = "";
		return;
	}
	try {
		imageDataInput.value = await resizeBanner(file);
		renderPreview();
		showMessage("Image is ready.", "success");
	} catch (error) {
		showMessage(error.message, "error");
	}
});

form.addEventListener("input", renderPreview);
cancelButton.addEventListener("click", resetForm);
form.addEventListener("submit", async (event) => {
	event.preventDefault();
	try {
		const banner = readForm();
		const saved = await saveBanner(banner);
		const existingIndex = banners.findIndex((item) => item.id === saved.id);
		if (existingIndex >= 0) banners[existingIndex] = saved;
		else banners.push(saved);
		renderList();
		resetForm();
		showMessage("Banner saved successfully.", "success");
	} catch (error) {
		showMessage(error.message, "error");
	}
});

field("bannerPriority").value = String(banners.length + 1);
renderPreview();
renderList();


