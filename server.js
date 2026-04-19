const http = require("http");
const WebSocket = require("ws");

console.log("SERVER STARTED");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebRTC signaling server alive");
});

const wss = new WebSocket.Server({ server });

function broadcast(sender, data) {
  wss.clients.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on("connection", (ws) => {
  console.log("CLIENT CONNECTED");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      console.log("MSG TYPE:", Object.keys(data)[0]);

      // Relay everything except sender
      broadcast(ws, JSON.stringify(data));

    } catch (err) {
      console.log("INVALID MESSAGE RECEIVED");
    }
  });

  ws.on("close", () => {
    console.log("CLIENT DISCONNECTED");
  });

  ws.on("error", (err) => {
    console.log("WS ERROR:", err.message);
  });
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Listening on", PORT);
});
