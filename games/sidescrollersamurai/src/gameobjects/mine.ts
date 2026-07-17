import * as Phaser from 'phaser';
import { BaseExplodable } from './baseExplodable';

export class Mine extends BaseExplodable {
    private flameParticles: Phaser.GameObjects.Particles.ParticleEmitter;
    private lifeTimer: number = 5000;  // 5 seconds
    private creationTime: number;
    protected colors: number[] = [0xffa500, 0xff4500];
   
    constructor(scene: Phaser.Scene, startX: number, startY: number) {
        // Migrated from legacy Geom.Point to Vector2
        super(scene, scene.add.graphics(), [new Phaser.Math.Vector2(startX, startY)]);

        this.flameParticles = this.createFlameEmitter(this.colors, startX, startY);
        this.flameParticles.start();
        this.creationTime = Date.now();
    }

    private createFlameEmitter(colors: number[], x: number, y: number): Phaser.GameObjects.Particles.ParticleEmitter {
        // Create the modern Phaser 4 particle emitter
        return this.scene.add.particles(x, y, 'flares', {
            frame: ['red', 'yellow', 'green'],
            lifespan: { min: 400, max: 800 }, // Converted from 2ms to functional lifespan window
            radial: true,
            scale: { start: 0.5, end: 0, ease: 'sine.in' },
            alpha: { start: 1, end: 0, ease: 'sine.in' },
            speed: { min: 20, max: 80 }, // Scaled speed slightly to match the millisecond lifespan
            angle: { min: 0, max: 360 },
            blendMode: 'ADD',
            visible: true
        });
    }

    // Fixed typo from inrementX to incrementX
    public incrementX(x: number) {
        this.flameParticles.x += x;
        this._points.forEach((point) => {
            point.x += x;
        });
    }

    public drawExplosion(): boolean {
        this.flameParticles.setVisible(false);
        this.flameParticles.destroy();
        return super.drawExplosion();
    }

    public drawObjectAlive(): void {
        const currentTime = Date.now();
        if (currentTime - this.creationTime >= this.lifeTimer) {
            this.explode();
        }
    }
}