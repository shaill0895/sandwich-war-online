export class SpriteManager {
    constructor() {
        this.sprites = {};
        this.loaded = 0;
        this.toLoad = 0;
    }

    load(name, path) {
        this.toLoad++;
        const img = new Image();
        img.src = path;
        img.onload = () => {
            this.loaded++;
            console.log(`Loaded sprite: ${name}`);
        };
        this.sprites[name] = img;
    }

    get(name) {
        return this.sprites[name];
    }
}

export const sprites = new SpriteManager();

// Preload Assets
import austinSrc from '../assets/characters/austin.png';
import bradySrc from '../assets/characters/brady.png';
import bryceSrc from '../assets/characters/bryce.png';

export function loadGameAssets() {
    sprites.load('austin', austinSrc);
    sprites.load('brady', bradySrc);
    sprites.load('bryce', bryceSrc);
}
