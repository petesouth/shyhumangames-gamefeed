import Phaser from 'phaser';
import { PlayerSpaceship } from './gameobjects/playerspaceship';
import { EnemySpaceship } from './gameobjects/enemyspaceship';
import { SpaceObject } from './gameobjects/spaceobject';

const num_ships = 6;

export class MainScene extends Phaser.Scene {
    private playerspaceship!: PlayerSpaceship;
    private enemyspaceships: EnemySpaceship[] = [];
    private starsBackground!: Phaser.GameObjects.Graphics;

    private spaceObjects: SpaceObject[] = [];


    constructor() {
        super('MainScene');
    }

    create() {
        this.createStarBackground();

        this.playerspaceship = new PlayerSpaceship(this);

        for (var i = 0; i < num_ships; ++i) {
            this.enemyspaceships.push(new EnemySpaceship(this, 5000 + (i*1000), this.playerspaceship));
        }

        this.createAsteroidsBasedOnScreenSize();
    }


    update() {

        this.spaceObjects.forEach(spaceObj => {
            spaceObj.update(this.spaceObjects);
        });
        
        this.playerspaceship.detectCollisions(this.spaceObjects, this.enemyspaceships);
        this.playerspaceship.handleBullets(this.spaceObjects, this.enemyspaceships);
        this.playerspaceship.handleMines(this.spaceObjects, this.enemyspaceships );
        this.playerspaceship.handleMissiles(this.spaceObjects, this.enemyspaceships );
        this.playerspaceship.render();
        

        this.enemyspaceships.forEach((tenemyspaceship) => {
            tenemyspaceship.detectCollisions(this.spaceObjects, [this.playerspaceship]);
            tenemyspaceship.handleBullets(this.spaceObjects, [this.playerspaceship]);
            tenemyspaceship.handleMines(this.spaceObjects, [this.playerspaceship] );
            tenemyspaceship.handleMissiles(this.spaceObjects, [this.playerspaceship] );
            tenemyspaceship.render();
        });

       
    }

    public createAsteroidsBasedOnScreenSize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const dimendsionsSpaceObject: { width: number, height: number } = SpaceObject.getMaxSpaceObjectWidthHeight();
        let numobjects: number = 0;

        if (width >= height) {
            numobjects = (width / dimendsionsSpaceObject.width);
        } else {
            numobjects = (height / dimendsionsSpaceObject.width);
        }

        this.spaceObjects.forEach((spaceObject) => {
            spaceObject.destroy();
        });

        this.spaceObjects = [];


        numobjects = Phaser.Math.Between(numobjects * .6, numobjects);

        for (let i = 0; i < numobjects; i++) {
            const spaceObj = new SpaceObject(this);
            this.spaceObjects.push(spaceObj);
        }
    }

    public createStarBackground() {
        // Clear the existing stars
        if (this.starsBackground) {
            this.starsBackground.clear();
        } else {
            this.starsBackground = this.add.graphics({ fillStyle: { color: 0xFFFFFF } });
            this.starsBackground.setDepth(0); // Make sure the stars are rendered behind other game objects
        }

        const numStars = Math.floor((this.scale.width * this.scale.height) / 200); // One star for every 200 pixels

        for (let i = 0; i < numStars; i++) {
            const x = Phaser.Math.Between(0, this.scale.width);
            const y = Phaser.Math.Between(0, this.scale.height);
            this.starsBackground.fillRect(x, y, 1, 1);
        }
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

        // Add event listeners for key presses
        window.addEventListener("resize", this.handleWindowResize.bind(this));
        window.addEventListener("keydown", this.handleKeyDown.bind(this));
    }

    handleWindowResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.scale.setGameSize(w, h);
        const mainScene = this.scene.getScene("MainScene") as MainScene;
        mainScene.createStarBackground();
        mainScene.createAsteroidsBasedOnScreenSize();
    }

    handleKeyDown(event: KeyboardEvent) {
        // Check if the Ctrl key is pressed (key code 17) and the "f" key (key code 70)
        if (event.ctrlKey && event.keyCode === 70) {
            this.toggleFullscreen();
        } else if (event.key === "Escape") {
            this.exitFullscreen();
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            const canvas = this.canvas as HTMLCanvasElement;
            canvas.requestFullscreen().catch((err) => {
                console.error("Fullscreen request failed:", err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    exitFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    }
}
