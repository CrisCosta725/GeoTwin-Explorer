import http from "node:http";

import { createReadStream } from "node:fs";

import { realpath, stat } from "node:fs/promises";

import path from "node:path";

import { fileURLToPath } from "node:url";

import { spawn } from "node:child_process";

const appId = "geotwin-explorer-v24";

const defaultDirectory = fileURLToPath(new URL("./dist/", import.meta.url));

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".md": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

export function parseOptions(args) {
  const options = {
    port: 8e3,
    open: true,
    help: false
  };
  for (let i = 0; i < args.length; i++) if (args[i] === "--puerto") options.port = Number(args[++i]); else if (args[i] === "--sin-abrir") options.open = false; else if (args[i] === "--help" || args[i] === "-h") options.help = true; else throw Error("Opción desconocida: " + args[i]);
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) throw Error("Indica un puerto entero entre 1 y 65535.");
  return options;
}

export async function createGeoTwinServer(directory = defaultDirectory) {
  const root = await realpath(directory);
  await stat(path.join(root, "index.html"));
  return http.createServer(async (req, res) => {
    if (![ "GET", "HEAD" ].includes(req.method)) {
      res.writeHead(405, {
        Allow: "GET, HEAD"
      });
      res.end();
      return;
    }
    let file;
    try {
      const pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
      file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      file = await realpath(file);
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const info = await stat(file);
      if (!info.isFile()) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": mimeTypes[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Content-Length": info.size,
        "X-GeoTwin-App": appId,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache"
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      createReadStream(file).on("error", () => res.destroy()).pipe(res);
    } catch (error) {
      res.writeHead(error instanceof URIError ? 400 : 404);
      res.end("Recurso no disponible");
    }
  });
}

function openBrowser(url) {
  const [command, args] = process.platform === "win32" ? [ "rundll32.exe", [ "url.dll,FileProtocolHandler", url ] ] : process.platform === "darwin" ? [ "open", [ url ] ] : [ "xdg-open", [ url ] ];
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.on("error", () => console.log("Abre el enlace local en tu navegador."));
  child.unref();
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    console.log("GeoTwin Explorer v24\nnode iniciar_geotwin.mjs [--puerto 8000] [--sin-abrir]");
    return;
  }
  const server = await createGeoTwinServer();
  const url = "http://127.0.0.1:" + options.port + "/";
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, "127.0.0.1", resolve);
  }).catch(error => {
    throw Error(error.code === "EADDRINUSE" ? "El puerto " + options.port + " está ocupado. Abre " + url + " si GeoTwin ya está activo, o usa --puerto " + (options.port === 65535 ? 8001 : options.port + 1) + "." : error.message);
  });
  console.log("GeoTwin Explorer v24\nAbre " + url + "\nMantén esta consola abierta. Ctrl+C cierra el servidor.");
  if (options.open) openBrowser(url);
  for (const signal of [ "SIGINT", "SIGTERM" ]) process.once(signal, () => server.close(() => process.exit(0)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
  console.error("No se pudo iniciar GeoTwin: " + error.message);
  process.exitCode = 1;
});
