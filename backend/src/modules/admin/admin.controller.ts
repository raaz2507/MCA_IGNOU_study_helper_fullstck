import type { RequestHandler } from "express";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import zlib from "node:zlib";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../../shared/middleware/async-handler.js";
import { AppError } from "../../shared/errors/app-error.js";
import { env } from "../../config/env.js";
import { adminService } from "./admin.service.js";
import { prisma } from "../../config/prisma.js";
import {
	analyticsRetentionSchema,
	emailVerificationSettingsSchema,
	assignmentSchema,
	linkPreviewSettingsSchema,
	paperSchema,
	reportReviewSchema,
	semesterSchema,
	shareSettingsSchema,
	supportSettingsSchema,
	studyMaterialSchema,
	subjectSchema,
	newUserDefaultStatusSchema,
	updateUserSchema,
	updateRoleSchema,
	userStatusSchema
} from "./admin.schema.js";

async function audit(actorId: string | null | undefined, action: string, entityType: string, entityId?: string, details?: object) {
	await prisma.auditLog.create({ data: { actorId: actorId || null, action, entityType, entityId, details } });
}

const shareSettingsKey = "share-settings";
const supportSettingsKey = "support-settings";
const linkPreviewSettingsKey = "link-preview-settings";
const execFileAsync = promisify(execFile);
const pdfPreviewCacheDir = path.join(env.frontendRoot, "assets", "images", "pdf-gallery-cache");
const resourceCatalogScript = path.join(env.frontendRoot, "tools", "generate-resource-catalog.py");
const defaultShareSettings = {
	title: "Share GyanPath",
	description: "Scan the QR code or share it with another MCA student.",
	shareText: "GyanPath - IGNOU MCA study resources",
	url: "https://mcaignoustudyhelperfullstck-production.up.railway.app/",
	qrImageSource: "generated",
	qrImageUrl: null,
	qrImagePath: null,
	qrImageMeta: null
};
const defaultSupportSettings = {
	enabled: false,
	title: "Support GyanPath",
	description: "Your donation helps keep IGNOU MCA resources organized, updated and free for students.",
	qrData: null,
	qrImageSource: "generated",
	qrImageUrl: null,
	qrImagePath: null,
	qrImageMeta: null,
	buttonText: "Donation details coming soon",
	buttonUrl: null
};
const defaultLinkPreviewSettings = {
	enabled: true,
	title: "GyanPath | IGNOU MCA Study Companion",
	description: "Watermark-Free Study PDFs • Hindi-Translated Study Material • Previous-Year Papers • Smart Question Bank • English & Hinglish Answers • Related Video Lecture Links • Revision Lists • Learning Milestones",
	url: "https://raaz2507.github.io/MCA_IGNOU_study_helper_fullstack/",
	imageSource: "upload",
	imageUrl: null,
	imagePath: "/assets/images/link-preview-banner.png",
	imageMeta: null
};
const settingsCacheTtlMs = 60_000;
const settingsCache = new Map<string, { expiresAt: number; value: unknown }>();
const backupVersion = 1;
const backupModelNames = [
	"users",
	"semesters",
	"subjects",
	"sessions",
	"studyMaterials",
	"papers",
	"questions",
	"answers",
	"progress",
	"notes",
	"banners",
	"lectures",
	"contributors",
	"discussions",
	"comments",
	"appSettings",
	"assignments",
	"reports",
	"fileAssets",
	"auditLogs",
	"analyticsVisits"
] as const;
const backupModelDelegates = {
	users: "user",
	semesters: "semester",
	subjects: "subject",
	sessions: "session",
	studyMaterials: "studyMaterial",
	papers: "paper",
	questions: "question",
	answers: "answer",
	progress: "progress",
	notes: "note",
	banners: "banner",
	lectures: "lecture",
	contributors: "contributor",
	discussions: "discussion",
	comments: "comment",
	appSettings: "appSetting",
	assignments: "assignment",
	reports: "report",
	fileAssets: "fileAsset",
	auditLogs: "auditLog",
	analyticsVisits: "analyticsVisit"
} as const;
const backupIdentityFields: Partial<Record<BackupModelName, string[]>> = {
	users: ["id", "username", "email"],
	semesters: ["id", "number"],
	subjects: ["id", "code", "folderPath"],
	studyMaterials: ["id", "filePath"],
	papers: ["id", "englishPath"],
	questions: ["id"],
	answers: ["id"],
	banners: ["id"],
	lectures: ["id"],
	contributors: ["id"],
	discussions: ["id"],
	comments: ["id"],
	appSettings: ["key"],
	assignments: ["id"],
	reports: ["id"],
	fileAssets: ["id", "path"],
	auditLogs: ["id"],
	analyticsVisits: ["id"]
};

type BackupModelName = typeof backupModelNames[number];
type DatabaseBackup = {
	version: number;
	exportedAt: string;
	models: Record<BackupModelName, unknown[]>;
	files?: DatabaseBackupFile[];
};
type DatabaseBackupFile = {
	path: string;
	size: number;
	source: "fileAsset" | "uploadsFolder";
};
type BackupAnalysisRow = {
	model: BackupModelName;
	backup: number;
	current: number;
	newRows: number;
	existingRows: number;
	duplicateRows: number;
	conflictRows: number;
	items: BackupEntryAnalysisRow[];
};
type BackupEntryAnalysisRow = {
	key: string;
	label: string;
	status: "new" | "existing" | "conflict" | "duplicate";
	backupPreview: string;
	currentPreview: string;
	defaultAction: "backup" | "current" | "skip";
};
type BackupFileAnalysisRow = {
	path: string;
	size: number;
	archiveSize: number | null;
	currentSize: number | null;
	status: "same" | "different" | "missingOnServer" | "missingInArchive";
	defaultAction: "backup" | "current" | "skip";
	archivePreviewUrl?: string | null;
	currentPreviewUrl?: string | null;
};
type BackupResolution = {
	mode?: "merge" | "replace";
	entries?: Record<string, "backup" | "current" | "skip">;
	files?: Record<string, "backup" | "current" | "skip">;
};
type ShareSettings = {
	title: string;
	description: string;
	shareText: string;
	url: string;
	qrImageSource: "generated" | "url" | "upload";
	qrImageUrl?: string | null;
	qrImagePath?: string | null;
	qrImageMeta?: {
		name?: string | null;
		type?: string | null;
		size?: number | null;
		width?: number | null;
		height?: number | null;
	} | null;
};
type SupportSettings = {
	enabled: boolean;
	title: string;
	description: string;
	qrData?: string | null;
	qrImageSource: "generated" | "url" | "upload";
	qrImageUrl?: string | null;
	qrImagePath?: string | null;
	qrImageMeta?: ShareSettings["qrImageMeta"];
	buttonText?: string | null;
	buttonUrl?: string | null;
};

const emptyBackupModels = () => Object.fromEntries(
	backupModelNames.map((name) => [name, []])
) as unknown as Record<BackupModelName, unknown[]>;

async function readCachedSetting<T>(key: string, loader: () => Promise<T>) {
	const cached = settingsCache.get(key);
	if (cached && cached.expiresAt > Date.now()) return cached.value as T;
	const value = await loader();
	settingsCache.set(key, { value, expiresAt: Date.now() + settingsCacheTtlMs });
	return value;
}

function cacheSetting(key: string, value: unknown) {
	settingsCache.set(key, { value, expiresAt: Date.now() + settingsCacheTtlMs });
}

function clearSettingCache(key: string) {
	settingsCache.delete(key);
}

function pythonCandidates() {
	const candidates = [
		process.env.PYTHON,
		process.env.PYTHON_PATH,
		process.env.USERPROFILE
			? path.join(process.env.USERPROFILE, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "python.exe")
			: "",
		"python",
		"python3"
	];
	return candidates.filter(Boolean) as string[];
}

async function cacheFiles() {
	await fs.mkdir(pdfPreviewCacheDir, { recursive: true });
	const entries = await fs.readdir(pdfPreviewCacheDir, { withFileTypes: true });
	const files = await Promise.all(entries
		.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".webp"))
		.map(async (entry) => {
			const filePath = path.join(pdfPreviewCacheDir, entry.name);
			const stat = await fs.stat(filePath);
			return { name: entry.name, path: filePath, size: stat.size, updatedAt: stat.mtime };
		}));
	return files;
}

async function previewCacheSummary(extra: Record<string, unknown> = {}) {
	const files = await cacheFiles();
	return {
		count: files.length,
		size: files.reduce((total, file) => total + file.size, 0),
		updatedAt: files.length
			? new Date(Math.max(...files.map((file) => file.updatedAt.getTime()))).toISOString()
			: null,
		cachePath: pdfPreviewCacheDir,
		...extra
	};
}

async function runPreviewGenerator() {
	let lastError = "";
	for (const candidate of pythonCandidates()) {
		try {
			const { stdout, stderr } = await execFileAsync(candidate, [resourceCatalogScript], {
				cwd: env.projectRoot,
				timeout: 180000,
				maxBuffer: 1024 * 1024 * 8
			});
			return { python: candidate, output: [stdout, stderr].filter(Boolean).join("\n").trim() };
		} catch (error: any) {
			lastError = error?.stderr || error?.stdout || error?.message || String(error);
		}
	}
	throw new Error(`Preview generator could not run. ${lastError}`.trim());
}

function normalizeBackupFilePath(value: string) {
	const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
	const withoutFilesPrefix = normalized.startsWith("files/") ? normalized.slice("files/".length) : normalized;
	if (!withoutFilesPrefix.startsWith("uploads/")) return "";
	if (withoutFilesPrefix.includes("..")) return "";
	return withoutFilesPrefix;
}

function imageMimeType(filePath: string) {
	const extension = path.extname(filePath).toLowerCase();
	if (extension === ".png") return "image/png";
	if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
	if (extension === ".webp") return "image/webp";
	if (extension === ".gif") return "image/gif";
	if (extension === ".svg") return "image/svg+xml";
	return "";
}

function archivePreviewUrl(filePath: string, data: Buffer | null) {
	const mimeType = imageMimeType(filePath);
	if (!mimeType || !data || data.length > 2 * 1024 * 1024) return null;
	return `data:${mimeType};base64,${data.toString("base64")}`;
}

function currentPreviewUrl(filePath: string, exists: boolean) {
	return exists && imageMimeType(filePath) ? `/${filePath}` : null;
}

function crc32(buffer: Buffer) {
	let crc = 0xffffffff;
	for (const byte of buffer) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit += 1) {
			crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
	const year = Math.max(1980, date.getFullYear());
	const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
	const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
	return { time, day };
}

function createZip(entries: { name: string; data: Buffer }[]) {
	const localParts: Buffer[] = [];
	const centralParts: Buffer[] = [];
	let offset = 0;
	const { time, day } = dosDateTime();

	for (const entry of entries) {
		const name = Buffer.from(entry.name.replace(/\\/g, "/"), "utf8");
		const checksum = crc32(entry.data);
		const local = Buffer.alloc(30);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(20, 4);
		local.writeUInt16LE(0x0800, 6);
		local.writeUInt16LE(0, 8);
		local.writeUInt16LE(time, 10);
		local.writeUInt16LE(day, 12);
		local.writeUInt32LE(checksum, 14);
		local.writeUInt32LE(entry.data.length, 18);
		local.writeUInt32LE(entry.data.length, 22);
		local.writeUInt16LE(name.length, 26);
		local.writeUInt16LE(0, 28);
		localParts.push(local, name, entry.data);

		const central = Buffer.alloc(46);
		central.writeUInt32LE(0x02014b50, 0);
		central.writeUInt16LE(20, 4);
		central.writeUInt16LE(20, 6);
		central.writeUInt16LE(0x0800, 8);
		central.writeUInt16LE(0, 10);
		central.writeUInt16LE(time, 12);
		central.writeUInt16LE(day, 14);
		central.writeUInt32LE(checksum, 16);
		central.writeUInt32LE(entry.data.length, 20);
		central.writeUInt32LE(entry.data.length, 24);
		central.writeUInt16LE(name.length, 28);
		central.writeUInt16LE(0, 30);
		central.writeUInt16LE(0, 32);
		central.writeUInt16LE(0, 34);
		central.writeUInt16LE(0, 36);
		central.writeUInt32LE(0, 38);
		central.writeUInt32LE(offset, 42);
		centralParts.push(central, name);
		offset += local.length + name.length + entry.data.length;
	}

	const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(0, 4);
	end.writeUInt16LE(0, 6);
	end.writeUInt16LE(entries.length, 8);
	end.writeUInt16LE(entries.length, 10);
	end.writeUInt32LE(centralSize, 12);
	end.writeUInt32LE(offset, 16);
	end.writeUInt16LE(0, 20);
	return Buffer.concat([...localParts, ...centralParts, end]);
}

function readZip(buffer: Buffer) {
	const entries = new Map<string, Buffer>();
	const endSignature = 0x06054b50;
	let end = -1;
	for (let index = buffer.length - 22; index >= 0; index -= 1) {
		if (buffer.readUInt32LE(index) === endSignature) {
			end = index;
			break;
		}
	}
	if (end < 0) throw new Error("Backup ZIP is not valid.");
	const count = buffer.readUInt16LE(end + 10);
	let centralOffset = buffer.readUInt32LE(end + 16);
	for (let entryIndex = 0; entryIndex < count; entryIndex += 1) {
		if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) throw new Error("Backup ZIP directory is not valid.");
		const method = buffer.readUInt16LE(centralOffset + 10);
		const compressedSize = buffer.readUInt32LE(centralOffset + 20);
		const fileNameLength = buffer.readUInt16LE(centralOffset + 28);
		const extraLength = buffer.readUInt16LE(centralOffset + 30);
		const commentLength = buffer.readUInt16LE(centralOffset + 32);
		const localOffset = buffer.readUInt32LE(centralOffset + 42);
		const name = buffer.subarray(centralOffset + 46, centralOffset + 46 + fileNameLength).toString("utf8");
		if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`Backup ZIP entry is not valid: ${name}`);
		const localNameLength = buffer.readUInt16LE(localOffset + 26);
		const localExtraLength = buffer.readUInt16LE(localOffset + 28);
		const dataStart = localOffset + 30 + localNameLength + localExtraLength;
		const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
		if (method === 0) entries.set(name, Buffer.from(compressed));
		else if (method === 8) entries.set(name, zlib.inflateRawSync(compressed));
		else throw new Error(`Unsupported ZIP compression method for ${name}.`);
		centralOffset += 46 + fileNameLength + extraLength + commentLength;
	}
	return entries;
}

async function databaseBackup() {
	const models: DatabaseBackup["models"] = {
		users: await prisma.user.findMany(),
		semesters: await prisma.semester.findMany(),
		subjects: await prisma.subject.findMany(),
		sessions: await prisma.session.findMany(),
		studyMaterials: await prisma.studyMaterial.findMany(),
		papers: await prisma.paper.findMany(),
		questions: await prisma.question.findMany(),
		answers: await prisma.answer.findMany(),
		progress: await prisma.progress.findMany(),
		notes: await prisma.note.findMany(),
		banners: await prisma.banner.findMany(),
		lectures: await prisma.lecture.findMany(),
		contributors: await prisma.contributor.findMany(),
		discussions: await prisma.discussion.findMany(),
		comments: await prisma.comment.findMany(),
		appSettings: await prisma.appSetting.findMany(),
		assignments: await prisma.assignment.findMany(),
		reports: await prisma.report.findMany(),
		fileAssets: await prisma.fileAsset.findMany(),
		auditLogs: await prisma.auditLog.findMany(),
		analyticsVisits: await prisma.analyticsVisit.findMany()
	};
	const fileMap = new Map<string, DatabaseBackupFile>();
	(models.fileAssets as { path?: string; size?: number }[])
		.map((asset) => ({
			path: normalizeBackupFilePath(String(asset.path || "")),
			size: Number(asset.size || 0),
			source: "fileAsset" as const
		}))
		.filter((file) => file.path)
		.forEach((file) => fileMap.set(file.path, file));
	const uploadsRoot = path.join(env.projectRoot, "uploads");
	async function collectUploads(dir: string) {
		let entries: import("node:fs").Dirent[] = [];
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				await collectUploads(fullPath);
				continue;
			}
			if (!entry.isFile()) continue;
			const relative = normalizeBackupFilePath(path.relative(env.projectRoot, fullPath));
			if (!relative || fileMap.has(relative)) continue;
			const stat = await fs.stat(fullPath);
			fileMap.set(relative, { path: relative, size: stat.size, source: "uploadsFolder" });
		}
	}
	await collectUploads(uploadsRoot);
	return {
		version: backupVersion,
		exportedAt: new Date().toISOString(),
		models,
		files: [...fileMap.values()]
	};
}

async function backupZip(backup: DatabaseBackup) {
	const entries: { name: string; data: Buffer }[] = [{
		name: "backup.json",
		data: Buffer.from(JSON.stringify(backup, null, 2), "utf8")
	}];
	for (const file of backup.files || []) {
		const normalized = normalizeBackupFilePath(file.path);
		if (!normalized) continue;
		const source = path.resolve(env.projectRoot, normalized);
		if (!source.startsWith(path.resolve(env.projectRoot, "uploads") + path.sep)) continue;
		try {
			entries.push({
				name: `files/${normalized}`,
				data: await fs.readFile(source)
			});
		} catch {
			// Missing upload files are recorded in backup.json but skipped from the archive.
		}
	}
	return createZip(entries);
}

async function restoreBackupFiles(entries: Map<string, Buffer>, backup: DatabaseBackup, resolution: BackupResolution = {}) {
	let restored = 0;
	for (const file of backup.files || []) {
		const normalized = normalizeBackupFilePath(file.path);
		if (!normalized) continue;
		const data = entries.get(`files/${normalized}`);
		if (!data) continue;
		const selectedAction = resolution.files?.[normalized];
		let exists = false;
		const target = path.resolve(env.projectRoot, normalized);
		if (!target.startsWith(path.resolve(env.projectRoot, "uploads") + path.sep)) continue;
		try {
			await fs.access(target);
			exists = true;
		} catch {
			exists = false;
		}
		const finalAction = selectedAction || (exists ? "current" : "backup");
		if (finalAction !== "backup") continue;
		await fs.mkdir(path.dirname(target), { recursive: true });
		await fs.writeFile(target, data);
		restored += 1;
	}
	return restored;
}

function parseBackupJson(data: Buffer | string) {
	return JSON.parse(Buffer.isBuffer(data) ? data.toString("utf8") : data) as DatabaseBackup;
}

async function parseUploadedBackup(request: Parameters<RequestHandler>[0]) {
	if (request.file) {
		const originalName = request.file.originalname.toLowerCase();
		if (originalName.endsWith(".zip")) {
			const entries = readZip(request.file.buffer);
			const backupJson = entries.get("backup.json");
			if (!backupJson) throw new Error("Backup ZIP does not contain backup.json.");
			return { backup: parseBackupJson(backupJson), entries };
		}
		return { backup: parseBackupJson(request.file.buffer), entries: null };
	}
	if ((request.body as any)?.archiveBase64) {
		const entries = readZip(Buffer.from(String((request.body as any).archiveBase64), "base64"));
		const backupJson = entries.get("backup.json");
		if (!backupJson) throw new Error("Backup ZIP does not contain backup.json.");
		return { backup: parseBackupJson(backupJson), entries };
	}
	return { backup: request.body as DatabaseBackup, entries: null };
}

function parseResolution(request: Parameters<RequestHandler>[0]) {
	const raw = (request.body as any)?.resolution;
	if (!raw) return {} as BackupResolution;
	if (typeof raw === "object") return raw as BackupResolution;
	try {
		return JSON.parse(String(raw)) as BackupResolution;
	} catch {
		return {} as BackupResolution;
	}
}

function uploadCategoryPath(category: string) {
	const cleaned = category
		.replace(/\\/g, "/")
		.split("/")
		.map((part) => part.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, ""))
		.filter(Boolean)
		.slice(0, 3);
	const first = cleaned[0] || "settings";
	if (first === "settings") return ["settings", ...(cleaned.slice(1))];
	if (first === "banners") return ["banners", ...(cleaned.slice(1))];
	if (first === "contributors") return ["contributors", ...(cleaned.slice(1))];
	return ["settings", ...cleaned];
}

function uploadPublicPathToAbsolute(publicPath: string) {
	const normalized = normalizeBackupFilePath(publicPath);
	if (!normalized) return null;
	const absolute = path.resolve(env.projectRoot, normalized);
	const uploadsRoot = path.resolve(env.projectRoot, "uploads");
	return absolute.startsWith(uploadsRoot + path.sep) ? absolute : null;
}

async function moveUploadFile(publicPath: string | null | undefined, category: string) {
	if (!publicPath || !publicPath.startsWith("/uploads/")) return null;
	const source = uploadPublicPathToAbsolute(publicPath);
	if (!source) return null;
	const categoryParts = uploadCategoryPath(category);
	const fileName = path.basename(source);
	const targetDir = path.join(env.projectRoot, "uploads", ...categoryParts);
	const target = path.join(targetDir, fileName);
	const nextPath = `/uploads/${[...categoryParts, fileName].join("/")}`;
	if (publicPath === nextPath) return { changed: false, path: publicPath };
	try {
		await fs.access(source);
	} catch {
		return null;
	}
	await fs.mkdir(targetDir, { recursive: true });
	try {
		await fs.access(target);
		const parsed = path.parse(fileName);
		const alternateName = `${parsed.name}-${Date.now()}${parsed.ext}`;
		const alternateTarget = path.join(targetDir, alternateName);
		await fs.rename(source, alternateTarget);
		return { changed: true, path: `/uploads/${[...categoryParts, alternateName].join("/")}` };
	} catch {
		await fs.rename(source, target);
		return { changed: true, path: nextPath };
	}
}

async function saveGeneratedQrImage(data: string, category: string, size = 300) {
	const categoryParts = uploadCategoryPath(category);
	const uploadDir = path.join(env.projectRoot, "uploads", ...categoryParts);
	const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
	const qrResponse = await fetch(url);
	if (!qrResponse.ok) throw new Error("QR image could not be generated.");
	const buffer = Buffer.from(await qrResponse.arrayBuffer());
	const storedName = `${Date.now()}-${crypto.randomUUID()}.png`;
	const filePath = path.join(uploadDir, storedName);
	const publicPath = `/uploads/${[...categoryParts, storedName].join("/")}`;
	await fs.mkdir(uploadDir, { recursive: true });
	await fs.writeFile(filePath, buffer);
	const asset = await prisma.fileAsset.create({
		data: {
			originalName: "generated-qr.png",
			storedName,
			mimeType: "image/png",
			size: buffer.length,
			path: publicPath,
			category,
			uploadedById: ""
		}
	});
	return {
		path: publicPath,
		meta: {
			name: asset.originalName,
			type: asset.mimeType,
			size: asset.size,
			width: size,
			height: size
		}
	};
}

async function ensureGeneratedShareQr(setting: ShareSettings, force = false) {
	if (setting.qrImageSource !== "generated") return setting;
	if (!force && setting.qrImagePath) return setting;
	const generated = await saveGeneratedQrImage(setting.url, "settings/share-qr", 300);
	return {
		...setting,
		qrImagePath: generated.path,
		qrImageMeta: generated.meta
	};
}

async function ensureGeneratedSupportQr(setting: SupportSettings, force = false) {
	if (setting.qrImageSource !== "generated") return setting;
	if (!setting.qrData) return setting;
	if (!force && setting.qrImagePath) return setting;
	const generated = await saveGeneratedQrImage(setting.qrData, "settings/support-qr", 300);
	return {
		...setting,
		qrImagePath: generated.path,
		qrImageMeta: generated.meta
	};
}

type NormalizeUploadSummary = {
	moved: number;
	looseFilesMoved: number;
	alreadyStructured: number;
	skipped: number;
	missing: number;
	mappings: Record<string, string>;
};

function isOldDirectSettingsUpload(publicPath: string) {
	return /^\/uploads\/settings\/[^/]+$/i.test(publicPath);
}

async function normalizeReferencedUpload(
	publicPath: string | null | undefined,
	category: string,
	movedPaths: Map<string, string>,
	summary: NormalizeUploadSummary
) {
	if (!publicPath || !publicPath.startsWith("/uploads/")) {
		summary.skipped += 1;
		return null;
	}
	if (movedPaths.has(publicPath)) return movedPaths.get(publicPath) || null;
	const result = await moveUploadFile(publicPath, category);
	if (!result) {
		summary.missing += 1;
		return null;
	}
	movedPaths.set(publicPath, result.path);
	if (result.changed) summary.moved += 1;
	else summary.alreadyStructured += 1;
	if (result.path !== publicPath) summary.mappings[publicPath] = result.path;
	return result.path;
}

async function normalizeLooseSettingsUploads(movedPaths: Map<string, string>, summary: NormalizeUploadSummary) {
	const settingsRoot = path.join(env.projectRoot, "uploads", "settings");
	let entries: import("node:fs").Dirent[] = [];
	try {
		entries = await fs.readdir(settingsRoot, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		if (!entry.isFile()) continue;
		const publicPath = `/uploads/settings/${entry.name}`;
		const nextPath = await normalizeReferencedUpload(publicPath, "settings/misc", movedPaths, summary);
		if (nextPath && nextPath !== publicPath) summary.looseFilesMoved += 1;
	}
	try {
		const remaining = await fs.readdir(settingsRoot, { withFileTypes: true });
		if (!remaining.some((entry) => entry.isFile())) return;
	} catch {
		// Directory may have been removed externally.
	}
}

async function restoreBackupModels(body: Partial<DatabaseBackup>) {
	if (body.version !== backupVersion || !body.models || typeof body.models !== "object") {
		throw new Error("Backup JSON is not valid for this application version.");
	}
	const models = { ...emptyBackupModels(), ...body.models };

	await prisma.$transaction(async (tx) => {
		await tx.analyticsVisit.deleteMany();
		await tx.auditLog.deleteMany();
		await tx.fileAsset.deleteMany();
		await tx.report.deleteMany();
		await tx.assignment.deleteMany();
		await tx.appSetting.deleteMany();
		await tx.comment.deleteMany();
		await tx.discussion.deleteMany();
		await tx.contributor.deleteMany();
		await tx.lecture.deleteMany();
		await tx.banner.deleteMany();
		await tx.note.deleteMany();
		await tx.progress.deleteMany();
		await tx.answer.deleteMany();
		await tx.question.deleteMany();
		await tx.paper.deleteMany();
		await tx.studyMaterial.deleteMany();
		await tx.session.deleteMany();
		await tx.subject.deleteMany();
		await tx.semester.deleteMany();
		await tx.user.deleteMany();

		if (models.users.length) await tx.user.createMany({ data: models.users as never[] });
		if (models.semesters.length) await tx.semester.createMany({ data: models.semesters as never[] });
		if (models.subjects.length) await tx.subject.createMany({ data: models.subjects as never[] });
		if (models.sessions.length) await tx.session.createMany({ data: models.sessions as never[] });
		if (models.studyMaterials.length) await tx.studyMaterial.createMany({ data: models.studyMaterials as never[] });
		if (models.papers.length) await tx.paper.createMany({ data: models.papers as never[] });
		if (models.questions.length) await tx.question.createMany({ data: models.questions as never[] });
		if (models.answers.length) await tx.answer.createMany({ data: models.answers as never[] });
		if (models.progress.length) await tx.progress.createMany({ data: models.progress as never[] });
		if (models.notes.length) await tx.note.createMany({ data: models.notes as never[] });
		if (models.banners.length) await tx.banner.createMany({ data: models.banners as never[] });
		if (models.lectures.length) await tx.lecture.createMany({ data: models.lectures as never[] });
		if (models.contributors.length) await tx.contributor.createMany({ data: models.contributors as never[] });
		if (models.discussions.length) await tx.discussion.createMany({ data: models.discussions as never[] });
		if (models.comments.length) await tx.comment.createMany({ data: models.comments as never[] });
		if (models.appSettings.length) await tx.appSetting.createMany({ data: models.appSettings as never[] });
		if (models.assignments.length) await tx.assignment.createMany({ data: models.assignments as never[] });
		if (models.reports.length) await tx.report.createMany({ data: models.reports as never[] });
		if (models.fileAssets.length) await tx.fileAsset.createMany({ data: models.fileAssets as never[] });
		if (models.auditLogs.length) await tx.auditLog.createMany({ data: models.auditLogs as never[] });
		if (models.analyticsVisits.length) await tx.analyticsVisit.createMany({ data: models.analyticsVisits as never[] });
	});
}

async function restoreBackupModelsMerge(body: DatabaseBackup, resolution: BackupResolution = {}) {
	if (body.version !== backupVersion || !body.models || typeof body.models !== "object") {
		throw new Error("Backup JSON is not valid for this application version.");
	}
	const models = { ...emptyBackupModels(), ...body.models };
	const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };

	for (const model of backupModelNames) {
		const delegate = (prisma as any)[backupModelDelegates[model]];
		const rows = models[model] as any[];
		for (const row of rows) {
			const identity = primaryIdentity(row);
			if (!identity) {
				stats.skipped += 1;
				continue;
			}
			const action = resolution.entries?.[`${model}:${identity.key}`];
			const where = rowWhere(row);
			if (!where) {
				stats.skipped += 1;
				continue;
			}
			let exists = false;
			try {
				exists = Boolean(await delegate.findUnique({ where }));
			} catch {
				exists = false;
			}
			const finalAction = action || (exists ? "current" : "backup");
			if (finalAction !== "backup") {
				stats.skipped += 1;
				continue;
			}
			try {
				if (exists) {
					await delegate.update({ where, data: row });
					stats.updated += 1;
				} else {
					await delegate.create({ data: row });
					stats.created += 1;
				}
			} catch {
				stats.failed += 1;
			}
		}
	}
	return stats;
}

function rowKey(row: any, fields: string[]) {
	return fields
		.map((field) => row?.[field] === null || row?.[field] === undefined ? "" : `${field}:${String(row[field])}`)
		.filter(Boolean)
		.join("|");
}

function primaryIdentity(row: any) {
	if (row?.id !== undefined && row?.id !== null) return { field: "id", value: row.id, key: `id:${String(row.id)}` };
	if (row?.key !== undefined && row?.key !== null) return { field: "key", value: row.key, key: `key:${String(row.key)}` };
	if (row?.userId && row?.questionId) return { field: "userId_questionId", value: { userId: row.userId, questionId: row.questionId }, key: `userId:${row.userId}|questionId:${row.questionId}` };
	if (row?.questionId && row?.language && row?.mode) return {
		field: "questionId_language_mode",
		value: { questionId: row.questionId, language: row.language, mode: row.mode },
		key: `questionId:${row.questionId}|language:${row.language}|mode:${row.mode}`
	};
	return null;
}

function rowWhere(row: any) {
	const identity = primaryIdentity(row);
	if (!identity) return null;
	return { [identity.field]: identity.value };
}

function previewRow(row: any) {
	if (!row) return "";
	const label = row.displayName || row.title || row.name || row.username || row.code || row.path || row.key || row.id || row.filePath || row.englishPath;
	const meta = row.updatedAt || row.createdAt || row.status || row.role || row.category || "";
	return [String(label || "Entry"), meta ? String(meta).slice(0, 32) : ""].filter(Boolean).join(" | ");
}

async function analyzeBackup(backup: DatabaseBackup, entries: Map<string, Buffer> | null) {
	if (backup.version !== backupVersion || !backup.models || typeof backup.models !== "object") {
		throw new Error("Backup JSON is not valid for this application version.");
	}
	const models = { ...emptyBackupModels(), ...backup.models };
	const rows: BackupAnalysisRow[] = [];

	for (const model of backupModelNames) {
		const delegateName = backupModelDelegates[model];
		const delegate = (prisma as any)[delegateName];
		const backupRows = models[model] as any[];
		const identityFields = backupIdentityFields[model] || ["id"];
		const currentRows = await delegate.findMany();
		const currentKeys = new Set<string>();
		const currentByKey = new Map<string, any>();
		for (const row of currentRows) {
			for (const field of identityFields) {
				const key = rowKey(row, [field]);
				if (key) {
					currentKeys.add(key);
					currentByKey.set(key, row);
				}
			}
		}
		const seenBackupKeys = new Set<string>();
		let existingRows = 0;
		let duplicateRows = 0;
		let conflictRows = 0;
		const items: BackupEntryAnalysisRow[] = [];

		for (const row of backupRows) {
			const keys = identityFields.map((field) => rowKey(row, [field])).filter(Boolean);
			const primaryKey = keys[0] || JSON.stringify(row);
			let status: BackupEntryAnalysisRow["status"] = "new";
			if (seenBackupKeys.has(primaryKey)) {
				duplicateRows += 1;
				status = "duplicate";
			} else seenBackupKeys.add(primaryKey);
			const matchedKeys = keys.filter((key) => currentKeys.has(key));
			if (matchedKeys.length) {
				existingRows += 1;
				status = status === "duplicate" ? status : "existing";
			}
			if (matchedKeys.length && !matchedKeys.includes(primaryKey)) {
				conflictRows += 1;
				status = "conflict";
			}
			if (items.length < 200 && status !== "new") {
				const current = currentByKey.get(matchedKeys[0]);
				items.push({
					key: primaryKey,
					label: previewRow(row),
					status,
					backupPreview: previewRow(row),
					currentPreview: previewRow(current),
					defaultAction: status === "conflict" || status === "existing" ? "current" : "skip"
				});
			}
		}

		rows.push({
			model,
			backup: backupRows.length,
			current: currentRows.length,
			newRows: Math.max(0, backupRows.length - existingRows - duplicateRows),
			existingRows,
			duplicateRows,
			conflictRows,
			items
		});
	}

	let filesInBackup = 0;
	let filesInZip = 0;
	let filesAlreadyPresent = 0;
	let filesMissingOnServer = 0;
	let sameFiles = 0;
	let differentFiles = 0;
	const fileRows: BackupFileAnalysisRow[] = [];
	const analyzedFiles = new Map<string, DatabaseBackupFile>();
	for (const file of backup.files || []) {
		const normalized = normalizeBackupFilePath(file.path);
		if (!normalized) continue;
		analyzedFiles.set(normalized, { ...file, path: normalized });
	}
	for (const [entryName, data] of entries || []) {
		const normalized = normalizeBackupFilePath(entryName);
		if (!normalized || analyzedFiles.has(normalized)) continue;
		analyzedFiles.set(normalized, {
			path: normalized,
			size: data.length,
			source: "uploadsFolder"
		});
	}
	for (const file of analyzedFiles.values()) {
		const normalized = normalizeBackupFilePath(file.path);
		if (!normalized) continue;
		filesInBackup += 1;
		const archiveData = entries?.get(`files/${normalized}`) || null;
		if (archiveData) filesInZip += 1;
		const target = path.resolve(env.projectRoot, normalized);
		if (target.startsWith(path.resolve(env.projectRoot, "uploads") + path.sep)) {
			try {
				const currentData = await fs.readFile(target);
				filesAlreadyPresent += 1;
				const same = archiveData ? currentData.equals(archiveData) : false;
				if (same) sameFiles += 1;
				else if (archiveData) differentFiles += 1;
				fileRows.push({
					path: normalized,
					size: file.size,
					archiveSize: archiveData?.length ?? null,
					currentSize: currentData.length,
					status: archiveData ? (same ? "same" : "different") : "missingInArchive",
					defaultAction: same ? "current" : "current",
					archivePreviewUrl: archivePreviewUrl(normalized, archiveData),
					currentPreviewUrl: currentPreviewUrl(normalized, true)
				});
			} catch {
				filesMissingOnServer += 1;
				fileRows.push({
					path: normalized,
					size: file.size,
					archiveSize: archiveData?.length ?? null,
					currentSize: null,
					status: archiveData ? "missingOnServer" : "missingInArchive",
					defaultAction: archiveData ? "backup" : "skip",
					archivePreviewUrl: archivePreviewUrl(normalized, archiveData),
					currentPreviewUrl: null
				});
			}
		}
	}

	return {
		version: backup.version,
		exportedAt: backup.exportedAt,
		models: rows,
		files: {
			declared: filesInBackup,
			inArchive: filesInZip,
			alreadyPresent: filesAlreadyPresent,
			missingOnServer: filesMissingOnServer,
			same: sameFiles,
			different: differentFiles,
			items: fileRows
		},
		totals: rows.reduce((total, row) => ({
			backup: total.backup + row.backup,
			current: total.current + row.current,
			newRows: total.newRows + row.newRows,
			existingRows: total.existingRows + row.existingRows,
			duplicateRows: total.duplicateRows + row.duplicateRows,
			conflictRows: total.conflictRows + row.conflictRows
		}), { backup: 0, current: 0, newRows: 0, existingRows: 0, duplicateRows: 0, conflictRows: 0 })
	};
}

export async function readShareSettings() {
	return readCachedSetting(shareSettingsKey, async () => {
		const setting = await prisma.appSetting.findUnique({ where: { key: shareSettingsKey } });
		const parsed = shareSettingsSchema.safeParse(setting?.value);
		const current = parsed.success ? { ...defaultShareSettings, ...parsed.data } : defaultShareSettings;
		const next = await ensureGeneratedShareQr(current as ShareSettings);
		if (next !== current) {
			await prisma.appSetting.upsert({
				where: { key: shareSettingsKey },
				update: { value: next },
				create: { key: shareSettingsKey, value: next }
			});
		}
		return next;
	});
}

export const getShareSettings: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await readShareSettings());
});

export const saveShareSettings: RequestHandler = asyncHandler(async (request, response) => {
	const input = shareSettingsSchema.parse(request.body);
	const setting = await ensureGeneratedShareQr({ ...defaultShareSettings, ...input });
	await prisma.appSetting.upsert({
		where: { key: shareSettingsKey },
		update: { value: setting },
		create: { key: shareSettingsKey, value: setting }
	});
	cacheSetting(shareSettingsKey, setting);
	await audit(String(request.user?.id), "SHARE_SETTINGS_UPDATED", "AppSetting", shareSettingsKey, setting);
	response.json(setting);
});

export const refreshShareQrImage: RequestHandler = asyncHandler(async (request, response) => {
	const current = await readShareSettings();
	const setting = await ensureGeneratedShareQr({ ...current, qrImageSource: "generated" }, true);
	await prisma.appSetting.upsert({
		where: { key: shareSettingsKey },
		update: { value: setting },
		create: { key: shareSettingsKey, value: setting }
	});
	cacheSetting(shareSettingsKey, setting);
	await audit(String(request.user?.id), "SHARE_QR_IMAGE_REFRESHED", "AppSetting", shareSettingsKey, {
		path: setting.qrImagePath
	});
	response.json(setting);
});

export const deleteShareSettings: RequestHandler = asyncHandler(async (request, response) => {
	await prisma.appSetting.deleteMany({ where: { key: shareSettingsKey } });
	clearSettingCache(shareSettingsKey);
	await audit(String(request.user?.id), "SHARE_SETTINGS_RESET", "AppSetting", shareSettingsKey);
	response.status(204).end();
});

export async function readSupportSettings() {
	return readCachedSetting(supportSettingsKey, async () => {
		const setting = await prisma.appSetting.findUnique({ where: { key: supportSettingsKey } });
		const parsed = supportSettingsSchema.safeParse(setting?.value);
		const current = parsed.success ? { ...defaultSupportSettings, ...parsed.data } : defaultSupportSettings;
		const next = await ensureGeneratedSupportQr(current as SupportSettings);
		if (next !== current) {
			await prisma.appSetting.upsert({
				where: { key: supportSettingsKey },
				update: { value: next },
				create: { key: supportSettingsKey, value: next }
			});
		}
		return next;
	});
}

export const getSupportSettings: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await readSupportSettings());
});

export const saveSupportSettings: RequestHandler = asyncHandler(async (request, response) => {
	const input = supportSettingsSchema.parse(request.body);
	const setting = await ensureGeneratedSupportQr({ ...defaultSupportSettings, ...input });
	await prisma.appSetting.upsert({
		where: { key: supportSettingsKey },
		update: { value: setting },
		create: { key: supportSettingsKey, value: setting }
	});
	cacheSetting(supportSettingsKey, setting);
	await audit(String(request.user?.id), "SUPPORT_SETTINGS_UPDATED", "AppSetting", supportSettingsKey, setting);
	response.json(setting);
});

export const refreshSupportQrImage: RequestHandler = asyncHandler(async (request, response) => {
	const current = await readSupportSettings();
	const setting = await ensureGeneratedSupportQr({ ...current, qrImageSource: "generated" }, true);
	await prisma.appSetting.upsert({
		where: { key: supportSettingsKey },
		update: { value: setting },
		create: { key: supportSettingsKey, value: setting }
	});
	cacheSetting(supportSettingsKey, setting);
	await audit(String(request.user?.id), "SUPPORT_QR_IMAGE_REFRESHED", "AppSetting", supportSettingsKey, {
		path: setting.qrImagePath
	});
	response.json(setting);
});

export const deleteSupportSettings: RequestHandler = asyncHandler(async (request, response) => {
	await prisma.appSetting.deleteMany({ where: { key: supportSettingsKey } });
	clearSettingCache(supportSettingsKey);
	await audit(String(request.user?.id), "SUPPORT_SETTINGS_RESET", "AppSetting", supportSettingsKey);
	response.status(204).end();
});

export async function readLinkPreviewSettings() {
	return readCachedSetting(linkPreviewSettingsKey, async () => {
		const setting = await prisma.appSetting.findUnique({ where: { key: linkPreviewSettingsKey } });
		const parsed = linkPreviewSettingsSchema.safeParse(setting?.value);
		return parsed.success ? { ...defaultLinkPreviewSettings, ...parsed.data } : defaultLinkPreviewSettings;
	});
}

export const getLinkPreviewSettings: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await readLinkPreviewSettings());
});

export const saveLinkPreviewSettings: RequestHandler = asyncHandler(async (request, response) => {
	const input = linkPreviewSettingsSchema.parse(request.body);
	const setting = { ...defaultLinkPreviewSettings, ...input };
	await prisma.appSetting.upsert({
		where: { key: linkPreviewSettingsKey },
		update: { value: setting },
		create: { key: linkPreviewSettingsKey, value: setting }
	});
	cacheSetting(linkPreviewSettingsKey, setting);
	await audit(String(request.user?.id), "LINK_PREVIEW_SETTINGS_UPDATED", "AppSetting", linkPreviewSettingsKey, setting);
	response.json(setting);
});

export const deleteLinkPreviewSettings: RequestHandler = asyncHandler(async (request, response) => {
	await prisma.appSetting.deleteMany({ where: { key: linkPreviewSettingsKey } });
	clearSettingCache(linkPreviewSettingsKey);
	await audit(String(request.user?.id), "LINK_PREVIEW_SETTINGS_RESET", "AppSetting", linkPreviewSettingsKey);
	response.status(204).end();
});

export const uploadSettingQrImage: RequestHandler = asyncHandler(async (request, response) => {
	if (!request.file) {
		response.status(400).json({ code: "QR_IMAGE_REQUIRED", message: "Please choose a QR image to upload." });
		return;
	}
	const category = String(request.body.category || "settings/misc");
	const categoryParts = uploadCategoryPath(category);
	const uploadDir = path.join(env.projectRoot, "uploads", ...categoryParts);
	await fs.mkdir(uploadDir, { recursive: true });
	const extension = path.extname(request.file.originalname).toLowerCase() || ".png";
	const storedName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
	const filePath = path.join(uploadDir, storedName);
	await fs.writeFile(filePath, request.file.buffer);
	const publicPath = `/uploads/${[...categoryParts, storedName].join("/")}`;
	const asset = await prisma.fileAsset.create({
		data: {
			originalName: request.file.originalname,
			storedName,
			mimeType: request.file.mimetype,
			size: request.file.size,
			path: publicPath,
			category,
			uploadedById: String(request.user?.id)
		}
	});
	await audit(String(request.user?.id), "SETTING_QR_IMAGE_UPLOADED", "FileAsset", asset.id, {
		category,
		path: publicPath
	});
	response.status(201).json({
		id: asset.id,
		path: publicPath,
		name: asset.originalName,
		type: asset.mimeType,
		size: asset.size
	});
});

export const moveOldUploadImages: RequestHandler = asyncHandler(async (request, response) => {
	const summary: NormalizeUploadSummary = {
		moved: 0,
		looseFilesMoved: 0,
		alreadyStructured: 0,
		skipped: 0,
		missing: 0,
		mappings: {}
	};
	const movedPaths = new Map<string, string>();
	const settingTargets = [
		{ key: shareSettingsKey, field: "qrImagePath", category: "settings/share-qr" },
		{ key: supportSettingsKey, field: "qrImagePath", category: "settings/support-qr" },
		{ key: linkPreviewSettingsKey, field: "imagePath", category: "settings/link-preview" }
	];

	for (const target of settingTargets) {
		const row = await prisma.appSetting.findUnique({ where: { key: target.key } });
		const value = row?.value && typeof row.value === "object" && !Array.isArray(row.value)
			? row.value as Record<string, unknown>
			: null;
		const currentPath = typeof value?.[target.field] === "string" ? value[target.field] as string : null;
		await normalizeReferencedUpload(currentPath, target.category, movedPaths, summary);
	}

	const banners = await prisma.banner.findMany();
	for (const banner of banners) {
		await normalizeReferencedUpload(banner.image, `banners/${banner.id}`, movedPaths, summary);
	}

	const contributors = await prisma.contributor.findMany();
	for (const contributor of contributors) {
		await normalizeReferencedUpload(contributor.avatar, `contributors/${contributor.id}`, movedPaths, summary);
	}

	const oldFileAssets = await prisma.fileAsset.findMany({
		where: { path: { startsWith: "/uploads/settings/" } }
	});
	for (const asset of oldFileAssets) {
		if (!isOldDirectSettingsUpload(asset.path)) continue;
		await normalizeReferencedUpload(asset.path, asset.category || "settings/misc", movedPaths, summary);
	}
	await normalizeLooseSettingsUploads(movedPaths, summary);

	if (Object.keys(summary.mappings).length) {
		const mappingPath = path.join(env.projectRoot, "uploads", "old-upload-image-mapping.json");
		await fs.mkdir(path.dirname(mappingPath), { recursive: true });
		await fs.writeFile(mappingPath, JSON.stringify(summary.mappings, null, 2), "utf8");
	}

	await audit(String(request.user?.id), "OLD_UPLOAD_IMAGES_MOVED", "FileAsset", undefined, summary);
	response.json(summary);
});

export const getPaperPreviewCache: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await previewCacheSummary());
});

export const generatePaperPreviewCache: RequestHandler = asyncHandler(async (request, response) => {
	const result = await runPreviewGenerator();
	await audit(String(request.user?.id), "PAPER_PREVIEW_CACHE_GENERATED", "PdfPreviewCache", undefined, {
		python: result.python
	});
	response.json(await previewCacheSummary({
		generated: true,
		python: result.python,
		output: result.output
	}));
});

export const cleanPaperPreviewCache: RequestHandler = asyncHandler(async (request, response) => {
	const files = await cacheFiles();
	await Promise.all(files.map((file) => fs.unlink(file.path)));
	await audit(String(request.user?.id), "PAPER_PREVIEW_CACHE_CLEANED", "PdfPreviewCache", undefined, {
		deleted: files.length
	});
	response.json(await previewCacheSummary({ deleted: files.length }));
});

export const exportDatabaseBackup: RequestHandler = asyncHandler(async (request, response) => {
	const backup = await databaseBackup();
	const zip = await backupZip(backup);
	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	await audit(String(request.user?.id), "DATABASE_BACKUP_EXPORTED", "DatabaseBackup", stamp, {
		files: backup.files?.length || 0
	});
	response.setHeader("Content-Type", "application/zip");
	response.setHeader("Content-Disposition", `attachment; filename="gyanpath-database-backup-${stamp}.zip"`);
	response.send(zip);
});

export const restoreDatabaseBackup: RequestHandler = asyncHandler(async (request, response) => {
	let parsed: { backup: DatabaseBackup; entries: Map<string, Buffer> | null };
	const resolution = parseResolution(request);
	let mergeStats: Awaited<ReturnType<typeof restoreBackupModelsMerge>> | null = null;
	try {
		parsed = await parseUploadedBackup(request);
		if (resolution.mode === "merge") {
			mergeStats = await restoreBackupModelsMerge(parsed.backup, resolution);
		} else {
			await restoreBackupModels(parsed.backup);
		}
	} catch (error: any) {
		response.status(400).json({ code: "INVALID_BACKUP", message: "Backup JSON is not valid for this application version." });
		return;
	}
	const restoredFiles = parsed.entries ? await restoreBackupFiles(parsed.entries, parsed.backup, resolution) : 0;

	await audit(null, "DATABASE_BACKUP_RESTORED", "DatabaseBackup", undefined, {
		version: parsed.backup.version,
		exportedAt: parsed.backup.exportedAt || null,
		files: restoredFiles,
		mode: resolution.mode || "replace",
		mergeStats
	});
	response.json({ restored: true, models: backupModelNames.length, files: restoredFiles, mergeStats });
});

export const previewDatabaseBackupRestore: RequestHandler = asyncHandler(async (request, response) => {
	try {
		const parsed = await parseUploadedBackup(request);
		response.json(await analyzeBackup(parsed.backup, parsed.entries));
	} catch {
		response.status(400).json({ code: "INVALID_BACKUP", message: "Backup file could not be analyzed." });
	}
});

export const getOverview: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await adminService.overview());
});

export const getUsers: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await adminService.users());
});

export const getSubjects: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await adminService.subjects());
});

export const saveSubject: RequestHandler = asyncHandler(async (request, response) => {
	const input = subjectSchema.parse(request.body);
	const normalizedCode = input.code.toUpperCase();
	const folderCode = normalizedCode.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
	const folderPath = input.folderPath?.trim() || `MCA_new/Semester_${input.semester}/${folderCode}`;
	const data = {
		code: normalizedCode,
		title: input.title,
		semester: input.semester,
		type: input.type,
		folderPath,
		htmlViewerPath: input.htmlViewerPath || null,
		questionBank: input.questionBank
	};
	const id = request.params.id ? String(request.params.id) : undefined;
	const item = id
		? await prisma.subject.update({
			where: { id },
			data,
			select: {
				id: true,
				code: true,
				title: true,
				semester: true,
				type: true
			}
		})
		: await prisma.subject.create({
			data,
			select: {
				id: true,
				code: true,
				title: true,
				semester: true,
				type: true
			}
		});
	await audit(String(request.user?.id), id ? "SUBJECT_UPDATED" : "SUBJECT_CREATED", "Subject", item.id, item);
	response.status(id ? 200 : 201).json(item);
});

export const deleteSubject: RequestHandler = asyncHandler(async (request, response) => {
	const id = String(request.params.id);
	await prisma.subject.delete({ where: { id } });
	await audit(String(request.user?.id), "SUBJECT_DELETED", "Subject", id);
	response.status(204).end();
});

export const updateUserRole: RequestHandler = asyncHandler(async (request, response) => {
	const input = updateRoleSchema.parse(request.body);
	response.json(
		await adminService.updateRole(
			String(request.user?.id),
			String(request.params.id),
			input.role
		)
	);
});

export const getSystemStatus: RequestHandler = asyncHandler(async (_request, response) => {
	response.json({
		api: "online",
		database: "connected",
		architecture: "Express + TypeScript Modular Monolith",
		databaseEngine: "PostgreSQL + Prisma",
		nodeVersion: process.version,
		redis: "optional"
	});
});

export const getAnalyticsRetention: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await adminService.analyticsRetention());
});

export const saveAnalyticsRetention: RequestHandler = asyncHandler(async (request, response) => {
	const input = analyticsRetentionSchema.parse(request.body);
	response.json(await adminService.saveAnalyticsRetention(input));
});

export const updateUserStatus: RequestHandler = asyncHandler(async (request, response) => {
	const input = userStatusSchema.parse(request.body);
	const actorId = String(request.user?.id);
	if (actorId === request.params.id && input.status !== "ACTIVE") {
		response.status(400).json({ code: "SELF_STATUS_CHANGE", message: "You cannot suspend or ban your own account." });
		return;
	}
	const user = await prisma.user.update({
		where: { id: String(request.params.id) },
		data: { status: input.status },
		select: { id: true, username: true, displayName: true, role: true, status: true }
	});
	await audit(actorId, "USER_STATUS_UPDATED", "User", user.id, { status: input.status });
	response.json(user);
});

export const updateUser: RequestHandler = asyncHandler(async (request, response) => {
	const input = updateUserSchema.parse(request.body);
	const user = await adminService.updateUser(
		String(request.user?.id),
		String(request.params.id),
		input
	);
	await audit(String(request.user?.id), "USER_UPDATED", "User", user.id, input);
	response.json(user);
});

export const getEmailVerificationSettings: RequestHandler = asyncHandler(async (_request, response) => {
	const setting = await prisma.appSetting.findUnique({ where: { key: "email-verification" } });
	const value = setting?.value as { enabled?: boolean } | null;
	response.json({
		enabled: value?.enabled === true,
		configured: Boolean(env.resendApiKey && env.resendFromEmail),
		fromEmail: env.resendFromEmail || null
	});
});

export const saveEmailVerificationSettings: RequestHandler = asyncHandler(async (request, response) => {
	const input = emailVerificationSettingsSchema.parse(request.body);
	if (input.enabled && (!env.resendApiKey || !env.resendFromEmail)) {
		throw new AppError(
			400,
			"Set RESEND_API_KEY and RESEND_FROM_EMAIL before enabling email verification.",
			"EMAIL_PROVIDER_NOT_CONFIGURED"
		);
	}
	await prisma.appSetting.upsert({
		where: { key: "email-verification" },
		update: { value: input },
		create: { key: "email-verification", value: input }
	});
	await audit(String(request.user?.id), "EMAIL_VERIFICATION_SETTING_UPDATED", "AppSetting", "email-verification", input);
	response.json({ ...input, configured: true, fromEmail: env.resendFromEmail });
});

export const resetUserPassword: RequestHandler = asyncHandler(async (request, response) => {
	const id = String(request.params.id);
	const temporaryPassword = `GyanPath-${crypto.randomBytes(5).toString("hex")}`;
	const passwordHash = await bcrypt.hash(temporaryPassword, 12);
	const user = await adminService.resetPassword(String(request.user?.id), id, passwordHash);
	await audit(String(request.user?.id), "USER_PASSWORD_RESET", "User", user.id);
	response.json({ user, temporaryPassword });
});

export const deleteUser: RequestHandler = asyncHandler(async (request, response) => {
	const deleted = await adminService.deleteUser(String(request.user?.id), String(request.params.id));
	await audit(String(request.user?.id), "USER_DELETED", "User", deleted.id, {
		username: deleted.username,
		displayName: deleted.displayName,
		role: deleted.role
	});
	response.json(deleted);
});

export const getNewUserDefaultStatus: RequestHandler = asyncHandler(async (_request, response) => {
	const setting = await prisma.appSetting.findUnique({ where: { key: "new-user-default-status" } });
	const value = setting?.value as { status?: string } | null;
	response.json({ status: value?.status === "ACTIVE" ? "ACTIVE" : "PENDING" });
});

export const saveNewUserDefaultStatus: RequestHandler = asyncHandler(async (request, response) => {
	const input = newUserDefaultStatusSchema.parse(request.body);
	await prisma.appSetting.upsert({
		where: { key: "new-user-default-status" },
		update: { value: input },
		create: { key: "new-user-default-status", value: input }
	});
	await audit(String(request.user?.id), "NEW_USER_DEFAULT_STATUS_UPDATED", "AppSetting", "new-user-default-status", input);
	response.json(input);
});

export const listSemesters: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await prisma.semester.findMany({ orderBy: { number: "asc" } }));
});

export const saveSemester: RequestHandler = asyncHandler(async (request, response) => {
	const input = semesterSchema.parse(request.body);
	const id = request.params.id ? String(request.params.id) : undefined;
	const item = id
		? await prisma.semester.update({ where: { id }, data: input })
		: await prisma.semester.create({ data: input });
	await audit(String(request.user?.id), id ? "SEMESTER_UPDATED" : "SEMESTER_CREATED", "Semester", item.id, input);
	response.json(item);
});

export const deleteSemester: RequestHandler = asyncHandler(async (request, response) => {
	const id = String(request.params.id);
	await prisma.semester.delete({ where: { id } });
	await audit(String(request.user?.id), "SEMESTER_DELETED", "Semester", id);
	response.status(204).end();
});

export const listAssignments: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await prisma.assignment.findMany({
		include: { subject: { select: { code: true, title: true } }, createdBy: { select: { displayName: true } } },
		orderBy: { createdAt: "desc" }
	}));
});

export const saveAssignment: RequestHandler = asyncHandler(async (request, response) => {
	const input = assignmentSchema.parse(request.body);
	const data = { ...input, dueDate: input.dueDate ? new Date(input.dueDate) : null };
	const id = request.params.id ? String(request.params.id) : undefined;
	const item = id
		? await prisma.assignment.update({ where: { id }, data })
		: await prisma.assignment.create({ data: { ...data, createdById: String(request.user?.id) } });
	await audit(String(request.user?.id), id ? "ASSIGNMENT_UPDATED" : "ASSIGNMENT_CREATED", "Assignment", item.id);
	response.json(item);
});

export const deleteAssignment: RequestHandler = asyncHandler(async (request, response) => {
	const id = String(request.params.id);
	await prisma.assignment.delete({ where: { id } });
	await audit(String(request.user?.id), "ASSIGNMENT_DELETED", "Assignment", id);
	response.status(204).end();
});

export const listStudyMaterials: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await prisma.studyMaterial.findMany({
		include: { subject: { select: { code: true, title: true, semester: true } } },
		orderBy: [{ subject: { semester: "asc" } }, { subject: { code: "asc" } }, { groupName: "asc" }, { title: "asc" }]
	}));
});

export const saveStudyMaterial: RequestHandler = asyncHandler(async (request, response) => {
	const input = studyMaterialSchema.parse(request.body);
	const id = request.params.id ? String(request.params.id) : undefined;
	const data = {
		...input,
		hindiPath: input.hindiPath || null,
		englishChecksum: input.englishChecksum || null,
		hindiChecksum: input.hindiChecksum || null
	};
	const item = id
		? await prisma.studyMaterial.update({ where: { id }, data })
		: await prisma.studyMaterial.create({ data });
	await audit(String(request.user?.id), id ? "STUDY_MATERIAL_UPDATED" : "STUDY_MATERIAL_CREATED", "StudyMaterial", item.id);
	response.status(id ? 200 : 201).json(item);
});

export const deleteStudyMaterial: RequestHandler = asyncHandler(async (request, response) => {
	const id = String(request.params.id);
	await prisma.studyMaterial.delete({ where: { id } });
	await audit(String(request.user?.id), "STUDY_MATERIAL_DELETED", "StudyMaterial", id);
	response.status(204).end();
});

export const listPapers: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await prisma.paper.findMany({
		include: { subject: { select: { code: true, title: true, semester: true } } },
		orderBy: [{ subject: { semester: "asc" } }, { subject: { code: "asc" } }, { session: "desc" }, { title: "asc" }]
	}));
});

export const savePaper: RequestHandler = asyncHandler(async (request, response) => {
	const input = paperSchema.parse(request.body);
	const id = request.params.id ? String(request.params.id) : undefined;
	const data = {
		...input,
		fileName: input.fileName || input.englishPath.split(/[\\/]/).pop() || input.title,
		hindiPath: input.hindiPath || null,
		englishChecksum: input.englishChecksum || null,
		hindiChecksum: input.hindiChecksum || null,
		previewPath: input.previewPath || null,
		pageCount: input.pageCount ?? null,
		fileSize: input.fileSize ?? null,
		updatedAt: new Date()
	};
	const item = id
		? await prisma.paper.update({ where: { id }, data })
		: await prisma.paper.create({ data });
	await audit(String(request.user?.id), id ? "PAPER_UPDATED" : "PAPER_CREATED", "Paper", item.id);
	response.status(id ? 200 : 201).json(item);
});

export const deletePaper: RequestHandler = asyncHandler(async (request, response) => {
	const id = String(request.params.id);
	await prisma.paper.delete({ where: { id } });
	await audit(String(request.user?.id), "PAPER_DELETED", "Paper", id);
	response.status(204).end();
});

export const listReports: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await prisma.report.findMany({
		include: {
			reporter: { select: { username: true, displayName: true } },
			reportedUser: { select: { username: true, displayName: true } }
		},
		orderBy: { createdAt: "desc" }
	}));
});

export const reviewReport: RequestHandler = asyncHandler(async (request, response) => {
	const input = reportReviewSchema.parse(request.body);
	const item = await prisma.report.update({ where: { id: String(request.params.id) }, data: input });
	await audit(String(request.user?.id), "REPORT_REVIEWED", "Report", item.id, input);
	response.json(item);
});

export const listAuditLogs: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await prisma.auditLog.findMany({
		take: 200,
		include: { actor: { select: { username: true, displayName: true } } },
		orderBy: { createdAt: "desc" }
	}));
});
