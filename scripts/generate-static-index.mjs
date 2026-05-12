import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const distClient = join(process.cwd(), "dist", "client");
const serverEntry = join(process.cwd(), "dist", "server", "index.js");
const productionUrl = process.env.SITE_URL || "https://rssupermercado.com.br/";

const { default: worker } = await import(pathToFileURL(serverEntry).href);
const response = await worker.fetch(new Request(productionUrl), {}, {});

if (!response.ok) {
  throw new Error(`SSR render failed with HTTP ${response.status}.`);
}

const html = await response.text();
await writeFile(join(distClient, "index.html"), html, "utf8");
