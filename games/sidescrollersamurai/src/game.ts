/// <reference path="../node_modules/phaser/types/phaser.d.ts" />
import * as Phaser from 'phaser';
import { SplashScreen } from './scenes/SplashScreen';
import { MainScene } from './scenes/MainScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.WEBGL,
    // Width and height converted to numbers for strict type safety
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game',
    fps: {
        limit: 60,
    },
    scene: [SplashScreen, MainScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        touch: {
            capture: true
        }
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0, x: 0 },
            debug: false,
            checkCollision: {
                up: true,
                down: true,
                left: true,
                right: true
            }
        }
    },
};

export default class Game extends Phaser.Game {
    constructor() {
        super(config);

        window.addEventListener("resize", this.handleWindowResize.bind(this));
        document.getElementById("game")?.focus();
        
        // Setup Resize Listeners
        this.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, this.handleWindowResize, this);
        this.scale.on(Phaser.Scale.Events.FULLSCREEN_FAILED, this.handleWindowResize, this);
        this.scale.on(Phaser.Scale.Events.FULLSCREEN_UNSUPPORTED, this.handleWindowResize, this);
        this.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, this.handleWindowResize, this);
    }

    handleWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Safer scene retrieval
        const scenes = ['MainScene', 'SplashScreen'];
        scenes.forEach(key => {
            const scene = this.scene.getScene(key);
            if (scene && scene.scene.isActive()) {
                // Safely invoke the scene's custom resize method
                (scene as any).handleWindowResize?.(width, height);
            }
        });
    }
}