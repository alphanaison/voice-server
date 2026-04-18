const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });

let clients = [];

wss.on("connection", (ws) => {
  clients.push(ws);

  ws.on("message", (msg) => {
    clients.forEach(c => {
      if (c !== ws && c.readyState === 1) {
        c.send(msg);
      }
    });
  });

  ws.on("close", () => {
    clients = clients.filter(c => c !== ws);
  });
});

console.log("Server running");
