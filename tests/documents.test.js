import test from "node:test";
import assert from "node:assert/strict";
import { renderDocument, filename } from "../src/markdown.js";
import { standaloneHtml } from "../src/export.js";
import { restoreLibrary, serializeLibrary } from "../src/storage.js";

test("renders tables, code blocks, and inline Markdown", () => {
  const { html } = renderDocument(
    "# Hello\n\n**Bold**\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```js\nconst a = 1;\n```",
  );
  for (const tag of [
    "<h1",
    "<strong>",
    "<table>",
    '<code class="language-js">',
  ])
    assert.ok(html.includes(tag));
});
test("raw HTML and dangerous links cannot become executable markup", () => {
  const { html } = renderDocument(
    "<script>alert(1)</script>\n\n[bad](javascript:alert(1))",
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes('href="javascript:'));
});
test("remote images become text without triggering network requests", () => {
  const { html } = renderDocument(
    "![a picture](https://example.com/tracker.png)",
  );
  assert.ok(html.includes("Image omitted: a picture"));
  assert.ok(!html.includes("<img"));
});
test("outline IDs are unique, support Unicode, and avoid named-property collisions", () => {
  const result = renderDocument(
    "# Hello\n\n## Hello\n\n## Привет мир\n\n## document",
  );
  assert.equal(new Set(result.headings.map((heading) => heading.id)).size, 4);
  assert.ok(result.headings[2].id.startsWith("pt-привет-мир"));
  assert.ok(result.headings.every((heading) => heading.id.startsWith("pt-")));
});
test("empty documents count as zero words", () =>
  assert.equal(renderDocument("   ").words, 0));
test("filenames remove path separators and unsupported characters", () =>
  assert.equal(filename("a/b:c?", "md"), "a-b-c-.md"));
test("standalone export escapes title and embeds its own styles and CSP", () => {
  const html = standaloneHtml(
    "</title><script>alert(1)</script>",
    "<p>safe</p>",
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;/title&gt;"));
  assert.ok(html.includes("default-src 'none'"));
  assert.ok(html.includes("<style>"));
});
test("library serialization round-trips and repairs a missing active ID", () => {
  const document = {
    id: "1",
    title: "A draft",
    content: "# Hello",
    updated: 100,
  };
  assert.deepEqual(restoreLibrary(serializeLibrary([document], "absent")), {
    documents: [document],
    activeId: "1",
  });
});
test("library rejects invalid versions, oversized documents, and duplicate IDs", () => {
  const document = { id: "1", title: "A draft", content: "x", updated: 100 };
  assert.throws(() => restoreLibrary('{"version":2}'));
  assert.throws(
    () => restoreLibrary(serializeLibrary([document, document], "1")),
    /Duplicate/,
  );
  assert.throws(() =>
    restoreLibrary(
      serializeLibrary([{ ...document, content: "x".repeat(200001) }], "1"),
    ),
  );
});
