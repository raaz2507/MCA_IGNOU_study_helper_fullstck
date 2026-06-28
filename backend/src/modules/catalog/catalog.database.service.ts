import { env } from "../../config/env.js";
import { catalogRepository } from "./catalog.repository.js";
import { papers as localPapers } from "./catalog.service.js";

const fallbackPreview = "/assets/images/pdf-preview-fallback.svg";

function pdfPath(filePath: string | null) {
	if (!filePath) return "";
	const normalized = filePath.split("\\").join("/");
	const marker = "/assets/resources/MCA_new/";
	const markerIndex = normalized.indexOf(marker);
	if (markerIndex >= 0) {
		return `${env.pdfResourceBaseUrl}/${normalized.slice(markerIndex + marker.length)}`;
	}
	if (normalized.startsWith("MCA_new/")) {
		return `${env.pdfResourceBaseUrl}/${normalized.slice("MCA_new/".length)}`;
	}
	return normalized;
}

function previewPath(filePath: string | null) {
	if (!filePath) return fallbackPreview;
	const normalized = filePath.split("\\").join("/");
	const markerIndex = normalized.indexOf("/assets/");
	if (markerIndex >= 0) return normalized.slice(markerIndex);
	if (normalized.startsWith("assets/")) return `/${normalized}`;
	return normalized;
}

function shortSession(value: string) {
	const monthYear = value.match(/\b(June|December|Dec)\s+(\d{4})\b/i);
	if (monthYear) return `${monthYear[2]} ${monthYear[1].toLowerCase().startsWith("dec") ? "Dec" : "June"}`;
	const yearMonth = value.match(/\b(\d{4})\s+(June|December|Dec)\b/i);
	if (yearMonth) return `${yearMonth[1]} ${yearMonth[2].toLowerCase().startsWith("dec") ? "Dec" : "June"}`;
	return value;
}

function paperKey(paper: { subject: string; session: string }) {
	return `${paper.subject}::${shortSession(paper.session)}`;
}

export const catalogDatabaseService = {
	async subjects() {
		const subjects = await catalogRepository.subjects();
		const localPaperCounts = localPapers().reduce((counts, paper) => {
			counts.set(paper.subject, (counts.get(paper.subject) || 0) + 1);
			return counts;
		}, new Map<string, number>());
		const semesters = new Map<number, any[]>();

		for (const subject of subjects) {
			const groups = new Map<string, any[]>();
			for (const material of subject.studyMaterials) {
				const items = groups.get(material.groupName) || [];
				items.push({ title: material.title, path: pdfPath(material.filePath) });
				groups.set(material.groupName, items);
			}
			const questionPaperCount = Math.max(
				subject._count.papers,
				localPaperCounts.get(subject.code) || 0
			);
			const item = {
				code: subject.code,
				name: subject.title,
				type: subject.type,
				semester: subject.semester,
				folderPath: subject.folderPath,
				questionPaperCount,
				galleryPage: questionPaperCount
					? `/paper-gallery?subject=${encodeURIComponent(subject.code)}`
					: "",
				htmlViewer: subject.htmlViewerPath || "",
				questionBank: subject.questionBank
					? `/question-bank?subject=${encodeURIComponent(subject.folderPath)}`
					: "",
				studyGroups: [...groups].map(([title, files]) => ({ title, files }))
			};
			const semester = semesters.get(subject.semester) || [];
			semester.push(item);
			semesters.set(subject.semester, semester);
		}

		return [...semesters]
			.sort(([a], [b]) => a - b)
			.map(([number, semesterSubjects]) => ({
				number,
				folder: `Semester_${number}`,
				subjects: semesterSubjects
			}));
	},
	async papers(subjectCode?: string) {
		const databasePapers = (await catalogRepository.papers(subjectCode)).map((paper) => ({
			id: paper.id,
			title: paper.title,
			subject: paper.subject.code,
			session: shortSession(paper.session),
			english: pdfPath(paper.englishPath),
			hindi: pdfPath(paper.hindiPath),
			preview: previewPath(paper.previewPath),
			fileName: paper.fileName,
			pages: paper.pageCount,
			size: paper.fileSize,
			updated: new Intl.DateTimeFormat("en-GB", {
				day: "2-digit",
				month: "short",
				year: "numeric"
			}).format(paper.updatedAt)
		}));
		const local = localPapers()
			.filter((paper) => !subjectCode || paper.subject === subjectCode)
			.map((paper) => ({ ...paper, session: shortSession(paper.session) }));
		const merged = new Map<string, any>();
		for (const paper of databasePapers) merged.set(paperKey(paper), paper);
		for (const paper of local) merged.set(paperKey(paper), paper);
		return [...merged.values()].sort((a, b) => b.session.localeCompare(a.session) || a.title.localeCompare(b.title));
	}
};
