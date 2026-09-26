/**
 * TYPE//TANK - Application Controller & State Machine
 * Screen Flow, Keyboard Navigation, Arcade Aspect Scaling & Record Celebration
 */

class AppController {
  constructor() {
    this.currentScreen = "login"; // 'login' | 'settings' | 'instructions' | 'game' | 'result' | 'records'
    this.gameEngine = null;
    this.confettiParticles = [];
    this.confettiCanvas = null;
    this.confettiCtx = null;
    this.confettiRaf = null;
    this.selectedRecordFilter = "all";

    // Bind event handlers
    this.handleGlobalKeydown = this.handleGlobalKeydown.bind(this);
  }

  init() {
    // 1. Initialize DOM references
    this.cacheDOM();

    // 2. Load stored settings and initialize UI
    this.loadInitialSettings();

    // 3. Setup Game Engine
    this.setupGameEngine();

    // 4. Attach event listeners
    this.attachEventListeners();

    // 5. Navigate to initial screen (if callsign already exists, could go to settings or login)
    const storedCallsign = storageEngine.getCallsign();
    if (storedCallsign && storedCallsign !== "VIPER_01") {
      this.dom.callsignInput.value = storedCallsign;
    }
    this.switchScreen("login");
  }

  cacheDOM() {
    this.dom = {
      cabinet: document.getElementById("arcade-cabinet"),
      crtOverlay: document.getElementById("crt-overlay"),

      // Header controls
      callsignDisplay: document.getElementById("hud-callsign"),
      btnSwitchCallsign: document.getElementById("btn-switch-callsign"),
      btnToggleAspect: document.getElementById("btn-toggle-aspect"),
      btnToggleCRT: document.getElementById("btn-toggle-crt"),
      btnToggleAudio: document.getElementById("btn-toggle-audio"),
      btnQuickRecords: document.getElementById("btn-quick-records"),

      // Screens
      screens: {
        login: document.getElementById("screen-login"),
        settings: document.getElementById("screen-settings"),
        instructions: document.getElementById("screen-instructions"),
        game: document.getElementById("screen-game"),
        result: document.getElementById("screen-result"),
        records: document.getElementById("screen-records")
      },

      // Login screen
      callsignInput: document.getElementById("input-callsign"),
      btnLoginSubmit: document.getElementById("btn-login-submit"),

      // Settings screen
      modeCards: document.querySelectorAll(".mode-card"),
      toggleUpper: document.getElementById("matrix-toggle-upper"),
      toggleNumbers: document.getElementById("matrix-toggle-numbers"),
      toggleSpecials: document.getElementById("matrix-toggle-specials"),
      previewWordList: document.getElementById("preview-word-list"),
      btnConfirmArsenal: document.getElementById("btn-confirm-arsenal"),
      aspectPills: document.querySelectorAll(".aspect-pill"),

      // Instructions screen
      btnEngageSortie: document.getElementById("btn-engage-sortie"),
      btnBackToSettings: document.getElementById("btn-back-to-settings"),

      // Game HUD
      canvas: document.getElementById("game-canvas"),
      hudOperator: document.getElementById("hud-game-operator"),
      hudModeBadge: document.getElementById("hud-game-mode"),
      hudScore: document.getElementById("hud-game-score"),
      hudCombo: document.getElementById("hud-game-combo"),
      hudWpm: document.getElementById("hud-game-wpm"),
      hudAccuracy: document.getElementById("hud-game-accuracy"),
      hudHealthBar: document.getElementById("hud-health-fill"),
      hudHealthText: document.getElementById("hud-health-val"),
      btnAbortSortie: document.getElementById("btn-abort-sortie"),

      // Result screen
      resultBanner: document.getElementById("result-record-banner"),
      resultScore: document.getElementById("result-score"),
      resultWpm: document.getElementById("result-wpm"),
      resultAccuracy: document.getElementById("result-accuracy"),
      resultDestroyed: document.getElementById("result-destroyed"),
      resultMaxCombo: document.getElementById("result-max-combo"),
      resultMode: document.getElementById("result-mode"),
      resultPbComparison: document.getElementById("result-pb-comparison"),
      btnPlayAgain: document.getElementById("btn-play-again"),
      btnViewRecords: document.getElementById("btn-view-records"),
      btnChangeArsenal: document.getElementById("btn-change-arsenal"),
      confettiCanvas: document.getElementById("confetti-canvas"),

      // Records screen
      recordFilters: document.querySelectorAll(".filter-btn"),
      logsTableBody: document.getElementById("logs-table-body"),
      lifetimePeakScore: document.getElementById("stat-peak-score"),
      lifetimeMaxWpm: document.getElementById("stat-max-wpm"),
      lifetimePeakAcc: document.getElementById("stat-peak-acc"),
      lifetimeTotalThreats: document.getElementById("stat-total-threats"),
      modeBestCards: {
        1: document.getElementById("mode-best-1"),
        2: document.getElementById("mode-best-2"),
        3: document.getElementById("mode-best-3"),
        4: document.getElementById("mode-best-4")
      },
      btnPurgeLogs: document.getElementById("btn-purge-logs"),
      btnRecordsBack: document.getElementById("btn-records-back"),

      // Modals
      abortModal: document.getElementById("modal-abort-confirm"),
      btnAbortYes: document.getElementById("btn-abort-yes"),
      btnAbortNo: document.getElementById("btn-abort-no"),
      purgeModal: document.getElementById("modal-purge-confirm"),
      btnPurgeYes: document.getElementById("btn-purge-yes"),
      btnPurgeNo: document.getElementById("btn-purge-no")
    };
  }

  loadInitialSettings() {
    // 1. Callsign
    const callsign = storageEngine.getCallsign();
    this.dom.callsignDisplay.textContent = `[CALLSIGN: ${callsign}]`;
    if (this.dom.callsignInput) {
      this.dom.callsignInput.value = callsign;
    }

    // 2. Aspect Ratio
    const aspect = storageEngine.getAspectRatio();
    this.applyAspectRatio(aspect);

    // 3. CRT Scanlines
    const crt = storageEngine.getCRTEnabled();
    this.applyCRT(crt);

    // 4. Audio Mute
    const audioMuted = storageEngine.getAudioMuted();
    soundFX.setMuted(audioMuted);
    this.dom.btnToggleAudio.textContent = audioMuted ? "[AUDIO: OFF]" : "[AUDIO: ON]";
    this.dom.btnToggleAudio.classList.toggle("hud-active", !audioMuted);

    // 5. Arsenal Mode
    const savedMode = storageEngine.getArsenalMode();
    arsenalManager.setMode(savedMode);
    this.syncSettingsUI();
  }

  setupGameEngine() {
    const hudElements = {
      score: this.dom.hudScore,
      combo: this.dom.hudCombo,
      wpm: this.dom.hudWpm,
      accuracy: this.dom.hudAccuracy,
      healthBar: this.dom.hudHealthBar,
      healthText: this.dom.hudHealthText
    };

    this.gameEngine = new GameEngine(
      this.dom.canvas,
      hudElements,
      (sortieSummary) => this.handleGameOver(sortieSummary)
    );
  }

  attachEventListeners() {
    // Global Keyboard Router
    window.addEventListener("keydown", this.handleGlobalKeydown);

    // Header Controls
    this.dom.btnSwitchCallsign.addEventListener("click", () => {
      soundFX.playMenuClick();
      this.switchScreen("login");
      setTimeout(() => this.dom.callsignInput.focus(), 100);
    });

    this.dom.btnToggleAspect.addEventListener("click", () => {
      soundFX.playMenuClick();
      this.cycleAspectRatio();
    });

    this.dom.btnToggleCRT.addEventListener("click", () => {
      soundFX.playMenuClick();
      const current = storageEngine.getCRTEnabled();
      this.applyCRT(!current);
    });

    this.dom.btnToggleAudio.addEventListener("click", () => {
      soundFX.ensureContext();
      const muted = soundFX.toggleMute();
      storageEngine.setAudioMuted(muted);
      this.dom.btnToggleAudio.textContent = muted ? "[AUDIO: OFF]" : "[AUDIO: ON]";
      this.dom.btnToggleAudio.classList.toggle("hud-active", !muted);
      if (!muted) soundFX.playMenuClick();
    });

    this.dom.btnQuickRecords.addEventListener("click", () => {
      soundFX.playMenuClick();
      if (this.currentScreen === "game" && this.gameEngine.running) {
        this.openAbortModal();
      } else {
        this.switchScreen("records");
      }
    });

    // Login Screen
    this.dom.btnLoginSubmit.addEventListener("click", () => this.handleLoginSubmit());
    this.dom.callsignInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.handleLoginSubmit();
    });

    // Settings Screen
    this.dom.modeCards.forEach(card => {
      card.addEventListener("click", () => {
        soundFX.playMenuClick();
        const mode = parseInt(card.dataset.mode, 10);
        arsenalManager.setMode(mode);
        storageEngine.setArsenalMode(mode);
        this.syncSettingsUI();
      });
    });

    // Matrix switches
    const onMatrixChange = () => {
      soundFX.playMenuClick();
      arsenalManager.setMatrix(
        this.dom.toggleUpper.checked,
        this.dom.toggleNumbers.checked,
        this.dom.toggleSpecials.checked
      );
      storageEngine.setArsenalMode(arsenalManager.currentMode);
      this.syncSettingsUI();
    };
    this.dom.toggleUpper.addEventListener("change", onMatrixChange);
    this.dom.toggleNumbers.addEventListener("change", onMatrixChange);
    this.dom.toggleSpecials.addEventListener("change", onMatrixChange);

    // Aspect buttons inside settings
    this.dom.aspectPills.forEach(pill => {
      pill.addEventListener("click", () => {
        soundFX.playMenuClick();
        const mode = pill.dataset.aspect;
        this.applyAspectRatio(mode);
      });
    });

    this.dom.btnConfirmArsenal.addEventListener("click", () => {
      soundFX.playMenuClick();
      this.switchScreen("instructions");
    });

    // Instructions Screen
    this.dom.btnEngageSortie.addEventListener("click", () => {
      soundFX.playMenuClick();
      this.switchScreen("game");
    });
    this.dom.btnBackToSettings.addEventListener("click", () => {
      soundFX.playMenuClick();
      this.switchScreen("settings");
    });

    // Game Screen Abort
    this.dom.btnAbortSortie.addEventListener("click", () => {
      soundFX.playMenuClick();
      this.openAbortModal();
    });

    this.dom.btnAbortYes.addEventListener("click", () => {
      soundFX.playMenuClick();
      this.closeAbortModal();
      this.gameEngine.triggerGameOver(true); // aborted
    });

    this.dom.btnAbortNo.addEventListener("click", () => {
      soundFX.playMenuClick();
      this.closeAbortModal();
      if (this.gameEngine.paused) {
        this.gameEngine.togglePause();
      }
    });

    // Result Screen
    this.dom.btnPlayAgain.addEventListener("click", () => {
      soundFX.playMenuClick();
      this.switchScreen("game");
    });
    this.dom.btnViewRecords.addEventListener("click", () => {
      soundFX.playMenuClick();
      this.switchScreen("records");
    });
    this.dom.btnChangeArsenal.addEventListener("click", () => {
      soundFX.playMenuClick();
      this.switchScreen("settings");
    });

    // Records Screen
    this.dom.recordFilters.forEach(btn => {
      btn.addEventListener("click", () => {
        soundFX.playMenuClick();
        this.dom.recordFilters.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.selectedRecordFilter = btn.dataset.filter;
        this.renderFlightLogs();
      });
    });

    this.dom.btnPurgeLogs.addEventListener("click", () => {
      soundFX.playMenuClick();
      this.dom.purgeModal.classList.remove("hidden");
    });

    this.dom.btnPurgeYes.addEventListener("click", () => {
      soundFX.playMenuClick();
      storageEngine.purgeFlightLogs();
      this.dom.purgeModal.classList.add("hidden");
      this.renderRecordsScreen();
    });

    this.dom.btnPurgeNo.addEventListener("click", () => {
      soundFX.playMenuClick();
      this.dom.purgeModal.classList.add("hidden");
    });

    this.dom.btnRecordsBack.addEventListener("click", () => {
      soundFX.playMenuClick();
      this.switchScreen("settings");
    });
  }

  /**
   * Screen Switcher State Machine
   */
  switchScreen(screenName) {
    if (!this.dom.screens[screenName]) return;

    // Stop confetti if leaving result screen
    if (this.currentScreen === "result" && screenName !== "result") {
      this.stopConfetti();
    }

    // Stop game loop if leaving game screen
    if (this.currentScreen === "game" && screenName !== "game") {
      this.gameEngine.stop();
    }

    // Hide all screens
    Object.values(this.dom.screens).forEach(screen => {
      screen.classList.add("screen-hidden");
    });

    // Show target screen
    this.currentScreen = screenName;
    this.dom.screens[screenName].classList.remove("screen-hidden");

    // Specific screen setup hooks
    if (screenName === "settings") {
      this.syncSettingsUI();
    } else if (screenName === "game") {
      soundFX.ensureContext();
      this.dom.hudOperator.textContent = storageEngine.getCallsign();
      this.dom.hudModeBadge.textContent = arsenalManager.getModeName();
      this.gameEngine.start();
    } else if (screenName === "records") {
      this.renderRecordsScreen();
    }
  }

  /**
   * Global Keyboard Router
   */
  handleGlobalKeydown(e) {
    // Audio context activation on any keydown
    soundFX.ensureContext();

    // Prevent default scrolling on Space / Arrow keys in game
    if (["Space", "ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes(e.code) && this.currentScreen === "game") {
      e.preventDefault();
    }

    // Modal Active: Esc or Enter keys for modals
    if (!this.dom.abortModal.classList.contains("hidden")) {
      if (e.key === "Escape" || e.key.toLowerCase() === "n") {
        this.dom.btnAbortNo.click();
        return;
      }
      if (e.key === "Enter" || e.key.toLowerCase() === "y") {
        this.dom.btnAbortYes.click();
        return;
      }
      return;
    }

    if (!this.dom.purgeModal.classList.contains("hidden")) {
      if (e.key === "Escape" || e.key.toLowerCase() === "n") {
        this.dom.btnPurgeNo.click();
        return;
      }
      if (e.key === "Enter" || e.key.toLowerCase() === "y") {
        this.dom.btnPurgeYes.click();
        return;
      }
      return;
    }

    // Handle screen-specific key shortcuts
    switch (this.currentScreen) {
      case "login":
        if (e.key === "Enter") {
          this.handleLoginSubmit();
        }
        break;

      case "settings":
        if (e.key === "Enter") {
          soundFX.playMenuClick();
          this.switchScreen("instructions");
        } else if (e.key >= "1" && e.key <= "4") {
          // Quick mode selection via keys 1 - 4
          soundFX.playMenuClick();
          const mode = parseInt(e.key, 10);
          arsenalManager.setMode(mode);
          storageEngine.setArsenalMode(mode);
          this.syncSettingsUI();
        }
        break;

      case "instructions":
        if (e.key === "Enter" || e.code === "Space") {
          soundFX.playMenuClick();
          this.switchScreen("game");
        } else if (e.key === "Escape") {
          soundFX.playMenuClick();
          this.switchScreen("settings");
        }
        break;

      case "game":
        if (e.key === "Escape") {
          this.openAbortModal();
        } else {
          // Route typing character to combat engine
          this.gameEngine.handleKeystroke(e.key);
        }
        break;

      case "result":
        if (e.key === "Enter" || e.code === "Space") {
          soundFX.playMenuClick();
          this.switchScreen("game");
        } else if (e.key.toLowerCase() === "r") {
          soundFX.playMenuClick();
          this.switchScreen("records");
        } else if (e.key.toLowerCase() === "s" || e.key === "Escape") {
          soundFX.playMenuClick();
          this.switchScreen("settings");
        }
        break;

      case "records":
        if (e.key === "Escape" || e.key.toLowerCase() === "b") {
          soundFX.playMenuClick();
          this.switchScreen("settings");
        }
        break;
    }
  }

  handleLoginSubmit() {
    soundFX.playMenuClick();
    const rawVal = this.dom.callsignInput.value;
    const finalCallsign = storageEngine.setCallsign(rawVal);
    this.dom.callsignDisplay.textContent = `[CALLSIGN: ${finalCallsign}]`;
    this.switchScreen("settings");
  }

  openAbortModal() {
    if (this.gameEngine.running && !this.gameEngine.paused) {
      this.gameEngine.togglePause();
    }
    this.dom.abortModal.classList.remove("hidden");
  }

  closeAbortModal() {
    this.dom.abortModal.classList.add("hidden");
  }

  /**
   * Sync Arsenal Mode & Matrix UI
   */
  syncSettingsUI() {
    const currentMode = arsenalManager.currentMode;

    // Highlight active mode card
    this.dom.modeCards.forEach(card => {
      const mode = parseInt(card.dataset.mode, 10);
      card.classList.toggle("active-mode", mode === currentMode);
    });

    // Sync toggle switches
    this.dom.toggleUpper.checked = arsenalManager.customMatrix.uppercase;
    this.dom.toggleNumbers.checked = arsenalManager.customMatrix.numbers;
    this.dom.toggleSpecials.checked = arsenalManager.customMatrix.specials;

    // Render live word preview
    const sampleWords = arsenalManager.getSampleWords(currentMode);
    this.dom.previewWordList.innerHTML = "";
    sampleWords.forEach(w => {
      const chip = document.createElement("span");
      chip.className = "preview-chip";
      chip.textContent = w;
      this.dom.previewWordList.appendChild(chip);
    });
  }

  /**
   * Aspect Ratio Architecture:
   * 'auto': Fluidly fills window
   * '16-9': Centered 16:9 arcade cabinet with side bezels
   * '4-3': Centered 4:3 classic CRT monitor with side pillarboxing
   */
  applyAspectRatio(mode) {
    const valid = storageEngine.setAspectRatio(mode);
    const cabinet = this.dom.cabinet;

    cabinet.classList.remove("aspect-auto", "aspect-16-9", "aspect-4-3");
    if (valid === "16-9") {
      cabinet.classList.add("aspect-16-9");
      this.dom.btnToggleAspect.textContent = "[ASPECT: 16:9]";
    } else if (valid === "4-3") {
      cabinet.classList.add("aspect-4-3");
      this.dom.btnToggleAspect.textContent = "[ASPECT: 4:3]";
    } else {
      cabinet.classList.add("aspect-auto");
      this.dom.btnToggleAspect.textContent = "[ASPECT: AUTO]";
    }

    // Sync aspect buttons in settings
    this.dom.aspectPills.forEach(pill => {
      pill.classList.toggle("active", pill.dataset.aspect === valid);
    });

    // Re-calibrate game canvas & physics coordinates
    if (this.gameEngine) {
      setTimeout(() => this.gameEngine.handleResize(), 50);
    }
  }

  cycleAspectRatio() {
    const current = storageEngine.getAspectRatio();
    let next = "auto";
    if (current === "auto") next = "16-9";
    else if (current === "16-9") next = "4-3";
    else next = "auto";
    this.applyAspectRatio(next);
  }

  /**
   * CRT Scanlines & Bloom Toggle
   */
  applyCRT(enabled) {
    storageEngine.setCRTEnabled(enabled);
    if (enabled) {
      this.dom.crtOverlay.classList.remove("crt-off");
      this.dom.btnToggleCRT.textContent = "[CRT: ON]";
      this.dom.btnToggleCRT.classList.add("hud-active");
    } else {
      this.dom.crtOverlay.classList.add("crt-off");
      this.dom.btnToggleCRT.textContent = "[CRT: OFF]";
      this.dom.btnToggleCRT.classList.remove("hud-active");
    }
  }

  /**
   * Sortie Debriefing & Record Celebration
   */
  handleGameOver(summary) {
    const recordResult = storageEngine.recordSortie(summary);

    // Populate Result screen metrics
    this.dom.resultScore.textContent = summary.score.toString().padStart(6, "0");
    this.dom.resultWpm.textContent = summary.wpm.toString();
    this.dom.resultAccuracy.textContent = `${summary.accuracy}%`;
    this.dom.resultDestroyed.textContent = summary.wordsDestroyed.toString();
    this.dom.resultMaxCombo.textContent = `x${summary.maxCombo}`;
    this.dom.resultMode.textContent = summary.modeName;

    // Check if New Personal Best
    if (recordResult.isPB) {
      this.dom.resultBanner.classList.remove("hidden");
      this.dom.resultPbComparison.innerHTML = `
        <span class="text-glow-green">★ NEW ALL-TIME MODE RECORD SURPASSED! ★</span><br>
        PREVIOUS BEST: ${recordResult.previousBestScore.toString().padStart(6, "0")} PTS 
        <span class="text-amber">(+${recordResult.scoreDelta} PTS)</span>
      `;
      // Play victory fanfare sound
      soundFX.playVictoryFanfare();
      // Launch full-screen confetti celebration
      this.launchConfetti();
    } else {
      this.dom.resultBanner.classList.add("hidden");
      const delta = recordResult.previousBestScore - summary.score;
      this.dom.resultPbComparison.innerHTML = `
        PREVIOUS PERSONAL RECORD: <span class="text-glow-green">${recordResult.previousBestScore.toString().padStart(6, "0")} PTS</span><br>
        DEFICIT TO BEAT RECORD: <span class="text-amber">-${delta} PTS</span>
      `;
    }

    this.switchScreen("result");
  }

  /**
   * Arcade Confetti & Phosphor Celebration Particle System
   */
  launchConfetti() {
    this.stopConfetti();

    const canvas = this.dom.confettiCanvas;
    if (!canvas) return;

    this.confettiCanvas = canvas;
    this.confettiCtx = canvas.getContext("2d");

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const colors = ["#00ff66", "#50fa7b", "#ff2a4b", "#ffb020", "#ffffff", "#00e5ff"];
    this.confettiParticles = [];

    for (let i = 0; i < 90; i++) {
      this.confettiParticles.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * 50,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 8
      });
    }

    const render = () => {
      this.confettiCtx.clearRect(0, 0, canvas.width, canvas.height);

      for (let p of this.confettiParticles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;

        if (p.y > canvas.height + 20) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }

        this.confettiCtx.save();
        this.confettiCtx.translate(p.x, p.y);
        this.confettiCtx.rotate((p.rotation * Math.PI) / 180);
        this.confettiCtx.fillStyle = p.color;
        this.confettiCtx.shadowColor = p.color;
        this.confettiCtx.shadowBlur = 6;
        this.confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        this.confettiCtx.restore();
      }

      this.confettiRaf = requestAnimationFrame(render);
    };

    this.confettiRaf = requestAnimationFrame(render);
  }

  stopConfetti() {
    if (this.confettiRaf) {
      cancelAnimationFrame(this.confettiRaf);
      this.confettiRaf = null;
    }
    if (this.confettiCtx && this.confettiCanvas) {
      this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
    }
  }

  /**
   * Flight Logs & Records Screen
   */
  renderRecordsScreen() {
    // 1. Lifetime stats
    const lifetime = storageEngine.getLifetimeStats();
    this.dom.lifetimePeakScore.textContent = (lifetime.peakScore || 0).toString().padStart(6, "0");
    this.dom.lifetimeMaxWpm.textContent = (lifetime.peakWPM || 0).toString();
    this.dom.lifetimePeakAcc.textContent = `${lifetime.peakAccuracy || 0}%`;
    this.dom.lifetimeTotalThreats.textContent = (lifetime.totalWordsDestroyed || 0).toString();

    // 2. Mode Bests Quad
    const bests = storageEngine.getModeBests();
    for (let m = 1; m <= 4; m++) {
      const card = this.dom.modeBestCards[m];
      if (card) {
        const best = bests[m] || { score: 0, wpm: 0 };
        card.querySelector(".best-score").textContent = best.score.toString().padStart(6, "0");
        card.querySelector(".best-wpm").textContent = `${best.wpm} WPM`;
      }
    }

    // 3. Render table logs
    this.renderFlightLogs();
  }

  renderFlightLogs() {
    const logs = storageEngine.getFlightLogs(this.selectedRecordFilter);
    const tbody = this.dom.logsTableBody;
    tbody.innerHTML = "";

    if (logs.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="7" class="text-center py-4 text-dim">--- NO RECORDED COMBAT SORTIES IN THIS SECTOR ---</td>`;
      tbody.appendChild(row);
      return;
    }

    logs.forEach(log => {
      const row = document.createElement("tr");
      const modeLabels = { 1: "ALPHA", 2: "BRAVO", 3: "CHARLIE", 4: "DELTA" };
      const modeBadge = modeLabels[log.mode] || `M${log.mode}`;

      const pbTag = log.isPB ? `<span class="badge-pb">★ PB</span>` : "";

      row.innerHTML = `
        <td class="font-mono text-dim">${log.dateStr || "N/A"}</td>
        <td><span class="badge-mode mode-${log.mode}">[${modeBadge}]</span></td>
        <td class="text-glow-green font-bold">${log.score.toString().padStart(6, "0")} ${pbTag}</td>
        <td>${log.wpm} <span class="text-dim text-xs">WPM</span></td>
        <td>${log.accuracy}%</td>
        <td>x${log.maxCombo}</td>
        <td>${log.wordsDestroyed}</td>
      `;
      tbody.appendChild(row);
    });
  }
}

// Bootstrap Application on DOM Ready
window.addEventListener("DOMContentLoaded", () => {
  window.typeTankApp = new AppController();
  window.typeTankApp.init();
});
