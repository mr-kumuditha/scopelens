import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("create a project, preserve evidence, analyze and review a change", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Project name").fill(`Browser test ${Date.now()}`);
  await dialog
    .getByLabel("Project brief")
    .fill("Customers may cancel before the appointment.");
  await dialog
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A clear starting point." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add requirement", exact: true })
    .click();
  await dialog.getByLabel("Requirement title").fill("Cancellation policy");
  await dialog
    .getByRole("textbox", { name: "Requirement", exact: true })
    .fill("Customers may cancel before the appointment.");
  await dialog
    .getByLabel("Exact source excerpt")
    .fill("Customers may cancel before the appointment.");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Add artifact", exact: true }).click();
  await dialog.getByLabel("Title", { exact: true }).fill("Cancel endpoint");
  await dialog
    .getByLabel("Description", { exact: true })
    .fill("The endpoint allows cancellation before the appointment starts.");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByRole("button", { name: "Connect artifact", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await dialog
    .getByRole("textbox", { name: "Requirement", exact: true })
    .fill("Customers may cancel until 24 hours before the appointment.");
  await dialog
    .getByLabel("Reason for the change")
    .fill("Client changed the cancellation window.");
  await dialog
    .getByRole("button", { name: "Save new version", exact: true })
    .click();
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Change, with confidence." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Accept impact", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Accept impact", exact: true })
    .click();
  await expect(
    page.getByText("Accepted · needs attention", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Change review/ }).click();
  await expect(
    page.getByText("Accepted · needs attention", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Activity log", exact: true }).click();
  await expect(
    page.getByText("Impact reviewed", { exact: true }),
  ).toBeVisible();
});
test("example, desktop and mobile are accessible with no horizontal overflow", async ({
  page,
}) => {
  const seed = await page.request.post("/api/sample");
  const sample = await seed.json();
  await page.addInitScript(
    (id) => localStorage.setItem("scopelens.project", id),
    sample.id,
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Every change has a ripple." }),
  ).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator("body")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  }
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: /Change review/ }).click();
  await expect(
    page.getByRole("heading", { name: "Change, with confidence." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("draft candidates require explicit review before saving", async ({
  page,
}) => {
  const p = await (
    await page.request.post("/api/projects", {
      data: {
        name: `Draft review ${Date.now()}`,
        brief:
          "Members can invite a colleague. Invitations expire after seven days.",
      },
    })
  ).json();
  await page.addInitScript(
    (id) => localStorage.setItem("scopelens.project", id),
    p.id,
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Requirements", exact: true }).click();
  await page.getByRole("button", { name: "Draft from brief" }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", {
      name: "Members can invite a colleague",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review & edit" }).first().click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Requirement", exact: true }),
  ).toHaveValue("Members can invite a colleague.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Members can invite a colleague",
      exact: true,
    }),
  ).toBeVisible();
});

test("review, history, documentation, and a modal pass accessibility checks", async ({
  page,
}) => {
  const sample = await (await page.request.post("/api/sample")).json();
  await page.addInitScript(
    (id) => localStorage.setItem("scopelens.project", id),
    sample.id,
  );
  await page.goto("/");
  for (const name of [
    /^Change review/,
    /^Requirements$/,
    /^Activity log$/,
    /^Documentation$/,
  ]) {
    await page.getByRole("button", { name }).click();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  await page.getByRole("button", { name: "New project", exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
