import Phaser from 'phaser';
import { SplashScreen } from '../game';

// Constants derived from the polygon creation logic
const MAX_SIZE = 28;
const MIN_SIZE = 15;
const SCALE = 1.6;
const MIN_SIDES = 5;
const MAX_SIDES = 12;

export class SpaceObject {
    private graphics: Phaser.GameObjects.Graphics;
    private velocity: Phaser.Math.Vector2;
    private scene: Phaser.Scene;
    private angle: number;
    private spaceObjectSprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

    private polygon: Phaser.Geom.Polygon;


    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics();

        // Initialize the angle and angular velocity properties
        this.angle = Phaser.Utils.Array.GetRandom([1, -1]);


        const x = Phaser.Math.Between(0, scene.scale.width);
        const y = Phaser.Math.Between(0, scene.scale.height);

        const sides = Phaser.Math.Between(MIN_SIDES, MAX_SIDES);
        const size = Phaser.Math.Between(MIN_SIZE, MAX_SIZE);
        const scale = SCALE; // Scaling factor

        const points = [];
        for (let i = 0; i < sides; i++) {
            // Add randomness to the point generation
            const varianceX = Phaser.Math.Between(-size * scale * 0.5, size * scale * 0.5);
            const varianceY = Phaser.Math.Between(-size * scale * 0.5, size * scale * 0.5);

            const px = Math.cos((i / sides) * 2 * Math.PI) * (size * scale + varianceX) + x;
            const py = Math.sin((i / sides) * 2 * Math.PI) * (size * scale + varianceY) + y;

            points.push(new Phaser.Geom.Point(px, py));
        }

        this.polygon = new Phaser.Geom.Polygon(points);

        this.velocity = new Phaser.Math.Vector2(
            Phaser.Math.Between(-50, 50) / 100,
            Phaser.Math.Between(-50, 50) / 100
        );

        // Create a graphics object with the desired line color
        const centroid = this.getCentroid();
        this.spaceObjectSprite = this.scene.physics.add.sprite(centroid.x, centroid.y, Phaser.Utils.Array.GetRandom(SplashScreen.textureNames));
        this.renderPolyMask(this.polygon.points, this.spaceObjectSprite);
    }

    protected renderPolyMask(points: Phaser.Geom.Point[], image: Phaser.GameObjects.Image) {
        const maskGraphics = this.scene.make.graphics();
        maskGraphics.fillStyle(0xffffff); // Set the fill color to white
        maskGraphics.beginPath();
        maskGraphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            maskGraphics.lineTo(points[i].x, points[i].y);
        }
        maskGraphics.closePath();
        maskGraphics.fillPath();

        // Create a mask from the graphics object and apply it to the image
        const mask = maskGraphics.createGeometryMask();
        image.setMask(mask);
    }

    public renderSpaceObject(spaceObjects: SpaceObject[]) {
        // Update position and velocity
        this.polygon.setTo(this.polygon.points.map(point => {
            return new Phaser.Geom.Point(point.x + this.velocity.x, point.y + this.velocity.y);
        }));

        // Clamp the velocity magnitude to a maximum value
        const maxVelocityMagnitude = 7; // Adjust as needed
        const velocityMagnitude = this.velocity.length();

        if (velocityMagnitude > maxVelocityMagnitude) {
            this.velocity.normalize().scale(maxVelocityMagnitude);
        }

        // Wrap around the screen
        const maxX = Math.max(...this.polygon.points.map(point => point.x));
        const minX = Math.min(...this.polygon.points.map(point => point.x));
        const maxY = Math.max(...this.polygon.points.map(point => point.y));
        const minY = Math.min(...this.polygon.points.map(point => point.y));

        if (maxX < 0) {
            this.polygon.setTo(this.polygon.points.map(point => new Phaser.Geom.Point(point.x + this.scene.scale.width, point.y)));
        } else if (minX > this.scene.scale.width) {
            this.polygon.setTo(this.polygon.points.map(point => new Phaser.Geom.Point(point.x - this.scene.scale.width, point.y)));
        }

        if (maxY < 0) {
            this.polygon.setTo(this.polygon.points.map(point => new Phaser.Geom.Point(point.x, point.y + this.scene.scale.height)));
        } else if (minY > this.scene.scale.height) {
            this.polygon.setTo(this.polygon.points.map(point => new Phaser.Geom.Point(point.x, point.y - this.scene.scale.height)));
        }

        // Clear graphics and set fill style
        this.graphics.clear();

        // Calculate rotated polygon points
        const rotationAngleIncrment = this.angle;
        const rotatedPoints = this.polygon.points.map(point => {
            const rotatedX = Math.cos(Phaser.Math.DegToRad(rotationAngleIncrment)) * (point.x - this.getCentroid().x) - Math.sin(Phaser.Math.DegToRad(rotationAngleIncrment)) * (point.y - this.getCentroid().y) + this.getCentroid().x;
            const rotatedY = Math.sin(Phaser.Math.DegToRad(rotationAngleIncrment)) * (point.x - this.getCentroid().x) + Math.cos(Phaser.Math.DegToRad(rotationAngleIncrment)) * (point.y - this.getCentroid().y) + this.getCentroid().y;
            return new Phaser.Geom.Point(rotatedX, rotatedY);
        });

        this.polygon.points = rotatedPoints;
        this.spaceObjectSprite.rotation += Phaser.Math.DegToRad(rotationAngleIncrment);
        this.spaceObjectSprite.setPosition(this.getCentroid().x, this.getCentroid().y);

        // Draw the rotated polygon with both fill and stroke
        //this.graphics.fillPoints(rotatedPoints, true);
        //this.graphics.strokePoints(rotatedPoints, true);

        // Handle collisions with other SpaceObjects
        this.detectCollisions(spaceObjects);

        this.renderPolyMask(this.polygon.points, this.spaceObjectSprite);

    }

    public destroy() {
        this.graphics.clear();
        this.graphics.destroy();
        this.spaceObjectSprite.destroy();
    }

    public getObjectWidthHeight(): { width: number, height: number } {
        const maxX = Math.max(...this.polygon.points.map(point => point.x));
        const minX = Math.min(...this.polygon.points.map(point => point.x));
        const maxY = Math.max(...this.polygon.points.map(point => point.y));
        const minY = Math.min(...this.polygon.points.map(point => point.y));

        return {
            width: maxX - minX,
            height: maxY - minY
        };
    }



    public static getMaxSpaceObjectWidthHeight(): { width: number, height: number } {
        const maxDiameter = MAX_SIZE * SCALE * 2; // Diameter = 2 * Radius
        return {
            width: maxDiameter,
            height: maxDiameter
        };
    }

    public getCentroid(): Phaser.Geom.Point {
        return this.getCentroidOfPolygon(this.polygon);
    }

    private getCentroidOfPolygon(polygon: Phaser.Geom.Polygon): Phaser.Geom.Point {
        const { x, y } = polygon.points.reduce((acc, point) => ({
            x: acc.x + point.x,
            y: acc.y + point.y
        }), { x: 0, y: 0 });

        const centroidX = x / polygon.points.length;
        const centroidY = y / polygon.points.length;

        return new Phaser.Geom.Point(centroidX, centroidY);
    }

    private detectCollisions(spaceObjects: SpaceObject[]) {
        const centroidSpaceObj = this.getCentroid();
        for (const spaceObj of spaceObjects) {
            if (spaceObj !== this) {
                const collisionPoints = spaceObj.getPolygon().points;

                for (let point of collisionPoints) {
                    if (Phaser.Geom.Polygon.ContainsPoint(this.getPolygon(), point)) {
                        const distance = Phaser.Math.Distance.BetweenPoints(point, centroidSpaceObj);
                        const trigger = this.getObjectWidthHeight().height < this.getObjectWidthHeight().width ? this.getObjectWidthHeight().height : this.getObjectWidthHeight().width;

                        if (distance < trigger) {
                            // Calculate the repelling force direction
                            const repelDirection = new Phaser.Math.Vector2(
                                centroidSpaceObj.x - point.x,
                                centroidSpaceObj.y - point.y
                            ).normalize();

                            // Apply the repelling force
                            const repelForce = 0.5; // Adjust as needed
                            this.velocity.add(repelDirection.scale(repelForce));
                        }
                    }
                }
            }
        }
    }


    getPolygon() {
        return this.polygon;
    }

    getVelocity() : Phaser.Math.Vector2 {
        return this.velocity;
    }

    setVelocity(x: number, y: number) {
        this.velocity.set(x, y);
    }
}