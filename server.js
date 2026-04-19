const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

let clients = [];

wss.on("connection", (ws) => {
  clients.push(ws);

  ws.on("message", (msg) => {
    clients.forEach(client => {
      if (client !== ws && client.readyState === 1) {
        client.send(msg);
      }
    });
  });

  ws.on("close", () => {
    clients = clients.filter(c => c !== ws);
  });
});
