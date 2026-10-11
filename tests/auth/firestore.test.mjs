import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
let env;
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Run npm run test:auth; never point these tests at production.");
  env = await initializeTestEnvironment({ projectId: "demo-platform", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
beforeEach(async () => { await env.clearFirestore(); });
after(async () => { await env?.cleanup(); });

const project = () => ({ name: "Projeto teste", owner: "Alice", squad: "QA", createdBy: "alice", updatedBy: "alice", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
test("anonymous and users without roles cannot read or create projects", async () => {
  for (const context of [env.unauthenticatedContext(), env.authenticatedContext("no-role")]) {
    const ref = doc(context.firestore(), "projects", "p1");
    await assertFails(getDoc(ref)); await assertFails(setDoc(ref, project()));
  }
});
test("viewer can read but cannot write; editor can create but cannot delete projects", async () => {
  const editor = doc(env.authenticatedContext("alice", { role: "editor" }).firestore(), "projects", "p1");
  await assertSucceeds(setDoc(editor, project()));
  const viewer = doc(env.authenticatedContext("bob", { role: "viewer" }).firestore(), "projects", "p1");
  await assertSucceeds(getDoc(viewer)); await assertFails(setDoc(viewer, project()));
  await assertFails(deleteDoc(editor));
});
test("settings are admin-only writes", async () => {
  const settings = { successRateTarget: 90, slaDays: 7, logoPath: "/logo.svg", projectName: "Projeto", squadName: "QA", managerName: "Gestor", qaName: "Tester", updatedAt: serverTimestamp(), updatedBy: "admin" };
  await assertFails(setDoc(doc(env.authenticatedContext("editor", { role: "editor" }).firestore(), "settings", "global"), settings));
  await assertSucceeds(setDoc(doc(env.authenticatedContext("admin", { role: "admin" }).firestore(), "settings", "global"), settings));
});
