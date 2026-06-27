import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const projectRoot = process.cwd();
const backendRoot = path.join(projectRoot, "backend");
dotenv.config({ path: path.join(backendRoot, ".env") });

const schema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	PORT: z.coerce.number().int().positive().default(3000),
	FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
	SITE_URL: z.string().url().default("http://localhost:3000"),
	PDF_RESOURCE_BASE_URL: z.string().default("/local-resources/MCA_new"),
	DATABASE_URL: z.string().min(1),
	REDIS_URL: z.string().default("redis://localhost:6379"),
	JWT_ACCESS_SECRET: z.string().min(24),
	JWT_REFRESH_SECRET: z.string().min(24),
	RESEND_API_KEY: z.string().trim().default(""),
	RESEND_FROM_EMAIL: z.string().trim().default("")
});

const parsed = schema.parse(process.env);
export const env = Object.freeze({
	nodeEnv: parsed.NODE_ENV,
	port: parsed.PORT,
	frontendOrigin: parsed.FRONTEND_ORIGIN,
	siteUrl: parsed.SITE_URL.replace(/\/$/, ""),
	pdfResourceBaseUrl: parsed.PDF_RESOURCE_BASE_URL.replace(/\/$/, ""),
	databaseUrl: parsed.DATABASE_URL,
	redisUrl: parsed.REDIS_URL,
	accessSecret: parsed.JWT_ACCESS_SECRET,
	refreshSecret: parsed.JWT_REFRESH_SECRET,
	resendApiKey: parsed.RESEND_API_KEY,
	resendFromEmail: parsed.RESEND_FROM_EMAIL,
	projectRoot,
	backendRoot,
	localResourcesRoot: path.join(projectRoot, "local-resources"),
	frontendRoot: path.join(projectRoot, "frontend"),
	pagesRoot: path.join(projectRoot, "frontend", "pages")
});

