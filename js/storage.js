/**
 * TYPE//TANK - LocalStorage Persistence Engine
 * Operator Profile, Display Settings, Flight Logs & Personal Bests
 */

const STORAGE_KEYS = {
  CALLSIGN: "typetank_callsign",
  ASPECT: "typetank_aspect_ratio",
  CRT: "typetank_crt_enabled",
  AUDIO_MUTED: "typetank_audio_muted",
  MODE: "typetank_arsenal_mode",
  MATRIX: "typetank_character_matrix",
  FLIGHT_LOGS: "typetank_flight_logs",
  MODE_BESTS: "typetank_mode_bests",
  LIFETIME_STATS: "typetank_lifetime_stats"
};

class StorageEngine {
  constructor() {
    this.initDefaults();
  }

  initDefaults() {
    if (!localStorage.getItem(STORAGE_KEYS.CALLSIGN)) {
      localStorage.setItem(STORAGE_KEYS.CALLSIGN, "VIPER_01");
    }
    if (!localStorage.getItem(STORAGE_KEYS.ASPECT)) {
      localStorage.setItem(STORAGE_KEYS.ASPECT, "auto");
    }
    if (localStorage.getItem(STORAGE_KEYS.CRT) === null) {
      localStorage.setItem(STORAGE_KEYS.CRT, "true");
    }
    if (localStorage.getItem(STORAGE_KEYS.AUDIO_MUTED) === null) {
      localStorage.setItem(STORAGE_KEYS.AUDIO_MUTED, "false");
    }
    if (!localStorage.getItem(STORAGE_KEYS.MODE)) {
      localStorage.setItem(STORAGE_KEYS.MODE, "1");
    }
    if (!localStorage.getItem(STORAGE_KEYS.MODE_BESTS)) {
      const initialBests = {
        1: { score: 0, wpm: 0, accuracy: 0, date: null },
        2: { score: 0, wpm: 0, accuracy: 0, date: null },
        3: { score: 0, wpm: 0, accuracy: 0, date: null },
        4: { score: 0, wpm: 0, accuracy: 0, date: null }
      };
      localStorage.setItem(STORAGE_KEYS.MODE_BESTS, JSON.stringify(initialBests));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LIFETIME_STATS)) {
      const initialLifetime = {
        totalSorties: 0,
        totalWordsDestroyed: 0,
        peakScore: 0,
        peakWPM: 0,
        peakAccuracy: 0
      };
      localStorage.setItem(STORAGE_KEYS.LIFETIME_STATS, JSON.stringify(initialLifetime));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FLIGHT_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.FLIGHT_LOGS, JSON.stringify([]));
    }
  }

  // Callsign
  getCallsign() {
    return localStorage.getItem(STORAGE_KEYS.CALLSIGN) || "VIPER_01";
  }

  setCallsign(callsign) {
    const clean = (callsign || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 14);
    const finalCallsign = clean || "OPERATOR_01";
    localStorage.setItem(STORAGE_KEYS.CALLSIGN, finalCallsign);
    return finalCallsign;
  }

  // Aspect Ratio ('auto', '16-9', '4-3')
  getAspectRatio() {
    return localStorage.getItem(STORAGE_KEYS.ASPECT) || "auto";
  }

  setAspectRatio(mode) {
    const valid = ["auto", "16-9", "4-3"].includes(mode) ? mode : "auto";
    localStorage.setItem(STORAGE_KEYS.ASPECT, valid);
    return valid;
  }

  // CRT Scanlines
  getCRTEnabled() {
    return localStorage.getItem(STORAGE_KEYS.CRT) !== "false";
  }

  setCRTEnabled(val) {
    localStorage.setItem(STORAGE_KEYS.CRT, val ? "true" : "false");
    return val;
  }

  // Audio Mute
  getAudioMuted() {
    return localStorage.getItem(STORAGE_KEYS.AUDIO_MUTED) === "true";
  }

  setAudioMuted(val) {
    localStorage.setItem(STORAGE_KEYS.AUDIO_MUTED, val ? "true" : "false");
    return val;
  }

  // Arsenal Mode (1, 2, 3, 4)
  getArsenalMode() {
    const val = parseInt(localStorage.getItem(STORAGE_KEYS.MODE), 10);
    return (val >= 1 && val <= 4) ? val : 1;
  }

  setArsenalMode(mode) {
    const val = Math.max(1, Math.min(4, parseInt(mode, 10) || 1));
    localStorage.setItem(STORAGE_KEYS.MODE, val.toString());
    return val;
  }

  // Mode Bests
  getModeBests() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.MODE_BESTS));
      return data || {
        1: { score: 0, wpm: 0 },
        2: { score: 0, wpm: 0 },
        3: { score: 0, wpm: 0 },
        4: { score: 0, wpm: 0 }
      };
    } catch (e) {
      return { 1: { score: 0, wpm: 0 }, 2: { score: 0, wpm: 0 }, 3: { score: 0, wpm: 0 }, 4: { score: 0, wpm: 0 } };
    }
  }

  getModeBest(mode) {
    const bests = this.getModeBests();
    return bests[mode] || { score: 0, wpm: 0, accuracy: 0 };
  }

  // Lifetime Stats
  getLifetimeStats() {
    try {
      const stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.LIFETIME_STATS));
      return stats || { totalSorties: 0, totalWordsDestroyed: 0, peakScore: 0, peakWPM: 0, peakAccuracy: 0 };
    } catch (e) {
      return { totalSorties: 0, totalWordsDestroyed: 0, peakScore: 0, peakWPM: 0, peakAccuracy: 0 };
    }
  }

  // Flight Logs
  getFlightLogs(modeFilter = null) {
    try {
      const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLIGHT_LOGS)) || [];
      if (!modeFilter || modeFilter === "all" || modeFilter === 0) {
        return logs;
      }
      const targetMode = parseInt(modeFilter, 10);
      return logs.filter(log => log.mode === targetMode);
    } catch (e) {
      return [];
    }
  }

  /**
   * Records a completed or aborted sortie.
   * Compares against mode personal best.
   * Returns: { isPB: boolean, previousBestScore: number, scoreDelta: number }
   */
  recordSortie(attempt) {
    const mode = attempt.mode || 1;
    const score = Math.round(attempt.score || 0);
    const wpm = Math.round(attempt.wpm || 0);
    const accuracy = Math.round(attempt.accuracy || 0);
    const wordsDestroyed = attempt.wordsDestroyed || 0;
    const maxCombo = attempt.maxCombo || 0;
    const durationSeconds = attempt.durationSeconds || 0;

    const bests = this.getModeBests();
    const currentBest = bests[mode] || { score: 0, wpm: 0 };
    const previousBestScore = currentBest.score || 0;

    // Check if new personal best (score strictly greater or first completion with >0 score)
    const isPB = score > previousBestScore;
    const scoreDelta = score - previousBestScore;

    if (isPB) {
      bests[mode] = {
        score: score,
        wpm: Math.max(wpm, currentBest.wpm || 0),
        accuracy: accuracy,
        date: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.MODE_BESTS, JSON.stringify(bests));
    }

    // Update Lifetime Stats
    const lifetime = this.getLifetimeStats();
    lifetime.totalSorties = (lifetime.totalSorties || 0) + 1;
    lifetime.totalWordsDestroyed = (lifetime.totalWordsDestroyed || 0) + wordsDestroyed;
    lifetime.peakScore = Math.max(lifetime.peakScore || 0, score);
    lifetime.peakWPM = Math.max(lifetime.peakWPM || 0, wpm);
    lifetime.peakAccuracy = Math.max(lifetime.peakAccuracy || 0, accuracy);
    localStorage.setItem(STORAGE_KEYS.LIFETIME_STATS, JSON.stringify(lifetime));

    // Format log entry
    const now = new Date();
    const dateStr = now.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " +
      now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });

    const logEntry = {
      id: "SORTIE_" + Date.now(),
      timestamp: now.getTime(),
      dateStr: dateStr,
      callsign: this.getCallsign(),
      mode: mode,
      score: score,
      wpm: wpm,
      accuracy: accuracy,
      wordsDestroyed: wordsDestroyed,
      maxCombo: maxCombo,
      durationSeconds: durationSeconds,
      isPB: isPB
    };

    // Store in flight logs (keep most recent 60 logs)
    let logs = [];
    try {
      logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLIGHT_LOGS)) || [];
    } catch (e) {
      logs = [];
    }
    logs.unshift(logEntry);
    if (logs.length > 60) {
      logs = logs.slice(0, 60);
    }
    localStorage.setItem(STORAGE_KEYS.FLIGHT_LOGS, JSON.stringify(logs));

    return {
      isPB,
      previousBestScore,
      scoreDelta,
      logEntry
    };
  }

  purgeFlightLogs() {
    localStorage.setItem(STORAGE_KEYS.FLIGHT_LOGS, JSON.stringify([]));
    // Reset bests and lifetime
    const initialBests = {
      1: { score: 0, wpm: 0, accuracy: 0, date: null },
      2: { score: 0, wpm: 0, accuracy: 0, date: null },
      3: { score: 0, wpm: 0, accuracy: 0, date: null },
      4: { score: 0, wpm: 0, accuracy: 0, date: null }
    };
    localStorage.setItem(STORAGE_KEYS.MODE_BESTS, JSON.stringify(initialBests));

    const initialLifetime = {
      totalSorties: 0,
      totalWordsDestroyed: 0,
      peakScore: 0,
      peakWPM: 0,
      peakAccuracy: 0
    };
    localStorage.setItem(STORAGE_KEYS.LIFETIME_STATS, JSON.stringify(initialLifetime));
  }
}

// Global storage singleton
const storageEngine = new StorageEngine();
