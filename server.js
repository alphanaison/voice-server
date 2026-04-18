const WebSocket = require("ws");

// Use Render-provided PORT or fallback for local testing
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT });

let clients = [];

console.log(`WebSocket server running on port ${PORT}`);

wss.on("connection", (ws) => {
  console.log("New client connected");

  clients.push(ws);

  ws.on("message", (msg) => {
    // Broadcast to all other clients
    clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    clients = clients.filter((client) => client !== ws);
  });

  ws.on("error", (err) => {
    console.log("WebSocket error:", err);
  });
});
