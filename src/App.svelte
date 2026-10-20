<script>
  import { onMount } from "svelte";
  import DOMPurify from "dompurify";
  import { renderDocument, filename } from "./markdown";
  import {
    maxLength,
    restoreLibrary,
    serializeLibrary,
    storageKey,
  } from "./storage";
  import { templates } from "./templates";
  import { download, standaloneHtml } from "./export";

  let documents = $state([
    { id: "welcome", ...templates.handoff, updated: Date.now() },
  ]);
  let activeId = $state("welcome");
  let loaded = $state(false);
  let message = $state("");
  let saved = $state(true);
  let layout = $state("split");
  let template = $state("blank");
  let removed = $state(null);
  let fileInput;
  let editor;
  let preview;
  let active = $derived(
    documents.find((document) => document.id === activeId) || documents[0],
  );
  let rendered = $derived(renderDocument(active.content));
  let cleanHtml = $derived(
    DOMPurify.sanitize(rendered.html, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ["img", "style", "form", "input", "button"],
      ADD_ATTR: ["id"],
    }),
  );
  let characters = $derived(active.content.length);

  onMount(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const restored = restoreLibrary(raw);
        documents = restored.documents;
        activeId = restored.activeId;
      }
    } catch {
      message =
        "Saved drafts could not be read. Showing the sample document. Import a backup or start a new draft.";
    }
    loaded = true;
    function flush() {
      try {
        localStorage.setItem(storageKey, serializeLibrary(documents, activeId));
      } catch {
        saved = false;
      }
    }
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  });

  $effect(() => {
    if (!loaded) return;
    const value = serializeLibrary(documents, activeId);
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, value);
        saved = true;
      } catch {
        saved = false;
        message =
          "Could not save on this device. Export your document or library before leaving.";
      }
    }, 300);
    return () => clearTimeout(timer);
  });

  function update(field, value) {
    documents = documents.map((document) =>
      document.id === active.id
        ? { ...document, [field]: value, updated: Date.now() }
        : document,
    );
    saved = false;
  }
  function createDocument() {
    if (documents.length >= 20) {
      message =
        "The shelf holds 20 drafts. Export and remove a draft before adding another.";
      return;
    }
    const document = {
      id: crypto.randomUUID(),
      ...templates[template],
      updated: Date.now(),
    };
    documents = [...documents, document];
    activeId = document.id;
    message = "New document created.";
  }
  function removeDocument() {
    removed = {
      document: { ...active },
      index: documents.findIndex((document) => document.id === active.id),
    };
    documents = documents.filter((document) => document.id !== active.id);
    if (!documents.length)
      documents = [
        { id: crypto.randomUUID(), ...templates.blank, updated: Date.now() },
      ];
    activeId = documents[0].id;
    message =
      "Document removed. You can undo this until you remove another document.";
  }
  function undoRemove() {
    if (!removed || documents.length >= 20) return;
    const next = [...documents];
    next.splice(removed.index, 0, removed.document);
    documents = next;
    activeId = removed.document.id;
    removed = null;
    message = "Document restored.";
  }
  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5000000) throw new Error("Use a file smaller than 5 MB.");
      const content = await file.text();
      let incoming;
      if (file.name.toLowerCase().endsWith(".json")) {
        const library = restoreLibrary(content);
        incoming = library.documents.map((document) => ({
          ...document,
          id: crypto.randomUUID(),
          updated: Date.now(),
        }));
      } else {
        if (content.length > maxLength)
          throw new Error(
            "Markdown documents are limited to 200,000 characters.",
          );
        incoming = [
          {
            id: crypto.randomUUID(),
            title:
              file.name.replace(/\.[^.]+$/, "").slice(0, 100) ||
              "Imported document",
            content,
            updated: Date.now(),
          },
        ];
      }
      if (documents.length + incoming.length > 20)
        throw new Error(
          "Not enough shelf space. Export and remove drafts first; the limit is 20.",
        );
      documents = [...documents, ...incoming];
      activeId = incoming[0].id;
      message = `Imported ${incoming.length} document${incoming.length > 1 ? "s" : ""} as new drafts. Existing drafts were kept.`;
    } catch (error) {
      message = error.message;
    }
    event.target.value = "";
  }
  function insert(before, after = "") {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const content =
      active.content.slice(0, start) +
      before +
      active.content.slice(start, end) +
      after +
      active.content.slice(end);
    if (content.length > maxLength) {
      message = "This document has reached the character limit.";
      return;
    }
    update("content", content);
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(start + before.length, end + before.length);
    });
  }
  function jumpTo(id) {
    preview
      ?.querySelector(`[id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ behavior: "instant", block: "start" });
  }
  function exportHtml() {
    download(
      filename(active.title, "html"),
      standaloneHtml(active.title, cleanHtml),
      "text/html",
    );
    message =
      "Standalone HTML exported. It includes its own styles and needs no JavaScript.";
  }
</script>

<svelte:head><title>{active.title} — Papertrail</title></svelte:head>
<div class="app-shell">
  <aside class="shelf" aria-label="Document shelf">
    <a class="brand" href="#workspace"
      ><span class="paper-mark" aria-hidden="true">▤</span>papertrail<span
        >.</span
      ></a
    >
    <div class="shelf-heading">
      <h2>Your shelf</h2>
      <span>{documents.length}/20</span>
    </div>
    <div class="new-document">
      <label class="sr-only" for="template">New document template</label><select
        id="template"
        bind:value={template}
        ><option value="blank">Blank document</option><option value="handoff"
          >Technical handover</option
        ><option value="release">Release notes</option><option value="decision"
          >Decision record</option
        ></select
      ><button
        class="new-button"
        aria-label="New document"
        onclick={createDocument}
        disabled={documents.length >= 20}>New document <span>+</span></button
      >
    </div>
    <nav aria-label="Your documents">
      {#each documents as document (document.id)}<button
          class:active={active.id === document.id}
          aria-pressed={active.id === document.id}
          onclick={() => (activeId = document.id)}
          ><span aria-hidden="true">▱</span><span
            >{document.title}<small
              >{document.content.trim()
                ? document.content.trim().split(/\s+/).length
                : 0} words</small
            ></span
          ></button
        >{/each}
    </nav>
    <div class="shelf-bottom">
      <p>Useful notes.<br />Ready for the<br /><em>next person.</em></p>
      <button onclick={() => fileInput.click()}
        >Import Markdown / backup ↑</button
      ><button
        onclick={() => {
          download(
            "papertrail-library.json",
            serializeLibrary(documents, activeId),
            "application/json",
          );
          message = "Library backup exported.";
        }}>Export library backup ↓</button
      ><a href="https://github.com/goshkaaaa/papertrail">View source ↗</a>
    </div>
    <input
      type="file"
      bind:this={fileInput}
      accept=".md,.markdown,.txt,.json,text/plain,text/markdown,application/json"
      onchange={importFile}
      hidden
      aria-label="Import document file"
    />
  </aside>
  <main id="workspace">
    <header class="workspace-header">
      <div class="workspace-label">
        THE WRITING DESK <span>/</span>
        {active.title}
      </div>
      <div class="save-state">
        <span class:saved></span>{saved ? "Saved on this device" : "Saving…"}
      </div>
    </header>
    <section class="document-heading">
      <div>
        <label class="sr-only" for="document-title">Document title</label><input
          id="document-title"
          class="title-input"
          value={active.title}
          maxlength="100"
          oninput={(event) => {
            if (event.target.value.trim()) update("title", event.target.value);
          }}
        />
        <p>A note is useful when someone else can pick it up.</p>
      </div>
      <div class="document-actions">
        <button
          class="secondary-button"
          onclick={() => {
            download(
              filename(active.title, "md"),
              active.content,
              "text/markdown",
            );
            message = "Markdown exported.";
          }}>Markdown ↓</button
        ><button class="export-button" onclick={exportHtml}
          >Export HTML ↗</button
        >
      </div>
    </section>
    <div class="desk-toolbar">
      <div class="format-tools" role="group" aria-label="Markdown formatting">
        <button aria-label="Insert heading" onclick={() => insert("## ")}
          >H₂</button
        ><button aria-label="Bold selection" onclick={() => insert("**", "**")}
          ><strong>B</strong></button
        ><button aria-label="Italic selection" onclick={() => insert("*", "*")}
          ><em>I</em></button
        ><button
          aria-label="Insert link"
          onclick={() => insert("[", "](https://example.com)")}>↗</button
        ><button
          aria-label="Inline code selection"
          onclick={() => insert("`", "`")}>〈〉</button
        ><button aria-label="Insert list item" onclick={() => insert("- ")}
          >☷</button
        >
      </div>
      <div class="layout-tools" role="group" aria-label="Workspace layout">
        <button
          aria-pressed={layout === "write"}
          onclick={() => (layout = "write")}>Write</button
        ><button
          aria-pressed={layout === "split"}
          onclick={() => (layout = "split")}>Split</button
        ><button
          aria-pressed={layout === "read"}
          onclick={() => (layout = "read")}>Read</button
        >
      </div>
      <button class="print-button" onclick={() => window.print()}
        >Print / PDF ↗</button
      >
    </div>
    <div
      class="desk"
      class:write-only={layout === "write"}
      class:read-only={layout === "read"}
    >
      <section
        class="source-pane"
        aria-label="Markdown source"
        hidden={layout === "read"}
      >
        <div class="pane-heading">
          <span>YOUR MARKDOWN</span><span>.md</span>
        </div>
        <textarea
          bind:this={editor}
          aria-label="Markdown editor"
          value={active.content}
          oninput={(event) => update("content", event.target.value)}
          maxlength={maxLength}
          spellcheck="false"
          placeholder="# Start with the useful part"></textarea>
        <div class="source-footer">
          <span>{characters.toLocaleString("en")} / 200,000 characters</span
          ><span>Markdown</span>
        </div>
      </section>
      <section
        class="preview-pane"
        aria-label="Document preview"
        hidden={layout === "write"}
      >
        <div class="pane-heading">
          <span>THE FINISHED PAGE</span><span
            >{rendered.readingMinutes} MIN READ</span
          >
        </div>
        <div
          class="preview-scroll"
          bind:this={preview}
          role="region"
          aria-label="Rendered Markdown"
        >
          <a class="sr-only skip-preview" href="#document-outline"
            >Skip document preview</a
          >
          <article class="paper">{@html cleanHtml}</article>
        </div>
      </section>
    </div>
    <div class="desk-bottom">
      <div class="document-metrics">
        <span>{rendered.words} words</span><span
          >{rendered.headings.length} headings</span
        ><span>No uploads. No account.</span>
      </div>
      <button class="remove-document" onclick={removeDocument}
        >Remove document</button
      >
    </div>
    <div class="status-row">
      <p role="status">{message}</p>
      {#if removed}<button
          disabled={documents.length >= 20}
          onclick={undoRemove}>Undo removal ↶</button
        >{/if}
    </div>
    <section class="outline-section" id="document-outline">
      <div>
        <h2>On this page</h2>
        <p>Your document, at a glance.</p>
      </div>
      <nav aria-label="Document outline">
        {#each rendered.headings as heading (heading.id)}<button
            class:subheading={heading.level > 2}
            onclick={() => {
              layout = layout === "write" ? "read" : layout;
              requestAnimationFrame(() => jumpTo(heading.id));
            }}>{heading.title || "Untitled heading"}</button
          >{/each}{#if !rendered.headings.length}<p>
            Add a heading with # to build an outline.
          </p>{/if}
      </nav>
    </section>
    <footer>
      <span>GOOD DOCUMENTS LEAVE A TRAIL.</span><span
        >Raw HTML is shown as text. External images are omitted.</span
      >
    </footer>
  </main>
</div>
