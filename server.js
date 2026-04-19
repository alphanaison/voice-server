const http = require("http");
const WebSocket = require("ws");

const server = http.createServer();

const wss = new WebSocket.Server({ server });

let clients = [];

wss.on("connection", (ws) => {
  clients.push(ws);

  ws.on("message", (message) => {
    let data;

    try {
      data = JSON.parse(message);
    } catch (e) {
      return;
    }

    clients.forEach(client => {
      if (client !== ws && client.readyState === 1) {
        client.send(JSON.stringify(data));
      }
    });
  });

  ws.on("close", () => {
    clients = clients.filter(c => c !== ws);
  });
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
