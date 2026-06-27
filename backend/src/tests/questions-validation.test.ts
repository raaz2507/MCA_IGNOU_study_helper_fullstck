import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../app.js";

test("questions API rejects unsafe query parameters", async () => {
	const app = createApp();

	const unsafeSubjects = ["../MCS_211", "MCA_new//MCS_211", "MCA_new\\MCS_211"];
	for (const subject of unsafeSubjects) {
		const response = await request(app).get("/api/questions/manifest").query({ subject });
		assert.equal(response.status, 400);
		assert.equal(response.body.code, "VALIDATION_ERROR");
	}

	const unsafeFiles = ["../MCS211-Q001.json", "nested/MCS211-Q001.json", "MCS211-Q001.exe"];
	for (const file of unsafeFiles) {
		const response = await request(app)
			.get("/api/questions/item")
			.query({ subject: "MCA_new/Semester_1/MCS_211", file });
		assert.equal(response.status, 400);
		assert.equal(response.body.code, "VALIDATION_ERROR");
	}
});
