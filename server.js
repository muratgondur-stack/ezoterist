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
  ".json": "application/json; charset=utf-8",
};

function sendFile(response, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": path.basename(filePath) === "index.html" ? "no-cache" : "public, max-age=3600",
    });
    response.end(content);
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
    if (request.method === "HEAD") {
      response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "text/html; charset=utf-8" });
      response.end();
      return;
    }
    sendFile(response, filePath);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Ezoterist server listening on port ${port}`);
});
