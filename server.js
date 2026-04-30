const http = require("http");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Voice server running (Stage 3.3)");
});

const wss = new WebSocket.Server({ server });

// userId → deviceId → ws
const users = new Map();

// callId → { from, to, answeredBy }
const calls = new Map();

function generateId() {
  return Math.random().toString(36).slice(2);
}

function sendToUser(userId, data) {
  const devices = users.get(userId);
  if (!devices) return;

  const msg = JSON.stringify(data);

  for (const ws of devices.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

function sendToDevice(userId, deviceId, data) {
  const devices = users.get(userId);
  if (!devices) return;

  const ws = devices.get(deviceId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on("connection", (ws) => {
  let userId = null;
  let deviceId = null;

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
      deviceId = data.deviceId;

      if (!users.has(userId)) users.set(userId, new Map());
      users.get(userId).set(deviceId, ws);

      console.log("REGISTERED:", userId, deviceId);
      return;
    }

    // CALL
    if (data.type === "call") {
      const callId = generateId();

      calls.set(callId, {
        from: data.from,
        to: data.to,
        answeredBy: null
      });

      sendToUser(data.to, {
        type: "incoming",
        from: data.from,
        callId,
        payload: data.payload
      });

      return;
    }

    // ANSWER (LOCK)
    if (data.type === "answer") {
      const call = calls.get(data.callId);
      if (!call) return;

      if (call.answeredBy) return; // 🔒 lock

      call.answeredBy = data.deviceId;

      sendToUser(call.from, {
        type: "answer",
        from: data.from,
        callId: data.callId,
        payload: data.payload
      });

      return;
    }

    // ICE
    if (data.type === "ice") {
      const call = calls.get(data.callId);
      if (!call) return;

      const target =
        call.from === data.from ? call.to : call.from;

      sendToUser(target, {
        type: "ice",
        from: data.from,
        callId: data.callId,
        payload: data.payload
      });

      return;
    }

    // HANGUP
    if (data.type === "hangup") {
      const call = calls.get(data.callId);
      if (!call) return;

      sendToUser(call.from, { type: "hangup", callId: data.callId });
      sendToUser(call.to, { type: "hangup", callId: data.callId });

      calls.delete(data.callId);
    }
  });

  ws.on("close", () => {
    if (userId && deviceId) {
      const devices = users.get(userId);
      if (devices) {
        devices.delete(deviceId);
        if (devices.size === 0) users.delete(userId);
      }
    }
  });
});

server.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log("SERVER READY (STAGE 3.3)");
});
