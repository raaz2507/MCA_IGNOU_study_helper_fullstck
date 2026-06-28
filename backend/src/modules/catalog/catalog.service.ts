import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { env } from "../../config/env.js";

const contentRoot = path.join(env.frontendRoot, "assets", "resources", "MCA_new");
const pdfContentRoot = path.join(env.localResourcesRoot, "MCA_new");
const pdfManifestPath = path.join(env.frontendRoot, "pdf-resources.manifest.json");
const fallbackPreview = "/assets/images/pdf-preview-fallback.svg";
const config = JSON.parse(readFileSync(path.join(env.frontendRoot, "resource-paths.json"), "utf8"));
const pdfManifest = existsSync(pdfManifestPath)
	? JSON.parse(readFileSync(pdfManifestPath, "utf8"))
	: { examPapers: [], studyMaterial: [], resourceCollections: {} };

function directories(folder: string) {
	if (!existsSync(folder)) return [];
	return readdirSync(folder, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(folder, entry.name));
}

function files(folder: string, extension: string, recursive = false): string[] {
	if (!existsSync(folder)) return [];
	const result: string[] = [];
	for (const entry of readdirSync(folder, { withFileTypes: true })) {
		const item = path.join(folder, entry.name);
		if (entry.isDirectory() && recursive) result.push(...files(item, extension, true));
		else if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) result.push(item);
	}
	return result;
}

function codeFromFolder(folder: string) {
	return path.basename(folder).replaceAll("_", "-").toUpperCase();
}

function publicResource(file: string) {
	const relative = path.relative(path.join(env.frontendRoot, "assets"), file).split(path.sep).join("/");
	return `/assets/${relative}`;
}

function publicPdfResource(file: string) {
	const relative = path.relative(pdfContentRoot, file).split(path.sep).join("/");
	return `${env.pdfResourceBaseUrl}/${relative}`;
}

function publicManifestPdfResource(relative: string) {
	return `${env.pdfResourceBaseUrl}/${relative.split("\\").join("/")}`;
}

function titleFromFile(file: string) {
	return path.parse(file).name
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function formatUpdated(date: Date) {
	return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function pdfFolderResources(folderName: string) {
	const folder = path.join(pdfContentRoot, folderName);
	const localResources = files(folder, ".pdf", true)
		.map((file) => {
			const stat = statSync(file);
			const relativeFolder = path.relative(folder, path.dirname(file)).split(path.sep).filter(Boolean).join(" / ");
			return {
				title: titleFromFile(file),
				group: relativeFolder || "",
				path: publicPdfResource(file),
				fileName: path.basename(file),
				size: stat.size,
				updated: formatUpdated(stat.mtime)
			};
		})
		.sort((a, b) => a.title.localeCompare(b.title));
	if (localResources.length) return localResources;
	return (pdfManifest.resourceCollections?.[folderName] || [])
		.map((item: any) => ({
			title: item.title || titleFromFile(item.path || item.fileName || ""),
			group: item.group || "",
			path: publicManifestPdfResource(item.path),
			fileName: item.fileName || path.basename(item.path || ""),
			size: item.size || 0,
			updated: item.updated || ""
		}))
		.sort((a: any, b: any) => a.title.localeCompare(b.title));
}

function shortMonth(month: string) {
	return month.toLowerCase().startsWith("dec") ? "Dec" : "June";
}

function sessionFromName(name: string) {
	const monthYear = name.match(/\b(June|December|Dec)\s+(\d{4})\b/i);
	if (monthYear) return `${monthYear[2]} ${shortMonth(monthYear[1])}`;
	const yearMonth = name.match(/\b(\d{4})\s+(June|December|Dec)\b/i);
	if (yearMonth) return `${yearMonth[1]} ${shortMonth(yearMonth[2])}`;
	const set = name.match(/\bSet[-\s]*(\d+)\b/i);
	return set ? `Set ${set[1]}` : "Question Paper";
}

function slug(value: string) {
	return value.toLowerCase().replace(/-hi$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55);
}

function previewFor(file: string) {
	const readable = slug(path.parse(file).name);
	const source = path.relative(env.projectRoot, path.resolve(file)).split(path.sep).join("/");
	const digest = createHash("sha1").update(source).digest("hex").slice(0, 8);
	const fileName = `${readable}-${digest}.webp`;
	const cachedPreview = path.join(env.frontendRoot, "assets", "images", "pdf-gallery-cache", fileName);
	return existsSync(cachedPreview)
		? `/assets/images/pdf-gallery-cache/${fileName}`
		: fallbackPreview;
}

function htmlViewer(examFolder: string) {
	const viewer = files(examFolder, ".html").find((file) => path.basename(file).toLowerCase() !== "index.html");
	return viewer ? publicResource(viewer) : "";
}

function studyGroups(studyFolder: string) {
	const groups = new Map<string, any[]>();
	for (const file of files(studyFolder, ".pdf", true)) {
		const parent = path.relative(studyFolder, path.dirname(file)).split(path.sep).join("/");
		const title = parent || "Study Material";
		const list = groups.get(title) || [];
		list.push({ title: path.parse(file).name, path: publicPdfResource(file) });
		groups.set(title, list);
	}
	return [...groups].map(([title, groupFiles]) => ({ title, files: groupFiles }));
}

function manifestStudyGroups(relativeSubject: string) {
	const groups = new Map<string, any[]>();
	for (const item of pdfManifest.studyMaterial.filter((file: any) => file.subjectPath === relativeSubject)) {
		const title = item.group || "Study Material";
		const list = groups.get(title) || [];
		list.push({ title: item.title, path: publicManifestPdfResource(item.path) });
		groups.set(title, list);
	}
	return [...groups].map(([title, groupFiles]) => ({ title, files: groupFiles }));
}

function subjectRecord(subjectFolder: string, semester: number) {
	const code = codeFromFolder(subjectFolder);
	const examFolder = path.join(subjectFolder, config.examFolder || "exam_papers");
	const pdfRelativeSubject = path.relative(contentRoot, subjectFolder);
	const pdfSubjectFolder = path.join(pdfContentRoot, pdfRelativeSubject);
	const pdfExamFolder = path.join(pdfSubjectFolder, config.examFolder || "exam_papers");
	const studyFolder = path.join(pdfSubjectFolder, config.studyFolder || "study_material");
	const relativeSubject = path.relative(path.join(env.frontendRoot, "assets", "resources"), subjectFolder).split(path.sep).join("/");
	const hasQuestions = existsSync(path.join(subjectFolder, "data", "manifest.json"));
	const localExamFiles = files(pdfExamFolder, ".pdf").filter((file) => !path.parse(file).name.toLowerCase().endsWith("-hi"));
	const manifestExamFiles = pdfManifest.examPapers.filter((file: any) => file.subject === code && !file.language);
	const examPaperCount = localExamFiles.length || manifestExamFiles.length;
	const localStudyGroups = studyGroups(studyFolder);
	const materialGroups = localStudyGroups.length ? localStudyGroups : manifestStudyGroups(pdfRelativeSubject.split(path.sep).join("/"));

	return {
		code,
		name: config.subjectNames?.[code] || code,
		type: code.startsWith("MCSL") ? "practical" : "theory",
		semester,
		folderPath: relativeSubject,
		questionPaperCount: examPaperCount,
		galleryPage: examPaperCount ? `/paper-gallery?subject=${encodeURIComponent(code)}` : "",
		htmlViewer: htmlViewer(examFolder),
		questionBank: hasQuestions ? `/question-bank?subject=${encodeURIComponent(relativeSubject)}` : "",
		studyGroups: materialGroups
	};
}

export function catalog() {
	const semesters = directories(contentRoot)
		.filter((folder) => /^Semester_\d+$/i.test(path.basename(folder)))
		.map((semesterFolder) => {
			const number = Number(path.basename(semesterFolder).match(/\d+/)?.[0] || 0);
			const subjects = directories(semesterFolder)
				.map((subjectFolder) => subjectRecord(subjectFolder, number))
				.filter((subject) => subject.questionPaperCount || subject.studyGroups.length);
			return { number, folder: path.basename(semesterFolder), subjects };
		})
		.sort((a, b) => a.number - b.number);
	return { contentRoot: "MCA_new", semesters };
}

export function papers() {
	const result: any[] = [];
	for (const semesterFolder of directories(pdfContentRoot)) {
		for (const subjectFolder of directories(semesterFolder)) {
			const subject = codeFromFolder(subjectFolder);
			const examFolder = path.join(subjectFolder, config.examFolder || "exam_papers");
			const allPdfs = files(examFolder, ".pdf");
			const lookup = new Map(allPdfs.map((file) => [path.basename(file).toLowerCase(), file]));

			for (const english of allPdfs.filter((file) => !path.parse(file).name.toLowerCase().endsWith("-hi"))) {
				const parsed = path.parse(english);
				const hindi = lookup.get(`${parsed.name}-hi${parsed.ext}`.toLowerCase());
				const stat = statSync(english);
				result.push({
					title: parsed.name.replace(/\bquestion\s+paper\b/i, "").replace(/\s+/g, " ").trim(),
					subject,
					session: sessionFromName(parsed.name),
					english: publicPdfResource(english),
					hindi: hindi ? publicPdfResource(hindi) : "",
					preview: previewFor(english),
					fileName: path.basename(english),
					pages: null,
					size: stat.size,
					updated: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(stat.mtime)
				});
			}
		}
	}
	if (!result.length) {
		for (const item of pdfManifest.examPapers.filter((file: any) => !file.language)) {
			const hindi = pdfManifest.examPapers.find((file: any) => file.language === "hi" && file.basePath === item.basePath);
			result.push({
				title: item.title,
				subject: item.subject,
				session: item.session,
				english: publicManifestPdfResource(item.path),
				hindi: hindi ? publicManifestPdfResource(hindi.path) : "",
				preview: fallbackPreview,
				fileName: item.fileName,
				pages: null,
				size: item.size || 0,
				updated: item.updated || ""
			});
		}
	}
	return result.sort((a, b) => b.session.localeCompare(a.session));
}

export function resourceCollections() {
	return {
		programGuide: pdfFolderResources("program_guide"),
		assignments: pdfFolderResources("assignments")
	};
}
