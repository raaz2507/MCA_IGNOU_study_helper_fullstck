import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";

type TreeItem = { path: string; type: string; size?: number };

function repositoryDetails() {
	const url = new URL(env.pdfResourceBaseUrl);
	if (url.hostname !== "raw.githubusercontent.com") {
		throw new Error("PDF_RESOURCE_BASE_URL must be a raw.githubusercontent.com repository URL.");
	}
	const [owner, repository, branch, ...rootParts] = url.pathname.split("/").filter(Boolean);
	if (!owner || !repository || !branch || !rootParts.length) throw new Error("PDF_RESOURCE_BASE_URL is incomplete.");
	return { owner, repository, branch, root: rootParts.join("/") };
}

function publicUrl(relativePath: string) {
	return `${env.pdfResourceBaseUrl}/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

function subjectCode(folder: string) {
	return folder.replaceAll("_", "-").toUpperCase();
}

function titleFromFile(file: string) {
	return path.posix.basename(file, path.posix.extname(file)).replace(/-hi$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function sessionFromFile(file: string) {
	const name = path.posix.basename(file);
	const match = name.match(/\b(June|December|Dec)[-_ ]*(20\d{2})\b/i) || name.match(/\b(20\d{2})[-_ ]*(June|December|Dec)\b/i);
	if (!match) return "Unspecified";
	return /^20/.test(match[1]) ? `${match[2]} ${match[1]}` : `${match[1]} ${match[2]}`;
}

function subjectTitle(code: string) {
	const names: Record<string, string> = {
		"MCS-211": "Design and Analysis of Algorithms", "MCS-212": "Discrete Mathematics", "MCS-213": "Software Engineering",
		"MCS-214": "Professional Skills and Ethics", "MCS-215": "Security and Cyber Laws", "MCSL-216": "DAA and Web Design Lab",
		"MCSL-217": "Software Engineering Lab", "MCS-218": "Data Communication and Computer Networks", "MCS-219": "Object Oriented Analysis and Design",
		"MCS-220": "Web Technologies", "MCS-221": "Data Warehousing and Data Mining", "MCSL-222": "OOAD and Web Technologies Lab",
		"MCSL-223": "Computer Networks and Data Mining Lab", "MCS-224": "Artificial Intelligence and Machine Learning",
		"MCS-225": "Accountancy and Financial Management", "MCS-226": "Data Science and Big Data", "MCS-227": "Cloud Computing and IoT",
		"MCSL-228": "Artificial Intelligence and Machine Learning Lab", "MCSL-229": "Cloud and Data Science Lab",
		"MCS-230": "Digital Image Processing and Computer Vision", "MCS-231": "Mobile Computing", "MCS-232": "Project Guidelines"
	};
	return names[code] || code;
}

export async function syncGitHubContent() {
	const repository = repositoryDetails();
	const apiUrl = `https://api.github.com/repos/${repository.owner}/${repository.repository}/git/trees/${encodeURIComponent(repository.branch)}?recursive=1`;
	const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "GyanPath-content-sync" };
	if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
	const response = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(30_000) });
	if (!response.ok) throw new Error(`GitHub content scan failed (${response.status}).`);
	const payload = await response.json() as { truncated?: boolean; tree?: TreeItem[] };
	if (payload.truncated) throw new Error("GitHub repository tree is truncated; use a narrower content repository.");
	const prefix = `${repository.root}/`;
	const files = (payload.tree || []).filter((item) => item.type === "blob" && item.path.startsWith(prefix) && /\.pdf$/i.test(item.path));
	const grouped = new Map<string, { semester: number; folder: string; exam: TreeItem[]; study: TreeItem[] }>();
	for (const file of files) {
		const relative = file.path.slice(prefix.length);
		const parts = relative.split("/");
		const semesterMatch = parts[0]?.match(/^Semester_(\d+)$/i);
		if (!semesterMatch || !parts[1] || !parts[2]) continue;
		const category = parts[2].toLowerCase();
		if (category !== "exam_papers" && category !== "study_material") continue;
		const key = `${semesterMatch[1]}:${parts[1]}`;
		const group = grouped.get(key) || { semester: Number(semesterMatch[1]), folder: parts[1], exam: [], study: [] };
		(category === "exam_papers" ? group.exam : group.study).push({ ...file, path: relative });
		grouped.set(key, group);
	}

	let subjects = 0, papers = 0, studyMaterials = 0;
	for (const group of grouped.values()) {
		const code = subjectCode(group.folder);
		const folderPath = `MCA_new/Semester_${group.semester}/${group.folder}`;
		const subject = await prisma.subject.upsert({
			where: { code },
			update: { semester: group.semester, folderPath },
			create: { code, title: subjectTitle(code), semester: group.semester, type: code.startsWith("MCSL") ? "practical" : "theory", folderPath, questionBank: false }
		});
		subjects++;
		const examLookup = new Map(group.exam.map((item) => [item.path.toLowerCase(), item]));
		for (const item of group.exam.filter((file) => !/-hi\.pdf$/i.test(file.path))) {
			const hindi = examLookup.get(item.path.replace(/\.pdf$/i, "-hi.pdf").toLowerCase());
			await prisma.paper.upsert({
				where: { subjectId_englishPath: { subjectId: subject.id, englishPath: publicUrl(item.path) } },
				update: { hindiPath: hindi ? publicUrl(hindi.path) : null, fileSize: item.size || null, updatedAt: new Date() },
				create: { subjectId: subject.id, title: titleFromFile(item.path), session: sessionFromFile(item.path), fileName: path.posix.basename(item.path), englishPath: publicUrl(item.path), hindiPath: hindi ? publicUrl(hindi.path) : null, fileSize: item.size || null, updatedAt: new Date() }
			});
			papers++;
		}
		const studyLookup = new Map(group.study.map((item) => [item.path.toLowerCase(), item]));
		for (const item of group.study.filter((file) => !/-hi\.pdf$/i.test(file.path))) {
			const hindi = studyLookup.get(item.path.replace(/\.pdf$/i, "-hi.pdf").toLowerCase());
			const relativeParts = item.path.split("/");
			const groupName = relativeParts.length > 4 ? relativeParts[3].replace(/[_-]+/g, " ") : "Study Material";
			await prisma.studyMaterial.upsert({
				where: { filePath: publicUrl(item.path) },
				update: { subjectId: subject.id, groupName, title: titleFromFile(item.path), hindiPath: hindi ? publicUrl(hindi.path) : null },
				create: { subjectId: subject.id, groupName, title: titleFromFile(item.path), filePath: publicUrl(item.path), hindiPath: hindi ? publicUrl(hindi.path) : null }
			});
			studyMaterials++;
		}
	}
	return { subjects, papers, studyMaterials, scannedFiles: files.length, repository: `${repository.owner}/${repository.repository}` };
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedFile === fileURLToPath(import.meta.url)) {
	syncGitHubContent()
		.then((result) => console.log(`GitHub content sync completed: ${JSON.stringify(result)}`))
		.catch((error) => { console.error(error); process.exitCode = 1; })
		.finally(() => prisma.$disconnect());
}
