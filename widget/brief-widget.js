(function () {
  'use strict';

  // ─── CONFIGURATION ────────────────────────────────────────────────────────
  const API_BASE = 'https://momentscollective-eight.vercel.app';
  const BOOKING_URL = 'https://calendly.com/momentscollective'; // Update with Rob's actual URL
  const STORAGE_KEY = 'mc_brief_session';

  // ─── STATE ────────────────────────────────────────────────────────────────
  const state = {
    isOpen: false,
    messages: [],
    sessionId: null,
    isLoading: false,
    briefDetected: false,
    brief: null,
    emailSent: false,
    initialized: false,
  };

  // ─── DICTATION STATE ──────────────────────────────────────────────────────
  let recognition = null;
  let isRecording = false;
  let committedText = '';

  // ─── STYLES ───────────────────────────────────────────────────────────────
  function injectStyles() {
    const css = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;1,300&family=Playfair+Display:wght@400;500&display=swap');

      #mc-trigger {
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 99998;
        display: flex;
        align-items: center;
        gap: 10px;
        background: #0d0d0d;
        border: 1px solid rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.9);
        font-family: 'DM Mono', 'Courier New', monospace;
        font-size: 10px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        padding: 13px 20px;
        cursor: pointer;
        transition: all 0.25s ease;
        box-shadow: 0 4px 32px rgba(0,0,0,0.5);
      }

      #mc-trigger:hover {
        background: #1a1a1a;
        border-color: rgba(255,255,255,0.3);
        transform: translateY(-1px);
        box-shadow: 0 8px 40px rgba(0,0,0,0.6);
      }

      #mc-trigger .mc-trigger-dot {
        width: 6px;
        height: 6px;
        background: rgba(255,255,255,0.5);
        border-radius: 50%;
        animation: mc-pulse 2.5s ease-in-out infinite;
      }

      @keyframes mc-pulse {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.3); }
      }

      #mc-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 99998;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
        backdrop-filter: blur(2px);
      }

      #mc-overlay.mc-visible {
        opacity: 1;
        pointer-events: all;
      }

      #mc-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 440px;
        max-width: 100vw;
        z-index: 99999;
        background: #080808;
        border-left: 1px solid rgba(255,255,255,0.08);
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: -8px 0 48px rgba(0,0,0,0.6);
      }

      #mc-panel.mc-open {
        transform: translateX(0);
      }

      #mc-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        flex-shrink: 0;
      }

      #mc-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      #mc-logo-mark {
        width: 28px;
        height: 28px;
        border: 1px solid rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'DM Mono', monospace;
        font-size: 9px;
        letter-spacing: 0.1em;
        color: rgba(255,255,255,0.6);
      }

      #mc-header-title {
        font-family: 'DM Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.5);
      }

      #mc-close {
        background: none;
        border: none;
        cursor: pointer;
        color: rgba(255,255,255,0.35);
        font-size: 18px;
        line-height: 1;
        padding: 4px;
        transition: color 0.2s ease;
        font-family: sans-serif;
      }

      #mc-close:hover {
        color: rgba(255,255,255,0.7);
      }

      #mc-chat-window {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        scroll-behavior: smooth;
      }

      #mc-chat-window::-webkit-scrollbar {
        width: 3px;
      }

      #mc-chat-window::-webkit-scrollbar-track {
        background: transparent;
      }

      #mc-chat-window::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
      }

      .mc-msg {
        display: flex;
        flex-direction: column;
        max-width: 88%;
        animation: mc-fade-in 0.3s ease;
      }

      @keyframes mc-fade-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .mc-msg.mc-assistant {
        align-self: flex-start;
      }

      .mc-msg.mc-user {
        align-self: flex-end;
      }

      .mc-msg-bubble {
        padding: 12px 16px;
        font-family: 'DM Mono', monospace;
        font-size: 12.5px;
        line-height: 1.65;
        color: rgba(255,255,255,0.82);
      }

      .mc-assistant .mc-msg-bubble {
        background: #111111;
        border: 1px solid rgba(255,255,255,0.06);
      }

      .mc-user .mc-msg-bubble {
        background: #1c1c1c;
        border: 1px solid rgba(255,255,255,0.1);
        text-align: right;
      }

      /* Typing indicator */
      .mc-typing {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 14px 16px;
        background: #111111;
        border: 1px solid rgba(255,255,255,0.06);
        width: fit-content;
        animation: mc-fade-in 0.3s ease;
      }

      .mc-typing-dot {
        width: 4px;
        height: 4px;
        background: rgba(255,255,255,0.4);
        border-radius: 50%;
        animation: mc-bounce 1.2s ease-in-out infinite;
      }

      .mc-typing-dot:nth-child(2) { animation-delay: 0.15s; }
      .mc-typing-dot:nth-child(3) { animation-delay: 0.3s; }

      @keyframes mc-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
        40% { transform: translateY(-5px); opacity: 1; }
      }

      /* Brief card */
      .mc-brief-card {
        background: #0a0a0a;
        border: 1px solid rgba(255,255,255,0.12);
        padding: 28px;
        margin: 8px 0;
        animation: mc-fade-in 0.5s ease;
        width: 100%;
        box-sizing: border-box;
      }

      .mc-brief-eyebrow {
        font-family: 'DM Mono', monospace;
        font-size: 8px;
        letter-spacing: 0.28em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.3);
        margin: 0 0 6px 0;
      }

      .mc-brief-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 20px;
        font-weight: 400;
        color: #ffffff;
        letter-spacing: 0.01em;
        margin: 0 0 28px 0;
        line-height: 1.3;
      }

      .mc-brief-field {
        margin-bottom: 18px;
      }

      .mc-brief-label {
        font-family: 'DM Mono', monospace;
        font-size: 7.5px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.3);
        margin: 0 0 5px 0;
      }

      .mc-brief-value {
        font-family: 'DM Mono', monospace;
        font-size: 12px;
        color: rgba(255,255,255,0.8);
        line-height: 1.6;
        margin: 0;
      }

      .mc-tone-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 0;
      }

      .mc-tone-tag {
        border: 1px solid rgba(255,255,255,0.18);
        padding: 4px 10px;
        font-family: 'DM Mono', monospace;
        font-size: 9px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.55);
      }

      .mc-brief-divider {
        border: none;
        border-top: 1px solid rgba(255,255,255,0.06);
        margin: 20px 0;
      }

      .mc-brief-producer-note {
        font-family: 'DM Mono', monospace;
        font-size: 11.5px;
        color: rgba(255,255,255,0.45);
        line-height: 1.7;
        font-style: italic;
        margin: 0;
      }

      .mc-cta-btn {
        display: block;
        width: 100%;
        margin-top: 24px;
        padding: 15px;
        background: #ffffff;
        color: #000000;
        text-align: center;
        font-family: 'DM Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        font-weight: 400;
        border: none;
        cursor: pointer;
        transition: background 0.2s ease, transform 0.15s ease;
        text-decoration: none;
        box-sizing: border-box;
      }

      .mc-cta-btn:hover {
        background: #e8e8e8;
        transform: translateY(-1px);
      }

      /* Input area */
      #mc-input-area {
        display: flex;
        align-items: flex-end;
        gap: 10px;
        padding: 16px 20px;
        border-top: 1px solid rgba(255,255,255,0.06);
        flex-shrink: 0;
        background: #080808;
      }

      #mc-input {
        flex: 1;
        background: #111;
        border: 1px solid rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.85);
        font-family: 'DM Mono', monospace;
        font-size: 12.5px;
        line-height: 1.5;
        padding: 11px 14px;
        resize: none;
        outline: none;
        min-height: 44px;
        max-height: 120px;
        overflow-y: auto;
        transition: border-color 0.2s ease;
      }

      #mc-input::placeholder {
        color: rgba(255,255,255,0.2);
      }

      #mc-input:focus {
        border-color: rgba(255,255,255,0.25);
      }

      #mc-send {
        width: 44px;
        height: 44px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.6);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
        font-size: 14px;
      }

      #mc-send:hover:not(:disabled) {
        background: rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.9);
      }

      #mc-send:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      #mc-mic {
        width: 44px;
        height: 44px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.6);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      #mc-mic:hover {
        background: rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.9);
      }

      #mc-mic.mc-mic-active {
        background: rgba(200,60,60,0.18);
        border-color: rgba(200,60,60,0.45);
        color: rgba(230,100,100,1);
        animation: mc-mic-pulse 1.5s ease-in-out infinite;
      }

      @keyframes mc-mic-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(200,60,60,0.35); }
        50% { box-shadow: 0 0 0 5px rgba(200,60,60,0); }
      }

      /* Contact capture */
      .mc-contact-capture {
        background: #0a0a0a;
        border: 1px solid rgba(255,255,255,0.12);
        padding: 24px;
        margin: 8px 0;
        animation: mc-fade-in 0.5s ease;
        width: 100%;
        box-sizing: border-box;
      }

      .mc-contact-input {
        width: 100%;
        background: #111;
        border: 1px solid rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.85);
        font-family: 'DM Mono', monospace;
        font-size: 12px;
        padding: 10px 12px;
        outline: none;
        margin-bottom: 12px;
        box-sizing: border-box;
        transition: border-color 0.2s ease;
      }

      .mc-contact-input:focus {
        border-color: rgba(255,255,255,0.25);
      }

      .mc-contact-input::placeholder {
        color: rgba(255,255,255,0.2);
      }

      .mc-contact-submit {
        display: block;
        width: 100%;
        padding: 13px;
        background: #ffffff;
        color: #000000;
        text-align: center;
        font-family: 'DM Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        border: none;
        cursor: pointer;
        transition: background 0.2s ease, transform 0.15s ease;
        box-sizing: border-box;
      }

      .mc-contact-submit:hover {
        background: #e8e8e8;
        transform: translateY(-1px);
      }

      .mc-contact-skip {
        text-align: center;
        margin-top: 12px;
        font-family: 'DM Mono', monospace;
        font-size: 9px;
        letter-spacing: 0.12em;
        color: rgba(255,255,255,0.22);
        cursor: pointer;
        text-transform: uppercase;
      }

      .mc-contact-skip:hover {
        color: rgba(255,255,255,0.45);
      }

      #mc-powered {
        text-align: center;
        padding: 8px 0 4px;
        font-family: 'DM Mono', monospace;
        font-size: 8px;
        letter-spacing: 0.15em;
        color: rgba(255,255,255,0.15);
        text-transform: uppercase;
      }

      /* Mobile */
      @media (max-width: 480px) {
        #mc-trigger {
          bottom: 20px;
          right: 20px;
          padding: 11px 16px;
        }

        #mc-panel {
          width: 100vw;
          border-left: none;
        }

        .mc-brief-card {
          padding: 20px;
        }
      }
    `;

    const style = document.createElement('style');
    style.id = 'mc-widget-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ─── DOM CREATION ─────────────────────────────────────────────────────────
  function createDOM() {
    // Trigger button
    const trigger = document.createElement('button');
    trigger.id = 'mc-trigger';
    trigger.innerHTML = `<span class="mc-trigger-dot"></span><span>Tell Us Your Story</span>`;
    trigger.addEventListener('click', openPanel);

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'mc-overlay';
    overlay.addEventListener('click', closePanel);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'mc-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Creative Brief Assistant');

    panel.innerHTML = `
      <div id="mc-header">
        <div id="mc-header-left">
          <div id="mc-logo-mark">MC</div>
          <div id="mc-header-title">Creative Brief</div>
        </div>
        <button id="mc-close" aria-label="Close">✕</button>
      </div>
      <div id="mc-chat-window" role="log" aria-live="polite"></div>
      <div id="mc-input-area">
        <textarea
          id="mc-input"
          placeholder="Type your message…"
          rows="1"
          aria-label="Your message"
        ></textarea>
        <button id="mc-send" aria-label="Send message" disabled>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 1L7 13M7 1L2 6M7 1L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div id="mc-powered">Moments Collective</div>
    `;

    document.body.appendChild(trigger);
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    // Wire up close button
    document.getElementById('mc-close').addEventListener('click', closePanel);

    // Wire up input
    const input = document.getElementById('mc-input');
    const sendBtn = document.getElementById('mc-send');

    input.addEventListener('input', () => {
      // Auto-resize
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      // Enable/disable send
      sendBtn.disabled = input.value.trim().length === 0 || state.isLoading;
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) sendMessage();
      }
    });

    sendBtn.addEventListener('click', sendMessage);
  }

  // ─── PANEL OPEN/CLOSE ─────────────────────────────────────────────────────
  function openPanel() {
    state.isOpen = true;
    document.getElementById('mc-panel').classList.add('mc-open');
    document.getElementById('mc-overlay').classList.add('mc-visible');
    document.getElementById('mc-trigger').style.display = 'none';
    document.body.style.overflow = 'hidden';

    if (!state.initialized) {
      state.initialized = true;
      state.sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

      // Try to restore session
      const saved = restoreSession();
      if (saved) {
        renderSavedMessages();
      } else {
        // Inject the first message locally for instant feel
        const greeting = "Hey — tell me about what you're working on. What kind of project is this?";
        appendMessage('assistant', greeting);
        state.messages.push({ role: 'assistant', content: greeting });
        saveSession();
      }
    }

    // Focus input
    setTimeout(() => document.getElementById('mc-input').focus(), 350);
  }

  function closePanel() {
    if (isRecording) {
      isRecording = false;
      setMicInactive();
      if (recognition) recognition.stop();
      committedText = '';
    }

    state.isOpen = false;
    document.getElementById('mc-panel').classList.remove('mc-open');
    document.getElementById('mc-overlay').classList.remove('mc-visible');
    document.getElementById('mc-trigger').style.display = 'flex';
    document.body.style.overflow = '';
  }

  // ─── SESSION PERSISTENCE ──────────────────────────────────────────────────
  function saveSession() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        messages: state.messages,
        sessionId: state.sessionId,
        briefDetected: state.briefDetected,
        brief: state.brief,
        emailSent: state.emailSent,
      }));
    } catch (_) { /* sessionStorage might be unavailable */ }
  }

  function restoreSession() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      state.messages = saved.messages || [];
      state.sessionId = saved.sessionId || state.sessionId;
      state.briefDetected = saved.briefDetected || false;
      state.brief = saved.brief || null;
      state.emailSent = saved.emailSent || false;
      return state.messages.length > 0;
    } catch (_) {
      return false;
    }
  }

  function renderSavedMessages() {
    const chatWindow = document.getElementById('mc-chat-window');
    chatWindow.innerHTML = '';

    state.messages.forEach((msg) => {
      if (msg.role === 'brief') {
        appendBriefCard(msg.brief);
      } else {
        appendMessage(msg.role, msg.content);
      }
    });
  }

  // ─── MESSAGING ────────────────────────────────────────────────────────────
  function appendMessage(role, text) {
    const chatWindow = document.getElementById('mc-chat-window');

    const wrapper = document.createElement('div');
    wrapper.classList.add('mc-msg', `mc-${role}`);

    const bubble = document.createElement('div');
    bubble.classList.add('mc-msg-bubble');
    bubble.textContent = text;

    wrapper.appendChild(bubble);
    chatWindow.appendChild(wrapper);
    scrollToBottom();
  }

  function showTyping() {
    const chatWindow = document.getElementById('mc-chat-window');
    const typing = document.createElement('div');
    typing.id = 'mc-typing';
    typing.classList.add('mc-msg', 'mc-assistant');

    const indicator = document.createElement('div');
    indicator.classList.add('mc-typing');
    indicator.innerHTML = `
      <div class="mc-typing-dot"></div>
      <div class="mc-typing-dot"></div>
      <div class="mc-typing-dot"></div>
    `;

    typing.appendChild(indicator);
    chatWindow.appendChild(typing);
    scrollToBottom();
  }

  function hideTyping() {
    const el = document.getElementById('mc-typing');
    if (el) el.remove();
  }

  function scrollToBottom() {
    const chatWindow = document.getElementById('mc-chat-window');
    setTimeout(() => {
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }, 50);
  }

  // ─── DICTATION ────────────────────────────────────────────────────────────
  function initDictation() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    console.log('[MC Widget] initDictation called — SpeechRecognition available:', !!SpeechRecognition);
    if (!SpeechRecognition) return;

    // Dynamically inject the mic button only when speech is supported
    const micBtn = document.createElement('button');
    micBtn.id = 'mc-mic';
    micBtn.setAttribute('aria-label', 'Start dictation');
    micBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4.5" y="1" width="5" height="7.5" rx="2.5" stroke="currentColor" stroke-width="1.4"/>
        <path d="M1.5 7.5A5.5 5.5 0 0 0 12.5 7.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <line x1="7" y1="13" x2="7" y2="14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    `;
    const sendBtn = document.getElementById('mc-send');
    sendBtn.parentNode.insertBefore(micBtn, sendBtn);

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const input = document.getElementById('mc-input');
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        const space = committedText && !committedText.endsWith(' ') ? ' ' : '';
        committedText += space + finalTranscript.trim();
      }

      const gap = committedText && interimTranscript ? ' ' : '';
      input.value = committedText + gap + interimTranscript;

      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      document.getElementById('mc-send').disabled = input.value.trim().length === 0 || state.isLoading;
    };

    recognition.onend = () => {
      if (isRecording) {
        // Ended unexpectedly (timeout, etc.) — restart to keep listening
        try { recognition.start(); } catch (_) {}
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        isRecording = false;
        setMicInactive();
      }
    };

    micBtn.addEventListener('click', toggleDictation);
  }

  function toggleDictation() {
    if (!recognition) return;

    if (isRecording) {
      isRecording = false;
      setMicInactive();
      recognition.stop();
    } else {
      const input = document.getElementById('mc-input');
      committedText = input.value;
      isRecording = true;
      setMicActive();
      try {
        recognition.start();
      } catch (e) {
        isRecording = false;
        setMicInactive();
      }
    }
  }

  function setMicActive() {
    const micBtn = document.getElementById('mc-mic');
    if (micBtn) {
      micBtn.classList.add('mc-mic-active');
      micBtn.setAttribute('aria-label', 'Stop dictation');
    }
  }

  function setMicInactive() {
    const micBtn = document.getElementById('mc-mic');
    if (micBtn) {
      micBtn.classList.remove('mc-mic-active');
      micBtn.setAttribute('aria-label', 'Start dictation');
    }
  }

  // ─── SEND MESSAGE ─────────────────────────────────────────────────────────
  async function sendMessage() {
    // Stop dictation if active so the final text is committed
    if (isRecording) {
      isRecording = false;
      setMicInactive();
      if (recognition) recognition.stop();
    }

    const input = document.getElementById('mc-input');
    const sendBtn = document.getElementById('mc-send');
    const text = input.value.trim();

    if (!text || state.isLoading) return;

    // Add user message to UI and state
    appendMessage('user', text);
    state.messages.push({ role: 'user', content: text });
    saveSession();

    // Reset input
    input.value = '';
    input.style.height = 'auto';
    committedText = '';
    sendBtn.disabled = true;

    // Show loading state
    state.isLoading = true;
    showTyping();

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: state.messages.filter(m => m.role !== 'brief'),
          sessionId: state.sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      hideTyping();
      state.isLoading = false;

      // Render the assistant reply text
      if (data.reply) {
        appendMessage('assistant', data.reply);
        state.messages.push({ role: 'assistant', content: data.reply });
      }

      // If a brief was detected, render it
      if (data.briefDetected && data.brief) {
        state.briefDetected = true;
        state.brief = data.brief;
        state.messages.push({ role: 'brief', brief: data.brief });
        appendBriefCard(data.brief);

        // Show contact capture — it handles sending the email once info is collected
        if (!state.emailSent) {
          appendContactCapture(data.brief);
        }
      }

      saveSession();

    } catch (err) {
      hideTyping();
      state.isLoading = false;
      console.error('[MC Widget] Chat error:', err);
      appendMessage('assistant', "Something went wrong on my end — mind trying that again?");
    }

    // Re-enable send if there's content
    if (input.value.trim()) sendBtn.disabled = false;
  }

  // ─── BRIEF CARD RENDERING ─────────────────────────────────────────────────
  function appendBriefCard(brief) {
    const chatWindow = document.getElementById('mc-chat-window');

    const toneHtml = Array.isArray(brief.tone)
      ? brief.tone.map(t => `<span class="mc-tone-tag">${t}</span>`).join('')
      : `<span class="mc-tone-tag">${brief.tone}</span>`;

    const card = document.createElement('div');
    card.classList.add('mc-brief-card');
    card.innerHTML = `
      <p class="mc-brief-eyebrow">Creative Brief — Moments Collective</p>
      <h2 class="mc-brief-title">${escHtml(brief.projectTitle)}</h2>

      ${briefField('Project Type', brief.projectType)}
      ${briefField('Client / Brand', brief.clientBrand)}
      ${briefField('Brand', brief.brandDescription)}

      <hr class="mc-brief-divider">

      ${briefField('The Story', brief.theStory)}
      ${briefField('Desired Outcome', brief.desiredOutcome)}

      <div class="mc-brief-field">
        <p class="mc-brief-label">Tone</p>
        <div class="mc-tone-tags">${toneHtml}</div>
      </div>

      ${briefField('Aesthetic References', brief.aestheticReferences)}

      <hr class="mc-brief-divider">

      ${briefField('Deliverables', brief.deliverables)}
      ${briefField('Timeline', brief.timeline)}
      ${briefField('Budget', brief.budgetRange)}
      ${brief.specialRequirements ? briefField('Special Requirements', brief.specialRequirements) : ''}

      <hr class="mc-brief-divider">

      <div class="mc-brief-field">
        <p class="mc-brief-label">Producer's Note</p>
        <p class="mc-brief-producer-note">${escHtml(brief.producerNote)}</p>
      </div>

      <a
        href="${BOOKING_URL}"
        target="_blank"
        rel="noopener noreferrer"
        class="mc-cta-btn"
      >Book a Call with Rob →</a>
    `;

    chatWindow.appendChild(card);
    scrollToBottom();
  }

  function appendContactCapture(brief) {
    const chatWindow = document.getElementById('mc-chat-window');

    const card = document.createElement('div');
    card.classList.add('mc-contact-capture');
    card.innerHTML = `
      <p class="mc-brief-eyebrow" style="margin-bottom:16px">One last thing</p>
      <label class="mc-brief-label" for="mc-contact-name">Your Name</label>
      <input id="mc-contact-name" class="mc-contact-input" type="text" placeholder="Jane Smith" autocomplete="name">
      <label class="mc-brief-label" for="mc-contact-email">Your Email</label>
      <input id="mc-contact-email" class="mc-contact-input" type="email" placeholder="jane@brand.com" autocomplete="email">
      <button class="mc-contact-submit" id="mc-contact-submit">Send My Brief →</button>
      <p class="mc-contact-skip" id="mc-contact-skip">Skip</p>
    `;

    chatWindow.appendChild(card);
    scrollToBottom();

    // Fallback: send without contact info after 60s if ignored
    const timeout = setTimeout(() => {
      if (!state.emailSent) {
        state.emailSent = true;
        sendBriefEmail(brief, null, null);
      }
      if (card.parentNode) card.remove();
    }, 60000);

    function submitContact() {
      const name = document.getElementById('mc-contact-name').value.trim();
      const email = document.getElementById('mc-contact-email').value.trim();

      if (!email) {
        const emailInput = document.getElementById('mc-contact-email');
        emailInput.style.borderColor = 'rgba(200,60,60,0.6)';
        emailInput.focus();
        return;
      }

      clearTimeout(timeout);
      card.innerHTML = `<p style="font-family:'DM Mono',monospace;font-size:12px;color:rgba(255,255,255,0.55);text-align:center;padding:4px 0;">Got it — we'll be in touch ✦</p>`;
      scrollToBottom();

      if (!state.emailSent) {
        state.emailSent = true;
        sendBriefEmail(brief, name || null, email);
      }
    }

    document.getElementById('mc-contact-submit').addEventListener('click', submitContact);
    document.getElementById('mc-contact-email').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitContact();
    });

    document.getElementById('mc-contact-skip').addEventListener('click', () => {
      clearTimeout(timeout);
      card.remove();
      if (!state.emailSent) {
        state.emailSent = true;
        sendBriefEmail(brief, null, null);
      }
    });
  }

  function briefField(label, value) {
    if (!value) return '';
    return `
      <div class="mc-brief-field">
        <p class="mc-brief-label">${label}</p>
        <p class="mc-brief-value">${escHtml(value)}</p>
      </div>
    `;
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── EMAIL DISPATCH ───────────────────────────────────────────────────────
  async function sendBriefEmail(brief, visitorName, visitorEmail) {
    try {
      await fetch(`${API_BASE}/api/send-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          visitorName: visitorName || null,
          visitorEmail: visitorEmail || null,
          sessionId: state.sessionId,
        }),
      });
    } catch (err) {
      console.error('[MC Widget] Email dispatch failed:', err);
      // Silent fail — don't surface this to the visitor
    }
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  function setup() {
    injectStyles();
    createDOM();
    try {
      initDictation();
    } catch (e) {
      console.error('[MC Widget] initDictation failed:', e);
    }
    console.log('[MC Widget] setup complete — mic button in DOM:', !!document.getElementById('mc-mic'));
  }

  init();

})();
