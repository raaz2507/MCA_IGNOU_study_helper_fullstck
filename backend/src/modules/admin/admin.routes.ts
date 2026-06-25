import { Router } from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { UserRole } from "@prisma/client";
import { env } from "../../config/env.js";
import { requireRoles } from "../auth/auth.middleware.js";
import {
	getAnalyticsRetention,
	getOverview,
	getSubjects,
	getSystemStatus,
	getUsers,
	saveSubject,
	deletePaper,
	deleteStudyMaterial,
	getNewUserDefaultStatus,
	listPapers,
	listAssignments,
	listAuditLogs,
	listReports,
	listSemesters,
	listStudyMaterials,
	getShareSettings,
	getSupportSettings,
	deleteAssignment,
	deleteSemester,
	deleteSubject,
	deleteUser,
	deleteShareSettings,
	deleteSupportSettings,
	exportDatabaseBackup,
	reviewReport,
	restoreDatabaseBackup,
	saveAssignment,
	saveAnalyticsRetention,
	saveSemester,
	savePaper,
	saveShareSettings,
	saveSupportSettings,
	saveStudyMaterial,
	saveNewUserDefaultStatus,
	updateUser,
	updateUserRole,
	updateUserStatus,
	resetUserPassword,
	uploadSettingQrImage
} from "./admin.controller.js";

export const adminRouter = Router();
const settingUploadDir = path.join(env.projectRoot, "uploads", "settings");
fs.mkdirSync(settingUploadDir, { recursive: true });
const settingImageUpload = multer({
	storage: multer.diskStorage({
		destination: (_request, _file, callback) => callback(null, settingUploadDir),
		filename: (_request, file, callback) => {
			const extension = path.extname(file.originalname).toLowerCase() || ".png";
			callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
		}
	}),
	limits: { fileSize: 2 * 1024 * 1024 },
	fileFilter: (_request, file, callback) => {
		const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
		callback(null, allowed.has(file.mimetype));
	}
});

adminRouter.use(
	[
		"/study-materials",
		"/study-materials/:id",
		"/papers",
		"/papers/:id",
		"/subjects",
		"/subjects/:id",
		"/semesters",
		"/semesters/:id",
		"/assignments",
		"/assignments/:id",
		"/reports",
		"/reports/:id",
		"/audit-logs"
	],
	...requireRoles(UserRole.ADMIN, UserRole.EDITOR)
);
adminRouter.get("/study-materials", listStudyMaterials);
adminRouter.post("/study-materials", saveStudyMaterial);
adminRouter.put("/study-materials/:id", saveStudyMaterial);
adminRouter.delete("/study-materials/:id", deleteStudyMaterial);
adminRouter.get("/papers", listPapers);
adminRouter.post("/papers", savePaper);
adminRouter.put("/papers/:id", savePaper);
adminRouter.delete("/papers/:id", deletePaper);
adminRouter.get("/subjects", getSubjects);
adminRouter.post("/subjects", saveSubject);
adminRouter.put("/subjects/:id", saveSubject);
adminRouter.delete("/subjects/:id", deleteSubject);
adminRouter.get("/semesters", listSemesters);
adminRouter.post("/semesters", saveSemester);
adminRouter.put("/semesters/:id", saveSemester);
adminRouter.delete("/semesters/:id", deleteSemester);
adminRouter.get("/assignments", listAssignments);
adminRouter.post("/assignments", saveAssignment);
adminRouter.put("/assignments/:id", saveAssignment);
adminRouter.delete("/assignments/:id", deleteAssignment);
adminRouter.get("/reports", listReports);
adminRouter.patch("/reports/:id", reviewReport);
adminRouter.get("/audit-logs", listAuditLogs);

adminRouter.use(...requireRoles(UserRole.ADMIN));
adminRouter.get("/overview", getOverview);
adminRouter.get("/users", getUsers);
adminRouter.patch("/users/:id/role", updateUserRole);
adminRouter.patch("/users/:id/status", updateUserStatus);
adminRouter.put("/users/:id", updateUser);
adminRouter.post("/users/:id/reset-password", resetUserPassword);
adminRouter.delete("/users/:id", deleteUser);
adminRouter.get("/settings/new-user-default-status", getNewUserDefaultStatus);
adminRouter.put("/settings/new-user-default-status", saveNewUserDefaultStatus);
adminRouter.get("/system", getSystemStatus);
adminRouter.get("/settings/analytics-retention", getAnalyticsRetention);
adminRouter.put("/settings/analytics-retention", saveAnalyticsRetention);
adminRouter.get("/settings/share", getShareSettings);
adminRouter.put("/settings/share", saveShareSettings);
adminRouter.delete("/settings/share", deleteShareSettings);
adminRouter.get("/settings/support", getSupportSettings);
adminRouter.put("/settings/support", saveSupportSettings);
adminRouter.delete("/settings/support", deleteSupportSettings);
adminRouter.post("/settings/qr-image", settingImageUpload.single("image"), uploadSettingQrImage);
adminRouter.get("/database/backup", exportDatabaseBackup);
adminRouter.post("/database/restore", restoreDatabaseBackup);
