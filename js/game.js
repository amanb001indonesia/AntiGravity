/**
 * TYPE//TANK - Canvas 2D Ballistic Combat Engine
 * Semicircular Tank, 180-deg Turret, Ballistic Projectiles,
 * Lowest-First Priority Target Locking, Particle System & 60 FPS Loop
 */

class GameEngine {
  constructor(canvasElement, hudElements, onGameOverCallback) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext("2d");
    this.hud = hudElements; // references to HUD DOM nodes
    this.onGameOver = onGameOverCallback;

    // Viewport & Scale
    this.dpr = window.devicePixelRatio || 1;
    this.width = 800;
    this.height = 600;

    // Defense & Tank Geometry
    this.defenseLineY = 520;
    this.tankPos = { x: 400, y: 560 };
    this.turretAngle = -Math.PI / 2; // -90 deg (pointing straight up)
    this.targetTurretAngle = -Math.PI / 2;
    this.barrelRecoil = 0; // recoil offset in pixels

    // Combat State
    this.running = false;
    this.paused = false;
    this.health = 100; // 0 - 100%
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.wordsDestroyed = 0;
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;
    this.startTime = 0;
    this.elapsedSeconds = 0;

    // Words & Targeting
    this.words = [];
    this.lockedWord = null; // currently targeted word object
    this.bullets = [];
    this.particles = [];
    this.floatingTexts = [];

    // Spawning Timing
    this.lastSpawnTime = 0;
    this.spawnInterval = 2400; // ms between spawns (scales down with difficulty)
    this.bonusCounter = 0; // count to trigger red bonus words
    this.difficultyFactor = 1.0;

    // Screen Shake
    this.shakeDuration = 0;
    this.shakeIntensity = 0;

    // Animation frame handle
    this.rafId = null;
    this.lastFrameTime = performance.now();

    // Critical alarm throttle
    this.lastAlarmTime = 0;

    // Handle Resize
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener("resize", this.handleResize);
    this.handleResize();
  }

  handleResize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || 800;
    this.height = rect.height || 600;

    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    // Defense perimeter line: 95px above bottom
    this.defenseLineY = this.height - 95;
    // Tank center: bottom center
    this.tankPos = {
      x: this.width / 2,
      y: this.height - 35
    };
  }

  start() {
    this.handleResize();
    this.running = true;
    this.paused = false;
    this.health = 100;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.wordsDestroyed = 0;
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;
    this.words = [];
    this.lockedWord = null;
    this.bullets = [];
    this.particles = [];
    this.floatingTexts = [];
    this.startTime = performance.now();
    this.lastFrameTime = performance.now();
    this.lastSpawnTime = performance.now() - 1500; // trigger initial spawn quickly
    this.spawnInterval = 2500;
    this.bonusCounter = 0;
    this.difficultyFactor = 1.0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.barrelRecoil = 0;
    this.turretAngle = -Math.PI / 2;
    this.targetTurretAngle = -Math.PI / 2;

    this.updateHUD();

    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.loop = this.loop.bind(this);
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  togglePause() {
    if (!this.running) return false;
    this.paused = !this.paused;
    if (!this.paused) {
      this.lastFrameTime = performance.now();
      this.rafId = requestAnimationFrame(this.loop);
    }
    return this.paused;
  }

  /**
   * Main Keyboard Event Handler
   */
  handleKeystroke(key) {
    if (!this.running || this.paused || this.health <= 0) return false;
    if (!key || key.length !== 1) return false; // Ignore special keys like Shift, Enter, etc.

    this.totalKeystrokes++;

    // 1. If no word currently locked, search for all matching visible words
    if (!this.lockedWord) {
      // Find all visible words whose first letter matches the key
      const candidates = this.words.filter(w => !w.isDying && w.word && w.word[0] === key);

      if (candidates.length > 0) {
        // AUTOMATICALLY TARGET THE LOWEST / BOTTOM-MOST WORD FIRST (MAXIMUM Y)
        candidates.sort((a, b) => b.y - a.y);
        this.lockedWord = candidates[0];

        // Successfully hit first character!
        this.registerHitOnLockedWord(key);
        return true;
      } else {
        // Missed keystroke: no word matches
        this.registerMiss();
        return false;
      }
    } else {
      // 2. A word is already locked: must match the next character in sequence
      const targetChar = this.lockedWord.word[this.lockedWord.typedIndex];

      if (key === targetChar) {
        // Correct character in sequence!
        this.registerHitOnLockedWord(key);
        return true;
      } else {
        // Incorrect character for currently locked word
        this.registerMiss();
        return false;
      }
    }
  }

  registerHitOnLockedWord(key) {
    if (!this.lockedWord) return;

    this.correctKeystrokes++;
    const targetWord = this.lockedWord;
    const charIndex = targetWord.typedIndex;

    // Advance typed progress
    targetWord.typedIndex++;

    // Calculate exact screen position of this targeted character
    const charPos = targetWord.getCharPosition(charIndex);

    // Aim turret at the character
    const dx = charPos.x - this.tankPos.x;
    const dy = charPos.y - this.tankPos.y;
    this.targetTurretAngle = Math.atan2(dy, dx);
    // Clamp to upper hemisphere (-PI to 0)
    if (this.targetTurretAngle > 0) {
      this.targetTurretAngle = this.targetTurretAngle > Math.PI / 2 ? -Math.PI : 0;
    }

    // Trigger cannon recoil & muzzle flash
    this.barrelRecoil = 12;
    this.createMuzzleFlash();

    // Fire visible ballistic bullet towards character
    this.spawnBullet(charPos.x, charPos.y, targetWord.isRedBonus);

    // Sound effect
    soundFX.playLaserShot(targetWord.isRedBonus);

    // Check if entire word has been typed
    if (targetWord.typedIndex >= targetWord.word.length) {
      this.destroyWord(targetWord);
      this.lockedWord = null; // Clear lock for next target
    }

    this.updateHUD();
  }

  registerMiss() {
    this.combo = 0; // combo resets on miss
    soundFX.playMissBeep();
    // Subtle screen shake
    this.shakeDuration = 8;
    this.shakeIntensity = 2;
    this.updateHUD();
  }

  destroyWord(word) {
    this.wordsDestroyed++;
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    // Base score calculation: length * 25
    let points = word.word.length * 25;
    // Multiplier: 1 + combo bonus
    let multiplier = 1 + Math.min(5, Math.floor(this.combo / 4) * 0.5);

    if (word.isRedBonus) {
      // 3.5x bonus score!
      points = Math.round(points * 3.5);
    }

    const earned = Math.round(points * multiplier);
    this.score += earned;

    // Register resolution with ArsenalManager to enforce 3s exclusion window on initial char
    if (word.isRedBonus) {
      arsenalManager.registerBonusWordResolution(word.word);
    }

    // Audio explosion
    soundFX.playWordExplosion(word.isRedBonus);

    // Particle explosion & floating score text
    this.createWordExplosion(word.x, word.y, word.isRedBonus);

    const bonusTag = word.isRedBonus ? " [3.5X]" : (multiplier > 1 ? ` [x${multiplier.toFixed(1)}]` : "");
    this.addFloatingText(`+${earned}${bonusTag}`, word.x, word.y - 10, word.isRedBonus ? "#ff3344" : "#33ff77");

    // Mild screen shake
    this.shakeDuration = word.isRedBonus ? 16 : 10;
    this.shakeIntensity = word.isRedBonus ? 6 : 3;

    // Remove from active list
    this.words = this.words.filter(w => w !== word);

    // Increase difficulty progressively
    this.difficultyFactor = 1.0 + (this.wordsDestroyed * 0.02) + (this.elapsedSeconds * 0.005);
    this.spawnInterval = Math.max(1100, 2500 - (this.wordsDestroyed * 28));

    this.updateHUD();
  }

  handlePerimeterBreach(word) {
    // Word reached defense perimeter!
    const isBonus = word.isRedBonus;
    const damage = isBonus ? 30 : 20;

    this.health = Math.max(0, this.health - damage);
    this.combo = 0; // combo broken

    // Cooldown registration if bonus word breached
    if (isBonus) {
      arsenalManager.registerBonusWordResolution(word.word);
    }

    // Heavy audio & visual breach feedback
    soundFX.playDamageImpact();
    this.createBreachExplosion(word.x, this.defenseLineY, isBonus);

    this.shakeDuration = isBonus ? 24 : 18;
    this.shakeIntensity = isBonus ? 12 : 8;

    this.addFloatingText(`HULL -${damage}%`, word.x, this.defenseLineY - 20, "#ff2233");

    // Clear lock if this was the locked target
    if (this.lockedWord === word) {
      this.lockedWord = null;
    }

    // Remove word
    this.words = this.words.filter(w => w !== word);

    this.updateHUD();

    // Check game over
    if (this.health <= 0) {
      this.triggerGameOver(false); // false = perished / overrun
    }
  }

  triggerGameOver(aborted = false) {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Tank death explosion if hull depleted
    if (!aborted && this.health <= 0) {
      this.createTankDestructionExplosion();
      soundFX.playDamageImpact();
      soundFX.playWordExplosion(true);
    }

    const elapsedMinutes = Math.max(0.05, this.elapsedSeconds / 60);
    const wpm = Math.round((this.correctKeystrokes / 5) / elapsedMinutes);
    const accuracy = this.totalKeystrokes > 0 ?
      Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100) : 0;

    const sortieSummary = {
      score: this.score,
      wpm: wpm,
      accuracy: accuracy,
      wordsDestroyed: this.wordsDestroyed,
      maxCombo: this.maxCombo,
      durationSeconds: Math.round(this.elapsedSeconds),
      mode: arsenalManager.currentMode,
      modeName: arsenalManager.getModeName(),
      aborted: aborted,
      hullRemaining: this.health
    };

    if (this.onGameOver) {
      setTimeout(() => {
        this.onGameOver(sortieSummary);
      }, aborted ? 100 : 900);
    }
  }

  /**
   * Spawning Logic
   */
  spawnThreat() {
    // Check if red bonus target should spawn (every 6th threat or ~15% chance after 4th kill)
    this.bonusCounter++;
    const isBonus = (this.bonusCounter % 7 === 0);

    const wordText = arsenalManager.getRandomWord(isBonus, this.words);
    if (!wordText) return;

    // Fall speed scales with difficulty factor
    const baseSpeed = isBonus ? (1.35 * this.difficultyFactor) : (0.75 * this.difficultyFactor);

    // Font measurement for boundary placement
    this.ctx.font = '16px "Press Start 2P", monospace';
    const textWidth = this.ctx.measureText(wordText).width;

    // Random X bounded within playfield
    const margin = 40;
    const maxX = Math.max(margin + 50, this.width - textWidth - margin);
    const minX = margin;
    const spawnX = minX + Math.random() * (maxX - minX);
    const spawnY = -25; // spawn just above top edge

    const newWord = new FallingWord(wordText, spawnX, spawnY, baseSpeed, isBonus);
    this.words.push(newWord);

    if (isBonus) {
      soundFX.playRedBonusSpawn();
      this.addFloatingText("! RED BONUS THREAT !", spawnX, 30, "#ff2233");
    }
  }

  spawnBullet(targetX, targetY, isBonus) {
    // Bullet starts at cannon tip
    const barrelLength = 48 - this.barrelRecoil;
    const originX = this.tankPos.x + Math.cos(this.turretAngle) * barrelLength;
    const originY = this.tankPos.y + Math.sin(this.turretAngle) * barrelLength;

    const bullet = new BallisticBullet(originX, originY, targetX, targetY, isBonus);
    this.bullets.push(bullet);
  }

  createMuzzleFlash() {
    const barrelLength = 48;
    const tipX = this.tankPos.x + Math.cos(this.turretAngle) * barrelLength;
    const tipY = this.tankPos.y + Math.sin(this.turretAngle) * barrelLength;

    for (let i = 0; i < 9; i++) {
      const angle = this.turretAngle + (Math.random() - 0.5) * 0.8;
      const speed = 3 + Math.random() * 5;
      this.particles.push(new Particle(
        tipX, tipY,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        "#00ff66",
        12 + Math.random() * 10,
        2.5 + Math.random() * 2
      ));
    }
  }

  createWordExplosion(x, y, isBonus) {
    const color = isBonus ? "#ff3344" : "#00ff66";
    const count = isBonus ? 30 : 18;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * (isBonus ? 8 : 5);
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        25 + Math.random() * 20,
        2 + Math.random() * 3
      ));
    }
  }

  createBreachExplosion(x, y, isBonus) {
    for (let i = 0; i < 24; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 3 + Math.random() * 7;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        isBonus ? "#ff1122" : "#ffaa00",
        30 + Math.random() * 20,
        3 + Math.random() * 3
      ));
    }
  }

  createTankDestructionExplosion() {
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 10;
      const colors = ["#ff2233", "#ffaa00", "#ffffff", "#33ff66"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push(new Particle(
        this.tankPos.x + (Math.random() - 0.5) * 40,
        this.tankPos.y + (Math.random() - 0.5) * 20,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        50 + Math.random() * 30,
        3 + Math.random() * 4
      ));
    }
  }

  addFloatingText(text, x, y, color = "#00ff66") {
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      color: color,
      life: 45,
      maxLife: 45,
      vy: -1.2
    });
  }

  /**
   * Main Engine Loop (60 FPS)
   */
  loop(timestamp) {
    if (!this.running || this.paused) return;

    const dt = Math.min(100, timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;
    this.elapsedSeconds = (timestamp - this.startTime) / 1000;

    // 1. Spawning
    if (timestamp - this.lastSpawnTime > this.spawnInterval) {
      this.spawnThreat();
      this.lastSpawnTime = timestamp;
    }

    // 2. Turret smooth angle interpolation
    const angleDiff = this.targetTurretAngle - this.turretAngle;
    this.turretAngle += angleDiff * 0.18;

    // Recoil spring recovery
    if (this.barrelRecoil > 0) {
      this.barrelRecoil = Math.max(0, this.barrelRecoil - 35 * dt);
    }

    // 3. Update Falling Words
    for (let i = this.words.length - 1; i >= 0; i--) {
      const word = this.words[i];
      word.update(dt);

      // Check perimeter breach
      if (word.y >= this.defenseLineY) {
        this.handlePerimeterBreach(word);
      }
    }

    // 4. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt);
      if (b.reachedTarget()) {
        // Bullet hit! Spark burst at target
        for (let s = 0; s < 5; s++) {
          const spAngle = Math.random() * Math.PI * 2;
          const spSpeed = 1 + Math.random() * 3;
          this.particles.push(new Particle(
            b.targetX, b.targetY,
            Math.cos(spAngle) * spSpeed,
            Math.sin(spAngle) * spSpeed,
            b.isBonus ? "#ff4455" : "#50fa7b",
            12, 1.8
          ));
        }
        this.bullets.splice(i, 1);
      }
    }

    // 5. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 6. Update Floating Text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life--;
      ft.y += ft.vy;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 7. Critical Alarm Pulse if health < 25%
    if (this.health > 0 && this.health <= 25 && timestamp - this.lastAlarmTime > 1200) {
      soundFX.playCriticalAlarm();
      this.lastAlarmTime = timestamp;
    }

    // 8. Render Frame
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  }

  /**
   * Render Pass
   */
  render() {
    const ctx = this.ctx;
    ctx.save();

    // Scale for Retina/HiDPI
    ctx.scale(this.dpr, this.dpr);

    // Apply Screen Shake if active
    if (this.shakeDuration > 0) {
      this.shakeDuration--;
      const ox = (Math.random() - 0.5) * this.shakeIntensity;
      const oy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(ox, oy);
    }

    // Clear background
    ctx.fillStyle = "#020503";
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle tactical background radar grid
    this.renderTacticalGrid(ctx);

    // Render Defense Perimeter Line
    this.renderDefenseLine(ctx);

    // Render Falling Words
    for (let word of this.words) {
      word.render(ctx, word === this.lockedWord);
    }

    // Render Bullets
    for (let b of this.bullets) {
      b.render(ctx);
    }

    // Render Particles
    for (let p of this.particles) {
      p.render(ctx);
    }

    // Render Floating Text
    for (let ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '13px "Press Start 2P", monospace';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // Render Semicircular Tank & 180-deg Turret
    this.renderTank(ctx);

    ctx.restore();
  }

  renderTacticalGrid(ctx) {
    ctx.save();
    ctx.strokeStyle = "rgba(0, 255, 102, 0.04)";
    ctx.lineWidth = 1;

    // Vertical grid lines
    const gridStep = 50;
    for (let x = 0; x < this.width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.defenseLineY);
      ctx.stroke();
    }

    // Horizontal radar rings centered on tank
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0, 255, 102, 0.05)";
    for (let r = 120; r < this.height * 1.2; r += 120) {
      ctx.arc(this.tankPos.x, this.tankPos.y, r, Math.PI, 0);
    }
    ctx.stroke();

    ctx.restore();
  }

  renderDefenseLine(ctx) {
    ctx.save();

    // Pulsing glowing defense barrier
    const time = performance.now() * 0.003;
    const pulseAlpha = 0.5 + Math.sin(time) * 0.25;

    ctx.shadowColor = (this.health <= 25) ? "#ff2233" : "#00ff66";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = (this.health <= 25) ?
      `rgba(255, 34, 51, ${pulseAlpha})` :
      `rgba(0, 255, 102, ${pulseAlpha})`;
    ctx.lineWidth = 2;

    // Dashed neon line
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(10, this.defenseLineY);
    ctx.lineTo(this.width - 10, this.defenseLineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Defense line labels
    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.fillStyle = (this.health <= 25) ? "#ff3344" : "rgba(0, 255, 102, 0.6)";
    ctx.fillText("--- PERIMETER DEFENSE LINE [BREACH THRESHOLD] ---", 25, this.defenseLineY - 6);

    ctx.restore();
  }

  renderTank(ctx) {
    const cx = this.tankPos.x;
    const cy = this.tankPos.y;

    ctx.save();

    // 1. TANK BASE CHASSIS (Treads & Heavy Armor)
    const baseWidth = 140;
    const baseHeight = 22;
    const bx = cx - baseWidth / 2;
    const by = cy + 6;

    // Chassis tread box
    ctx.fillStyle = "#0a130c";
    ctx.strokeStyle = "#1b4424";
    ctx.lineWidth = 2;
    ctx.fillRect(bx, by, baseWidth, baseHeight);
    ctx.strokeRect(bx, by, baseWidth, baseHeight);

    // Tread segments
    ctx.fillStyle = "#040805";
    for (let tx = bx + 5; tx < bx + baseWidth - 5; tx += 12) {
      ctx.fillRect(tx, by + 2, 7, baseHeight - 4);
    }

    // Hazard stripes or neon trim
    ctx.strokeStyle = (this.health <= 25) ? "#ff2233" : "#00ff66";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + 10, by);
    ctx.lineTo(bx + baseWidth - 10, by);
    ctx.stroke();

    // 2. 180° ROTATING ACTIVE CANNON BARREL
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.turretAngle);

    const recoil = this.barrelRecoil;
    const barrelLength = 48 - recoil;
    const barrelWidth = 12;

    // Main barrel shadow / core
    ctx.fillStyle = "#0f2314";
    ctx.strokeStyle = (this.health <= 25) ? "#ff3344" : "#00ff66";
    ctx.lineWidth = 1.5;
    ctx.fillRect(0, -barrelWidth / 2, barrelLength, barrelWidth);
    ctx.strokeRect(0, -barrelWidth / 2, barrelLength, barrelWidth);

    // Barrel muzzle brake at tip
    ctx.fillStyle = (this.health <= 25) ? "#ff2233" : "#50fa7b";
    ctx.fillRect(barrelLength - 4, -barrelWidth / 2 - 3, 6, barrelWidth + 6);

    // Glowing laser sight tracer along cannon line towards target
    if (this.lockedWord) {
      ctx.strokeStyle = "rgba(0, 255, 102, 0.18)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(barrelLength + 4, 0);
      ctx.lineTo(barrelLength + 600, 0);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    // 3. SEMICIRCULAR DOME TURRET
    const domeRadius = 34;

    // Outer dome fill
    ctx.beginPath();
    ctx.arc(cx, cy, domeRadius, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = "#0c1b10";
    ctx.fill();
    ctx.strokeStyle = (this.health <= 25) ? "#ff3344" : "#00ff66";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Inner armor ring
    ctx.beginPath();
    ctx.arc(cx, cy, domeRadius - 8, Math.PI, 0, false);
    ctx.strokeStyle = "rgba(0, 255, 102, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Core Reactor / Hatch Light
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 7, 0, Math.PI * 2);
    ctx.fillStyle = (this.health <= 25) ? "#ff2233" : "#00ff66";
    ctx.shadowColor = (this.health <= 25) ? "#ff2233" : "#00ff66";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Armor plate rivets
    ctx.fillStyle = "#00ff66";
    for (let a = Math.PI * 0.85; a <= Math.PI * 1.85; a += Math.PI * 0.25) {
      const rx = cx + Math.cos(a) * (domeRadius - 4);
      const ry = cy + Math.sin(a) * (domeRadius - 4);
      ctx.beginPath();
      ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Sync Real-Time HUD Elements
   */
  updateHUD() {
    if (!this.hud) return;

    // 6-digit zero-padded score
    if (this.hud.score) {
      this.hud.score.textContent = this.score.toString().padStart(6, "0");
    }

    // Combo multiplier
    if (this.hud.combo) {
      const mult = 1 + Math.min(5, Math.floor(this.combo / 4) * 0.5);
      this.hud.combo.textContent = `x${mult.toFixed(1)} (${this.combo})`;
      this.hud.combo.style.color = this.combo >= 8 ? "#ffb020" : (this.combo > 0 ? "#50fa7b" : "#888888");
    }

    // Live WPM: (correctKeystrokes / 5) / (elapsedMinutes)
    if (this.hud.wpm) {
      const elapsedMins = Math.max(0.02, this.elapsedSeconds / 60);
      const liveWpm = Math.round((this.correctKeystrokes / 5) / elapsedMins);
      this.hud.wpm.textContent = liveWpm.toString();
    }

    // Live Accuracy
    if (this.hud.accuracy) {
      const acc = this.totalKeystrokes > 0 ?
        Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100) : 100;
      this.hud.accuracy.textContent = `${acc}%`;
    }

    // Health Bar
    if (this.hud.healthBar && this.hud.healthText) {
      const h = Math.max(0, Math.min(100, this.health));
      this.hud.healthBar.style.width = `${h}%`;
      this.hud.healthText.textContent = `${h}%`;

      if (h > 50) {
        this.hud.healthBar.style.backgroundColor = "#00ff66";
        this.hud.healthBar.style.boxShadow = "0 0 10px rgba(0, 255, 102, 0.6)";
      } else if (h > 25) {
        this.hud.healthBar.style.backgroundColor = "#ffaa00";
        this.hud.healthBar.style.boxShadow = "0 0 10px rgba(255, 170, 0, 0.6)";
      } else {
        this.hud.healthBar.style.backgroundColor = "#ff2233";
        this.hud.healthBar.style.boxShadow = "0 0 12px rgba(255, 34, 51, 0.8)";
      }
    }
  }
}

/**
 * Falling Threat Word Component
 */
class FallingWord {
  constructor(word, x, y, speed, isRedBonus = false) {
    this.word = word;
    this.typedIndex = 0; // index of next required character
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.isRedBonus = isRedBonus;
    this.isDying = false;

    // Cache font and sizing
    this.fontSize = 15;
    this.charWidth = 12; // approximate mono character width
  }

  update(dt) {
    this.y += this.speed * 60 * dt;
  }

  /**
   * Returns exact (x, y) center coordinate of character at index i
   */
  getCharPosition(index) {
    return {
      x: this.x + index * this.charWidth + (this.charWidth / 2),
      y: this.y + (this.fontSize / 2)
    };
  }

  render(ctx, isLocked) {
    ctx.save();

    const text = this.word;
    const len = text.length;
    const totalWidth = len * this.charWidth;

    // Target reticle / lock brackets if locked
    if (isLocked) {
      ctx.strokeStyle = this.isRedBonus ? "#ff2a4b" : "#50fa7b";
      ctx.lineWidth = 1.5;
      const pad = 6;
      const rx = this.x - pad;
      const ry = this.y - this.fontSize - pad + 4;
      const rw = totalWidth + pad * 2;
      const rh = this.fontSize + pad * 2;

      // Draw corner brackets: +--  --+
      const corner = 7;
      ctx.beginPath();
      // Top-Left
      ctx.moveTo(rx, ry + corner);
      ctx.lineTo(rx, ry);
      ctx.lineTo(rx + corner, ry);
      // Top-Right
      ctx.moveTo(rx + rw - corner, ry);
      ctx.lineTo(rx + rw, ry);
      ctx.lineTo(rx + rw, ry + corner);
      // Bottom-Right
      ctx.moveTo(rx + rw, ry + rh - corner);
      ctx.lineTo(rx + rw, ry + rh);
      ctx.lineTo(rx + rw - corner, ry + rh);
      // Bottom-Left
      ctx.moveTo(rx + corner, ry + rh);
      ctx.lineTo(rx, ry + rh);
      ctx.lineTo(rx, ry + rh - corner);
      ctx.stroke();

      // Pulsing Lock-On Reticle Text
      ctx.font = '9px "Share Tech Mono", monospace';
      ctx.fillStyle = this.isRedBonus ? "#ff3344" : "#00ff66";
      ctx.fillText("[LOCK-ON]", rx, ry - 4);
    }

    // Red Bonus Header Tag
    if (this.isRedBonus) {
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = "#ff2233";
      ctx.shadowColor = "#ff2233";
      ctx.shadowBlur = 6;
      ctx.fillText("▲ 3.5X BONUS ▲", this.x - 4, this.y - this.fontSize - 6);
      ctx.shadowBlur = 0;
    }

    // Render Characters with FADE EFFECT for typed characters:
    // Typed characters immediately drop to ~35-40% opacity while remaining letters stay crisp!
    ctx.font = `bold ${this.fontSize}px "Press Start 2P", monospace`;

    for (let i = 0; i < len; i++) {
      const char = text[i];
      const cx = this.x + i * this.charWidth;

      if (i < this.typedIndex) {
        // TYPED CHARACTER: Faded to ~35-40% opacity
        ctx.fillStyle = this.isRedBonus ? "rgba(255, 80, 100, 0.38)" : "rgba(0, 255, 102, 0.38)";
        ctx.shadowBlur = 0;
        ctx.fillText(char, cx, this.y);
      } else if (i === this.typedIndex) {
        // CURRENT TARGET CHARACTER: Bright, glowing cursor / underline beneath
        ctx.fillStyle = this.isRedBonus ? "#ffffff" : "#ffffff";
        ctx.shadowColor = this.isRedBonus ? "#ff3344" : "#00ff66";
        ctx.shadowBlur = 10;
        ctx.fillText(char, cx, this.y);

        // Blinking underline cursor
        const blink = Math.floor(performance.now() / 250) % 2 === 0;
        if (blink || isLocked) {
          ctx.fillStyle = this.isRedBonus ? "#ff3344" : "#00ff66";
          ctx.fillRect(cx, this.y + 4, this.charWidth - 2, 3);
        }
      } else {
        // REMAINING CHARACTERS: Crisp full opacity
        ctx.fillStyle = this.isRedBonus ? "#ff3344" : "#33ff77";
        ctx.shadowColor = this.isRedBonus ? "#ff2233" : "#00ff66";
        ctx.shadowBlur = 5;
        ctx.fillText(char, cx, this.y);
      }
    }

    ctx.restore();
  }
}

/**
 * Ballistic Projectile Bullet
 */
class BallisticBullet {
  constructor(originX, originY, targetX, targetY, isBonus = false) {
    this.x = originX;
    this.y = originY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.isBonus = isBonus;

    const dx = targetX - originX;
    const dy = targetY - originY;
    const dist = Math.hypot(dx, dy) || 1;

    this.speed = 1800; // fast responsive ballistic velocity (pixels/sec)
    this.vx = (dx / dist) * this.speed;
    this.vy = (dy / dist) * this.speed;

    // Trail points for phosphor tracer
    this.trail = [{ x: originX, y: originY }];
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) {
      this.trail.shift();
    }
  }

  reachedTarget() {
    // Reached or surpassed target altitude
    return this.y <= this.targetY || (this.vy > 0 && this.y >= this.targetY);
  }

  render(ctx) {
    ctx.save();

    // Draw tracer line
    if (this.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.strokeStyle = this.isBonus ? "rgba(255, 50, 70, 0.4)" : "rgba(80, 250, 123, 0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Glowing bullet head
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = this.isBonus ? "#ffffff" : "#ffffff";
    ctx.shadowColor = this.isBonus ? "#ff3344" : "#00ff66";
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Simple 2D Particle
 */
class Particle {
  constructor(x, y, vx, vy, color, life, size) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
  }

  update(dt) {
    this.x += this.vx * 60 * dt;
    this.y += this.vy * 60 * dt;
    this.life -= 60 * dt;
  }

  render(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.restore();
  }
}
