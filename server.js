const http = require("http");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  res.end("Voice server running");
});

const wss = new WebSocket.Server({ server });

// userId → ws
const users = new Map();

// callId → { from, to, status }
const calls = new Map();

function send(to, data) {
  const ws = users.get(to);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on("connection", (ws) => {
  let userId = null;

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg.toString());
    } catch {
      return;
    }

    // REGISTER
    if (data.type === "register") {
      userId = data.id;
      users.set(userId, ws);

      console.log("REGISTER:", userId);
      return;
    }

    // CALL INITIATION
    if (data.type === "call") {
      const callId = `${data.from}->${data.to}`;

      calls.set(callId, {
        from: data.from,
        to: data.to,
        status: "ringing"
      });

      send(data.to, {
        type: "incoming",
        from: data.from,
        callId
      });

      return;
    }

    // OFFER
    if (data.type === "offer") {
      send(data.to, {
        type: "offer",
        from: data.from,
        offer: data.offer
      });
      return;
    }

    // ANSWER
    if (data.type === "answer") {
      send(data.to, {
        type: "answer",
        from: data.from,
        answer: data.answer
      });
      return;
    }

    // ICE
    if (data.type === "ice") {
      send(data.to, {
        type: "ice",
        candidate: data.candidate
      });
      return;
    }

    // HANGUP
    if (data.type === "hangup") {
      send(data.to, { type: "hangup" });
      return;
    }
  });

  ws.on("close", () => {
    if (userId) users.delete(userId);
  });
});

server.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log("PRODUCTION VOICE SERVER RUNNING");
});
