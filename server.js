const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const configuredPort = Number.parseInt(process.env.PORT || "", 10);
const port = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 3000;
const root = __dirname;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".json": "application/json; charset=utf-8",
};

// iOS Safari probes video with `Range: bytes=0-1` and refuses to play unless the
// server answers 206. Returns null to serve the whole file, or "invalid" for 416.
function parseRange(header, size) {
  if (!header) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;

  let start;
  let end;

  if (rawStart === "") {
    const suffixLength = Number(rawEnd);
    if (suffixLength === 0) return "invalid";
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }

  if (!Number.isInteger(start) || !Number.isInteger(end)) return "invalid";
  if (start > end || start >= size) return "invalid";

  return { start, end };
}

function sendFile(request, response, filePath) {
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      const notFound = !error || error.code === "ENOENT";
      response.writeHead(notFound ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end(notFound ? "Not found" : "Server error");
      return;
    }

    const range = parseRange(request.headers.range, stats.size);

    if (range === "invalid") {
      response.writeHead(416, {
        "Content-Range": `bytes */${stats.size}`,
        "Accept-Ranges": "bytes",
      });
      response.end();
      return;
    }

    const headers = {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": path.basename(filePath) === "index.html" ? "no-cache" : "public, max-age=3600",
      "Accept-Ranges": "bytes",
      "Last-Modified": stats.mtime.toUTCString(),
    };

    if (range) {
      headers["Content-Range"] = `bytes ${range.start}-${range.end}/${stats.size}`;
      headers["Content-Length"] = range.end - range.start + 1;
      response.writeHead(206, headers);
    } else {
      headers["Content-Length"] = stats.size;
      response.writeHead(200, headers);
    }

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    const stream = fs.createReadStream(filePath, range ? { start: range.start, end: range.end } : undefined);
    stream.on("error", () => response.destroy());
    response.on("close", () => stream.destroy());
    stream.pipe(response);
  });
}

const server = http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }

  let requestPath;
  try {
    requestPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Invalid URL");
    return;
  }
  const requestedFile = path.resolve(root, `.${requestPath}`);

  if (requestedFile !== root && !requestedFile.startsWith(root + path.sep)) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Invalid path");
    return;
  }

  fs.stat(requestedFile, (error, stats) => {
    const filePath = !error && stats.isFile() ? requestedFile : path.join(root, "index.html");
    sendFile(request, response, filePath);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Ezoterist server listening on port ${port}`);
});
