const http = require("http");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("OK");
});

const wss = new WebSocket.Server({ server });

let clients = [];

wss.on("connection", (ws) => {
  clients.push(ws);
  console.log("CLIENT CONNECTED");

  ws.on("message", (msg) => {
    let data;

    try {
      data = JSON.parse(msg);
    } catch (e) {
      return;
    }

    // 🔥 ROUTE BY TYPE (THIS IS THE FIX)
    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {

        if (data.offer) {
          client.send(JSON.stringify({ offer: data.offer }));
        }

        if (data.answer) {
          client.send(JSON.stringify({ answer: data.answer }));
        }

        if (data.candidate) {
          client.send(JSON.stringify({ candidate: data.candidate }));
        }

      }
    });
  });

  ws.on("close", () => {
    clients = clients.filter(c => c !== ws);
  });
});

server.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log("Server running");
});
