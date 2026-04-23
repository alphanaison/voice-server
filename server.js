const http = require("http");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Voice server running (Stage 3.2)");
});

const wss = new WebSocket.Server({ server });

// userId → Set of sockets
const users = new Map();

// active calls
// callId → { from, to, answered }
const calls = new Map();

// user → current callId
const userCall = new Map();

function send(userId, data) {
  const conns = users.get(userId);
  if (!conns) return;

  const msg = JSON.stringify(data);

  for (const ws of conns) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

function addUser(userId, ws) {
  if (!users.has(userId)) users.set(userId, new Set());
  users.get(userId).add(ws);
}

function removeUser(userId, ws) {
  if (!users.has(userId)) return;

  users.get(userId).delete(ws);

  if (users.get(userId).size === 0) {
    users.delete(userId);
  }
}

function generateCallId() {
  return Math.random().toString(36).slice(2);
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
      userId = data.from;
      addUser(userId, ws);
      console.log("REGISTERED:", userId);
      return;
    }

    // CALL
    if (data.type === "call") {
      if (userCall.has(data.from) || userCall.has(data.to)) {
        send(data.from, { type: "busy", from: data.to });
        return;
      }

      const callId = generateCallId();

      calls.set(callId, {
        from: data.from,
        to: data.to,
        answered: false
      });

      userCall.set(data.from, callId);
      userCall.set(data.to, callId);

      send(data.to, {
        type: "incoming",
        from: data.from,
        callId,
        payload: data.payload
      });

      return;
    }

    // ANSWER
    if (data.type === "answer") {
      const callId = userCall.get(data.from);
      if (!callId) return;

      const call = calls.get(callId);
      if (!call) return;

      call.answered = true;

      send(call.from, {
        type: "answer",
        from: data.from,
        callId,
        payload: data.payload
      });

      return;
    }

    // ICE
    if (data.type === "ice") {
      const callId = userCall.get(data.from);
      if (!callId) return;

      const call = calls.get(callId);
      if (!call) return;

      const other = call.from === data.from ? call.to : call.from;

      send(other, {
        type: "ice",
        from: data.from,
        callId,
        payload: data.payload
      });

      return;
    }

    // HANGUP
    if (data.type === "hangup") {
      const callId = userCall.get(data.from);
      if (!callId) return;

      const call = calls.get(callId);
      if (!call) return;

      const other = call.from === data.from ? call.to : call.from;

      send(other, {
        type: "hangup",
        from: data.from,
        callId
      });

      userCall.delete(call.from);
      userCall.delete(call.to);
      calls.delete(callId);

      return;
    }
  });

  ws.on("close", () => {
    if (userId) {
      removeUser(userId, ws);

      const callId = userCall.get(userId);
      if (callId) {
        const call = calls.get(callId);
        if (call) {
          const other = call.from === userId ? call.to : call.from;

          send(other, { type: "hangup", from: userId });

          userCall.delete(call.from);
          userCall.delete(call.to);
          calls.delete(callId);
        }
      }

      console.log("DISCONNECTED:", userId);
    }
  });
});

server.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log("SERVER READY (STAGE 3.2)");
});
