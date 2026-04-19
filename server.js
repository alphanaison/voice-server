const http = require("http");
const WebSocket = require("ws");

console.log("SERVER STARTED");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WS server alive");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("CLIENT CONNECTED");

  ws.on("message", (msg) => {
    console.log("MSG:", msg.toString());

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg.toString());
      }
    });
  });

  ws.on("close", () => {
    console.log("CLIENT DISCONNECTED");
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log("Listening on", PORT);
});
