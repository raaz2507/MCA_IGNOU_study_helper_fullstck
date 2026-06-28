import { PrismaClient, QuestionStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { catalog, papers } from "../src/modules/catalog/catalog.service.js";
import { env } from "../src/config/env.js";

const prisma = new PrismaClient();

function questionFile(subjectFolder: string, fileName: string) {
	return path.join(
		env.frontendRoot,
		"assets",
		"resources",
		subjectFolder,
		"data",
		fileName
	);
}

async function seedUsers() {
	const users = [
		["admin", "admin123", "Administrator", UserRole.ADMIN],
		["editor", "editor123", "Content Editor", UserRole.EDITOR],
		["user", "user123", "Student User", UserRole.USER]
	] as const;

	for (const [username, password, displayName, role] of users) {
		await prisma.user.upsert({
			where: { username },
			update: { displayName, role, status: "ACTIVE" },
			create: {
				username,
				displayName,
				role,
				status: "ACTIVE",
				passwordHash: await bcrypt.hash(password, 12)
			}
		});
	}
}

async function seedCatalog() {
	const catalogData = catalog();
	const paperData = papers();

	for (const semester of catalogData.semesters) {
		for (const subject of semester.subjects) {
			const normalizedFolder = subject.folderPath;

			const savedSubject = await prisma.subject.upsert({
				where: { code: subject.code },
				update: {
					title: subject.name,
					semester: semester.number,
					type: subject.type,
					folderPath: normalizedFolder,
					htmlViewerPath: subject.htmlViewer || null,
					questionBank: Boolean(subject.questionBank)
				},
				create: {
					code: subject.code,
					title: subject.name,
					semester: semester.number,
					type: subject.type,
					folderPath: normalizedFolder,
					htmlViewerPath: subject.htmlViewer || null,
					questionBank: Boolean(subject.questionBank)
				}
			});

			await prisma.studyMaterial.deleteMany({ where: { subjectId: savedSubject.id } });
			const studyRows = subject.studyGroups.flatMap((group: any) =>
				group.files.map((file: any) => ({
					subjectId: savedSubject.id,
					groupName: group.title,
					title: file.title,
					filePath: file.path
				}))
			);
			if (studyRows.length) await prisma.studyMaterial.createMany({ data: studyRows });

			await prisma.paper.deleteMany({ where: { subjectId: savedSubject.id } });
			const paperRows = paperData
				.filter((paper: any) => paper.subject === subject.code)
				.map((paper: any) => ({
					subjectId: savedSubject.id,
					title: paper.title,
					session: paper.session,
					fileName: paper.fileName,
					englishPath: paper.english,
					hindiPath: paper.hindi || null,
					previewPath: paper.preview || null,
					pageCount: paper.pages || null,
					fileSize: paper.size || null,
					updatedAt: new Date()
				}));
			if (paperRows.length) await prisma.paper.createMany({ data: paperRows });

			if (subject.questionBank) await seedQuestions(savedSubject.id, normalizedFolder);
		}
	}
}

async function seedQuestions(subjectId: string, subjectFolder: string) {
	const manifestPath = questionFile(subjectFolder, "manifest.json");
	if (!existsSync(manifestPath)) return;
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

	for (const meta of manifest.questions || []) {
		const contentPath = questionFile(subjectFolder, meta.file);
		const hasContent = existsSync(contentPath);
		const content = hasContent ? JSON.parse(readFileSync(contentPath, "utf8")) : null;

		await prisma.question.upsert({
			where: { id: meta.id },
			update: {
				subjectId,
				sourceFile: meta.file,
				title: meta.title || meta.id,
				questionMd: content?.question?.markdown || null,
				category: meta.classification?.chapterTitle || null,
				difficulty: meta.difficulty || null,
				marks: meta.marks ?? null,
				tags: meta.tags || [],
				appearedIn: meta.appearedIn || [],
				relatedData: {
					classification: meta.classification || null,
					groupId: meta.groupId || null
				},
				media: content?.media || [],
				contentStatus: hasContent ? QuestionStatus.PUBLISHED : QuestionStatus.PENDING
			},
			create: {
				id: meta.id,
				subjectId,
				sourceFile: meta.file,
				title: meta.title || meta.id,
				questionMd: content?.question?.markdown || null,
				category: meta.classification?.chapterTitle || null,
				difficulty: meta.difficulty || null,
				marks: meta.marks ?? null,
				tags: meta.tags || [],
				appearedIn: meta.appearedIn || [],
				relatedData: {
					classification: meta.classification || null,
					groupId: meta.groupId || null
				},
				media: content?.media || [],
				contentStatus: hasContent ? QuestionStatus.PUBLISHED : QuestionStatus.PENDING
			}
		});

		if (content?.answers) {
			for (const [language, modes] of Object.entries(content.answers)) {
				for (const [mode, answer] of Object.entries(modes as Record<string, string>)) {
					await prisma.answer.upsert({
						where: {
							questionId_language_mode: {
								questionId: meta.id,
								language,
								mode
							}
						},
						update: { content: String(answer) },
						create: {
							questionId: meta.id,
							language,
							mode,
							content: String(answer)
						}
					});
				}
			}
		}
	}
}

async function seedContent() {
	const defaultBanners = [
		{
			title: "Prepare Smarter for Your MCA Exams",
			description: "Open previous-year papers, important questions and study material from one place.",
			category: "Exam",
			image: "../assets/images/banner-exam.svg",
			buttonText: "Explore Resources",
			buttonUrl: "#semesterContainer",
			priority: 1
		},
		{
			title: "Date Sheet & Exam Updates",
			description: "Publish important exam schedules and deadline announcements here.",
			category: "Date Sheet",
			image: "../assets/images/banner-datesheet.svg",
			buttonText: "View Notice",
			buttonUrl: "#semesterContainer",
			priority: 2
		},
		{
			title: "Exam Permission & Hall Ticket",
			description: "Check examination permission, hall-ticket and important eligibility notices.",
			category: "Permission",
			image: "../assets/images/banner-permission.svg",
			buttonText: "Check Updates",
			buttonUrl: "#semesterContainer",
			priority: 3
		}
	];

	for (const item of defaultBanners) {
		const existing = await prisma.banner.findFirst({ where: { title: item.title } });
		if (!existing) await prisma.banner.create({ data: item });
	}

	await prisma.contributor.upsert({
		where: { id: "rajaanha" },
		update: {},
		create: {
			id: "rajaanha",
			name: "Rajaanha",
			info: "Developer and maintainer of the MCA Study Helper.",
			avatar: "/assets/images/contributors/rajaanha-guinea-pig.webp",
			contributions: [
				"Designed and developed the study helper",
				"Organized semester-wise study resources"
			]
		}
	});
}

async function main() {
	await seedUsers();
	await seedCatalog();
	await seedContent();
}

main()
	.then(() => console.log("Database seed completed."))
	.finally(() => prisma.$disconnect());

