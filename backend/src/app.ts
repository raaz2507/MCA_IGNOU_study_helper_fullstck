import path from "node:path";
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
import { readShareSettings } from "./modules/admin/admin.controller.js";
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

export function createApp() {
	const app = express();
	const pages = [
		"about", "access-denied", "admin", "chat", "dashboard", "discussion",
		"login", "paper-gallery", "pdf-viewer", "profile", "question-bank",
		"resources", "user-guide", "video-lectures"
	];

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
	app.get("/api/runtime-config", (_request, response) => {
		response.json({
			pdfResourceBaseUrl: env.pdfResourceBaseUrl
		});
	});
	app.use("/api/auth", authRouter);
	app.use("/api", catalogRouter);
	app.use("/api/questions", questionsRouter);
	app.use("/api/progress", progressRouter);
	app.use("/api/content", contentRouter);
	app.use("/api/analytics", analyticsRouter);
	app.use("/api/admin", adminRouter);

	app.use("/assets", express.static(path.join(env.frontendRoot, "assets")));
	app.use("/local-resources", express.static(env.localResourcesRoot));
	app.use("/frontend", express.static(env.frontendRoot));
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
	app.get("/", (_request, response) => response.sendFile(path.join(env.pagesRoot, "index.html")));
	app.get("/dashboard/study-materials", (_request, response) =>
		response.sendFile(path.join(env.pagesRoot, "dashboard-study-materials.html"))
	);
	app.get("/dashboard/question-papers", (_request, response) =>
		response.sendFile(path.join(env.pagesRoot, "dashboard-question-papers.html"))
	);
	for (const page of pages) {
		app.get(`/${page}`, (_request, response) =>
			response.sendFile(path.join(env.pagesRoot, `${page}.html`))
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

