const http = require("http");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Voice server running (Stage 2)");
});

const wss = new WebSocket.Server({ server });

// userId → Set of sockets
const users = new Map();

// user call states (NEW)
const callState = new Map(); 
// format: { userId: "idle | calling | ringing | in-call" }

function setState(userId, state) {
  callState.set(userId, state);
}

function getState(userId) {
  return callState.get(userId) || "idle";
}

function addUser(userId, ws) {
  if (!users.has(userId)) users.set(userId, new Set());
  users.get(userId).add(ws);
  setState(userId, "idle");
}

function removeUser(userId, ws) {
  if (!users.has(userId)) return;

  users.get(userId).delete(ws);

  if (users.get(userId).size === 0) {
    users.delete(userId);
    callState.delete(userId);
  }
}

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

    // CALL (STATE CONTROL ADDED)
    if (data.type === "call") {
      if (getState(data.to) !== "idle") {
        send(data.from, {
          type: "busy",
          from: data.to
        });
        return;
      }

      setState(data.from, "calling");
      setState(data.to, "ringing");

      send(data.to, {
        type: "incoming",
        from: data.from,
        payload: data.payload
      });

      return;
    }

    // ANSWER
    if (data.type === "answer") {
      setState(data.from, "in-call");
      setState(data.to, "in-call");

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
      setState(data.from, "idle");
      setState(data.to, "idle");

      send(data.to, {
        type: "hangup",
        from: data.from
      });

      return;
    }
  });

  ws.on("close", () => {
    if (userId) {
      removeUser(userId, ws);
      console.log("DISCONNECTED:", userId);
    }
  });
});

server.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log("SERVER READY (STAGE 2)");
});
