import { escapeHtml } from "./markdown.js";
export const documentStyles = `:root{color:#28261f;background:#fff;font-family:Georgia,serif;font-size:17px;line-height:1.8}body{max-width:760px;margin:60px auto;padding:0 30px}h1,h2,h3,h4,h5,h6{line-height:1.25;letter-spacing:-.025em;scroll-margin-top:30px}h1{font-size:2.7em;margin:0 0 .8em}h2{font-size:1.7em;margin:1.8em 0 .6em;border-bottom:1px solid #dcd7cb;padding-bottom:.3em}p,ul,ol{margin:1em 0}a{color:#824432;text-underline-offset:3px}blockquote{margin:1.5em 0;padding:4px 20px;border-left:3px solid #a25b43;color:#62564c;background:#f5f2ec}pre{background:#f1f0eb;border:1px solid #dedad0;padding:18px;overflow:auto;border-radius:4px;font-size:13px;line-height:1.65}code{font-family:monospace;font-size:.83em;background:#f1f0eb;padding:2px 4px;border-radius:3px}pre code{padding:0;background:none;font-size:inherit}table{width:100%;border-collapse:collapse;font-size:.85em;display:block;overflow:auto}th,td{padding:11px 14px;border:1px solid #dcd7cb;text-align:left}th{background:#f5f2ec}hr{border:0;border-top:1px solid #dcd7cb;margin:2em 0}.image-note{font-size:.8em;color:#62564c}img{max-width:100%}@media(max-width:600px){body{margin:30px auto;padding:0 22px;font-size:15px}h1{font-size:2.2em}}@media print{body{margin:0;max-width:none;padding:0}pre,blockquote,tr{break-inside:avoid}h1,h2,h3{break-after:avoid}a{color:inherit}}`;
export function standaloneHtml(title, cleanHtml) {
  return `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escapeHtml(title)}</title><style>${documentStyles}</style></head><body><main>${cleanHtml}</main></body></html>`;
}
export function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
