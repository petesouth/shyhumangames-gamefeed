import * as Phaser from 'phaser';
import { BaseExplodable } from './baseExplodable';
import { Utils } from '../utils/utils';

export class Bullet extends BaseExplodable {
    protected speed: number = 10;  // Adjust for desired bullet speed
    protected distanceTraveled: number = 0;
    protected maxDistance: number;
    protected direction: Phaser.Math.Vector2;
    
    protected colors: number[];

    // Base dimensions for resolution scaling
    protected static BASE_WIDTH = 2065;
    protected static BASE_HEIGHT = 1047;

    constructor(protected scene: Phaser.Scene, startX: number, startY: number, angle: number, colors: number[] = [0xffa500, 0xff4500]) {
        // Migrated Geom.Point instantiation to Math.Vector2
        super(scene, scene.add.graphics(), [new Phaser.Math.Vector2(startX, startY)]);

        this.colors = colors;
        this.maxDistance = 0.5 * Math.max(scene.scale.width, scene.scale.height);
        
        // Convert the angle to a direction vector
        const radians = Phaser.Math.DegToRad(angle);
        this.direction = new Phaser.Math.Vector2(Math.cos(radians), Math.sin(radians));
    }

    protected handleScreenWrap() {
        const centroid = this.getCentroid();
        if (centroid.x < 0) {
            this._points[0].x += this.scene.scale.width;
        } else if (centroid.x > this.scene.scale.width) {
            this._points[0].x -= this.scene.scale.width;
        }

        if (centroid.y < 0) {
            this._points[0].y += this.scene.scale.height;
        } else if (centroid.y > this.scene.scale.height) {
            this._points[0].y -= this.scene.scale.height;
        }
    }

    public drawObjectAlive() {
        // Included decoupled base dimensions to calculate relative speed scaling
        const ratioSpeed = Utils.computeRatioValue(this.speed, Bullet.BASE_WIDTH, Bullet.BASE_HEIGHT);
        const dx = this.direction.x * ratioSpeed;
        const dy = this.direction.y * ratioSpeed;
        this._points[0].x += dx;
        this._points[0].y += dy;
        this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
        
        // Check if the bullet has reached the maximum distance
        if (this.distanceTraveled >= this.maxDistance) {
            this.explode();
        }

        const chosenColor = Phaser.Utils.Array.GetRandom(this.colors);
        this.graphics.fillStyle(chosenColor);
        const theCenter = this.getCentroid();

        // Included decoupled base dimensions to calculate relative circle radius scaling
        const radius = Utils.computeRatioValue(4, Bullet.BASE_WIDTH, Bullet.BASE_HEIGHT);
        this.graphics.fillCircle(theCenter.x, theCenter.y, radius);
        this.handleScreenWrap();
    }

    public incrementX(x: number) {
        this._points.forEach((point) => {
            point.x += x;
        });
    }
}