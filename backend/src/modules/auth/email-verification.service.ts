import { randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { hashToken } from "./auth.repository.js";

const SETTINGS_KEY = "email-verification";
const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

export async function emailVerificationEnabled() {
	const setting = await prisma.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
	const value = setting?.value as { enabled?: boolean } | null;
	return value?.enabled === true;
}

async function sendWithResend(input: { to: string; displayName: string; token: string }) {
	if (!env.resendApiKey || !env.resendFromEmail) {
		throw new AppError(503, "Resend email delivery is not configured.", "EMAIL_PROVIDER_NOT_CONFIGURED");
	}

	const verificationUrl = `${env.siteUrl}/?verifyEmailToken=${encodeURIComponent(input.token)}`;
	const safeName = escapeHtml(input.displayName);
	const safeUrl = escapeHtml(verificationUrl);
	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.resendApiKey}`,
			"Content-Type": "application/json",
			"User-Agent": "GyanPath/1.0"
		},
		body: JSON.stringify({
			from: env.resendFromEmail,
			to: [input.to],
			subject: "Verify your GyanPath email",
			html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h2>Verify your email</h2><p>Hello ${safeName},</p><p>Confirm this email address to finish securing your GyanPath account.</p><p><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#3157d5;color:#fff;text-decoration:none;border-radius:8px">Verify email</a></p><p>This link expires in 24 hours.</p></div>`,
			text: `Hello ${input.displayName},\n\nVerify your GyanPath email: ${verificationUrl}\n\nThis link expires in 24 hours.`,
			tags: [{ name: "category", value: "email_verification" }]
		})
	});

	if (!response.ok) {
		const payload = await response.text();
		console.error(`Resend email request failed (${response.status}): ${payload}`);
		throw new AppError(502, "Verification email could not be sent. Please try again.", "EMAIL_DELIVERY_FAILED");
	}
}

export const emailVerificationService = {
	isEnabled: emailVerificationEnabled,
	isConfigured: () => Boolean(env.resendApiKey && env.resendFromEmail),
	async issue(user: { id: string; email: string | null; displayName: string }) {
		if (!user.email) throw new AppError(400, "A valid email address is required.", "EMAIL_REQUIRED");
		const token = randomBytes(32).toString("hex");
		await prisma.user.update({
			where: { id: user.id },
			data: {
				emailVerificationRequired: true,
				emailVerificationTokenHash: hashToken(token),
				emailVerificationExpiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS)
			}
		});
		await sendWithResend({ to: user.email, displayName: user.displayName, token });
	},
	async verify(token: string) {
		const user = await prisma.user.findUnique({
			where: { emailVerificationTokenHash: hashToken(token) }
		});
		if (!user || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
			throw new AppError(400, "This verification link is invalid or has expired.", "INVALID_VERIFICATION_TOKEN");
		}
		await prisma.user.update({
			where: { id: user.id },
			data: {
				emailVerifiedAt: new Date(),
				emailVerificationRequired: false,
				emailVerificationTokenHash: null,
				emailVerificationExpiresAt: null
			}
		});
		return { success: true };
	},
	async resend(email: string) {
		if (!await emailVerificationEnabled()) return { accepted: true };
		const user = await prisma.user.findUnique({ where: { email } });
		if (user?.emailVerificationRequired && !user.emailVerifiedAt) {
			await this.issue(user);
		}
		return { accepted: true };
	}
};
