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

// ---------------- FORCE CONNECT ----------------
function connect() {
  log("Connecting WebSocket...");

  ws = new WebSocket(SERVER);

  ws.onopen = () => {
    log("WebSocket OPEN ✅");
    setStatus("connected");
  };

  ws.onerror = (e) => {
    log("WebSocket ERROR ❌");
    setStatus("error");
  };

  ws.onclose = () => {
    log("WebSocket CLOSED ❌");
    setStatus("disconnected");
  };

  ws.onmessage = async (event) => {
    log("MESSAGE: " + event.data);

    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      log("Bad JSON");
      return;
    }

    if (data.offer) {
      incomingOffer = data.offer;
      setStatus("📞 incoming call");
      alert("Incoming Call 📞");
    }

    if (data.answer && pc) {
      await pc.setRemoteDescription(data.answer);
      setStatus("in call");
    }

    if (data.candidate && pc) {
      try {
        await pc.addIceCandidate(data.candidate);
      } catch (e) {
        log("ICE error");
      }
    }
  };
}

// START IMMEDIATELY
connect();

// ---------------- PEER ----------------
async function createPeer() {
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      ws.send(JSON.stringify({ candidate: e.candidate }));
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
    alert("WebSocket not connected yet");
    return;
  }

  await createPeer();

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  ws.send(JSON.stringify({ offer }));

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

  ws.send(JSON.stringify({ answer }));

  setStatus("in call");
}

// ---------------- HANGUP ----------------
function hangUp() {
  ws.send(JSON.stringify({ hangup: true }));
  if (pc) pc.close();
  pc = null;
  incomingOffer = null;
  setStatus("ended");
}
</script>

</body>
</html>
