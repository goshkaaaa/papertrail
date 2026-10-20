import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
});
markdown.renderer.rules.image = (tokens, index) =>
  `<span class="image-note">[Image omitted: ${markdown.utils.escapeHtml(tokens[index].content || "untitled")}]</span>`;
const renderLink =
  markdown.renderer.rules.link_open ||
  ((tokens, index, options, environment, renderer) =>
    renderer.renderToken(tokens, index, options));
markdown.renderer.rules.link_open = (
  tokens,
  index,
  options,
  environment,
  renderer,
) => {
  tokens[index].attrSet("rel", "noopener noreferrer");
  return renderLink(tokens, index, options, environment, renderer);
};

export function renderDocument(source) {
  const tokens = markdown.parse(source, {});
  const headings = [];
  const used = new Map();
  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index].type !== "heading_open") continue;
    const inline = tokens[index + 1];
    const title =
      inline.children
        ?.filter(
          (token) => token.type === "text" || token.type === "code_inline",
        )
        .map((token) => token.content)
        .join("") || inline.content;
    const slug =
      title
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 100) || "section";
    const count = (used.get(slug) || 0) + 1;
    used.set(slug, count);
    const id = `pt-${slug}-${count}`;
    tokens[index].attrSet("id", id);
    headings.push({ id, title, level: Number(tokens[index].tag.slice(1)) });
  }
  const text = source.trim();
  const words = text ? text.split(/\s+/u).length : 0;
  return {
    html: markdown.renderer.render(tokens, markdown.options, {}),
    headings,
    words,
    readingMinutes: Math.max(1, Math.ceil(words / 220)),
  };
}

export function escapeHtml(value) {
  return markdown.utils.escapeHtml(value);
}
export function filename(title, extension) {
  return `${
    title
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .replace(/[. ]+$/, "")
      .slice(0, 80) || "document"
  }.${extension}`;
}
