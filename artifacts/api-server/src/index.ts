import http from "http";
import net from "net";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "/", `http://localhost`);

  if (url.pathname === "/api/obd/wifi") {
    wss.handleUpgrade(request, socket as any, head, (ws) => {
      const host = url.searchParams.get("host") ?? "192.168.0.10";
      const tcpPort = parseInt(url.searchParams.get("port") ?? "35000", 10);

      logger.info({ host, port: tcpPort }, "OBD WiFi: opening TCP connection");

      const tcp = new net.Socket();
      let ready = false;

      tcp.connect(tcpPort, host, () => {
        ready = true;
        logger.info({ host, port: tcpPort }, "OBD WiFi: TCP connected");
        ws.send(JSON.stringify({ type: "connected", host, port: tcpPort }));
      });

      tcp.on("data", (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data.toString("ascii"));
        }
      });

      tcp.on("error", (err) => {
        logger.error({ err, host, port: tcpPort }, "OBD WiFi: TCP error");
        try {
          ws.send(JSON.stringify({ type: "error", message: err.message }));
          ws.close();
        } catch { /* ignore */ }
      });

      tcp.on("close", () => {
        logger.info("OBD WiFi: TCP closed");
        try { ws.close(); } catch { /* ignore */ }
      });

      ws.on("message", (data) => {
        if (ready && tcp.writable) {
          tcp.write(data.toString());
        }
      });

      ws.on("close", () => {
        logger.info("OBD WiFi: WebSocket closed");
        tcp.destroy();
      });

      ws.on("error", (err) => {
        logger.error({ err }, "OBD WiFi: WebSocket error");
        tcp.destroy();
      });
    });
  } else {
    socket.destroy();
  }
});

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
