import { cpSync, existsSync, readFileSync, readdirSync, mkdirSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const managed = [".nvmrc", ".node-version", ".npmrc", ".editorconfig", ".github/workflows/validate.yml"];
const source = dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2];
const target = resolve(process.argv[3] ?? "");
if (!["--check", "--to"].includes(mode) || !process.argv[3] || !existsSync(resolve(target, "package.json"))) {
  throw new Error("Usage: node platform/sync.mjs --check|--to /path/to/project");
}
if (resolve(target, "platform") === source) throw new Error("Choose another repository");
function files(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(resolve(dir, e.name)) : [resolve(dir, e.name)]); }
if (mode === "--to") {
  cpSync(source, resolve(target, "platform"), { recursive: true });
  for (const file of managed) { mkdirSync(dirname(resolve(target,file)), { recursive: true }); cpSync(resolve(source, "template", file), resolve(target, file)); }
  console.log("Platform copied; review adapters and run npm run check in the target.");
} else {
  const expected = files(source).map(f => relative(source, f));
  const targetDir = resolve(target, "platform");
  const actual = existsSync(targetDir) ? files(targetDir).map(f => relative(targetDir, f)) : [];
  const drift = [...new Set([...expected, ...actual])].filter(f => !existsSync(resolve(source,f)) || !existsSync(resolve(targetDir,f)) || !readFileSync(resolve(source,f)).equals(readFileSync(resolve(targetDir,f))));
  for (const file of managed) {
    if (!existsSync(resolve(target, file)) || !readFileSync(resolve(source, "template", file)).equals(readFileSync(resolve(target, file)))) drift.push(file);
  }
  if (drift.length) { console.error(drift.join("\n")); process.exit(1); }
  console.log("Platform copies match.");
}
