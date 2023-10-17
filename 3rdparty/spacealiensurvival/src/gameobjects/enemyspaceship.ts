import Phaser from 'phaser';
import { BaseSpaceship, MISSILE_WAIT_TIME } from './basespaceship';
import { SpaceObject } from './spaceobject';
import { Bullet } from './bullet';
import { Missile } from './missile';
import { Mine } from './mine';
import { BaseExplodable, BaseExplodableState } from './baseExplodable';
import { PlayerSpaceship } from './playerspaceship';
import { ForceField } from './forcefield';
import gGameStore from '../store/store';
import { gameActions } from '../store/gamestore';



export class EnemySpaceship extends BaseSpaceship {


    private playerSpaceship: BaseSpaceship;
    static missileFireRate: number = 5000;
    private store = gGameStore;

    constructor(scene: Phaser.Scene, distanceFromLeftCorner: number, playerSpaceship: BaseSpaceship) {
        super(scene, distanceFromLeftCorner, 0xFF0000);

        this.playerSpaceship = playerSpaceship;
        this.fireKey = undefined;
        this.missileKey = undefined;
        this.mineKey = undefined;
        this.explosionColors = [0xFF0000];
        this.maxPopSize = 40;
        this.fireRate = 1000;
        this.mineRate = 10000;
        this.exhaustFlame.show();
    }

    
    public destroy(): void {
        super.destroy();    
        this.store.dispatch( gameActions.incrementEnemiesScore({}) );
    }


    public handleBullets(spaceShips: BaseSpaceship[]) {
        const currentTime = this.scene.time.now;

        if ((currentTime - this.lastFired > this.fireRate) &&
            this.playerSpaceship?.state === BaseExplodableState.ALIVE) {

            const centroid = Phaser.Geom.Triangle.Centroid(this.spaceShipShape);
            const angle = Math.atan2(this.spaceShipShape.y1 - centroid.y, this.spaceShipShape.x1 - centroid.x);
            const bullet = new Bullet(this.scene, this.spaceShipShape.x1, this.spaceShipShape.y1, angle);
            this.bullets.push(bullet);
            this.lastFired = currentTime;
        }

        this.collisionCollectionTest(this.bullets, spaceShips);

    }


    public handleMissiles(spaceShips: BaseSpaceship[]) {
        const currentTime = this.scene.time.now;

        if ((currentTime - this.missileLastFired > EnemySpaceship.missileFireRate) &&
            this.playerSpaceship?.state === BaseExplodableState.ALIVE) {

            const centroid = Phaser.Geom.Triangle.Centroid(this.spaceShipShape);
            const angle = Math.atan2(this.spaceShipShape.y1 - centroid.y, this.spaceShipShape.x1 - centroid.x);
            const missile = new Missile(this.scene, this.spaceShipShape.x1, this.spaceShipShape.y1, angle);
            missile.setTarget(spaceShips[Phaser.Math.Between(0, spaceShips.length - 1)]);
            this.missiles.push(missile);
            this.missileLastFired = currentTime;
        }

        this.collisionCollectionTest(this.missiles, spaceShips);

    }


    public drawObjectAlive(): void {
        const centroid = Phaser.Geom.Triangle.Centroid(this.spaceShipShape);
        const playerCentroid = this.playerSpaceship.getCentroid();
        const directionX = playerCentroid?.x - centroid.x;
        const directionY = playerCentroid?.y - centroid.y;
        const distanceToPlayer = Phaser.Math.Distance.Between(centroid.x, centroid.y, playerCentroid.x, playerCentroid.y);
        const angle = Math.atan2(directionY, directionX);

        // Rotate the spaceship to point towards the player
        const currentRotation = Math.atan2(this.spaceShipShape.y1 - centroid.y, this.spaceShipShape.x1 - centroid.x);
        const rotationDifference = angle - currentRotation;

        Phaser.Geom.Triangle.RotateAroundPoint(this.spaceShipShape, centroid, rotationDifference);
        Phaser.Geom.Triangle.RotateAroundPoint(this.innerSpaceShipShape, centroid, rotationDifference);

        // If the enemy is closer than 40 pixels to the player, reduce its speed
        let effectiveThrust = this.thrust;
        if (distanceToPlayer < 80) { // Considering 80 because 40 pixels is the buffer, so we start slowing down when we are 80 pixels away
            effectiveThrust *= (distanceToPlayer - 80) / 80;
        }

        this.velocity.x += effectiveThrust * Math.cos(angle);
        this.velocity.y += effectiveThrust * Math.sin(angle);

        this.velocity.x *= this.damping;
        this.velocity.y *= this.damping;

        Phaser.Geom.Triangle.Offset(this.spaceShipShape, this.velocity.x, this.velocity.y);
        Phaser.Geom.Triangle.Offset(this.innerSpaceShipShape, this.velocity.x, this.velocity.y);


        this.graphics.strokeTriangleShape(this.spaceShipShape);
        this.graphics.fillTriangleShape(this.innerSpaceShipShape);
        
        this.exhaustFlame.update();
        this.exhaustFlame.render();

        this.forceField.update();
        this.forceField.render();

        this._points = this.spaceShipShape.getPoints(3);
    }

    
    protected testCollisionAgainstGroup(sourceObject: BaseExplodable,
        targetObjects: BaseExplodable[]) {

        for (let i2 = 0; i2 < targetObjects.length; ++i2) {
            let width = targetObjects[i2].getObjectWidthHeight().width / 2;
            let height = targetObjects[i2].getObjectWidthHeight().height / 2;


            if( targetObjects[i2] instanceof PlayerSpaceship) {
                let player = targetObjects[i2] as PlayerSpaceship;

                if (player.forceField?.isVisible === true) {
                    width =  ForceField.circleRadius * 1.5;
                    height = ForceField.circleRadius * 1.5;
                }
            }
            

            if (sourceObject.handleBaseCollision(targetObjects[i2], (width > height) ? width : height)) {
                return i2;
            }
        }
        return -1;
    }


}
