import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
const stack = JSON.parse(readFileSync(new URL("./stack.json", import.meta.url)));
for (const group of ["dependencies", "devDependencies"]) {
  for (const [name, version] of Object.entries(stack[group])) {
    if (pkg[group]?.[name] !== version) throw new Error(`Stack drift: ${name} must be ${version}`);
  }
}
for (const [name, version] of Object.entries(stack.optionalSharedDependencies)) {
  const declared = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
  if (declared && declared !== version) throw new Error(`Stack drift: ${name} must be ${version}`);
}
for (const file of [".nvmrc", ".node-version"]) {
  if (readFileSync(new URL(`../${file}`, import.meta.url), "utf8").trim() !== stack.node) throw new Error(`Stack drift: ${file}`);
}
const npm = execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["--version"], { encoding: "utf8" }).trim();
if (process.versions.node !== pkg.engines.node || `npm@${npm}` !== pkg.packageManager) {
  console.error(`Use Node ${pkg.engines.node} and ${pkg.packageManager}; found Node ${process.versions.node}, npm ${npm}. Run nvm use.`);
  process.exit(1);
}
console.log(`Environment OK: Node ${process.versions.node}, npm ${npm}`);
