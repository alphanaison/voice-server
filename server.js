const http = require("http");
const WebSocket = require("ws");

console.log("SERVER STARTED");

const server = http.createServer((req, res) => {
  // 🔥 THIS FIXES YOUR PROBLEM
  res.writeHead(200);
  res.end("WebSocket server is running");
});

const wss = new WebSocket.Server({ server });

let clients = [];

wss.on("connection", (ws) => {
  console.log("CLIENT CONNECTED");

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
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
