/**
 * Dev proxy: binds $PORT immediately (satisfies Replit's health check),
 * starts Expo Metro in the background, then proxies all HTTP requests to Metro.
 */

const { spawn } = require("child_process");
const http = require("http");
const net = require("net");

const PORT = parseInt(process.env.PORT || "3000", 10);
const METRO_PORT = 8081;

const env = {
  ...process.env,
  EXPO_PACKAGER_PROXY_URL: process.env.EXPO_PACKAGER_PROXY_URL || "",
  EXPO_PUBLIC_DOMAIN: process.env.EXPO_PUBLIC_DOMAIN || process.env.REPLIT_DEV_DOMAIN || "",
  EXPO_PUBLIC_REPL_ID: process.env.REPL_ID || "",
  REACT_NATIVE_PACKAGER_HOSTNAME: process.env.REACT_NATIVE_PACKAGER_HOSTNAME || process.env.REPLIT_DEV_DOMAIN || "",
};

let metroReady = false;

function checkMetroPort() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port: METRO_PORT, host: "127.0.0.1" });
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
    socket.setTimeout(1000, () => { socket.destroy(); resolve(false); });
  });
}

async function waitForMetro() {
  for (let i = 0; i < 120; i++) {
    const up = await checkMetroPort();
    if (up) {
      metroReady = true;
      console.log("[proxy] Metro ready on port", METRO_PORT);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.error("[proxy] Metro did not start within 120s");
}

function proxyRequest(req, res) {
  if (!metroReady) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ATS Checker Mobile</title>
  <meta http-equiv="refresh" content="3">
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f1f5f9; }
    .box { text-align: center; }
    .ring { width: 48px; height: 48px; border: 3px solid #334155; border-top-color: #3B82F6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { margin: 0 0 8px; font-size: 20px; }
    p { color: #94A3B8; font-size: 14px; margin: 0; }
  </style>
</head>
<body>
  <div class="box">
    <div class="ring"></div>
    <h2>ATS Checker Mobile</h2>
    <p>Loading Expo bundle&hellip;</p>
  </div>
</body>
</html>`);
    return;
  }

  const options = {
    hostname: "127.0.0.1",
    port: METRO_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on("error", (err) => {
    console.error("[proxy] upstream error:", err.message);
    if (!res.headersSent) {
      res.writeHead(502);
      res.end("Bad Gateway");
    }
  });

  req.pipe(proxy, { end: true });
}

const server = http.createServer(proxyRequest);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[proxy] Listening on port ${PORT}`);

  const metroArgs = [
    "exec", "expo", "start",
    "--localhost",
    "--port", String(METRO_PORT),
  ];

  console.log("[proxy] Starting Metro on port", METRO_PORT);
  const metro = spawn("pnpm", metroArgs, {
    env,
    stdio: "inherit",
    cwd: require("path").resolve(__dirname, ".."),
  });

  metro.on("error", (err) => {
    console.error("[proxy] Metro spawn error:", err.message);
    process.exit(1);
  });

  metro.on("exit", (code) => {
    console.log("[proxy] Metro exited with code", code);
    process.exit(code || 0);
  });

  waitForMetro();
});

const cleanup = () => { server.close(); process.exit(0); };
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
