const http = require("http");
const WebSocket = require("ws");

console.log("SERVER STARTED");

// ✅ Create HTTP server (Render needs this)
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebSocket server is running");
});

// ✅ Attach WebSocket to HTTP server
const wss = new WebSocket.Server({ server });

let clients = [];

wss.on("connection", (ws, req) => {
  console.log("CLIENT CONNECTED:", req.socket.remoteAddress);

  clients.push(ws);

  ws.on("message", (message) => {
    console.log("MESSAGE RECEIVED:", message.toString());

    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.log("INVALID JSON");
      return;
    }

    // 🔁 Broadcast to all OTHER clients
    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });

  ws.on("close", () => {
    console.log("CLIENT DISCONNECTED");
    clients = clients.filter(c => c !== ws);
  });

  ws.on("error", (err) => {
    console.log("WS ERROR:", err.message);
  });
});

// ✅ IMPORTANT: Bind to 0.0.0.0 for Render
const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
});
