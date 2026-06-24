import { Router } from "express";
import { UserRole } from "@prisma/client";
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
	deleteAssignment,
	deleteSemester,
	deleteSubject,
	deleteShareSettings,
	reviewReport,
	saveAssignment,
	saveAnalyticsRetention,
	saveSemester,
	savePaper,
	saveShareSettings,
	saveStudyMaterial,
	saveNewUserDefaultStatus,
	updateUser,
	updateUserRole,
	updateUserStatus
} from "./admin.controller.js";

export const adminRouter = Router();

adminRouter.use(
	["/study-materials", "/study-materials/:id", "/papers", "/papers/:id"],
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
adminRouter.get("/subjects", ...requireRoles(UserRole.ADMIN, UserRole.EDITOR), getSubjects);

adminRouter.use(...requireRoles(UserRole.ADMIN));
adminRouter.get("/overview", getOverview);
adminRouter.get("/users", getUsers);
adminRouter.post("/subjects", saveSubject);
adminRouter.put("/subjects/:id", saveSubject);
adminRouter.delete("/subjects/:id", deleteSubject);
adminRouter.patch("/users/:id/role", updateUserRole);
adminRouter.patch("/users/:id/status", updateUserStatus);
adminRouter.put("/users/:id", updateUser);
adminRouter.get("/settings/new-user-default-status", getNewUserDefaultStatus);
adminRouter.put("/settings/new-user-default-status", saveNewUserDefaultStatus);
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
adminRouter.get("/system", getSystemStatus);
adminRouter.get("/settings/analytics-retention", getAnalyticsRetention);
adminRouter.put("/settings/analytics-retention", saveAnalyticsRetention);
adminRouter.get("/settings/share", getShareSettings);
adminRouter.put("/settings/share", saveShareSettings);
adminRouter.delete("/settings/share", deleteShareSettings);
