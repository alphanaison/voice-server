const http = require("http");
const WebSocket = require("ws");

console.log("SERVER STARTED");

const server = http.createServer((req, res) => {
  res.end("alive");
});

const wss = new WebSocket.Server({ server });

// store users
const users = new Map();

wss.on("connection", (ws) => {
  let id = null;

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg.toString());
    } catch {
      return;
    }

    // REGISTER
    if (data.type === "register") {
      id = data.id;
      users.set(id, ws);
      console.log("REGISTERED:", id);
      return;
    }

    // ROUTE MESSAGE
    if (data.to && users.has(data.to)) {
      users.get(data.to).send(JSON.stringify(data));
    }
  });

  ws.on("close", () => {
    if (id) users.delete(id);
  });
});

server.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log("Listening");
});
