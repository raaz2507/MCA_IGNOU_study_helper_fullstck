import { Router } from "express";
import multer from "multer";
import { UserRole } from "../../domain/auth/roles.js";
import { requireRoles } from "../auth/auth.middleware.js";
import {
	getAnalyticsRetention,
	getEmailVerificationSettings,
	getOverview,
	getSubjects,
	getSystemStatus,
	getDataSourceAudit,
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
	getLinkPreviewSettings,
	deleteAssignment,
	deleteSemester,
	deleteSubject,
	deleteUser,
	deleteShareSettings,
	deleteSupportSettings,
	deleteLinkPreviewSettings,
	exportDatabaseBackup,
	cleanPaperPreviewCache,
	generatePaperPreviewCache,
	getPaperPreviewCache,
	moveOldUploadImages,
	previewDatabaseBackupRestore,
	reviewReport,
	restoreDatabaseBackup,
	saveAssignment,
	saveAnalyticsRetention,
	saveEmailVerificationSettings,
	saveSemester,
	savePaper,
	saveShareSettings,
	saveSupportSettings,
	saveLinkPreviewSettings,
	saveStudyMaterial,
	saveNewUserDefaultStatus,
	updateUser,
	updateUserRole,
	updateUserStatus,
	resetUserPassword,
	refreshShareQrImage,
	refreshSupportQrImage,
	syncGitHubAcademicContent,
	uploadSettingQrImage
} from "./admin.controller.js";

export const adminRouter = Router();
const settingImageUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 4 * 1024 * 1024 },
	fileFilter: (_request, file, callback) => {
		const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
		callback(null, allowed.has(file.mimetype));
	}
});
const databaseRestoreUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 50 * 1024 * 1024 },
	fileFilter: (_request, file, callback) => {
		const name = file.originalname.toLowerCase();
		callback(null, name.endsWith(".json") || name.endsWith(".zip"));
	}
});

adminRouter.use(
	[
		"/study-materials",
		"/study-materials/:id",
		"/papers",
		"/papers/:id",
		"/paper-preview-cache",
		"/subjects",
		"/subjects/:id",
		"/semesters",
		"/semesters/:id",
		"/assignments",
		"/assignments/:id",
		"/reports",
		"/reports/:id",
		"/audit-logs",
		"/content-sync/github"
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
adminRouter.get("/paper-preview-cache", getPaperPreviewCache);
adminRouter.post("/paper-preview-cache/generate", generatePaperPreviewCache);
adminRouter.delete("/paper-preview-cache", cleanPaperPreviewCache);
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
adminRouter.post("/content-sync/github", syncGitHubAcademicContent);
adminRouter.get(
	"/settings/link-preview",
	...requireRoles(UserRole.ADMIN, UserRole.EDITOR),
	getLinkPreviewSettings
);
adminRouter.put(
	"/settings/link-preview",
	...requireRoles(UserRole.ADMIN, UserRole.EDITOR),
	saveLinkPreviewSettings
);
adminRouter.post(
	"/settings/qr-image",
	...requireRoles(UserRole.ADMIN, UserRole.EDITOR),
	settingImageUpload.single("image"),
	uploadSettingQrImage
);

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
adminRouter.get("/data-sources", getDataSourceAudit);
adminRouter.get("/settings/analytics-retention", getAnalyticsRetention);
adminRouter.put("/settings/analytics-retention", saveAnalyticsRetention);
adminRouter.get("/settings/email-verification", getEmailVerificationSettings);
adminRouter.put("/settings/email-verification", saveEmailVerificationSettings);
adminRouter.get("/settings/share", getShareSettings);
adminRouter.put("/settings/share", saveShareSettings);
adminRouter.post("/settings/share/qr-refresh", refreshShareQrImage);
adminRouter.delete("/settings/share", deleteShareSettings);
adminRouter.get("/settings/support", getSupportSettings);
adminRouter.put("/settings/support", saveSupportSettings);
adminRouter.post("/settings/support/qr-refresh", refreshSupportQrImage);
adminRouter.delete("/settings/support", deleteSupportSettings);
adminRouter.delete("/settings/link-preview", deleteLinkPreviewSettings);
adminRouter.post("/uploads/move-old-images", moveOldUploadImages);
adminRouter.get("/database/backup", exportDatabaseBackup);
adminRouter.post("/database/restore/preview", databaseRestoreUpload.single("backup"), previewDatabaseBackupRestore);
adminRouter.post("/database/restore", databaseRestoreUpload.single("backup"), restoreDatabaseBackup);
