import Phaser from 'phaser';
import { PlayerSpaceship } from './gameobjects/playerspaceship';
import { EnemySpaceship } from './gameobjects/enemyspaceship';
import { SpaceObject } from './gameobjects/spaceobject';

export class MainScene extends Phaser.Scene {
    private playerspaceship!: PlayerSpaceship;
    private enemyspaceship!: EnemySpaceship;

    private spaceObjects: SpaceObject[] = [];

    constructor() {
        super('MainScene');
    }

    create() {
        this.playerspaceship = new PlayerSpaceship(this);
        this.enemyspaceship = new EnemySpaceship(this, this.playerspaceship);

        // Create a random number of space objects
        const numObjects = Phaser.Math.Between(18, 30);
        for (let i = 0; i < numObjects; i++) {
            const spaceObj = new SpaceObject(this);
            this.spaceObjects.push(spaceObj);
        }
    }

    update() {
        
      this.playerspaceship.updateSpaceshipState(this.spaceObjects);

      this.enemyspaceship.updateSpaceshipState(this.spaceObjects);


      this.spaceObjects.forEach(spaceObj => {
            spaceObj.update(this.spaceObjects);
        });
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game',
    scene: [MainScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

export default class Game extends Phaser.Game {
    constructor() {
        super(config);

        // Adjust game size on window resize
        window.addEventListener("resize", () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.scale.setGameSize(w, h);
        });
    }
}
