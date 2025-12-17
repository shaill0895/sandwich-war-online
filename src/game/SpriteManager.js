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
import pigeonSrc from '../assets/characters/pigeon_sheet.png';
import chefSrc from '../assets/characters/chef_sheet.png';
import fridgeSrc from '../assets/characters/fridge_sheet.png';
import toasterSrc from '../assets/characters/toaster_sheet.png';
import mechaSrc from '../assets/characters/mecha_sandwich_sheet.png';
import crustSrc from '../assets/characters/lord_crust_sheet.png';
import galacticSrc from '../assets/characters/galactic_garnish_sheet.png';
import floorSrc from '../assets/floor_texture.png';

export function loadGameAssets() {
    sprites.load('austin', austinSrc);
    sprites.load('brady', bradySrc);
    sprites.load('bryce', bryceSrc);
    sprites.load('pigeon', pigeonSrc);
    sprites.load('chef', chefSrc);
    sprites.load('fridge', fridgeSrc);
    sprites.load('toaster', toasterSrc);
    sprites.load('mecha', mechaSrc);
    sprites.load('crust', crustSrc);
    sprites.load('galactic', galacticSrc);
    sprites.load('floor', floorSrc);
}
