// Polyfill WebSocket for CI environments (Node.js 20 has no native WebSocket)
import { WebSocket } from "undici";
if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket;
}

import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const distClient = join(process.cwd(), "dist", "client");
const serverEntryCandidates = [
  join(process.cwd(), "dist", "server", "index.js"),
  join(process.cwd(), "dist", "server", "server.js"),
];
const productionUrl = process.env.SITE_URL || "https://rssupermercado.com.br/";

let serverEntry;
for (const candidate of serverEntryCandidates) {
  try {
    await access(candidate);
    serverEntry = candidate;
    break;
  } catch {
    // Try the next TanStack Start server output filename.
  }
}

if (!serverEntry) {
  throw new Error(
    `No server entry found. Tried: ${serverEntryCandidates.join(", ")}`,
  );
}

const { default: worker } = await import(pathToFileURL(serverEntry).href);
const response = await worker.fetch(new Request(productionUrl), {}, {});

if (!response.ok) {
  throw new Error(`SSR render failed with HTTP ${response.status}.`);
}

const html = await response.text();
await writeFile(join(distClient, "index.html"), html, "utf8");
