import Phaser from 'phaser';

export class SpaceObject {
    private graphics: Phaser.GameObjects.Graphics;
    private polygon: Phaser.Geom.Polygon;
    private velocity: Phaser.Math.Vector2;
    private scene: Phaser.Scene;
    private hasCollided: boolean = false; // Flag to track collision

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        const x = Phaser.Math.Between(0, scene.scale.width);
        const y = Phaser.Math.Between(0, scene.scale.height);

        const sides = Phaser.Math.Between(5, 7);
        const size = Phaser.Math.Between(10, 20);
        const scale = 1.6; // Scaling factor

        const points = [];

        for (let i = 0; i < sides; i++) {
            const px = Math.cos((i / sides) * 2 * Math.PI) * size * scale + x;
            const py = Math.sin((i / sides) * 2 * Math.PI) * size * scale + y;
            points.push(new Phaser.Geom.Point(px, py));
        }

        this.polygon = new Phaser.Geom.Polygon(points);

        this.velocity = new Phaser.Math.Vector2(
            Phaser.Math.Between(-50, 50) / 100,
            Phaser.Math.Between(-50, 50) / 100
        );

        this.graphics = scene.add.graphics({ lineStyle: { width: 1, color: 0xFFFFFF } });
    }

    update(spaceObjects: SpaceObject[]) {
        this.polygon.setTo(this.polygon.points.map(point => {
            return new Phaser.Geom.Point(point.x + this.velocity.x, point.y + this.velocity.y);
        }));

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

        this.graphics.clear();
        this.graphics.strokePoints(this.polygon.points, true);

        // Handle collisions with other SpaceObjects
        if (!this.hasCollided) { // Check if a collision has occurred in the current frame
            for (const spaceObj of spaceObjects) {
                if (spaceObj !== this) { // Avoid self-collision
                    const collisionPoints = this.polygon.points;

                    for (let i = 0; i < collisionPoints.length; i++) {
                        const x1 = collisionPoints[i].x;
                        const y1 = collisionPoints[i].y;
                        const x2 = collisionPoints[(i + 1) % collisionPoints.length].x;
                        const y2 = collisionPoints[(i + 1) % collisionPoints.length].y;

                        const distance = Phaser.Math.Distance.Between(x1, y1, spaceObj.getPolygon().points[0].x, spaceObj.getPolygon().points[0].y);

                        if (distance < 30) { // Check if the objects are close enough to collide
                            // Calculate collision angle with some randomness
                            const angle = Phaser.Math.Angle.Between(x1, y1, spaceObj.getPolygon().points[0].x, spaceObj.getPolygon().points[0].y) + Phaser.Math.RND.realInRange(-Math.PI / 4, Math.PI / 4);

                            // Create Vector2 objects for velocity and position
                            const velocity1 = this.velocity.clone();
                            const velocity2 = spaceObj.getVelocity().clone();
                            const position1 = new Phaser.Math.Vector2(x1, y1);
                            const position2 = { ...spaceObj.getPolygon().points[0] };

                            // Calculate new velocities for both objects based on collision
                            const m1 = 1; // Mass of the first object (adjust as needed)
                            const m2 = 1; // Mass of the second object (adjust as needed)

                            const newVelocity1 = velocity1
                                .clone()
                                .scale((m1 - m2) / (m1 + m2))
                                .add(
                                    velocity2
                                        .clone()
                                        .scale((2 * m2) / (m1 + m2))
                                );

                            const newVelocity2 = velocity2
                                .clone()
                                .scale((m2 - m1) / (m1 + m2))
                                .add(
                                    velocity1
                                        .clone()
                                        .scale((2 * m1) / (m1 + m2))
                                );

                            // Apply new velocities in opposite directions
                            this.velocity.set(newVelocity1.x, newVelocity1.y);
                            spaceObj.setVelocity(newVelocity2.x, newVelocity2.y);

                            // Set the collision flag to true to maintain the new speed until the next frame
                            this.hasCollided = true;
                            spaceObj.hasCollided = true;

                            // Add a separation force to avoid sticking
                            const separationForce = new Phaser.Math.Vector2(Math.cos(angle) * 2, Math.sin(angle) * 2);
                            this.velocity.add(separationForce);
                            spaceObj.getVelocity().subtract(separationForce);
                        }
                    }
                }
            }
        } else {
            // Reset the collision flag to false if no collision occurred in the current frame
            this.hasCollided = false;
        }
    }

    getPolygon() {
        return this.polygon;
    }

    getVelocity() {
        return this.velocity;
    }

    setVelocity(x: number, y: number) {
        this.velocity.set(x, y);
    }
}
