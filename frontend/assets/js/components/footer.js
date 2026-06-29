const defaultShareSettings = {
	title: "Share GyanPath",
	description: "Scan the QR code or share it with another MCA student.",
	shareText: "GyanPath - IGNOU MCA study resources",
	url: "https://mcaignoustudyhelperfullstck-production.up.railway.app/",
	qrImageSource: "generated",
	qrImageUrl: "",
	qrImagePath: ""
};
const defaultSupportSettings = {
	enabled: false,
	title: "Support GyanPath",
	description: "Your donation helps keep IGNOU MCA resources organized, updated and free for students.",
	qrData: "",
	qrImageSource: "generated",
	qrImageUrl: "",
	qrImagePath: "",
	buttonText: "Donation details coming soon",
	buttonUrl: ""
};

function selectedQrImage(settings, generatedData) {
	if (settings.qrImageSource === "generated" && settings.qrImagePath) return settings.qrImagePath;
	if (settings.qrImageSource === "upload" && settings.qrImagePath) return settings.qrImagePath;
	if (settings.qrImageSource === "url" && settings.qrImageUrl) return settings.qrImageUrl;
	return "";
}

function updateShareLinks(container, settings) {
	const share = { ...defaultShareSettings, ...settings };
	const title = container.querySelector("#shareGyanPathTitle");
	const description = container.querySelector("[data-share-description]");
	const qr = container.querySelector("[data-share-qr]");
	const whatsapp = container.querySelector("[data-share-whatsapp]");
	const telegram = container.querySelector("[data-share-telegram]");
	const message = `${share.shareText}: ${share.url}`;

	if (title) title.textContent = share.title;
	if (description) description.textContent = share.description;
	if (qr) {
		const qrImage = selectedQrImage(share, share.url);
		qr.hidden = !qrImage;
		if (qrImage) qr.src = qrImage;
	}
	if (whatsapp) whatsapp.href = `https://wa.me/?text=${encodeURIComponent(message)}`;
	if (telegram) telegram.href = `https://t.me/share/url?url=${encodeURIComponent(share.url)}&text=${encodeURIComponent(share.shareText)}`;
}

function updateSupportSection(container, settings) {
	const support = { ...defaultSupportSettings, ...settings };
	const section = container.querySelector("[data-support-section]");
	const title = container.querySelector("#donationTitle");
	const description = container.querySelector("[data-support-description]");
	const qr = container.querySelector("[data-support-qr]");
	const action = container.querySelector("[data-support-action]");
	if (!section) return;

	section.hidden = !support.enabled;
	if (title) title.textContent = support.title;
	if (description) description.textContent = support.description;
	if (qr) {
		const qrImage = selectedQrImage(support, support.qrData);
		qr.hidden = !qrImage;
		if (qrImage) qr.src = qrImage;
	}
	if (action) {
		action.textContent = support.buttonText || defaultSupportSettings.buttonText;
		if (support.buttonUrl) {
			action.href = support.buttonUrl;
			action.className = "donation-button";
			action.removeAttribute("aria-disabled");
		} else {
			action.removeAttribute("href");
			action.className = "donation-button donation-button-disabled";
			action.setAttribute("aria-disabled", "true");
		}
	}
}

export function enhanceFooter(container) {
	if (!container) return;

	const hasServerMarkup = Boolean(container.querySelector(".site-footer"));
	if (!hasServerMarkup) return;
	fetch("/api/share-settings")
		.then((response) => response.ok ? response.json() : null)
		.then((settings) => {
			if (settings) updateShareLinks(container, settings);
		})
		.catch(() => {});
	fetch("/api/support-settings")
		.then((response) => response.ok ? response.json() : null)
		.then((settings) => {
			if (settings) updateSupportSection(container, settings);
		})
		.catch(() => {});
}
