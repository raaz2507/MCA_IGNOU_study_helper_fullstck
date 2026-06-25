import type { RequestHandler } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../../shared/middleware/async-handler.js";
import { adminService } from "./admin.service.js";
import { prisma } from "../../config/prisma.js";
import {
	analyticsRetentionSchema,
	assignmentSchema,
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

type BackupModelName = typeof backupModelNames[number];
type DatabaseBackup = {
	version: number;
	exportedAt: string;
	models: Record<BackupModelName, unknown[]>;
};

const emptyBackupModels = () => Object.fromEntries(
	backupModelNames.map((name) => [name, []])
) as unknown as Record<BackupModelName, unknown[]>;

export async function readShareSettings() {
	const setting = await prisma.appSetting.findUnique({ where: { key: shareSettingsKey } });
	const parsed = shareSettingsSchema.safeParse(setting?.value);
	return parsed.success ? { ...defaultShareSettings, ...parsed.data } : defaultShareSettings;
}

export const getShareSettings: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await readShareSettings());
});

export const saveShareSettings: RequestHandler = asyncHandler(async (request, response) => {
	const input = shareSettingsSchema.parse(request.body);
	const setting = { ...defaultShareSettings, ...input };
	await prisma.appSetting.upsert({
		where: { key: shareSettingsKey },
		update: { value: setting },
		create: { key: shareSettingsKey, value: setting }
	});
	await audit(String(request.user?.id), "SHARE_SETTINGS_UPDATED", "AppSetting", shareSettingsKey, setting);
	response.json(setting);
});

export const deleteShareSettings: RequestHandler = asyncHandler(async (request, response) => {
	await prisma.appSetting.deleteMany({ where: { key: shareSettingsKey } });
	await audit(String(request.user?.id), "SHARE_SETTINGS_RESET", "AppSetting", shareSettingsKey);
	response.status(204).end();
});

export async function readSupportSettings() {
	const setting = await prisma.appSetting.findUnique({ where: { key: supportSettingsKey } });
	const parsed = supportSettingsSchema.safeParse(setting?.value);
	return parsed.success ? { ...defaultSupportSettings, ...parsed.data } : defaultSupportSettings;
}

export const getSupportSettings: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await readSupportSettings());
});

export const saveSupportSettings: RequestHandler = asyncHandler(async (request, response) => {
	const input = supportSettingsSchema.parse(request.body);
	const setting = { ...defaultSupportSettings, ...input };
	await prisma.appSetting.upsert({
		where: { key: supportSettingsKey },
		update: { value: setting },
		create: { key: supportSettingsKey, value: setting }
	});
	await audit(String(request.user?.id), "SUPPORT_SETTINGS_UPDATED", "AppSetting", supportSettingsKey, setting);
	response.json(setting);
});

export const deleteSupportSettings: RequestHandler = asyncHandler(async (request, response) => {
	await prisma.appSetting.deleteMany({ where: { key: supportSettingsKey } });
	await audit(String(request.user?.id), "SUPPORT_SETTINGS_RESET", "AppSetting", supportSettingsKey);
	response.status(204).end();
});

export const uploadSettingQrImage: RequestHandler = asyncHandler(async (request, response) => {
	if (!request.file) {
		response.status(400).json({ code: "QR_IMAGE_REQUIRED", message: "Please choose a QR image to upload." });
		return;
	}
	const category = String(request.body.category || "settings-qr");
	const publicPath = `/uploads/settings/${request.file.filename}`;
	const asset = await prisma.fileAsset.create({
		data: {
			originalName: request.file.originalname,
			storedName: request.file.filename,
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

export const exportDatabaseBackup: RequestHandler = asyncHandler(async (request, response) => {
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
	const backup: DatabaseBackup = {
		version: backupVersion,
		exportedAt: new Date().toISOString(),
		models
	};
	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	await audit(String(request.user?.id), "DATABASE_BACKUP_EXPORTED", "DatabaseBackup", stamp);
	response.setHeader("Content-Type", "application/json");
	response.setHeader("Content-Disposition", `attachment; filename="gyanpath-database-backup-${stamp}.json"`);
	response.json(backup);
});

export const restoreDatabaseBackup: RequestHandler = asyncHandler(async (request, response) => {
	const body = request.body as Partial<DatabaseBackup>;
	if (body.version !== backupVersion || !body.models || typeof body.models !== "object") {
		response.status(400).json({ code: "INVALID_BACKUP", message: "Backup JSON is not valid for this application version." });
		return;
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

	await audit(null, "DATABASE_BACKUP_RESTORED", "DatabaseBackup", undefined, {
		version: body.version,
		exportedAt: body.exportedAt || null
	});
	response.json({ restored: true, models: backupModelNames.length });
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
