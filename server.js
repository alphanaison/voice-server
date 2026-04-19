const http = require("http");
const WebSocket = require("ws");

console.log("SERVER STARTED");

const server = http.createServer((req, res) => {
  res.end("WebRTC server alive");
});

const wss = new WebSocket.Server({ server });

// store users by ID
const users = new Map();

/*
Client must first send:
{ register: "user1" }
*/

wss.on("connection", (ws) => {
  let userId = null;

  ws.on("message", (msg) => {
    let data;

    try {
      data = JSON.parse(msg.toString());
    } catch {
      return;
    }

    // REGISTER USER
    if (data.register) {
      userId = data.register;
      users.set(userId, ws);
      console.log("REGISTERED:", userId);
      return;
    }

    // ROUTE CALLS
    if (data.to && users.has(data.to)) {
      const target = users.get(data.to);

      if (target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify(data));
      }
    }
  });

  ws.on("close", () => {
    if (userId) users.delete(userId);
  });
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Listening on", PORT);
});
