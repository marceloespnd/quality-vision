import { expect, test } from "@playwright/test";
test("local application renders and direct scenario navigation survives reload", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Cenários", exact: true }).or(page.getByRole("link", { name: "Cenários", exact: true })).first()).toBeVisible();
  await page.goto("/cenarios?status=Pendente");
  await expect(page.locator("#page-title")).toBeVisible();
  await page.reload(); await expect(page).toHaveURL(/status=Pendente/);
  await expect(page.locator("#page-title")).toBeVisible();
  expect(errors).toEqual([]);
});

test("scenario creation keeps its project, flow and execution after reload", async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("platform-e2e-seeded")) return;
    localStorage.setItem("quality-vision-projects", JSON.stringify([{ id: "p1", name: "Projeto E2E", owner: "QA" }]));
    localStorage.setItem("quality-vision-flows", JSON.stringify([{ id: "f1", projectId: "p1", name: "Fluxo E2E", owner: "QA" }]));
    localStorage.setItem("platform-e2e-seeded", "true");
  });
  await page.goto("/cenarios?projectId=p1&flowId=f1");
  await page.getByRole("button", { name: "Adicionar cenário", exact: true }).first().click();
  await page.getByLabel("Nome do cenário").fill("Cenário da base compartilhada");
  await expect(page.getByLabel("Projeto do cenário")).toHaveValue("p1");
  await expect(page.getByLabel("Fluxo do cenário")).toHaveValue("f1");
  await page.getByLabel("Status de execução").selectOption("Aprovado");
  await page.getByLabel("Data da execução").fill("2026-10-11");
  await page.getByRole("button", { name: "Salvar cenário", exact: true }).click();
  await expect(page.getByText("Cenário da base compartilhada", { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("Cenário da base compartilhada", { exact: true }).first()).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("quality-vision-scenarios") ?? "[]"));
  expect(saved).toEqual(expect.arrayContaining([expect.objectContaining({ projectId: "p1", flowId: "f1", status: "Aprovado", executedAt: "2026-10-11" })]));
});
