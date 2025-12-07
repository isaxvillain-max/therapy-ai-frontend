# Voice AI — Frontend Demo

This is a small frontend-only demo project that shows basic voice features in the browser:

Features
- Record audio using the microphone (MediaRecorder).
- Simple speech-to-text (SpeechRecognition) if supported by the browser.
- Text-to-speech (SpeechSynthesis) for instant voice playback.
- Two example avatar PNGs for optional UI use.

How to use
1. Open `index.html` in a modern browser (Chrome or Edge recommended).
2. Allow microphone access when prompted.
3. Use "Start Recording" / "Stop" to capture audio and "Play Last" to listen.
4. Type text into the TTS box and click Speak to hear it.

Notes
- Recording saves audio in-memory only (no server).
- Browser support varies. The SpeechRecognition API is better supported in Chrome-based browsers.
- This is a demo template — feel free to extend it with server integration, cloud TTS/ASR, or UI changes.

Made for quick demo and prototyping.
