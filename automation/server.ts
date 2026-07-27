import http from "node:http";
import {
  connectMeesho,
  disconnectMeesho,
  getMeeshoStatus,
  compareImageVariants,
} from "../src/server/meesho.js";

const PORT = Number(process.env.PORT || process.env.AUTOMATION_PORT || 3001);

/** Standalone Automation Microservice for Render / Railway / EC2 / Docker / VPS deployments. */
const server = http.createServer(async (req, res) => {
  // CORS & JSON Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url ?? "/";

  // Helper to read JSON body
  const readJsonBody = async () => {
    return new Promise<any>((resolve) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });
  };

  try {
    if (req.method === "GET" && (url === "/" || url === "/health")) {
      res.writeHead(200);
      res.end(JSON.stringify({ status: "ok", service: "shipsmart-automation-microservice" }));
      return;
    }

    if (req.method === "GET" && url === "/meesho/status") {
      const status = await getMeeshoStatus();
      res.writeHead(200);
      res.end(JSON.stringify(status));
      return;
    }

    if (req.method === "POST" && url === "/meesho/connect") {
      const body = await readJsonBody();
      const result = await connectMeesho(body.credentials);
      res.writeHead(result.success ? 200 : 400);
      res.end(JSON.stringify(result));
      return;
    }

    if (req.method === "POST" && url === "/meesho/disconnect") {
      const result = await disconnectMeesho();
      res.writeHead(200);
      res.end(JSON.stringify(result));
      return;
    }

    if (req.method === "POST" && url === "/meesho/compare") {
      const body = await readJsonBody();
      if (!body.variants || !Array.isArray(body.variants)) {
        res.writeHead(400);
        res.end(
          JSON.stringify({
            success: false,
            message: "Missing 'variants' array in request body",
            step: "validation",
          }),
        );
        return;
      }
      const result = await compareImageVariants(body.variants);
      res.writeHead(result.success ? 200 : 500);
      res.end(JSON.stringify(result));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ success: false, message: "Endpoint not found", step: "routing" }));
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.writeHead(500);
    res.end(
      JSON.stringify({
        success: false,
        message: `Automation microservice error: ${errorMsg}`,
        error: errorMsg,
        step: "microservice_unhandled",
      }),
    );
  }
});

server.listen(PORT, () => {
  console.log(`[SHIPSMART AUTOMATION] Microservice listening on http://localhost:${PORT}`);
});
