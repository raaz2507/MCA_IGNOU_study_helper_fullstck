import type { RequestHandler } from "express";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../shared/middleware/async-handler.js";
import { authService } from "./auth.service.js";
import { changePasswordSchema, loginSchema, registerSchema, resendVerificationSchema, updateProfileSchema, verifyEmailSchema } from "./auth.schema.js";

const cookieOptions = {
	httpOnly: true,
	sameSite: "lax" as const,
	secure: env.nodeEnv === "production",
	path: "/"
};

export const login: RequestHandler = asyncHandler(async (request, response) => {
	const input = loginSchema.parse(request.body);
	const result = await authService.login(input.username, input.password);
	response.cookie("gyanpath_access", result.accessToken, {
		...cookieOptions,
		maxAge: 15 * 60 * 1000
	});
	response.cookie("gyanpath_refresh", result.refreshToken, {
		...cookieOptions,
		maxAge: 7 * 24 * 60 * 60 * 1000
	});
	response.json(result.user);
});

export const register: RequestHandler = asyncHandler(async (request, response) => {
	const input = registerSchema.parse(request.body);
	const result = await authService.register(input);
	response.status(201).json(result);
});

export const verifyEmail: RequestHandler = asyncHandler(async (request, response) => {
	const input = verifyEmailSchema.parse(request.body);
	response.json(await authService.verifyEmail(input.token));
});

export const resendVerification: RequestHandler = asyncHandler(async (request, response) => {
	const input = resendVerificationSchema.parse(request.body);
	response.json(await authService.resendVerification(input.email));
});

export const refresh: RequestHandler = asyncHandler(async (request, response) => {
	const result = await authService.refresh(String(request.cookies?.gyanpath_refresh || ""));
	response.cookie("gyanpath_access", result.accessToken, {
		...cookieOptions,
		maxAge: 15 * 60 * 1000
	});
	response.json(result.user);
});

export const me: RequestHandler = asyncHandler(async (request, response) => {
	response.json(await authService.currentUser(request.user!.id));
});

export const profile: RequestHandler = asyncHandler(async (request, response) => {
	response.json(await authService.profile(request.user!.id));
});

export const updateProfile: RequestHandler = asyncHandler(async (request, response) => {
	const input = updateProfileSchema.parse(request.body);
	response.json(await authService.updateProfile(request.user!.id, input));
});

export const changePassword: RequestHandler = asyncHandler(async (request, response) => {
	const input = changePasswordSchema.parse(request.body);
	await authService.changePassword(request.user!.id, input.currentPassword, input.newPassword);
	response.clearCookie("gyanpath_access", cookieOptions);
	response.clearCookie("gyanpath_refresh", cookieOptions);
	response.json({ success: true });
});

export const logout: RequestHandler = asyncHandler(async (request, response) => {
	await authService.logout(request.cookies?.gyanpath_refresh);
	response.clearCookie("gyanpath_access", cookieOptions);
	response.clearCookie("gyanpath_refresh", cookieOptions);
	response.json({ success: true });
});

