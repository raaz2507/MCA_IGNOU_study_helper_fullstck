import type { UserRole } from "@prisma/client";
import { AppError } from "../../shared/errors/app-error.js";
import { adminRepository } from "./admin.repository.js";

export const adminService = {
	overview: () => adminRepository.overview(),
	users: () => adminRepository.users(),
	subjects: () => adminRepository.subjects(),
	async analyticsRetention() {
		const saved = await adminRepository.analyticsRetention();
		if (
			saved
			&& typeof saved === "object"
			&& !Array.isArray(saved)
			&& "enabled" in saved
			&& "retentionDays" in saved
			&& "action" in saved
		) return saved;
		return {
			enabled: true,
			retentionDays: 90,
			action: "anonymize"
		};
	},
	async saveAnalyticsRetention(value: {
		enabled: boolean;
		retentionDays: 90 | 180;
		action: "delete" | "anonymize";
	}) {
		await adminRepository.saveAnalyticsRetention(value);
		return value;
	},
	async updateRole(currentAdminId: string, userId: string, role: UserRole) {
		const user = await adminRepository.findUser(userId);
		if (!user) throw new AppError(404, "User not found.", "USER_NOT_FOUND");

		if (currentAdminId === userId && role !== "ADMIN") {
			throw new AppError(400, "You cannot remove your own Admin role.", "SELF_ROLE_CHANGE");
		}

		if (user.role === "ADMIN" && role !== "ADMIN" && await adminRepository.adminCount() <= 1) {
			throw new AppError(400, "At least one Admin account is required.", "LAST_ADMIN");
		}

		return adminRepository.updateRole(userId, role);
	},
	async updateUser(
		currentAdminId: string,
		userId: string,
		data: { role: UserRole; status: "PENDING" | "ACTIVE" | "SUSPENDED" | "BANNED" }
	) {
		const user = await adminRepository.findUser(userId);
		if (!user) throw new AppError(404, "User not found.", "USER_NOT_FOUND");
		if (currentAdminId === userId && (data.role !== "ADMIN" || data.status !== "ACTIVE")) {
			throw new AppError(400, "You cannot restrict or demote your own Admin account.", "SELF_ACCOUNT_CHANGE");
		}
		if (user.role === "ADMIN" && data.role !== "ADMIN" && await adminRepository.adminCount() <= 1) {
			throw new AppError(400, "At least one Admin account is required.", "LAST_ADMIN");
		}
		return adminRepository.updateUser(userId, data);
	},
	async resetPassword(currentAdminId: string, userId: string, passwordHash: string) {
		const user = await adminRepository.findUser(userId);
		if (!user) throw new AppError(404, "User not found.", "USER_NOT_FOUND");
		if (currentAdminId === userId) {
			throw new AppError(400, "Use profile settings to change your own password.", "SELF_PASSWORD_RESET");
		}
		return adminRepository.updatePassword(userId, passwordHash);
	},
	async deleteUser(currentAdminId: string, userId: string) {
		const user = await adminRepository.findUser(userId);
		if (!user) throw new AppError(404, "User not found.", "USER_NOT_FOUND");
		if (currentAdminId === userId) {
			throw new AppError(400, "You cannot delete your own Admin account.", "SELF_DELETE");
		}
		if (user.role === "ADMIN" && await adminRepository.adminCount() <= 1) {
			throw new AppError(400, "At least one Admin account is required.", "LAST_ADMIN");
		}
		return adminRepository.deleteUser(userId);
	}
};
