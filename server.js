<!DOCTYPE html>
<html>
<head>
  <title>Voice Call</title>
</head>
<body>

<h2>Voice Call System</h2>

<button onclick="startCall()">📞 Call</button>
<button onclick="answerCall()">📲 Answer</button>
<button onclick="declineCall()">❌ Decline</button>
<button onclick="hangUp()">🔴 Hang Up</button>

<p id="status">Status: idle</p>

<script>
const SERVER = "wss://voice-server-s87r.onrender.com";

let ws;
let pc;
let localStream;

let incomingOffer = null;

const statusEl = document.getElementById("status");

// ---------------- CONNECT ----------------
function connect() {
  ws = new WebSocket(SERVER);

  ws.onopen = () => {
    setStatus("connected");
  };

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    console.log("RECEIVED:", data);

    // 📞 INCOMING CALL
    if (data.offer) {
      incomingOffer = data.offer;
      setStatus("incoming call 📞");

      alert("Incoming Call!");
    }

    // 📲 ANSWER
    if (data.answer && pc) {
      await pc.setRemoteDescription(data.answer);
      setStatus("in call");
    }

    // 📡 ICE
    if (data.candidate && pc) {
      try {
        await pc.addIceCandidate(data.candidate);
      } catch (e) {
        console.log(e);
      }
    }

    // ❌ DECLINE
    if (data.decline) {
      setStatus("call declined");
      cleanup();
    }

    // 🔴 HANGUP
    if (data.hangup) {
      setStatus("call ended");
      cleanup();
    }
  };
}

// ---------------- PEER ----------------
async function createPeer() {
  pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
    ]
  });

  localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });

  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({ candidate: event.candidate }));
    }
  };

  pc.ontrack = (event) => {
    const audio = document.createElement("audio");
    audio.srcObject = event.streams[0];
    audio.autoplay = true;
    document.body.appendChild(audio);
  };
}

// ---------------- CALL ----------------
async function startCall() {
  connect();
  await createPeer();

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  ws.send(JSON.stringify({ offer }));

  setStatus("calling...");
}

// ---------------- ANSWER ----------------
async function answerCall() {
  if (!incomingOffer) return;

  await createPeer();

  await pc.setRemoteDescription(incomingOffer);

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  ws.send(JSON.stringify({ answer }));

  setStatus("in call");
}

// ---------------- DECLINE ----------------
function declineCall() {
  ws.send(JSON.stringify({ decline: true }));
  cleanup();
  setStatus("declined");
}

// ---------------- HANGUP ----------------
function hangUp() {
  ws.send(JSON.stringify({ hangup: true }));
  cleanup();
  setStatus("ended");
}

// ---------------- CLEAN ----------------
function cleanup() {
  if (pc) pc.close();
  pc = null;
  incomingOffer = null;
}

// ---------------- STATUS UI ----------------
function setStatus(text) {
  statusEl.innerText = "Status: " + text;
}
</script>

</body>
</html>
