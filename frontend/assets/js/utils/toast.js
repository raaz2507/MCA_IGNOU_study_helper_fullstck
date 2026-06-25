const toastState = {
	container: null,
	timers: new WeakMap(),
	recent: new Map()
};

const storageKey = "gyanpath-flash-message";
const validTypes = new Set(["success", "error", "warning", "info"]);

function normalizeType(type = "info") {
	return validTypes.has(type) ? type : "info";
}

export function initToasts() {
	if (toastState.container) return toastState.container;

	const existing = document.getElementById("toastRegion");
	if (existing) {
		toastState.container = existing;
		return existing;
	}

	const container = document.createElement("section");
	container.id = "toastRegion";
	container.className = "toast-region";
	container.setAttribute("aria-label", "Notifications");
	container.setAttribute("aria-live", "polite");
	container.setAttribute("aria-atomic", "false");
	document.body.append(container);
	toastState.container = container;
	return container;
}

export function showToast(text, type = "info", options = {}) {
	const message = String(text || "").trim();
	if (!message) return null;

	const container = initToasts();
	const toast = document.createElement("article");
	const selectedType = normalizeType(type);
	const duplicateKey = `${selectedType}:${message}`;
	const now = Date.now();
	if (now - (toastState.recent.get(duplicateKey) || 0) < 700) return null;
	toastState.recent.set(duplicateKey, now);
	const duration = Number(options.duration || (selectedType === "error" ? 6500 : 4200));
	toast.className = `toast-message ${selectedType}`;
	toast.setAttribute("role", selectedType === "error" ? "alert" : "status");

	const content = document.createElement("p");
	content.textContent = message;
	const close = document.createElement("button");
	close.type = "button";
	close.className = "toast-close";
	close.setAttribute("aria-label", "Dismiss notification");
	close.textContent = "Close";

	const dismiss = () => {
		const timer = toastState.timers.get(toast);
		if (timer) window.clearTimeout(timer);
		toast.classList.add("is-leaving");
		window.setTimeout(() => toast.remove(), 160);
	};

	close.addEventListener("click", dismiss);
	toast.append(content, close);
	container.append(toast);

	const timer = window.setTimeout(dismiss, duration);
	toastState.timers.set(toast, timer);
	window.setTimeout(() => toastState.recent.delete(duplicateKey), 1200);
	return toast;
}

export function setFlash(text, type = "info") {
	const message = String(text || "").trim();
	if (!message) return;
	sessionStorage.setItem(storageKey, JSON.stringify({
		text: message,
		type: normalizeType(type)
	}));
}

export function consumeFlash() {
	const raw = sessionStorage.getItem(storageKey);
	if (!raw) return null;
	sessionStorage.removeItem(storageKey);
	try {
		const flash = JSON.parse(raw);
		if (flash?.text) return showToast(flash.text, flash.type);
	} catch {
		return null;
	}
	return null;
}
