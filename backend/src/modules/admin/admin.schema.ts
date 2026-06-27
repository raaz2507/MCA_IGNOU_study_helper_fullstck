import { UserRole } from "@prisma/client";
import { z } from "zod";

export const updateRoleSchema = z.object({
	role: z.nativeEnum(UserRole)
});

export const analyticsRetentionSchema = z.object({
	enabled: z.boolean(),
	retentionDays: z.union([z.literal(90), z.literal(180)]),
	action: z.enum(["delete", "anonymize"])
});

export const emailVerificationSettingsSchema = z.object({
	enabled: z.boolean()
});

const optionalUrl = z.preprocess(
	(value) => typeof value === "string" && value.trim() === "" ? null : value,
	z.string().trim().url().max(500).optional().nullable()
);

const qrImageMetaSchema = z.object({
	name: z.string().max(260).optional().nullable(),
	type: z.string().max(80).optional().nullable(),
	size: z.number().int().nonnegative().optional().nullable(),
	width: z.number().int().positive().optional().nullable(),
	height: z.number().int().positive().optional().nullable()
});

export const shareSettingsSchema = z.object({
	title: z.string().trim().min(2).max(80),
	description: z.string().trim().min(2).max(220),
	shareText: z.string().trim().min(2).max(500),
	url: z.string().trim().url().max(300),
	qrImageSource: z.enum(["generated", "url", "upload"]).default("generated"),
	qrImageUrl: optionalUrl,
	qrImagePath: z.string().trim().max(500).optional().nullable(),
	qrImageMeta: qrImageMetaSchema.optional().nullable()
});

export const supportSettingsSchema = z.object({
	enabled: z.boolean().default(false),
	title: z.string().trim().min(2).max(80),
	description: z.string().trim().min(2).max(300),
	qrData: z.string().trim().max(700).optional().nullable(),
	qrImageSource: z.enum(["generated", "url", "upload"]).default("generated"),
	qrImageUrl: optionalUrl,
	qrImagePath: z.string().trim().max(500).optional().nullable(),
	qrImageMeta: qrImageMetaSchema.optional().nullable(),
	buttonText: z.string().trim().max(60).optional().nullable(),
	buttonUrl: optionalUrl
});

export const linkPreviewSettingsSchema = z.object({
	enabled: z.boolean().default(true),
	title: z.string().trim().min(2).max(90),
	description: z.string().trim().min(2).max(220),
	url: z.string().trim().url().max(300),
	imageSource: z.enum(["url", "upload"]).default("url"),
	imageUrl: optionalUrl,
	imagePath: z.string().trim().max(500).optional().nullable(),
	imageMeta: qrImageMetaSchema.optional().nullable()
});

export const userStatusSchema = z.object({
	status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "BANNED"])
});

export const updateUserSchema = z.object({
	role: z.nativeEnum(UserRole),
	status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "BANNED"])
});

export const newUserDefaultStatusSchema = z.object({
	status: z.enum(["PENDING", "ACTIVE"])
});

export const semesterSchema = z.object({
	number: z.coerce.number().int().min(1).max(20),
	title: z.string().trim().min(2).max(100),
	active: z.boolean().default(true),
	status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED")
});

export const subjectSchema = z.object({
	code: z.string().trim().min(2).max(30),
	title: z.string().trim().min(2).max(160),
	semester: z.coerce.number().int().min(1).max(20),
	type: z.enum(["theory", "practical", "project"]).default("theory"),
	folderPath: z.string().trim().max(240).optional(),
	htmlViewerPath: z.string().trim().max(300).optional().nullable(),
	questionBank: z.boolean().default(false)
});

export const assignmentSchema = z.object({
	subjectId: z.string().min(1),
	title: z.string().trim().min(2).max(200),
	description: z.string().trim().max(5000).optional().nullable(),
	dueDate: z.string().datetime().optional().nullable(),
	solutionUrl: z.string().url().optional().nullable(),
	status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT")
});

const optionalText = (max = 500) => z.string().trim().max(max).optional().nullable();

export const studyMaterialSchema = z.object({
	subjectId: z.string().min(1),
	groupName: z.string().trim().min(1).max(160),
	title: z.string().trim().min(2).max(220),
	filePath: z.string().trim().min(1).max(700),
	hindiPath: optionalText(700),
	englishChecksum: optionalText(160),
	hindiChecksum: optionalText(160),
	status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED")
});

export const paperSchema = z.object({
	subjectId: z.string().min(1),
	title: z.string().trim().min(2).max(220),
	session: z.string().trim().min(2).max(80),
	fileName: z.string().trim().max(260).optional().nullable(),
	englishPath: z.string().trim().min(1).max(700),
	hindiPath: optionalText(700),
	englishChecksum: optionalText(160),
	hindiChecksum: optionalText(160),
	previewPath: optionalText(700),
	pageCount: z.coerce.number().int().min(0).max(2000).optional().nullable(),
	fileSize: z.coerce.number().int().min(0).optional().nullable(),
	status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED")
});

export const reportReviewSchema = z.object({
	status: z.enum(["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"]),
	resolution: z.string().trim().max(2000).optional().nullable()
});
