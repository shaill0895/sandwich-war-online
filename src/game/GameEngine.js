import { CONFIG, COLORS, CHARACTERS } from './constants';
import { Player, Obstacle } from './entities';
import { checkRectCollide } from './utils';

export class GameEngine {
    constructor() {
        this.p1 = new Player(1, "AUSTIN", COLORS.blue, 100, true);
        this.p2 = new Player(2, "BRADY", COLORS.red, CONFIG.arenaWidth - 150, false);

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

        const isP1 = owner === this.p1;
        const p = {
            x: isP1 ? owner.x + owner.width : owner.x - 25,
            y: owner.y + owner.height / 2 - 10 - owner.z, // Spawn at height
            z: owner.z, // Projectile height
            width: isP1 ? 40 : 25,
            height: isP1 ? 20 : 25,
            vx: isP1 ? CONFIG.projectileSpeed : -CONFIG.projectileSpeed,
            vy: 0,
            owner: owner,
            type: isP1 ? 'sub' : 'chip',
            damage: owner.damage,
            penetrates: false,
            life: 2.0
        };

        if (owner.rapidFireTimer > 0) owner.cooldown = CONFIG.fireRate / 2;
        else owner.cooldown = CONFIG.fireRate;

        this.projectiles.push(p);
    }

    useUltimate(owner) {
        if (owner.ultCharge < owner.maxUlt) return;
        owner.ultCharge = 0;
        this.spawnText(owner.x, owner.y - owner.z - 80, "ULTIMATE!", "#FF00FF", 60);
        this.shake(20);

        // ... (Ultimate logic similar to before, slightly adjusted for Z if needed, but keeping 2D logic for simplicity of hitboxes)
        if (owner.charType === 'chef') { // GARGANTUAN
            const p = {
                x: owner.x + owner.width,
                y: owner.y + owner.height / 2 - 50,
                width: 180, height: 100,
                vx: 1500, vy: 0,
                owner: owner,
                type: 'gargantuan',
                damage: 80,
                penetrates: true,
                life: 3.0
            };
            this.projectiles.push(p);
        } else if (owner.charType === 'pigeon') { // FLOCK
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.projectiles.push({
                        x: owner.x + owner.width, y: owner.y + Math.random() * owner.height,
                        width: 30, height: 30,
                        vx: 1200, vy: (Math.random() - 0.5) * 400,
                        owner: owner, type: 'bird', damage: 20, penetrates: false, life: 2.0
                    });
                }, i * 100);
            }
        } else if (owner.charType === 'fridge') { // FREEZE
            this.activeEvent = 'SLOW';
            this.eventTimer = 3.0;
            this.spawnText(this.camera.x + window.innerWidth / 2, this.camera.y + window.innerHeight / 2, "FREEZE!", "#00FFFF", 80);
        } else if (owner.charType === 'toaster') { // TOAST POP
            this.shake(40);
            this.createExplosion(owner.x + owner.width / 2, owner.y + owner.height / 2, '#FFA500');
            for (let i = 0; i < 8; i++) {
                this.projectiles.push({
                    x: owner.x + owner.width / 2, y: owner.y + owner.height / 2,
                    width: 40, height: 40,
                    vx: (Math.random() - 0.5) * 1500, vy: (Math.random() - 0.5) * 1500,
                    owner: owner, type: 'toast', damage: 45, penetrates: false, life: 1.0
                });
            }
        }
    }

    update(dt, inputs) {
        if (this.gameState !== 'PLAYING') return;
        if (dt > 0.1) dt = 0.1;

        if (this.shakeIntensity > 0) this.shakeIntensity *= 0.9;
        if (this.shakeIntensity < 0.5) this.shakeIntensity = 0;

        // Camera Update (Dynamic Zoom & Fit)
        const midX = (this.p1.x + this.p2.x + this.p1.width / 2 + this.p2.width / 2) / 2;
        const midY = (this.p1.y + this.p2.y + this.p1.height / 2 + this.p2.height / 2) / 2;

        const distX = Math.abs(this.p1.x - this.p2.x) + 400; // +Padding
        const distY = Math.abs(this.p1.y - this.p2.y) + 400;

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
        // P1
        let dx1 = 0, dy1 = 0;
        if (inputs.p1.up) dy1 = -1;
        if (inputs.p1.down) dy1 = 1;
        if (inputs.p1.left) dx1 = -1;
        if (inputs.p1.right) dx1 = 1;
        if (inputs.p1.fire) this.spawnProjectile(this.p1);
        if (inputs.p1.dash && !this.p1.isDashing && this.p1.dashCooldown <= 0) {
            if (this.p1.stamina > 20) {
                this.p1.isDashing = true; this.p1.dashTime = 0.2; this.p1.dashCooldown = CONFIG.dashCooldown;
                this.p1.stamina -= 20;
                this.spawnText(this.p1.x, this.p1.y, "DASH!", "#FFF", 20);
            }
        }
        if (inputs.p1.ult) this.useUltimate(this.p1);
        if (inputs.p1.jump === true || inputs.p1.jump === undefined && inputs.p1.up && !dy1) { /* handled via specialized inputs in GameCanvas? No, let's map it */ }
        // Let's assume 'jump' input is mapped
        if (inputs.p1.jump) this.p1.jump();

        this.p1.move(dx1, dy1, dt, this.obstacles, this.activeEvent);

        // P2
        let dx2 = 0, dy2 = 0;
        if (inputs.p2.up) dy2 = -1;
        if (inputs.p2.down) dy2 = 1;
        if (inputs.p2.left) dx2 = -1;
        if (inputs.p2.right) dx2 = 1;
        if (inputs.p2.fire) this.spawnProjectile(this.p2);
        if (inputs.p2.dash && !this.p2.isDashing && this.p2.dashCooldown <= 0) {
            if (this.p2.stamina > 20) {
                this.p2.isDashing = true; this.p2.dashTime = 0.2; this.p2.dashCooldown = CONFIG.dashCooldown;
                this.p2.stamina -= 20;
                this.spawnText(this.p2.x, this.p2.y, "DASH!", "#FFF", 20);
            }
        }
        if (inputs.p2.ult) this.useUltimate(this.p2);
        if (inputs.p2.jump) this.p2.jump();

        this.p2.move(dx2, dy2, dt, this.obstacles, this.activeEvent);

        // Cooldowns & Timers
        [this.p1, this.p2].forEach(p => {
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

            // Simple Hit Check (ignoring z for projectile simplicity, or maybe checking z < 50)
            let target = p.owner === this.p1 ? this.p2 : this.p1;

            // If owning player id is 0 (Hazard), hurt both
            if (p.owner.id === 0) {
                if (checkRectCollide(p, this.p1)) target = this.p1;
                else if (checkRectCollide(p, this.p2)) target = this.p2;
                else target = null;
            }

            if (target && checkRectCollide(p, target)) {
                // 2.5D Hit Check: Projectile must be within Z range of target
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
                    if (!p.penetrates) this.projectiles.splice(i, 1);
                }
            }
        }

        // Powerups
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            let p = this.powerups[i];
            [this.p1, this.p2].forEach(player => {
                // Must be on ground to pick up
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
                    this.powerups.splice(i, 1);
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
                ultCharge: this.p2.ultCharge, stamina: this.p2.stamina
            },
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

        this.projectiles = data.projectiles.map(p => ({
            ...p,
            owner: p.ownerId === 0 ? { id: 0 } : (p.ownerId === 1 ? this.p1 : this.p2)
        }));

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

        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, CONFIG.arenaWidth, CONFIG.arenaHeight);

        // Grid lines for 3D feel
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        for (let i = 0; i < CONFIG.arenaWidth; i += 100) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CONFIG.arenaHeight); ctx.stroke(); }
        for (let i = 0; i < CONFIG.arenaHeight; i += 100) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CONFIG.arenaWidth, i); ctx.stroke(); }

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
            ctx.fillStyle = p.color;
            if (p.isTrail) ctx.fillRect(p.x, p.y, p.width, p.height);
            else ctx.fillRect(p.x, p.y, 5, 5);
        });

        this.projectiles.forEach(p => {
            ctx.fillStyle = (p.owner.id === 1) ? COLORS.blue : (p.owner.id === 2 ? COLORS.red : '#FFF');
            if (p.type === 'sub') ctx.fillStyle = COLORS.bread;
            if (p.type === 'chip') ctx.fillStyle = COLORS.chip;
            ctx.fillRect(p.x, p.y, p.width, p.height);
        });

        [this.p1, this.p2].forEach(p => this.drawPlayer(ctx, p));
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

        // Body
        ctx.fillStyle = p.baseColor;
        ctx.fillRect(p.x, drawY, p.width, p.height);

        if (p.isDashing) {
            ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
            ctx.strokeRect(p.x, drawY, p.width, p.height);
        }
        if (p.shield > 0) {
            ctx.strokeStyle = COLORS.shield; ctx.lineWidth = 3;
            ctx.strokeRect(p.x - 5, drawY - 5, p.width + 10, p.height + 10);
        }

        // Head
        ctx.fillStyle = '#f1c27d';
        ctx.fillRect(p.x + 10, drawY - 15, 30, 20);

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

        ctx.fillStyle = 'white'; ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.fillStyle = 'black';
        for (let i = 0; i < b.height; i += 12) ctx.fillRect(b.x, b.y + i, b.width, 6);
        ctx.fillStyle = '#f1c27d'; ctx.fillRect(b.x + 10, b.y - 15, 30, 20);

        if (b.msgTimer > 0) {
            ctx.textAlign = 'center'; ctx.fillStyle = 'white'; ctx.strokeStyle = 'black'; ctx.lineWidth = 2;
            ctx.font = 'bold 20px Arial';
            ctx.strokeText(b.msg, b.x + b.width / 2, b.y - 40);
            ctx.fillText(b.msg, b.x + b.width / 2, b.y - 40);
        }
        ctx.restore();
    }
}
