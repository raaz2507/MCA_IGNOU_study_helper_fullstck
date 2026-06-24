import type { RequestHandler } from "express";
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
	studyMaterialSchema,
	subjectSchema,
	newUserDefaultStatusSchema,
	updateUserSchema,
	updateRoleSchema,
	userStatusSchema
} from "./admin.schema.js";

async function audit(actorId: string, action: string, entityType: string, entityId?: string, details?: object) {
	await prisma.auditLog.create({ data: { actorId, action, entityType, entityId, details } });
}

const shareSettingsKey = "share-settings";
const defaultShareSettings = {
	title: "Share GyanPath",
	description: "Scan the QR code or share it with another MCA student.",
	shareText: "GyanPath - IGNOU MCA study resources",
	url: "https://mcaignoustudyhelperfullstck-production.up.railway.app/"
};

export async function readShareSettings() {
	const setting = await prisma.appSetting.findUnique({ where: { key: shareSettingsKey } });
	const parsed = shareSettingsSchema.safeParse(setting?.value);
	return parsed.success ? parsed.data : defaultShareSettings;
}

export const getShareSettings: RequestHandler = asyncHandler(async (_request, response) => {
	response.json(await readShareSettings());
});

export const saveShareSettings: RequestHandler = asyncHandler(async (request, response) => {
	const input = shareSettingsSchema.parse(request.body);
	await prisma.appSetting.upsert({
		where: { key: shareSettingsKey },
		update: { value: input },
		create: { key: shareSettingsKey, value: input }
	});
	await audit(String(request.user?.id), "SHARE_SETTINGS_UPDATED", "AppSetting", shareSettingsKey, input);
	response.json(input);
});

export const deleteShareSettings: RequestHandler = asyncHandler(async (request, response) => {
	await prisma.appSetting.deleteMany({ where: { key: shareSettingsKey } });
	await audit(String(request.user?.id), "SHARE_SETTINGS_RESET", "AppSetting", shareSettingsKey);
	response.status(204).end();
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
