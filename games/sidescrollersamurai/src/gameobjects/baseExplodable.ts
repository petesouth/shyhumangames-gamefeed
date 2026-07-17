import * as Phaser from 'phaser';
import { Utils } from "../utils/utils";

export enum BaseExplodableState {
    ALIVE,
    EXPLODING,
    DESTROYED
}

export abstract class BaseExplodable {

    protected scene: Phaser.Scene;
    protected graphics: Phaser.GameObjects.Graphics;
    protected popSize: number = 0;
    protected maxPopSize: number = 5;
    
    // 1. Change Point[] to Vector2[]
    protected _points: Phaser.Math.Vector2[] = []; 
    public state: BaseExplodableState = BaseExplodableState.ALIVE;
    protected explosionEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
    protected explosionColors: string[] = [ 'red', 'yellow', 'green' ];

    protected static BASE_WIDTH = 2065;
    protected static BASE_HEIGHT = 1047;

    // 2. Update constructor types
    constructor(scene: Phaser.Scene, graphics: Phaser.GameObjects.Graphics, points: Phaser.Math.Vector2[] = []) {
        this.graphics = graphics;
        this.scene = scene;
        this._points = points;
    }

    createExplosionEmitter() {
        const centroid = this.getCentroid();
        const computedLifespan = Utils.computeRatioValue(this.maxPopSize, BaseExplodable.BASE_WIDTH, BaseExplodable.BASE_HEIGHT);

        this.explosionEmitter = this.scene.add.particles(centroid.x, centroid.y, 'flares', {
            frame: this.explosionColors,
            lifespan: computedLifespan,
            speed: { min: 150, max: 250 },
            scale: { start: 0.8, end: 0 },
            gravityY: 150,
            blendMode: 'ADD',
            emitting: false
        });
        
        this.explosionEmitter.setPosition(centroid.x, centroid.y);
        this.explosionEmitter.explode(computedLifespan);
    }

    // 3. Update Getter & Setter types
    public getPoints(): Phaser.Math.Vector2[] {
        return this._points;
    }

    public setPoints(value: Phaser.Math.Vector2[]) {
        this._points = value;
    }

    public respawn() {
        this.state = BaseExplodableState.ALIVE;
    }

    public explode() {
        this.state = BaseExplodableState.EXPLODING;
        this.playExplosionSound();
    }

    public destroy() {
        this.graphics.clear();
        this.state = BaseExplodableState.DESTROYED;
    }

    public playExplosionSound(): void {
        let explosionSound = this.scene.sound.add('explosion', { loop: false });
        explosionSound.play();
    }

    public abstract drawObjectAlive(): void;

    public drawObjectIsDead(): void {
    }

    public drawExplosion(): boolean {
        this.destroy();
        this.createExplosionEmitter();
        return false;
    }

    public render() {
        this.graphics.clear();

        switch (this.state) {
            case BaseExplodableState.ALIVE:
                this.drawObjectAlive();
                break;
            case BaseExplodableState.EXPLODING:
                this.drawExplosion();
                break;
            case BaseExplodableState.DESTROYED:
                this.drawObjectIsDead();
                break;
        }
    }

    // 4. Update return type to Vector2
    public getCentroid(): Phaser.Math.Vector2 {
        if (this._points.length === 0) {
            return new Phaser.Math.Vector2(0, 0);
        }

        const { x, y } = this._points.reduce((acc, point) => ({
            x: acc.x + point.x,
            y: acc.y + point.y
        }), { x: 0, y: 0 });

        const centroidX = x / this._points.length;
        const centroidY = y / this._points.length;

        // Construct Phaser.Math.Vector2 instead of Geom.Point
        return new Phaser.Math.Vector2(centroidX, centroidY);
    }

    public getObjectWidthHeight(): { width: number, height: number } {
        if (this._points.length === 0) {
            return { width: 0, height: 0 };
        }

        const maxX = Math.max(...this._points.map(point => point.x));
        const minX = Math.min(...this._points.map(point => point.x));
        const maxY = Math.max(...this._points.map(point => point.y));
        const minY = Math.min(...this._points.map(point => point.y));

        return {
            width: maxX - minX,
            height: maxY - minY
        };
    }

    // 5. Update target parameter type expectation to expect a Vector2 centroid
    public handleBaseCollision(target: { getCentroid(): Phaser.Math.Vector2 }, distanceTrigger: number): boolean {
        const sourcePoint = this.getCentroid();
        const targetPoint = target.getCentroid();

        if (this.state === BaseExplodableState.ALIVE) {
            const distance = Phaser.Math.Distance.BetweenPoints(sourcePoint, targetPoint);

            if (distanceTrigger >= distance) {
                this.explode();
            }
        }

        return this.state !== BaseExplodableState.ALIVE;
    }
}