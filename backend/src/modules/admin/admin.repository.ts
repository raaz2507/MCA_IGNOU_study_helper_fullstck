import type { UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

export const adminRepository = {
	async overview() {
		const [
			users,
			subjects,
			papers,
			studyMaterials,
			questions,
			discussions,
			comments,
			banners,
			lectures
		] = await prisma.$transaction([
			prisma.user.count(),
			prisma.subject.count(),
			prisma.paper.count(),
			prisma.studyMaterial.count(),
			prisma.question.count(),
			prisma.discussion.count(),
			prisma.comment.count(),
			prisma.banner.count(),
			prisma.lecture.count()
		]);

		return {
			users,
			subjects,
			papers,
			studyMaterials,
			questions,
			discussions,
			comments,
			banners,
			lectures
		};
	},
	users() {
		return prisma.user.findMany({
			select: {
				id: true,
				username: true,
				email: true,
				displayName: true,
				role: true,
				status: true,
				createdAt: true,
				analyticsVisits: {
					take: 1,
					orderBy: { createdAt: "desc" },
					select: { createdAt: true, pagePath: true, deviceType: true, browser: true }
				},
				_count: {
					select: {
						progress: true,
						discussions: true,
						comments: true,
						assignments: true,
						reportsMade: true,
						reportsAbout: true
					}
				}
			},
			orderBy: [{ role: "desc" }, { createdAt: "asc" }]
		});
	},
	subjects() {
		return prisma.subject.findMany({
			select: {
				id: true,
				code: true,
				title: true,
				semester: true,
				type: true,
				folderPath: true,
				htmlViewerPath: true,
				questionBank: true
			},
			orderBy: [{ semester: "asc" }, { code: "asc" }]
		});
	},
	findUser(id: string) {
		return prisma.user.findUnique({ where: { id } });
	},
	updateRole(id: string, role: UserRole) {
		return prisma.user.update({
			where: { id },
			data: { role },
			select: {
				id: true,
				username: true,
				displayName: true,
				email: true,
				role: true,
				createdAt: true
			}
		});
	},
	updateUser(id: string, data: { role: UserRole; status: "PENDING" | "ACTIVE" | "SUSPENDED" | "BANNED" }) {
		return prisma.user.update({
			where: { id },
			data,
			select: {
				id: true,
				username: true,
				displayName: true,
				email: true,
				role: true,
				status: true,
				createdAt: true
			}
		});
	},
	updatePassword(id: string, passwordHash: string) {
		return prisma.user.update({
			where: { id },
			data: { passwordHash },
			select: { id: true, username: true, displayName: true }
		});
	},
	deleteUser(id: string) {
		return prisma.user.delete({
			where: { id },
			select: { id: true, username: true, displayName: true, role: true }
		});
	},
	adminCount() {
		return prisma.user.count({ where: { role: "ADMIN" } });
	},
	async analyticsRetention() {
		const setting = await prisma.appSetting.findUnique({
			where: { key: "analytics-retention" }
		});
		return setting?.value;
	},
	saveAnalyticsRetention(value: {
		enabled: boolean;
		retentionDays: 90 | 180;
		action: "delete" | "anonymize";
	}) {
		return prisma.appSetting.upsert({
			where: { key: "analytics-retention" },
			update: { value },
			create: { key: "analytics-retention", value }
		});
	}
};
