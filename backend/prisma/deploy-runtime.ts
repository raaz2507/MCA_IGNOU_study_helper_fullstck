import { spawnSync } from "node:child_process";
import path from "node:path";
import dotenv from "dotenv";

const projectRoot = process.cwd();
dotenv.config({ path: path.join(projectRoot, ".env"), override: true });
const prismaCli = path.join(projectRoot, "node_modules", "prisma", "build", "index.js");
const schema = path.join(projectRoot, "backend", "prisma", "schema.prisma");
const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy", "--schema", schema], {
	stdio: "inherit",
	env: process.env
});
if (result.status === 0) {
	const syncScript = path.join(projectRoot, "backend", "dist", "src", "infrastructure", "content", "sync-github-content.js");
	const sync = spawnSync(process.execPath, [syncScript], { stdio: "inherit", env: process.env });
	if (sync.status !== 0) console.warn("GitHub content sync failed; continuing server startup. Retry it from Academic Operations.");
}
process.exitCode = result.status ?? 1;
