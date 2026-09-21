import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || "out");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
http.createServer(async (request, response) => {
  try {
    let file = path.resolve(root, "." + decodeURIComponent(new URL(request.url, "http://localhost").pathname));
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error("Invalid path");
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    response.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end("Not found"); }
}).listen(Number(process.argv[3] || 3000), "127.0.0.1", () => console.log(`Serving ${root}`));
