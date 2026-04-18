import "./src/db-init";
import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import net from "net";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import cookieParser from "cookie-parser";
import { logger } from "./artifacts/api-server/src/lib/logger";
import apiRouter from "./artifacts/api-server/src/routes/index";

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "5000", 10);

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // API Routes
  app.use("/api", apiRouter);

  // Vite Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist/public");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = http.createServer(app);

  // WebSocket for OBD bridge
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

  server.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT }, `Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
