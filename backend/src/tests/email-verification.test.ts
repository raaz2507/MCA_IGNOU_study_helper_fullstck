import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../config/prisma.js";
import { hashToken } from "../modules/auth/auth.repository.js";

test("email verification blocks login until a valid token is consumed", async () => {
	const username = `verify-test-${Date.now()}`;
	const email = `${username}@example.com`;
	const token = "v".repeat(64);
	const previousSetting = await prisma.appSetting.findUnique({ where: { key: "email-verification" } });
	const user = await prisma.user.create({
		data: {
			username,
			email,
			displayName: "Verification Test",
			passwordHash: await bcrypt.hash("verification-test-password", 4),
			status: "ACTIVE",
			emailVerificationRequired: true,
			emailVerificationTokenHash: hashToken(token),
			emailVerificationExpiresAt: new Date(Date.now() + 60_000)
		}
	});
	await prisma.appSetting.upsert({
		where: { key: "email-verification" },
		update: { value: { enabled: true } },
		create: { key: "email-verification", value: { enabled: true } }
	});

	try {
		const app = createApp();
		const blocked = await request(app).post("/api/auth/login").send({
			username,
			password: "verification-test-password"
		});
		assert.equal(blocked.status, 403);
		assert.equal(blocked.body.code, "EMAIL_NOT_VERIFIED");

		const verified = await request(app).post("/api/auth/verify-email").send({ token });
		assert.equal(verified.status, 200);
		assert.equal(verified.body.success, true);

		const login = await request(app).post("/api/auth/login").send({
			username,
			password: "verification-test-password"
		});
		assert.equal(login.status, 200);
	} finally {
		await prisma.user.deleteMany({ where: { id: user.id } });
		if (previousSetting) {
			await prisma.appSetting.update({
				where: { key: "email-verification" },
				data: { value: previousSetting.value as Prisma.InputJsonValue }
			});
		} else {
			await prisma.appSetting.deleteMany({ where: { key: "email-verification" } });
		}
	}
});
