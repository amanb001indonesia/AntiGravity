/**
 * TYPE//TANK - Word Repositories & Arsenal Exclusion Manager
 * Strictly Vanilla JS - Zero External Dependencies
 */

const WORD_REPOSITORY = {
  // Mode 1 [Alpha]: Strictly Lowercase military, tech, and tactical terminology
  alpha: [
    "tank", "radar", "cannon", "turret", "armor", "strike", "patrol", "bunker",
    "convoy", "mortar", "beacon", "sensor", "missile", "recon", "rocket", "sniper",
    "target", "vector", "trench", "bullet", "shield", "plasma", "laser", "flank",
    "squad", "trooper", "infantry", "barrage", "defend", "breach", "vulcan", "charge",
    "supply", "sector", "depot", "airfield", "hangar", "stealth", "vortex", "garrison",
    "ballistic", "citadel", "fortress", "assault", "torpedo", "grenade", "ambush",
    "trigger", "caliber", "warhead", "outpost", "armory", "barracks", "howitzer",
    "perimeter", "platoon", "battalion", "corps", "vanguard", "flak", "shrapnel",
    "artillery", "command", "ordnance", "sentry", "skirmish", "tactics", "override",
    "bayonet", "chassis", "tread", "cockpit", "periscope", "engine", "exhaust",
    "telemetry", "lockon", "payload", "scout", "commando", "bastion", "redoubt"
  ],

  // Mode 2 [Bravo]: Lowercase + Uppercase mixed tactical callsigns, operations, and units
  bravo: [
    "Tank", "RadarX", "DeltaForce", "AlphaOne", "TopGun", "Striker", "Vanguard",
    "RedAlert", "SkyFire", "IronClad", "WarHawk", "NightFox", "GhostOps", "ApexWolf",
    "StormTroop", "EchoLead", "PhantomX", "TitanMech", "HyperNova", "OmegaStrike",
    "SteelRain", "BattleCore", "BlackHawk", "AegisShield", "EagleEye", "FireStorm",
    "Valkyrie", "RaptorSquad", "ThunderBolt", "WarMachine", "SilentKill", "GoliathTank",
    "ZeroHour", "ShadowUnit", "BlitzKrieg", "CyberTank", "HavocChopper", "DarkStar",
    "PanzerElite", "CrossBow", "HellCat", "WildFire", "StarFall", "VenomStrike",
    "Crusader", "Centurion", "OverWatch", "TempestSquad", "GrimReaper", "WarLord",
    "BioHazard", "SteelFang", "PaladinArmor", "IronFist", "ShockWave", "ApexPredator"
  ],

  // Mode 3 [Charlie]: Lowercase + Uppercase + Numbers (Military designations, math, serial codes)
  charlie: [
    "Squad5", "Tank99", "v2.0", "M1A2", "F22Raptor", "B52Strat", "AK47Ops",
    "Unit01", "Zone7", "Sector9", "Base88", "Grid42", "Fox2", "Code99",
    "Tier1", "MarkIV", "Core300", "Kilo9", "Delta7", "SubZero8", "Falcon9",
    "Bunker404", "Call7", "Viper07", "T90Heavy", "Su57", "Type10", "BMP3", "AH64",
    "MiG35", "F35Lightning", "B2Spirit", "SR71Black", "C130Hercules", "M2Bradley",
    "Leopard2A7", "Merkava4", "T14Armata", "Challenger2", "K2BlackPanther",
    "Tomahawk9", "PatriotPAC3", "AIM120", "Stinger7", "Javelin88", "Hellfire2",
    "RPG7", "SpikeLR2", "Kornet9M", "AGM65", "GBU39", "ANTPQ53", "APG81", "ALQ131",
    "TrophyHV", "IronDome1", "S400Triumf", "PantsirS1", "BukM3", "TorM2"
  ],

  // Mode 4 [Delta]: Lowercase + Uppercase + Numbers + Special Characters
  delta: [
    "[tank-01]", "{cmd-9}", "!alert!", "<fire_0>", "[apex#4]",
    "!danger!", "#strike-9", "[unit_55]", "{alpha/1}", "+boost+", "[aim-lock]",
    "<radar*7>", "!mayday!", "{kill-9}", "[ops_99]", "#threat-1", "[zero&one]",
    "{nuke!}", "[flank#2]", "!breach!", "<shield=9>", "[iron-core]", "{war*99}",
    "!critical!", "[m1-abrams]", "<delta%4>", "[flak-88]", "{code:007}", "!red#zone!",
    "<vector+z>", "[bunker_9]", "{fire/wall}", "#armor+100", "[ammo:full]", "<hp-crit>",
    "{stealth.on}", "[emp*burst]", "!overload!", "<sonar~ping>", "[lock:active]",
    "{target#99}", "!kill_switch!", "[def_matrix]", "<freq:142.8>", "{payload+x}",
    "!hostile@gate!", "[chassis-v2]", "<ping_10ms>", "{turret#rot}", "!plasma_arc!"
  ],

  // Crimson High-Threat Bonus Targets (Fast-falling, glowing crimson, 3.5x score multiplier)
  bonusWords: [
    "RED-ALERT", "CRIMSON-9", "WARLORD-X", "MEGA-BURST", "DEATH-RAY",
    "FIRE-STORM", "HYPER-CANNON", "TITAN-MECH", "OVERDRIVE", "HELL-FIRE",
    "OMEGA-PRIME", "APOCALYPSE", "DEVASTATOR", "EXTERMINATE", "SUPER-NOVA",
    "NIGHT-MARE", "DOOM-SLAYER", "VULCAN-GOD", "IRON-BEAST", "HELL-HOUND"
  ]
};

/**
 * Arsenal Manager & Exclusion Controller
 * Handles spawning rules, mode selection, character matrix mapping,
 * and the critical red bonus target exclusion window.
 */
class ArsenalManager {
  constructor() {
    this.currentMode = 1; // 1: Alpha, 2: Bravo, 3: Charlie, 4: Delta
    this.customMatrix = {
      uppercase: false,
      numbers: false,
      specials: false
    };

    // Tracks cooldowns for characters that recently had a red bonus word active
    // Map: character (lowercase) -> timestamp when cooldown ends
    this.bonusExclusionCooldowns = new Map();
    this.COOLDOWN_MS = 3000; // 3-second cooldown window after resolution

    // Words currently falling on screen
    this.activeWords = [];
  }

  setMode(modeNumber) {
    this.currentMode = Math.max(1, Math.min(4, parseInt(modeNumber, 10) || 1));
    this.syncMatrixFromMode();
  }

  syncMatrixFromMode() {
    switch (this.currentMode) {
      case 1:
        this.customMatrix = { uppercase: false, numbers: false, specials: false };
        break;
      case 2:
        this.customMatrix = { uppercase: true, numbers: false, specials: false };
        break;
      case 3:
        this.customMatrix = { uppercase: true, numbers: true, specials: false };
        break;
      case 4:
        this.customMatrix = { uppercase: true, numbers: true, specials: true };
        break;
    }
  }

  setMatrix(uppercase, numbers, specials) {
    this.customMatrix = {
      uppercase: !!uppercase,
      numbers: !!numbers,
      specials: !!specials
    };

    // Map matrix to closest standard mode
    if (this.customMatrix.specials) {
      this.currentMode = 4;
      this.customMatrix.uppercase = true;
      this.customMatrix.numbers = true;
    } else if (this.customMatrix.numbers) {
      this.currentMode = 3;
      this.customMatrix.uppercase = true;
    } else if (this.customMatrix.uppercase) {
      this.currentMode = 2;
    } else {
      this.currentMode = 1;
    }
  }

  getModeName(mode = this.currentMode) {
    switch (mode) {
      case 1: return "MODE 1 [ALPHA]";
      case 2: return "MODE 2 [BRAVO]";
      case 3: return "MODE 3 [CHARLIE]";
      case 4: return "MODE 4 [DELTA]";
      default: return "MODE 1 [ALPHA]";
    }
  }

  getModeDescription(mode = this.currentMode) {
    switch (mode) {
      case 1: return "LOWERCASE ONLY (MILITARY TACTICAL)";
      case 2: return "LOWERCASE + UPPERCASE (CALLSIGNS & UNITS)";
      case 3: return "UPPER + LOWER + NUMBERS (MILITARY SERIALS)";
      case 4: return "UPPER + LOWER + NUMBERS + SPECIALS (BRACKETS, MATH)";
      default: return "STANDARD ARSENAL";
    }
  }

  getSampleWords(mode = this.currentMode) {
    switch (mode) {
      case 1: return ["tank", "radar", "cannon", "artillery", "strike", "turret"];
      case 2: return ["Tank", "RadarX", "DeltaForce", "AlphaOne", "TopGun", "ApexWolf"];
      case 3: return ["Squad5", "Tank99", "v2.0", "M1A2", "F22Raptor", "Base88"];
      case 4: return ["[tank-01]", "{cmd-9}", "!alert!", "<fire_0>", "[apex#4]", "#threat-1"];
      default: return ["tank", "radar", "cannon"];
    }
  }

  /**
   * Called when a red bonus word finishes (destroyed or breached).
   * Enforces the 3-second exclusion cooldown on that initial character.
   */
  registerBonusWordResolution(wordText) {
    if (!wordText || wordText.length === 0) return;
    const initialChar = wordText[0].toLowerCase();
    this.bonusExclusionCooldowns.set(initialChar, Date.now() + this.COOLDOWN_MS);
  }

  /**
   * Checks if a character is currently suppressed due to an active red bonus word
   * or within the post-resolution cooldown window.
   */
  isCharacterSuppressed(char, activeFallingWords) {
    if (!char) return false;
    const initial = char.toLowerCase();

    // 1. Check if any currently falling red bonus word starts with this character
    const activeBonusConflict = activeFallingWords.some(w =>
      w.isRedBonus && w.word && w.word[0].toLowerCase() === initial
    );
    if (activeBonusConflict) return true;

    // 2. Check if this character is currently in cooldown window
    const cooldownEndTime = this.bonusExclusionCooldowns.get(initial);
    if (cooldownEndTime) {
      if (Date.now() < cooldownEndTime) {
        return true; // Still under exclusion cooldown
      } else {
        this.bonusExclusionCooldowns.delete(initial); // Cooldown expired
      }
    }

    return false;
  }

  /**
   * Selects an appropriate threat word for spawning based on mode and exclusions.
   * Ensures no word is spawned if its starting character is currently suppressed.
   */
  getRandomWord(isBonus = false, activeFallingWords = []) {
    let pool = [];

    if (isBonus) {
      pool = [...WORD_REPOSITORY.bonusWords];
    } else {
      switch (this.currentMode) {
        case 1: pool = [...WORD_REPOSITORY.alpha]; break;
        case 2: pool = [...WORD_REPOSITORY.bravo]; break;
        case 3: pool = [...WORD_REPOSITORY.charlie]; break;
        case 4: pool = [...WORD_REPOSITORY.delta]; break;
        default: pool = [...WORD_REPOSITORY.alpha]; break;
      }
    }

    // Filter out words whose first character is currently suppressed by bonus rules
    const validCandidates = pool.filter(word => {
      if (!word) return false;
      const firstChar = word[0];

      // If this is a normal spawn, ensure its first character is not suppressed by a red bonus
      if (!isBonus && this.isCharacterSuppressed(firstChar, activeFallingWords)) {
        return false;
      }

      // Also avoid exact duplicates already active on screen
      const isAlreadyActive = activeFallingWords.some(w => w.word === word);
      if (isAlreadyActive) return false;

      return true;
    });

    if (validCandidates.length > 0) {
      return validCandidates[Math.floor(Math.random() * validCandidates.length)];
    }

    // Fallback: pick any from pool that is not an active duplicate
    const backupCandidates = pool.filter(w => !activeFallingWords.some(active => active.word === w));
    if (backupCandidates.length > 0) {
      return backupCandidates[Math.floor(Math.random() * backupCandidates.length)];
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }
}

// Global singleton instance
const arsenalManager = new ArsenalManager();
