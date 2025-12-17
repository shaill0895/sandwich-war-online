import { CONFIG, COLORS, CHARACTERS } from './constants';
import { Player, Obstacle } from './entities';
import { checkRectCollide } from './utils';
import { loadGameAssets, sprites } from './SpriteManager';

export class GameEngine {
    constructor() {
        loadGameAssets();
        this.p1 = new Player(1, "AUSTIN", COLORS.blue, 100, true);
        this.p2 = new Player(2, "BRADY", COLORS.red, CONFIG.arenaWidth - 150, false);
        this.p3 = new Player(3, "FRIDGE", COLORS.green, 100, true); // Bottom Left?
        this.p4 = new Player(4, "TOASTER", COLORS.yellow, CONFIG.arenaWidth - 150, false);

        // Init inactive players (will be activated by lobby)
        this.p3.active = false;
        this.p4.active = false;
        this.p1.active = true;
        this.p2.active = true;

        this.projectiles = [];
        this.particles = [];
        this.powerups = [];
        this.obstacles = [];
        this.floatingTexts = [];

        this.gameState = 'MENU';
        this.round = 1;
        this.shakeIntensity = 0;

        // Camera
        this.camera = { x: CONFIG.arenaWidth / 2, y: CONFIG.arenaHeight / 2, zoom: 1 };

        // Bryce (The Referee/Announcer)
        this.bryce = {
            x: CONFIG.arenaWidth / 2,
            y: CONFIG.arenaHeight / 2,
            width: 50, height: 70,
            speed: 400,
            targetX: CONFIG.arenaWidth / 2,
            targetY: CONFIG.arenaHeight / 2,
            msg: "", msgTimer: 0, actionTimer: 0
        };

        this.activeEvent = null;
        this.eventTimer = 0;
        this.foodRainTimer = 0;

        this.initLevel();
    }

    updateRoster(chars) {
        // chars = { p1: 'austin', p2: 'toaster' ... }
        if (chars.p1) this.setupPlayer(this.p1, chars.p1);
        if (chars.p2) this.setupPlayer(this.p2, chars.p2);
        if (chars.p3) this.setupPlayer(this.p3, chars.p3);
        if (chars.p4) this.setupPlayer(this.p4, chars.p4);

        // Active flags
        this.p3.active = !!chars.p3;
        this.p4.active = !!chars.p4;
    }

    setupPlayer(player, charId) {
        const data = CHARACTERS.find(c => c.id === charId) || CHARACTERS[0];
        player.charType = charId;
        player.color = data.color;
        // Reset stats if needed (hp, speed etc should be dynamic from data)
        // For now relying on hardcoded checks inside update/draw or we can set them here
        player.maxHp = data.hp;
        player.hp = player.maxHp;
        player.damage = data.dmg;
        // Speed is handled in Player class but we can override or set properties
        player.baseSpeed = CONFIG.playerSpeed * data.speed;
        player.maxUlt = 100;
    }

    initLevel() {
        this.obstacles = [];
        const w = CONFIG.arenaWidth;
        const h = CONFIG.arenaHeight;

        // Central Feature (Fountain)
        this.obstacles.push(new Obstacle(w / 2 - 35, h / 2 - 50, 70, 100, 'fountain'));

        // Spread out tables
        this.obstacles.push(new Obstacle(w * 0.2, h * 0.3, 100, 120, 'table'));
        this.obstacles.push(new Obstacle(w * 0.2, h * 0.7, 100, 120, 'table'));
        this.obstacles.push(new Obstacle(w * 0.8, h * 0.3, 100, 120, 'table'));
        this.obstacles.push(new Obstacle(w * 0.8, h * 0.7, 100, 120, 'table'));

        // Random clutter
        for (let i = 0; i < 5; i++) {
            this.obstacles.push(new Obstacle(
                300 + Math.random() * (w - 600),
                200 + Math.random() * (h - 400),
                60 + Math.random() * 50,
                80 + Math.random() * 40,
                'metal'
            ));
        }
    }

    spawnText(x, y, text, color, size = 30) {
        // Optimization: Limit text count
        if (this.floatingTexts.length > 20) this.floatingTexts.shift();
        this.floatingTexts.push({ x, y, text, color, size, life: 1.0, vy: -60 });
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 6; i++) { // Optimized particle count
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 500,
                vy: (Math.random() - 0.5) * 500,
                life: 0.3,
                color: color
            });
        }
    }

    shake(amount) {
        this.shakeIntensity = Math.min(this.shakeIntensity + amount, 50);
    }

    spawnProjectile(owner) {
        if (owner.cooldown > 0) return;

        const dir = owner.isLeft ? 1 : -1;

        let p = {
            x: owner.isLeft ? owner.x + owner.width : owner.x - 30,
            y: owner.y + owner.height / 3 - owner.z,
            z: owner.z,
            width: 30, height: 30,
            vx: 600 * dir, vy: 0,
            owner: owner,
            life: 2.0,
            damage: 15,
            type: 'default',
            penetrates: false
        };

        // Character Specifics
        if (owner.charType === 'austin') {
            p.type = 'baguette'; p.width = 40; p.height = 15;
            p.damage = 20; p.life = 1.5;
            owner.cooldown = 0.4;
        } else if (owner.charType === 'brady') {
            p.type = 'feather'; p.width = 20; p.height = 20;
            p.vx = 900 * dir; p.damage = 12;
            owner.cooldown = 0.25;
        } else if (owner.charType === 'pigeon') {
            p.type = 'poop'; p.width = 15; p.height = 15;
            p.vy = 200; p.vx = 500 * dir; // Arc
            p.damage = 10; owner.cooldown = 0.3;
        } else if (owner.charType === 'chef') {
            p.type = 'ladle'; p.width = 30; p.height = 30;
            p.vx = 450 * dir; p.damage = 30;
            owner.cooldown = 0.8;
        } else if (owner.charType === 'fridge') {
            p.type = 'ice'; p.vx = 450 * dir; p.damage = 25;
            owner.cooldown = 0.9;
        } else if (owner.charType === 'toaster') {
            p.type = 'toast'; p.vx = 1000 * dir; p.damage = 35;
            owner.cooldown = 1.1;
        } else if (owner.charType === 'mecha') {
            p.type = 'rocket'; p.vx = 800 * dir; p.damage = 40;
            p.penetrates = true;
            owner.cooldown = 1.5;
        } else if (owner.charType === 'crust') {
            p.type = 'pepperoni'; p.vx = 500 * dir; p.damage = 18;
            owner.cooldown = 0.35;
        } else if (owner.charType === 'galactic') {
            p.type = 'star'; p.vx = 700 * dir; p.damage = 22;
            owner.cooldown = 0.5;
            p.vy = (Math.random() - 0.5) * 100; // Wobbly
        }

        if (owner.rapidFireTimer > 0) owner.cooldown = 0.1;

        this.projectiles.push(p);
    }

    useUltimate(owner) {
        if (owner.ultCharge < owner.maxUlt) return;
        owner.ultCharge = 0;
        this.spawnText(owner.x, owner.y - owner.z - 80, "ULTIMATE!", "#FF00FF", 60);
        this.shake(20);

        if (owner.charType === 'austin') {
            // BAGUETTE BARRAGE
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.projectiles.push({
                        x: owner.x, y: owner.y - owner.z, width: 40, height: 15,
                        vx: (owner.isLeft ? 1 : -1) * 800, vy: (Math.random() - 0.5) * 200,
                        owner: owner, type: 'baguette', damage: 25, life: 2.0
                    });
                }, i * 100);
            }
        } else if (owner.charType === 'brady') {
            // FEATHER STORM (360 burst)
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                this.projectiles.push({
                    x: owner.x, y: owner.y - owner.z, width: 20, height: 20,
                    vx: Math.cos(angle) * 600, vy: Math.sin(angle) * 600,
                    owner: owner, type: 'feather', damage: 15, life: 1.5
                });
            }
        } else if (owner.charType === 'pigeon') {
            // DIVE BOMB (Launch up then slam)
            owner.vz = 1500; // Sky high
            setTimeout(() => {
                owner.vz = -2000; // Slam down
                // Damage handled in move/collision logic technically, but let's add an explosion on landing?
                // For now, spawn projectiles down
                this.projectiles.push({
                    x: owner.x, y: owner.y, z: 600, width: 100, height: 100,
                    vx: 0, vy: 2000, owner: owner, type: 'body_slam', damage: 60, life: 1.0
                });
            }, 500);
        } else if (owner.charType === 'chef') {
            // SOUP SPLASH (Pool)
            this.obstacles.push(new Obstacle(owner.x + (owner.isLeft ? 100 : -100), owner.y, 150, 150, 'puddle')); // Sticky puddle?
            this.createExplosion(owner.x, owner.y, '#00FF00');
        } else if (owner.charType === 'fridge') {
            // DEEP FREEZE
            this.activeEvent = 'SLOW'; // Global slow
            this.eventTimer = 4.0;
        } else if (owner.charType === 'toaster') {
            // TOAST POP (Explosion)
            this.createExplosion(owner.x, owner.y, '#FFA500');
            for (let i = 0; i < 8; i++) {
                this.projectiles.push({
                    x: owner.x, y: owner.y - owner.z, width: 30, height: 30,
                    vx: (Math.random() - 0.5) * 1200, vy: (Math.random() - 0.5) * 1200,
                    owner: owner, type: 'toast', damage: 50, life: 1.0
                });
            }
        } else if (owner.charType === 'mecha') {
            // ROCKET FIST
            this.projectiles.push({
                x: owner.x, y: owner.y - owner.z, width: 100, height: 60,
                vx: (owner.isLeft ? 1 : -1) * 1200, vy: 0,
                owner: owner, type: 'rocket', damage: 90, penetrates: true, life: 3.0
            });
        }
        // Add others if needed
    }

    update(dt, inputs) {
        if (this.gameState !== 'PLAYING') return;
        if (dt > 0.1) dt = 0.1;

        if (this.shakeIntensity > 0) this.shakeIntensity *= 0.9;
        if (this.shakeIntensity < 0.5) this.shakeIntensity = 0;

        // Camera Update (Dynamic Zoom & Fit)
        const activePlayers = [this.p1, this.p2, this.p3, this.p4].filter(p => p.active);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        activePlayers.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x + p.width);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y + p.height);
        });

        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        const distX = (maxX - minX) + 400; // Padding
        const distY = (maxY - minY) + 400;

        // Calculate Target Zoom
        const zoomX = window.innerWidth / distX;
        const zoomY = window.innerHeight / distY;
        let targetZoom = Math.min(zoomX, zoomY);

        // Clamp Zoom
        targetZoom = Math.max(CONFIG.minZoom, Math.min(targetZoom, CONFIG.maxZoom));

        // Smooth Zoom
        this.camera.zoom += (targetZoom - this.camera.zoom) * CONFIG.zoomSmooth;

        // Smooth Target
        this.camera.x += (midX - this.camera.x) * CONFIG.cameraSmooth;
        this.camera.y += (midY - this.camera.y) * CONFIG.cameraSmooth;

        // Clamp Camera Center to stay within arena bounds (considering zoom)
        const viewW = window.innerWidth / this.camera.zoom;
        const viewH = window.innerHeight / this.camera.zoom;

        this.camera.x = Math.max(viewW / 2, Math.min(this.camera.x, CONFIG.arenaWidth - viewW / 2));
        this.camera.y = Math.max(viewH / 2, Math.min(this.camera.y, CONFIG.arenaHeight - viewH / 2));


        // Event: Food Rain
        if (this.activeEvent === 'RAIN') {
            this.foodRainTimer -= dt;
            if (this.foodRainTimer <= 0) {
                this.foodRainTimer = 0.2;
                this.projectiles.push({
                    x: this.camera.x + Math.random() * window.innerWidth,
                    y: this.camera.y - 50,
                    width: 30, height: 30,
                    vx: 0, vy: 400,
                    owner: { id: 0, damage: 10 },
                    type: 'chip', damage: 10, penetrates: false, life: 3.0
                });
            }
        }

        // Event Timer
        this.eventTimer -= dt;
        if (this.eventTimer <= 0) {
            this.activeEvent = null;
        }

        // Bryce (Wandering)
        const b = this.bryce;
        b.actionTimer -= dt;

        // Move Bryce towards target
        const dx = b.targetX - b.x;
        const dy = b.targetY - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Bryce Speed (Dynamic based on Total Player Health)
        const activeChars = [this.p1, this.p2, this.p3, this.p4].filter(p => p.active);
        const totalMaxHp = activeChars.reduce((sum, p) => sum + p.maxHp, 0);
        const currentHp = activeChars.reduce((sum, p) => sum + Math.max(0, p.hp), 0);

        let hpRatio = 1.0;
        if (totalMaxHp > 0) hpRatio = currentHp / totalMaxHp;

        // Speed ranges from 100% (400) to 200% (800) as HP drops
        const dynSpeed = 400 + (1 - hpRatio) * 400;
        b.speed = dynSpeed;

        if (dist > 10) {
            b.x += (dx / dist) * b.speed * dt;
            b.y += (dy / dist) * b.speed * dt;
        } else {
            // Pick new target
            b.targetX = 100 + Math.random() * (CONFIG.arenaWidth - 200);
            b.targetY = 100 + Math.random() * (CONFIG.arenaHeight - 200);
        }

        if (b.actionTimer <= 0) {
            b.actionTimer = 12 + Math.random() * 15; // Less often (12-27s)
            if (Math.random() > 0.4) {
                this.spawnPowerup();
                // Random Event Chance
                if (Math.random() > 0.7) {
                    this.activeEvent = 'RAIN';
                    this.eventTimer = 5.0;
                    this.spawnText(b.x, b.y - 60, "FOOD RAIN!", "#FF4500", 50);
                }
            }
        }
        if (b.msgTimer > 0) b.msgTimer -= dt;

        // Inputs & Movement
        const players = [this.p1, this.p2, this.p3, this.p4].filter(p => p.active);

        players.forEach(p => {
            const key = `p${p.id}`;
            const input = inputs[key] || {};

            let dx = 0, dy = 0;
            if (input.up) dy = -1;
            if (input.down) dy = 1;
            if (input.left) dx = -1;
            if (input.right) dx = 1;

            if (input.fire) this.spawnProjectile(p);
            if (input.dash && !p.isDashing && p.dashCooldown <= 0) {
                if (p.stamina > 20) {
                    p.isDashing = true; p.dashTime = 0.2; p.dashCooldown = CONFIG.dashCooldown;
                    p.stamina -= 20;
                    this.spawnText(p.x, p.y, "DASH!", "#FFF", 20);
                }
            }
            if (input.ult) this.useUltimate(p);
            if (input.jump) p.jump();

            p.move(dx, dy, dt, this.obstacles, this.activeEvent);
        });

        // Cooldowns & Timers
        players.forEach(p => {
            if (p.cooldown > 0) p.cooldown -= dt;
            if (p.dashCooldown > 0) p.dashCooldown -= dt;
            if (p.isDashing) {
                p.dashTime -= dt;
                if (p.dashTime <= 0) p.isDashing = false;
                if (Math.random() > 0.5) {
                    this.particles.push({
                        x: p.x, y: p.y - p.z, width: p.width, height: p.height,
                        life: 0.2, color: 'rgba(255,255,255,0.3)', isTrail: true
                    });
                }
            }
            if (p.speedBuffTimer > 0) p.speedBuffTimer -= dt;
            if (p.rapidFireTimer > 0) p.rapidFireTimer -= dt;

            if (p.comboTimer > 0) {
                p.comboTimer -= dt;
                if (p.comboTimer <= 0) {
                    p.combo = 0;
                    this.spawnText(p.x, p.y - p.z - 40, "COMBO LOST", "#CCC", 20);
                }
            }
        });

        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            if (p.life <= 0 || p.x < 0 || p.x > CONFIG.arenaWidth) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Hit Check
            const targets = players.filter(pl => pl !== p.owner && (p.owner.id === 0 || p.owner.id !== pl.id));

            for (let target of targets) {
                if (checkRectCollide(p, target)) {
                    // 2.5D Hit Check
                    const projZ = p.z || 0;
                    if (Math.abs(projZ - target.z) < 60) {
                        if (!target.isDashing) {
                            if (target.shield > 0) {
                                target.shield--;
                                this.spawnText(target.x, target.y - target.z, "BLOCKED!", "#00FFFF", 30);
                                this.createExplosion(p.x, p.y, "#00FFFF");
                            } else {
                                target.hp -= p.damage;
                                if (p.owner.gainXp) {
                                    p.owner.gainXp(15, this);
                                    p.owner.addCombo(this);
                                }
                                this.spawnText(target.x, target.y - target.z, `-${Math.floor(p.damage)}`, COLORS.dmgText, 35);
                                this.createExplosion(p.x, p.y, p.type === 'sub' ? COLORS.bread : COLORS.chip);
                                this.shake(5);
                                this.checkWin();
                            }
                        } else {
                            this.spawnText(target.x, target.y - 20, "PERFECT!", "#00FF00", 30);
                            if (target.gainXp) target.gainXp(20, this);
                        }
                        if (!p.penetrates) {
                            this.projectiles.splice(i, 1);
                            break; // Handled
                        }
                    }
                }
            }
        }

        // Powerups
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            let p = this.powerups[i];
            players.forEach(player => {
                if (player.z < 20 && checkRectCollide(p, player)) {
                    if (p.type === 'speed') {
                        player.speedBuffTimer = 5.0;
                        this.spawnText(player.x, player.y, "SPEED UP!", COLORS.speed, 30);
                    } else if (p.type === 'shield') {
                        player.shield = 1;
                        this.spawnText(player.x, player.y, "SHIELD!", COLORS.shield, 30);
                    } else if (p.type === 'rapid') {
                        player.rapidFireTimer = 3.0;
                        this.spawnText(player.x, player.y, "RAPID FIRE!", COLORS.rapid, 30);
                    }
                    if (this.powerups.includes(p)) this.powerups.splice(i, 1);
                }
            });
        }

        this.updateParticles(dt, this.particles);
        this.updateParticles(dt, this.floatingTexts);
    }

    spawnPowerup() {
        const types = ['speed', 'shield', 'rapid'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.powerups.push({
            x: this.bryce.x, y: this.bryce.y,
            width: 35, height: 35,
            type: type
        });
        this.bryce.msg = "DROPPING!";
        this.bryce.msgTimer = 0.8;
    }

    updateParticles(dt, arr) {
        for (let i = arr.length - 1; i >= 0; i--) {
            let p = arr[i];
            if (p.vy) p.y += p.vy * dt;
            if (p.vx) { p.x += p.vx * dt; p.y += p.vy * dt; }
            p.life -= dt;
            if (p.life <= 0) arr.splice(i, 1);
        }
    }

    checkWin() {
        if (this.p1.hp <= 0 || this.p2.hp <= 0) {
            this.gameState = 'ROUND_OVER';
        }
    }

    getState() {
        return {
            p1: {
                x: this.p1.x, y: this.p1.y, z: this.p1.z, hp: this.p1.hp,
                isDashing: this.p1.isDashing, shield: this.p1.shield,
                ultCharge: this.p1.ultCharge, stamina: this.p1.stamina
            },
            p2: {
                x: this.p2.x, y: this.p2.y, z: this.p2.z, hp: this.p2.hp,
                isDashing: this.p2.isDashing, shield: this.p2.shield,
                ultCharge: this.p2.ultCharge, stamina: this.p2.stamina, active: this.p2.active
            },
            p3: this.p3.active ? {
                x: this.p3.x, y: this.p3.y, z: this.p3.z, hp: this.p3.hp,
                isDashing: this.p3.isDashing, shield: this.p3.shield,
                ultCharge: this.p3.ultCharge, stamina: this.p3.stamina, active: true
            } : null,
            p4: this.p4.active ? {
                x: this.p4.x, y: this.p4.y, z: this.p4.z, hp: this.p4.hp,
                isDashing: this.p4.isDashing, shield: this.p4.shield,
                ultCharge: this.p4.ultCharge, stamina: this.p4.stamina, active: true
            } : null,
            projectiles: this.projectiles.map(p => ({
                x: p.x, y: p.y, width: p.width, height: p.height,
                vx: p.vx, vy: p.vy, type: p.type, ownerId: p.owner.id,
                damage: p.damage, penetrates: p.penetrates, life: p.life
            })),
            powerups: this.powerups,
            bryce: this.bryce,
            activeEvent: this.activeEvent,
            camera: this.camera
        };
    }

    setState(data) {
        if (!data) return;
        Object.assign(this.p1, data.p1);
        Object.assign(this.p2, data.p2);
        if (data.p3) { this.p3.active = true; Object.assign(this.p3, data.p3); }
        if (data.p4) { this.p4.active = true; Object.assign(this.p4, data.p4); }

        this.projectiles = data.projectiles.map(p => {
            let owner = this.p1;
            if (p.ownerId === 2) owner = this.p2;
            if (p.ownerId === 3) owner = this.p3;
            if (p.ownerId === 4) owner = this.p4;
            return { ...p, owner };
        });

        this.powerups = data.powerups;
        this.bryce = data.bryce;
        this.activeEvent = data.activeEvent;
        if (data.camera) this.camera = data.camera;
    }

    draw(ctx) {
        ctx.save();
        // Camera Transform (Center Scaling)
        ctx.translate(window.innerWidth / 2, window.innerHeight / 2);
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x, -this.camera.y);



        // Floor Texture
        const floorImg = sprites.get('floor');
        if (floorImg && floorImg.complete) {
            const ptrn = ctx.createPattern(floorImg, 'repeat');
            ctx.fillStyle = ptrn;
            ctx.fillRect(0, 0, CONFIG.arenaWidth, CONFIG.arenaHeight);
        } else {
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, CONFIG.arenaWidth, CONFIG.arenaHeight);
            // Grid lines 
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            for (let i = 0; i < CONFIG.arenaWidth; i += 100) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CONFIG.arenaHeight); ctx.stroke(); }
            for (let i = 0; i < CONFIG.arenaHeight; i += 100) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CONFIG.arenaWidth, i); ctx.stroke(); }
        }

        // Shake
        if (this.shakeIntensity > 0) {
            const dx = (Math.random() - 0.5) * this.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.shakeIntensity;
            ctx.translate(dx, dy);
        }

        this.obstacles.forEach(o => o.draw(ctx));

        this.powerups.forEach(p => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(p.x + 5, p.y + p.height - 5, p.width, 5);
            // Item
            ctx.fillStyle = COLORS[p.type] || '#FFF';
            ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
            ctx.strokeRect(p.x, p.y, p.width, p.height);
        });

        this.particles.forEach(p => {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter'; // Glow effect
            ctx.fillStyle = p.color;
            ctx.beginPath();
            if (p.isTrail) {
                ctx.globalAlpha = 0.5;
                ctx.rect(p.x, p.y, p.width, p.height);
            } else {
                ctx.arc(p.x, p.y, 3 + Math.random() * 2, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.restore();
        });

        this.projectiles.forEach(p => {
            ctx.fillStyle = (p.owner.id === 1) ? COLORS.blue : (p.owner.id === 2 ? COLORS.red : '#FFF');
            if (p.type === 'sub') ctx.fillStyle = COLORS.bread;
            if (p.type === 'chip') ctx.fillStyle = COLORS.chip;
            ctx.fillRect(p.x, p.y, p.width, p.height);
        });

        [this.p1, this.p2, this.p3, this.p4].filter(p => p.active).forEach(p => this.drawPlayer(ctx, p));
        this.drawBryce(ctx);

        this.floatingTexts.forEach(t => {
            ctx.fillStyle = t.color;
            ctx.font = `bold ${t.size}px Arial`;
            ctx.fillText(t.text, t.x, t.y);
        });

        // UI Overlay (Stamina/HP bars above player) could go here or remain in HUD

        ctx.restore();
    }


    drawPlayer(ctx, p) {
        ctx.save();
        // Dynamic Shadow (based on Z)
        const shadowScale = Math.max(0.2, 1 - p.z / 250);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(p.x + p.width / 2, p.y + p.height - 5, 20 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Apply Z-offset for body
        const drawY = p.y - p.z;

        // Sprite Rendering
        let spriteName = 'austin'; // Default
        if (p.charType === 'pigeon') spriteName = 'brady';

        const img = sprites.get(spriteName);
        if (img && img.complete) {
            // Draw Sprite
            // Flip if facing left (Austin starts left, Brady starts right usually)
            // But we have "isLeft" property on Player? No, but we can check direction or ID.
            // ID 1 (Austin) usually faces right, ID 2 (Brady) faces left.
            // Let's assume standard sprites face RIGHT.

            ctx.drawImage(img, p.x - 20, drawY - 20, p.width + 40, p.height + 40); // Draw slightly larger than hit box

            if (p.isDashing) {
                ctx.globalCompositeOperation = 'add';
                ctx.globalAlpha = 0.5;
                ctx.drawImage(img, p.x - 20, drawY - 20, p.width + 40, p.height + 40);
                ctx.globalAlpha = 1.0;
                ctx.globalCompositeOperation = 'source-over';
            }
        } else {
            // Fallback Rect
            ctx.fillStyle = p.baseColor;
            ctx.fillRect(p.x, drawY, p.width, p.height);
            // ... (Head etc)
            ctx.fillStyle = '#f1c27d';
            ctx.fillRect(p.x + 10, drawY - 15, 30, 20);
        }

        if (p.shield > 0) {
            ctx.strokeStyle = COLORS.shield; ctx.lineWidth = 3;
            ctx.strokeRect(p.x - 5, drawY - 5, p.width + 10, p.height + 10);
        }

        // Stamina Bar (Small, under player)
        ctx.fillStyle = '#333';
        ctx.fillRect(p.x, drawY + p.height + 5, p.width, 5);
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(p.x, drawY + p.height + 5, p.width * (p.stamina / 100), 5);

        // Name
        ctx.fillStyle = 'white'; ctx.strokeStyle = 'black'; ctx.lineWidth = 2;
        ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
        ctx.strokeText(p.name, p.x + p.width / 2, drawY - 25);
        ctx.fillText(p.name, p.x + p.width / 2, drawY - 25);
        ctx.restore();
    }

    drawBryce(ctx) {
        const b = this.bryce;
        ctx.save();
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(b.x + b.width / 2, b.y + b.height - 5, 20, 8, 0, 0, Math.PI * 2); ctx.fill();

        const img = sprites.get('bryce');
        if (img && img.complete) {
            ctx.drawImage(img, b.x - 10, b.y - 10, b.width + 20, b.height + 20);
        } else {
            ctx.fillStyle = 'white'; ctx.fillRect(b.x, b.y, b.width, b.height);
            ctx.fillStyle = 'black';
            for (let i = 0; i < b.height; i += 12) ctx.fillRect(b.x, b.y + i, b.width, 6);
            ctx.fillStyle = '#f1c27d'; ctx.fillRect(b.x + 10, b.y - 15, 30, 20);
        }

        if (b.msgTimer > 0) {
            ctx.textAlign = 'center'; ctx.fillStyle = 'white'; ctx.strokeStyle = 'black'; ctx.lineWidth = 2;
            ctx.font = 'bold 20px Arial';
            ctx.strokeText(b.msg, b.x + b.width / 2, b.y - 40);
            ctx.fillText(b.msg, b.x + b.width / 2, b.y - 40);
        }
        ctx.restore();
    }
}
