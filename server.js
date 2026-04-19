<!DOCTYPE html>
<html>
<head>
  <title>Voice Debug System</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>

<h2>Voice Debug System</h2>

<button onclick="startCall()">📞 Call</button>
<button onclick="answerCall()">📲 Answer</button>
<button onclick="hangUp()">🔴 Hang Up</button>

<p id="status">Status: starting...</p>
<pre id="log"></pre>

<script>
const SERVER = "wss://voice-server-s87r.onrender.com";

let ws;
let pc;
let incomingOffer = null;

const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");

function log(msg) {
  console.log(msg);
  logEl.innerText += msg + "\n";
}

function setStatus(msg) {
  statusEl.innerText = "Status: " + msg;
}

// ---------------- SAFE SEND ----------------
function send(data) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  } else {
    log("WS not ready ❌");
  }
}

// ---------------- CONNECT ----------------
function connect() {
  log("Connecting WebSocket...");

  ws = new WebSocket(SERVER);

  ws.onopen = () => {
    log("WebSocket OPEN ✅");
    setStatus("connected");
  };

  ws.onerror = () => {
    log("WebSocket ERROR ❌");
    setStatus("error");
  };

  ws.onclose = () => {
    log("WebSocket CLOSED ❌ retrying...");
    setStatus("reconnecting...");
    setTimeout(connect, 2000);
  };

  ws.onmessage = async (event) => {
    log("MESSAGE: " + event.data);

    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    // 📞 incoming call
    if (data.offer) {
      incomingOffer = data.offer;
      setStatus("📞 incoming call");
      alert("Incoming Call 📞");
    }

    // 📲 answer received
    if (data.answer && pc) {
      await pc.setRemoteDescription(data.answer);
      setStatus("in call");
    }

    // 📡 ICE
    if (data.candidate && pc) {
      try {
        await pc.addIceCandidate(data.candidate);
      } catch {}
    }

    // ❌ hangup
    if (data.hangup) {
      cleanup();
      setStatus("call ended");
    }
  };
}

connect();

// ---------------- PEER ----------------
async function createPeer() {
  cleanup(); // important reset before new call

  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      send({ candidate: e.candidate });
    }
  };

  pc.ontrack = (e) => {
    const audio = document.createElement("audio");
    audio.srcObject = e.streams[0];
    audio.autoplay = true;
    document.body.appendChild(audio);
  };
}

// ---------------- CALL ----------------
async function startCall() {
  log("CALL CLICKED");

  if (!ws || ws.readyState !== 1) {
    alert("Not connected yet");
    return;
  }

  await createPeer();

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  send({ offer });

  setStatus("calling...");
  log("Offer sent");
}

// ---------------- ANSWER ----------------
async function answerCall() {
  log("ANSWER CLICKED");

  if (!incomingOffer) {
    alert("No incoming call");
    return;
  }

  await createPeer();

  await pc.setRemoteDescription(incomingOffer);

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  send({ answer });

  setStatus("in call");
}

// ---------------- HANGUP ----------------
function hangUp() {
  send({ hangup: true });
  cleanup();
  setStatus("ended");
}

// ---------------- CLEANUP ----------------
function cleanup() {
  if (pc) {
    pc.close();
    pc = null;
  }
  incomingOffer = null;
}
</script>

</body>
</html>
