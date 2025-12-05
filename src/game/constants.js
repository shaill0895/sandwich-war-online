export const CONFIG = {
    arenaWidth: 3000,
    arenaHeight: 2000,
    playerSpeed: 600,
    projectileSpeed: 1000,
    dashCooldown: 0.8,
    fireRate: 0.25,
    gravity: 2500,
    jumpStrength: 900,
    cameraSmooth: 0.1
};

export const COLORS = {
    red: '#CF0A2B',
    blue: '#00008B',
    white: '#FFFFFF',
    bread: '#D2691E',
    lettuce: '#32CD32',
    chip: '#FFD700',
    table: '#8B4513',
    metal: '#A9A9A9',
    xpText: '#00BFFF',
    dmgText: '#FF4500',
    speed: '#FFFF00',
    shield: '#00FFFF',
    rapid: '#FF4500'
};

export const CHARACTERS = [
    { id: 'chef', name: 'THE CHEF', hp: 100, dmg: 15, speed: 1.0, color: '#f1c27d', ult: 'GARGANTUAN' },
    { id: 'pigeon', name: 'PIGEON', hp: 70, dmg: 10, speed: 1.3, color: '#A9A9A9', ult: 'FLOCK' },
    { id: 'fridge', name: 'THE FRIDGE', hp: 150, dmg: 20, speed: 0.8, color: '#E0FFFF', ult: 'FREEZE' },
    { id: 'toaster', name: 'THE TOASTER', hp: 90, dmg: 25, speed: 1.1, color: '#555', ult: 'TOAST POP' }
];
