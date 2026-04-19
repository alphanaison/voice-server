const http = require("http");
const WebSocket = require("ws");

console.log("SERVER STARTED");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebRTC signaling server alive");
});

const wss = new WebSocket.Server({ server });

// store active clients
const clients = new Set();

// ---------------- HEARTBEAT (PREVENT RANDOM DROPS) ----------------
function heartbeat() {
  this.isAlive = true;
}

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log("KILLING DEAD CLIENT");
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// ---------------- CONNECTION ----------------
wss.on("connection", (ws) => {
  console.log("CLIENT CONNECTED");

  ws.isAlive = true;
  ws.on("pong", heartbeat);

  clients.add(ws);

  // ---------------- MESSAGE HANDLER ----------------
  ws.on("message", (msg) => {
    let data;

    try {
      data = JSON.parse(msg.toString());
    } catch (err) {
      console.log("INVALID JSON IGNORED");
      return;
    }

    const type = Object.keys(data)[0];
    console.log("MSG TYPE:", type);

    // relay to others
    broadcast(ws, data);
  });

  ws.on("close", () => {
    console.log("CLIENT DISCONNECTED");
    clients.delete(ws);
  });

  ws.on("error", (err) => {
    console.log("WS ERROR:", err.message);
  });
});

// ---------------- BROADCAST ----------------
function broadcast(sender, data) {
  const payload = JSON.stringify(data);

  wss.clients.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Listening on", PORT);
});
