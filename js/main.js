/* main.js
   Voice-only continuous Therapy AI conversation.
   - Session memory in localStorage (last 10 pairs)
   - Emotion keyword booster
   - Connected to Railway backend
*/

// ====== CONFIG ======
const BACKEND_URL = "https://therapy-backend-production-3628.up.railway.app/getAIReply"; // LIVE Railway backend
const MAX_SESSION_ENTRIES = 10; // how many recent pairs to keep
const EMOTION_KEYWORDS = ["sad","hopeless","depressed","anxious","alone","suicid","worthless","panic","overwhelmed","stressed","lonely","helpless"];

// ====== UI ======
const welcomePopup = document.getElementById("welcomePopup");
const closePopupBtn = document.getElementById("closePopup");
const startCallBtn = document.getElementById("startCallBtn");
const stopCallBtn = document.getElementById("stopCallBtn");
const statusEl = document.getElementById("status");
const sessionLogEl = document.getElementById("sessionLog");
const clearSessionBtn = document.getElementById("clearSession");

let selectedVoice = "male";
let recognition = null;
let isRecording = false;
let sessionHistory = JSON.parse(localStorage.getItem("therapySession") || "[]");

// ====== First Launch Popup ======
if (!localStorage.getItem("firstLaunchDone")) {
  welcomePopup.style.display = "flex";
}
closePopupBtn.addEventListener("click", () => {
  welcomePopup.style.display = "none";
  localStorage.setItem("firstLaunchDone", "true");
});

// voice selection buttons
document.getElementById("maleBtn").addEventListener("click", () => selectVoice("male"));
document.getElementById("femaleBtn").addEventListener("click", () => selectVoice("female"));

function selectVoice(which) {
  selectedVoice = which;
  document.getElementById("maleBtn").classList.toggle("selected", which === "male");
  document.getElementById("femaleBtn").classList.toggle("selected", which === "female");
  statusEl.innerText = `Status: ${which[0].toUpperCase() + which.slice(1)} voice selected`;
}

// session UI render
function renderSession() {
  sessionLogEl.innerHTML = "";
  sessionHistory.slice().reverse().forEach(pair => {
    const u = document.createElement("div");
    u.className = "session-entry user";
    u.innerText = "You: " + pair.user;
    sessionLogEl.appendChild(u);

    const a = document.createElement("div");
    a.className = "session-entry ai";
    a.innerText = "AI: " + pair.ai;
    sessionLogEl.appendChild(a);
  });
}
renderSession();

clearSessionBtn.addEventListener("click", () => {
  sessionHistory = [];
  localStorage.removeItem("therapySession");
  renderSession();
});

// ====== Start / Stop Controls ======
startCallBtn.addEventListener("click", () => { if (!isRecording) startContinuousConversation(); });
stopCallBtn.addEventListener("click", () => stopContinuousConversation());

function startContinuousConversation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Your browser does not support Speech Recognition. Use Chrome or Edge.");
    return;
  }
  isRecording = true;
  startCallBtn.disabled = true;
  stopCallBtn.disabled = false;
  statusEl.innerText = "Status: Listening (allow microphone)...";
  listenAndReply(); // starts loop
}

function stopContinuousConversation() {
  isRecording = false;
  startCallBtn.disabled = false;
  stopCallBtn.disabled = true;
  statusEl.innerText = "Status: Stopped.";
  if (recognition) try { recognition.stop(); } catch(e) {}
  recognition = null;
}

// ====== Listening + AI Loop ======
async function listenAndReply() {
  if (!isRecording) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();
  statusEl.innerText = "Status: Listening...";

  recognition.onresult = async (event) => {
    const userText = event.results[0][0].transcript;
    addSessionPartial(userText, null);
    statusEl.innerText = `You said: "${userText}"`;

    const lowered = userText.toLowerCase();
    const containsEmotion = EMOTION_KEYWORDS.some(k => lowered.includes(k));

    const payload = {
      text: userText,
      session: sessionHistory.slice(-MAX_SESSION_ENTRIES),
      emotion_flag: containsEmotion
    };

    const aiReply = await getAIReply(payload);
    addSessionFull(userText, aiReply);
    await speakAndWait(aiReply);

    if (isRecording) listenAndReply();
  };

  recognition.onerror = (event) => {
    console.error("Recognition error", event.error);
    statusEl.innerText = "Status: Error listening — retrying...";
    setTimeout(() => { if (isRecording) listenAndReply(); }, 700);
  };

  recognition.onend = () => {
    if (isRecording) setTimeout(() => { if (isRecording) listenAndReply(); }, 250);
  };
}

// ====== Session Helpers ======
function addSessionPartial(userText, aiText) {
  sessionHistory.push({ user: userText, ai: aiText || "..." });
  if (sessionHistory.length > MAX_SESSION_ENTRIES) sessionHistory.shift();
  localStorage.setItem("therapySession", JSON.stringify(sessionHistory));
  renderSession();
}

function addSessionFull(userText, aiText) {
  if (sessionHistory.length && sessionHistory[sessionHistory.length-1].user === userText && sessionHistory[sessionHistory.length-1].ai === "...") {
    sessionHistory[sessionHistory.length-1].ai = aiText;
  } else {
    sessionHistory.push({ user: userText, ai: aiText });
  }
  if (sessionHistory.length > MAX_SESSION_ENTRIES) sessionHistory.shift();
  localStorage.setItem("therapySession", JSON.stringify(sessionHistory));
  renderSession();
}

// ====== Backend call ======
async function getAIReply(payload) {
  try {
    const resp = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    return data.reply || "I hear you. Can you tell me more about how that feels?";
  } catch (err) {
    console.error("Backend error:", err);
    return "I am here to listen. Could you say that again?";
  }
}

// ====== Text-to-Speech ======
function speakAndWait(text) {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    let chosen = voices.find(v => v.name.toLowerCase().includes(selectedVoice));
    if (!chosen) chosen = voices[0] || null;
    if (chosen) utterance.voice = chosen;
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = (selectedVoice === "female") ? 1.02 : 0.98;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}
