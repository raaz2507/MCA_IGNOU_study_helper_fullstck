import { apiRequest } from "./client.js";

export const getAdminOverview = () => apiRequest("/admin/overview");
export const getAdminUsers = () => apiRequest("/admin/users");
export const getAdminSubjects = () => apiRequest("/admin/subjects");
export const saveAdminSubject = (subject, id = "") =>
	apiRequest(id ? `/admin/subjects/${encodeURIComponent(id)}` : "/admin/subjects", {
		method: id ? "PUT" : "POST",
		body: JSON.stringify(subject)
	});
export const deleteAdminSubject = (id) =>
	apiRequest(`/admin/subjects/${encodeURIComponent(id)}`, { method: "DELETE" });
export const getAdminSystemStatus = () => apiRequest("/admin/system");
export const getAnalyticsRetention = () =>
	apiRequest("/admin/settings/analytics-retention");
export const saveAnalyticsRetention = (setting) =>
	apiRequest("/admin/settings/analytics-retention", {
		method: "PUT",
		body: JSON.stringify(setting)
	});
export const getShareSettings = () =>
	apiRequest("/admin/settings/share");
export const getEmailVerificationSettings = () =>
	apiRequest("/admin/settings/email-verification");
export const saveEmailVerificationSettings = (setting) =>
	apiRequest("/admin/settings/email-verification", {
		method: "PUT",
		body: JSON.stringify(setting)
	});
export const saveShareSettings = (setting) =>
	apiRequest("/admin/settings/share", {
		method: "PUT",
		body: JSON.stringify(setting)
	});
export const refreshShareQrImage = () =>
	apiRequest("/admin/settings/share/qr-refresh", { method: "POST" });
export const uploadSettingQrImage = (file, category) => {
	const body = new FormData();
	body.append("image", file);
	body.append("category", category);
	return apiRequest("/admin/settings/qr-image", {
		method: "POST",
		body
	});
};
export const deleteShareSettings = () =>
	apiRequest("/admin/settings/share", { method: "DELETE" });
export const getSupportSettings = () =>
	apiRequest("/admin/settings/support");
export const saveSupportSettings = (setting) =>
	apiRequest("/admin/settings/support", {
		method: "PUT",
		body: JSON.stringify(setting)
	});
export const refreshSupportQrImage = () =>
	apiRequest("/admin/settings/support/qr-refresh", { method: "POST" });
export const deleteSupportSettings = () =>
	apiRequest("/admin/settings/support", { method: "DELETE" });
export const getLinkPreviewSettings = () =>
	apiRequest("/admin/settings/link-preview");
export const saveLinkPreviewSettings = (setting) =>
	apiRequest("/admin/settings/link-preview", {
		method: "PUT",
		body: JSON.stringify(setting)
	});
export const deleteLinkPreviewSettings = () =>
	apiRequest("/admin/settings/link-preview", { method: "DELETE" });
export const updateAdminUserRole = (id, role) =>
	apiRequest(`/admin/users/${encodeURIComponent(id)}/role`, {
		method: "PATCH",
		body: JSON.stringify({ role })
	});
export const updateAdminUserStatus = (id, status) =>
	apiRequest(`/admin/users/${encodeURIComponent(id)}/status`, {
		method: "PATCH",
		body: JSON.stringify({ status })
	});
export const updateAdminUser = (id, changes) =>
	apiRequest(`/admin/users/${encodeURIComponent(id)}`, {
		method: "PUT",
		body: JSON.stringify(changes)
	});
export const resetAdminUserPassword = (id) =>
	apiRequest(`/admin/users/${encodeURIComponent(id)}/reset-password`, { method: "POST" });
export const deleteAdminUser = (id) =>
	apiRequest(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
export const getNewUserDefaultStatus = () =>
	apiRequest("/admin/settings/new-user-default-status");
export const saveNewUserDefaultStatus = (status) =>
	apiRequest("/admin/settings/new-user-default-status", {
		method: "PUT",
		body: JSON.stringify({ status })
	});
export const getAdminSemesters = () => apiRequest("/admin/semesters");
export const saveAdminSemester = (semester, id = "") =>
	apiRequest(id ? `/admin/semesters/${encodeURIComponent(id)}` : "/admin/semesters", {
		method: id ? "PUT" : "POST",
		body: JSON.stringify(semester)
	});
export const deleteAdminSemester = (id) =>
	apiRequest(`/admin/semesters/${encodeURIComponent(id)}`, { method: "DELETE" });
export const getAdminAssignments = () => apiRequest("/admin/assignments");
export const saveAdminAssignment = (assignment, id = "") =>
	apiRequest(id ? `/admin/assignments/${encodeURIComponent(id)}` : "/admin/assignments", {
		method: id ? "PUT" : "POST",
		body: JSON.stringify(assignment)
	});
export const deleteAdminAssignment = (id) =>
	apiRequest(`/admin/assignments/${encodeURIComponent(id)}`, { method: "DELETE" });
export const getAdminStudyMaterials = () => apiRequest("/admin/study-materials");
export const saveAdminStudyMaterial = (material, id = "") =>
	apiRequest(id ? `/admin/study-materials/${encodeURIComponent(id)}` : "/admin/study-materials", {
		method: id ? "PUT" : "POST",
		body: JSON.stringify(material)
	});
export const deleteAdminStudyMaterial = (id) =>
	apiRequest(`/admin/study-materials/${encodeURIComponent(id)}`, { method: "DELETE" });
export const getAdminPapers = () => apiRequest("/admin/papers");
export const saveAdminPaper = (paper, id = "") =>
	apiRequest(id ? `/admin/papers/${encodeURIComponent(id)}` : "/admin/papers", {
		method: id ? "PUT" : "POST",
		body: JSON.stringify(paper)
	});
export const deleteAdminPaper = (id) =>
	apiRequest(`/admin/papers/${encodeURIComponent(id)}`, { method: "DELETE" });
export const getPaperPreviewCache = () => apiRequest("/admin/paper-preview-cache");
export const generatePaperPreviewCache = () =>
	apiRequest("/admin/paper-preview-cache/generate", { method: "POST" });
export const cleanPaperPreviewCache = () =>
	apiRequest("/admin/paper-preview-cache", { method: "DELETE" });
export const getAdminReports = () => apiRequest("/admin/reports");
export const reviewAdminReport = (id, review) =>
	apiRequest(`/admin/reports/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(review) });
export const getAdminAuditLogs = () => apiRequest("/admin/audit-logs");
export const syncGitHubAcademicContent = () =>
	apiRequest("/admin/content-sync/github", { method: "POST" });
export const moveOldUploadImages = () =>
	apiRequest("/admin/uploads/move-old-images", { method: "POST" });
export const previewDatabaseRestore = (backup) => {
	const body = new FormData();
	body.append("backup", backup);
	return apiRequest("/admin/database/restore/preview", {
		method: "POST",
		body
	});
};
export const restoreDatabaseBackup = (backup, resolution = null) => {
	if (backup instanceof File) {
		const body = new FormData();
		body.append("backup", backup);
		if (resolution) body.append("resolution", JSON.stringify(resolution));
		return apiRequest("/admin/database/restore", {
			method: "POST",
			body
		});
	}
	return apiRequest("/admin/database/restore", {
		method: "POST",
		body: JSON.stringify(backup)
	});
};
