import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../app.js";

test("health API returns Express status", async () => {
	const response = await request(createApp()).get("/api/health");
	assert.equal(response.status, 200);
	assert.equal(response.body.status, "ok");
	assert.equal(response.body.architecture, "express-modular-monolith");
});

test("frontend home page is served at the clean root route", async () => {
	const response = await request(createApp()).get("/");
	assert.equal(response.status, 200);
	assert.match(response.text, /<title>GyanPath \| Learn, Revise, Succeed<\/title>/);
	assert.match(response.text, /href="\/resources">Browse Study Resources<\/a>/);
	assert.match(response.text, /<header class="site-header">/);
	assert.match(response.text, /<footer class="site-footer">/);
	assert.doesNotMatch(response.text, /<%=/);
});

test("resources page is server-rendered from Eta", async () => {
	const response = await request(createApp()).get("/resources");
	assert.equal(response.status, 200);
	assert.match(response.text, /<title>Study Resources \| GyanPath<\/title>/);
	assert.match(response.text, /id="semesterContainer" data-ssr-subjects/);
	assert.match(response.text, /data-ssr-subject/);
	assert.match(response.text, /aria-current="page">Resources<\/a>/);
	assert.doesNotMatch(response.text, /<%=/);
});

test("about page uses the shared Eta shell", async () => {
	const response = await request(createApp()).get("/about");
	assert.equal(response.status, 200);
	assert.match(response.text, /<title>About \| GyanPath<\/title>/);
	assert.match(response.text, /id="contributorsGrid" class="contributors-grid" data-ssr-contributors/);
	assert.match(response.text, /id="feedbackForm"/);
	assert.match(response.text, /aria-current="page">About<\/a>/);
	assert.doesNotMatch(response.text, /<%=/);
});

test("paper gallery and question bank render through Eta", async () => {
	const [gallery, questionBank] = await Promise.all([
		request(createApp()).get("/paper-gallery?subject=MCS-211"),
		request(createApp()).get("/question-bank?subject=MCA_new%2FSemester_1%2FMCS_211")
	]);
	assert.equal(gallery.status, 200);
	assert.match(gallery.text, /<title>IGNOU MCA Previous Year Question Papers \| GyanPath<\/title>/);
	assert.match(gallery.text, /id="pdfGrid"/);
	assert.match(gallery.text, /\/assets\/js\/pages\/paper-gallery\.js/);
	assert.doesNotMatch(gallery.text, /<%=/);
	assert.equal(questionBank.status, 200);
	assert.match(questionBank.text, /<title>IGNOU MCA Question Bank \| GyanPath<\/title>/);
	assert.match(questionBank.text, /id="questionList"/);
	assert.match(questionBank.text, /marked\.min\.js/);
	assert.doesNotMatch(questionBank.text, /<%=/);
});

test("dashboard Eta page preserves Admin and Editor protection", async () => {
	const response = await request(createApp()).get("/dashboard");
	assert.equal(response.status, 200);
	assert.match(response.text, /<meta name="robots" content="noindex, nofollow"/);
	assert.match(response.text, /<body class="auth-pending"[^>]*data-allowed-roles="admin,editor"/);
	assert.match(response.text, /Resource Management/);
	assert.match(response.text, /\/assets\/js\/utils\/protected-page\.js/);
	assert.doesNotMatch(response.text, /<%=/);
});

test("Admin and Editor management pages preserve their Eta role boundaries", async () => {
	const adminPages = ["/admin", "/admin/users", "/admin/database"];
	const editorPages = [
		"/dashboard/study-materials",
		"/dashboard/question-papers",
		"/dashboard/academic-operations"
	];
	for (const page of adminPages) {
		const response = await request(createApp()).get(page);
		assert.equal(response.status, 200);
		assert.match(response.text, /data-allowed-roles="admin"/);
		assert.match(response.text, /\/assets\/js\/utils\/protected-page\.js/);
		assert.doesNotMatch(response.text, /<%=/);
	}
	for (const page of editorPages) {
		const response = await request(createApp()).get(page);
		assert.equal(response.status, 200);
		assert.match(response.text, /data-allowed-roles="admin,editor"/);
		assert.match(response.text, /\/assets\/js\/utils\/protected-page\.js/);
		assert.doesNotMatch(response.text, /<%=/);
	}
});

test("login and access-denied pages render from Eta without indexing", async () => {
	const [login, denied] = await Promise.all([
		request(createApp()).get("/login"),
		request(createApp()).get("/access-denied")
	]);
	assert.equal(login.status, 200);
	assert.match(login.text, /<meta name="robots" content="noindex, nofollow"/);
	assert.match(login.text, /id="loginForm"/);
	assert.equal(denied.status, 200);
	assert.match(denied.text, /<h1>Access Denied<\/h1>/);
	assert.match(denied.text, /<meta name="robots" content="noindex, nofollow"/);
});

test("legacy HTML page URLs redirect to clean routes", async () => {
	const response = await request(createApp()).get("/admin.html?tab=users");
	assert.equal(response.status, 301);
	assert.equal(response.headers.location, "/admin?tab=users");
});

test("remaining public, protected and reader pages render through Eta", async () => {
	const routes = ["/user-guide", "/video-lectures", "/chat", "/discussion", "/profile", "/pdf-viewer"];
	for (const route of routes) {
		const response = await request(createApp()).get(route);
		assert.equal(response.status, 200);
		assert.doesNotMatch(response.text, /<%=/);
	}
	const profile = await request(createApp()).get("/profile");
	assert.match(profile.text, /data-allowed-roles="user,editor,moderator,admin"/);
	assert.match(profile.text, /noindex, nofollow/);
	const viewer = await request(createApp()).get("/pdf-viewer");
	assert.match(viewer.text, /id="pdfFrame"/);
	assert.doesNotMatch(viewer.text, /class="site-header"/);
});
