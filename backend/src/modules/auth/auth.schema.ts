import { z } from "zod";

export const loginSchema = z.object({
	username: z.string().trim().min(1).max(80).transform((value) => value.toLowerCase()),
	password: z.string().min(1).max(200)
});

export const registerSchema = z.object({
	displayName: z.string().trim().min(2).max(100),
	username: z.string().trim().min(3).max(40).regex(/^[a-z0-9_-]+$/i).transform((value) => value.toLowerCase()),
	email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
	password: z.string().min(8).max(200)
});

export const updateProfileSchema = z.object({
	displayName: z.string().trim().min(2).max(100),
	email: z.string().trim().email().max(160).transform((value) => value.toLowerCase())
});

export const changePasswordSchema = z.object({
	currentPassword: z.string().min(1).max(200),
	newPassword: z.string().min(8).max(200)
}).refine((input) => input.currentPassword !== input.newPassword, {
	message: "New password must be different from the current password.",
	path: ["newPassword"]
});

export const verifyEmailSchema = z.object({
	token: z.string().trim().min(40).max(200)
});

export const resendVerificationSchema = z.object({
	email: z.string().trim().email().max(160).transform((value) => value.toLowerCase())
});

