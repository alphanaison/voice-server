const http = require("http");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  res.end("Voice server alive");
});

const wss = new WebSocket.Server({ server });

const users = new Map(); // id -> ws

function send(to, data) {
  const client = users.get(to);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
  }
}

wss.on("connection", (ws) => {
  let userId = null;

  ws.on("message", (msg) => {
    const data = JSON.parse(msg.toString());

    // REGISTER
    if (data.type === "register") {
      userId = data.from;
      users.set(userId, ws);
      console.log("REGISTERED:", userId);
      return;
    }

    // CALL -> forward incoming call
    if (data.type === "call") {
      send(data.to, {
        type: "incoming",
        from: data.from,
        payload: data.payload
      });
      return;
    }

    // ANSWER
    if (data.type === "answer") {
      send(data.to, {
        type: "answer",
        from: data.from,
        payload: data.payload
      });
      return;
    }

    // ICE
    if (data.type === "ice") {
      send(data.to, {
        type: "ice",
        from: data.from,
        payload: data.payload
      });
      return;
    }

    // HANGUP
    if (data.type === "hangup") {
      send(data.to, {
        type: "hangup",
        from: data.from
      });
      return;
    }
  });

  ws.on("close", () => {
    if (userId) users.delete(userId);
    console.log("DISCONNECTED:", userId);
  });
});

server.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log("SERVER READY");
});
