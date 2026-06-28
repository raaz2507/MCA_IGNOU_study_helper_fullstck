import path from "node:path";
import { readFile } from "node:fs/promises";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { questionsRouter } from "./modules/questions/questions.routes.js";
import { progressRouter } from "./modules/progress/progress.routes.js";
import { contentRouter } from "./modules/content/content.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { readLinkPreviewSettings, readShareSettings, readSupportSettings } from "./modules/admin/admin.controller.js";
import { errorHandler } from "./shared/middleware/error-handler.js";

const prettyLoggerStream = {
	write(message: string) {
		try {
			console.log(JSON.stringify(JSON.parse(message), null, 2));
		} catch {
			console.log(message.trimEnd());
		}
	}
};

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("\"", "&quot;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

function absoluteUrl(value: string) {
	if (/^https?:\/\//i.test(value)) return value;
	return `${env.siteUrl}${value.startsWith("/") ? "" : "/"}${value}`;
}

function replaceOrInsertHeadTag(html: string, pattern: RegExp, tag: string) {
	if (pattern.test(html)) return html.replace(pattern, tag);
	return html.replace(/<\/head>/i, `\t${tag}\n</head>`);
}

function imageMimeType(image: string, configuredType?: string | null) {
	if (configuredType?.startsWith("image/")) return configuredType;
	const pathname = image.split(/[?#]/, 1)[0].toLowerCase();
	if (pathname.endsWith(".webp")) return "image/webp";
	if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
	if (pathname.endsWith(".svg")) return "image/svg+xml";
	return "image/png";
}

async function sendPage(response: express.Response, filePath: string) {
	let html = await readFile(filePath, "utf8");
	const settings = await readLinkPreviewSettings();
	if (settings.enabled) {
		const image = settings.imageSource === "upload" && settings.imagePath
			? absoluteUrl(settings.imagePath)
			: settings.imageUrl || "";
		const imageType = imageMimeType(image, settings.imageMeta?.type);
		const imageWidth = settings.imageMeta?.width || 1731;
		const imageHeight = settings.imageMeta?.height || 909;
		const imageAlt = "GyanPath study companion for IGNOU MCA students";
		const replacements: [RegExp, string][] = [
			[/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${escapeHtml(settings.url)}" />`],
			[/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${escapeHtml(settings.title)}" />`],
			[/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(settings.description)}" />`],
			[/<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i, '<meta property="og:type" content="website" />'],
			[/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${escapeHtml(settings.url)}" />`],
			[/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${escapeHtml(image)}" />`],
			[/<meta\s+property="og:image:secure_url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:secure_url" content="${escapeHtml(image)}" />`],
			[/<meta\s+property="og:image:type"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:type" content="${imageType}" />`],
			[/<meta\s+property="og:image:width"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:width" content="${imageWidth}" />`],
			[/<meta\s+property="og:image:height"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:height" content="${imageHeight}" />`],
			[/<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:alt" content="${imageAlt}" />`],
			[/<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/?>/i, '<meta name="twitter:card" content="summary_large_image" />'],
			[/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${escapeHtml(settings.title)}" />`],
			[/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${escapeHtml(settings.description)}" />`],
			[/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${escapeHtml(image)}" />`],
			[/<meta\s+name="twitter:image:alt"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image:alt" content="${imageAlt}" />`]
		];
		for (const [pattern, replacement] of replacements) {
			html = replaceOrInsertHeadTag(html, pattern, replacement);
		}
	}
	response.type("html").send(html);
}

export function createApp() {
	const app = express();
	const pages = [
		"about", "access-denied", "admin", "chat", "dashboard", "discussion",
		"login", "paper-gallery", "pdf-viewer", "profile", "question-bank",
		"resources", "user-guide", "video-lectures"
	];
	const assetCache = {
		maxAge: "30d",
		immutable: true
	};
	const userContentCache = {
		maxAge: "1h"
	};

	app.disable("x-powered-by");
	app.use(pinoHttp({}, prettyLoggerStream));
	app.use(helmet({
		contentSecurityPolicy: false,
		crossOriginResourcePolicy: { policy: "cross-origin" }
	}));
	app.use(cors({
		origin: env.frontendOrigin,
		credentials: true
	}));
	app.use(cookieParser());
	app.use(express.json({ limit: "2mb" }));
	app.use(express.urlencoded({ extended: true, limit: "2mb" }));
	app.use("/api", rateLimit({ windowMs: 60_000, limit: 300 }));

	app.get("/api/health", (_request, response) => {
		response.json({
			status: "ok",
			service: "gyanpath-express-api",
			architecture: "express-modular-monolith"
		});
	});
	app.get("/api/share-settings", async (_request, response) => {
		response.json(await readShareSettings());
	});
	app.get("/api/support-settings", async (_request, response) => {
		response.json(await readSupportSettings());
	});
	app.get("/api/link-preview-settings", async (_request, response) => {
		response.json(await readLinkPreviewSettings());
	});
	app.get("/api/runtime-config", (_request, response) => {
		response.json({
			pdfResourceBaseUrl: env.pdfResourceBaseUrl
		});
	});
	app.get("/api/pdf-proxy", async (request, response) => {
		const source = String(request.query.url || "");
		const pdfBaseUrl = env.pdfResourceBaseUrl.replace(/\/$/, "");

		if (!source.startsWith(`${pdfBaseUrl}/`) || !source.toLowerCase().includes(".pdf")) {
			response.status(400).json({ code: "INVALID_PDF_URL", message: "PDF URL is not allowed." });
			return;
		}

		const upstream = await fetch(source);
		if (!upstream.ok || !upstream.body) {
			response.status(upstream.status).json({ code: "PDF_NOT_FOUND", message: "PDF file could not be loaded." });
			return;
		}

		const fileName = decodeURIComponent(source.split("/").pop() || "document.pdf").replace(/[^\w .()-]+/g, "_");
		response.setHeader("Content-Type", "application/pdf");
		response.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
		response.setHeader("Cache-Control", "public, max-age=3600");
		response.send(Buffer.from(await upstream.arrayBuffer()));
	});
	app.use("/api/auth", authRouter);
	app.use("/api", catalogRouter);
	app.use("/api/questions", questionsRouter);
	app.use("/api/progress", progressRouter);
	app.use("/api/content", contentRouter);
	app.use("/api/analytics", analyticsRouter);
	app.use("/api/admin", adminRouter);

	app.use("/assets", express.static(path.join(env.frontendRoot, "assets"), assetCache));
	app.use("/uploads", express.static(path.join(env.projectRoot, "uploads"), userContentCache));
	app.use("/local-resources", express.static(env.localResourcesRoot, userContentCache));
	app.use("/frontend", express.static(env.frontendRoot, assetCache));
	app.get("/favicon.ico", (_request, response) => {
		response.sendFile(path.join(env.frontendRoot, "assets", "images", "brand", "favicon.ico"));
	});
	app.get("/robots.txt", (_request, response) => {
		response.type("text/plain").send([
			"User-agent: *",
			"Allow: /",
			"Disallow: /admin",
			"Disallow: /dashboard",
			"Disallow: /profile",
			"Disallow: /login",
			"Disallow: /access-denied",
			`Sitemap: ${env.siteUrl}/sitemap.xml`
		].join("\n"));
	});
	app.get("/sitemap.xml", (_request, response) => {
		const indexedPages = ["", "resources", "paper-gallery", "question-bank", "video-lectures", "discussion", "user-guide", "about"];
		const urls = indexedPages.map((page) => {
			const loc = page ? `${env.siteUrl}/${page}` : `${env.siteUrl}/`;
			return [
				"\t<url>",
				`\t\t<loc>${loc}</loc>`,
				"\t\t<changefreq>weekly</changefreq>",
				"\t\t<priority>" + (page === "" ? "1.0" : "0.8") + "</priority>",
				"\t</url>"
			].join("\n");
		}).join("\n");

		response.type("application/xml").send([
			'<?xml version="1.0" encoding="UTF-8"?>',
			'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
			urls,
			"</urlset>"
		].join("\n"));
	});
	app.get("/", (_request, response) => sendPage(response, path.join(env.pagesRoot, "index.html")));
	app.get("/dashboard/study-materials", (_request, response) =>
		sendPage(response, path.join(env.pagesRoot, "dashboard-study-materials.html"))
	);
	app.get("/dashboard/question-papers", (_request, response) =>
		sendPage(response, path.join(env.pagesRoot, "dashboard-question-papers.html"))
	);
	app.get("/dashboard/academic-operations", (_request, response) =>
		sendPage(response, path.join(env.pagesRoot, "dashboard-academic-operations.html"))
	);
	app.get("/admin/users", (_request, response) =>
		sendPage(response, path.join(env.pagesRoot, "admin-users.html"))
	);
	app.get("/admin/database", (_request, response) =>
		sendPage(response, path.join(env.pagesRoot, "admin-database.html"))
	);
	for (const page of pages) {
		app.get(`/${page}`, (_request, response) =>
			sendPage(response, path.join(env.pagesRoot, `${page}.html`))
		);
	}
	app.get("/index.html", (request, response) => {
		const query = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
		response.redirect(301, `/${query}`);
	});
	for (const page of pages) {
		app.get(`/${page}.html`, (request, response) => {
			const query = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
			response.redirect(301, `/${page}${query}`);
		});
	}

	app.use((_request, response) => {
		response.status(404).json({ code: "NOT_FOUND", message: "Route not found." });
	});
	app.use(errorHandler);

	return app;
}

