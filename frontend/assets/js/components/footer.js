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
	if (settings.qrImageSource === "upload" && settings.qrImagePath) return settings.qrImagePath;
	if (settings.qrImageSource === "url" && settings.qrImageUrl) return settings.qrImageUrl;
	return generatedData ? `https://api.qrserver.com/v1/create-qr-code/?size=112x112&data=${encodeURIComponent(generatedData)}` : "";
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
	if (qr) qr.src = selectedQrImage(share, share.url);
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

export function renderFooter(container) {
	if (!container) return;

	container.innerHTML = `
		<footer class="site-footer">
			<div>
				<strong>GyanPath</strong>
				<p>Question papers, practicals and study material in one place.</p>
				<p class="footer-disclaimer">This is an independent study helper, not an official IGNOU application.</p>
			</div>
			<section class="share-gyanpath" aria-labelledby="shareGyanPathTitle">
				<img data-share-qr src="https://api.qrserver.com/v1/create-qr-code/?size=112x112&data=https%3A%2F%2Fmcaignoustudyhelperfullstck-production.up.railway.app%2F" alt="QR code to open GyanPath" width="112" height="112" />
				<div>
					<strong id="shareGyanPathTitle">Share GyanPath</strong>
					<p data-share-description>Scan the QR code or share it with another MCA student.</p>
					<div class="share-links">
						<a data-share-whatsapp href="#" target="_blank" rel="noopener noreferrer">WhatsApp</a>
						<a data-share-telegram href="#" target="_blank" rel="noopener noreferrer">Telegram</a>
					</div>
				</div>
			</section>
			<section class="donation-section" aria-labelledby="donationTitle" data-support-section hidden>
				<div class="donation-icon" aria-hidden="true">Rs</div>
				<img data-support-qr hidden alt="QR code to support GyanPath" width="112" height="112" />
				<div>
					<strong id="donationTitle">Support GyanPath</strong>
					<p data-support-description>Your donation helps keep IGNOU MCA resources organized, updated and free for students.</p>
					<a data-support-action class="donation-button donation-button-disabled" target="_blank" rel="noopener noreferrer" aria-disabled="true">Donation details coming soon</a>
				</div>
			</section>
			<nav class="footer-navigation" aria-label="Footer navigation">
				<a href="/">Home</a>
				<a href="/resources">Resources</a>
				<a href="/discussion">Discussion</a>
				<a href="/about">About</a>
				<a href="/user-guide">User Guide</a>
				<a href="/dashboard">Dashboard</a>
				<a href="/login">Login</a>
			</nav>
			<div class="footer-credit-strip">Developed by <strong>Rajaanha</strong>.</div>
		</footer>`;
	updateShareLinks(container, defaultShareSettings);
	updateSupportSection(container, defaultSupportSettings);
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
