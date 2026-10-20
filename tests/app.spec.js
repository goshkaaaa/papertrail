import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("edits update the preview, outline, and persist after reload", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Document title", exact: true })
    .fill("Useful deployment notes");
  await page
    .getByRole("textbox", { name: "Markdown editor" })
    .fill("# Deploy\n\n## Rollback\n\nKeep the previous image tag.");
  await expect(page.locator(".paper h1")).toHaveText("Deploy");
  await expect(
    page
      .getByRole("navigation", { name: "Document outline" })
      .getByRole("button", { name: "Rollback" }),
  ).toBeVisible();
  await expect(page.locator(".save-state")).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Document title", exact: true }),
  ).toHaveValue("Useful deployment notes");
  await expect(page.locator(".paper")).toContainText(
    "Keep the previous image tag.",
  );
});

test("templates, removal, and undo preserve drafts", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("New document template").selectOption("release");
  await page.getByRole("button", { name: "New document", exact: true }).click();
  await expect(page.locator(".paper h1")).toHaveText("Dispatch v2.4");
  await page
    .getByRole("button", { name: "Remove document", exact: true })
    .click();
  await expect(page.locator(".paper h1")).toHaveText("The Dispatch handover");
  await page.getByRole("button", { name: "Undo removal" }).click();
  await expect(page.locator(".paper h1")).toHaveText("Dispatch v2.4");
});

test("HTML exports are standalone and Markdown imports keep existing drafts", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Import document file")
    .setInputFiles({
      name: "handoff.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("# A fresh handoff\n\nHello **team**."),
    });
  await expect(page.locator(".paper h1")).toHaveText("A fresh handoff");
  await expect(
    page
      .getByRole("navigation", { name: "Your documents" })
      .getByRole("button"),
  ).toHaveCount(2);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export HTML" }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe("handoff.html");
  const stream = await file.createReadStream();
  let html = "";
  for await (const chunk of stream) html += chunk.toString();
  expect(html).toContain("<style>");
  expect(html).toContain("<strong>team</strong>");
  expect(html).toContain("default-src 'none'");
});

test("untrusted Markdown cannot execute or request images", async ({
  page,
}) => {
  await page.goto("/");
  const requests = [];
  page.on("request", (request) => {
    if (request.url().includes("example.com")) requests.push(request.url());
  });
  await page
    .getByRole("textbox", { name: "Markdown editor" })
    .fill(
      '# Safe\n\n<img src=x onerror="window.compromised=true">\n\n[run](javascript:alert(1))\n\n![tracking](https://example.com/track.png)',
    );
  await expect(page.locator(".paper")).toContainText("Image omitted: tracking");
  await expect(page.locator(".paper img,.paper script")).toHaveCount(0);
  expect(await page.evaluate(() => window.compromised)).toBeUndefined();
  expect(requests).toEqual([]);
});

test("print shows the preview and hides editor chrome", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Write", exact: true }).click();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".paper h1")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Markdown editor" }),
  ).toBeHidden();
  await expect(page.locator(".shelf")).toBeHidden();
});

test("mobile layout fits and workspace passes accessibility checks", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((item) => ({
      id: item.id,
      targets: item.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
});
