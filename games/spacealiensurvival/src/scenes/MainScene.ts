import Phaser from 'phaser';
import { PlayerSpaceship } from '../gameobjects/playerspaceship';
import { EnemySpaceship, EnemySpaceshipConfig } from '../gameobjects/enemyspaceship';
import { SpaceObject } from '../gameobjects/spaceobject';
import { BaseExplodableState } from '../gameobjects/baseExplodable';
import gGameStore from '../store/store';
import { gameActions } from '../store/gamestore';
import { SplashScreen } from './SplashScreen';
import { MainSceneStartGameText } from './MainSceneStartGameText';
import { BaseSpaceship } from '../gameobjects/basespaceship';


export class MainScene extends Phaser.Scene {

    public static GOLDEN_RATIO = { width: 2065, height: 1047 };
    private playerspaceship!: PlayerSpaceship;
    private enemyspaceships: EnemySpaceship[] = [];
    private starsBackgroundImage!: Phaser.GameObjects.Image;
    private timerBetweenLevels: number = -1;
    private timerBetweenLevelsWaitCount: number = 12000;
    private betweenGames: boolean = false;
    private spaceObjects: SpaceObject[] = [];
    private gamesongSound?: Phaser.Sound.NoAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound;
    private mainSceneStartGameText: MainSceneStartGameText = new MainSceneStartGameText(this);

    constructor() {
        super('MainScene');
    }

    private handleMouseClick(pointer: Phaser.Input.Pointer): void {
        this.startPlayerGame();
    }


    public playGameSongSound(): void {
        if (this.gamesongSound && !this.gamesongSound.isPlaying) {
            this.gamesongSound.play();
        }
    }

    public stopGameSongSound(): void {
        if (this.gamesongSound && this.gamesongSound.isPlaying) {
            this.gamesongSound.stop();
        }
    }

    public playSuccessSound(): void {
        let sound = this.sound.add('levelcomplete', { loop: false });
        sound.play();
    }

    public playLevelComplete(): void {
        let sound = this.sound.add('success', { loop: false });
        sound.play();
    }


    startPlayerGame() {
        if (this.playerspaceship && this.playerspaceship.state === BaseExplodableState.DESTROYED) {
            gGameStore.dispatch(gameActions.startCurrentLevel({}));
            this.playerspaceship.spawn();
            this.stopGameSongSound();
            this.betweenGames = true;
            this.enemyspaceships.forEach((ship) => {
                ship.destroy();
            });
            this.enemyspaceships = [];
            this.timerBetweenLevels = -1;
        }

    }


    create() {
        this.gamesongSound = this.sound.add('gamesong', { loop: true, volume: 1 });


        this.createBackgroundImage();
        this.resizeStarBackground();
        this.playerspaceship = new PlayerSpaceship(this);
        this.createAsteroidsBasedOnScreenSize();


        this.mainSceneStartGameText.createStartGameText();


        setInterval(() => {
            if (this.scale.width < window.innerWidth ||
                this.scale.height < window.innerHeight) {
                this.handleWindowResize();
            }
        }, 500);

        this.playGameSongSound();
        this.input.on('pointerdown', this.handleMouseClick, this);

    }




    handleWindowResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.scale.setGameSize(w, h);
        this.resizeStarBackground();
        this.createAsteroidsBasedOnScreenSize();
        this.mainSceneStartGameText.repositionStartGameText(w);

        [this.playerspaceship, ...this.enemyspaceships].forEach((basSpaceShip: BaseSpaceship) => {
            basSpaceShip?.resizeFromScreenRatio();
        });

    }

    update() {

        const w = window.innerWidth;
        const h = window.innerHeight;

        this.mainSceneStartGameText.displayGameText(this.playerspaceship);

        this.spaceObjects.forEach(spaceObj => {
            spaceObj.renderSpaceObject(this.spaceObjects);
        });


        if (this.playerspaceship.state === BaseExplodableState.ALIVE) {
            this.playerspaceship.detectBounceCollisions([...this.enemyspaceships, ...this.spaceObjects]);
        }

        this.playerspaceship.handleBullets(this.enemyspaceships);
        this.playerspaceship.handleMines(this.enemyspaceships);
        this.playerspaceship.handleMissiles(this.enemyspaceships);
        this.playerspaceship.handleWeaponsAgainstSpaceObjets(this.spaceObjects);

        this.playerspaceship.render();
        this.playerspaceship.renderWeapons();


        for (let i = 0; i < this.enemyspaceships.length; ++i) {
            const tenemyspaceship = this.enemyspaceships[i];
            const isEverythingDestroyed = tenemyspaceship.isEverythingDestroyed();
            if (isEverythingDestroyed) {
                this.enemyspaceships.splice(i, 1);
                i--;
                break;
            }


            if (this.playerspaceship.state === BaseExplodableState.ALIVE && this.playerspaceship.hitpoints > 0) {
                tenemyspaceship.handleBullets([this.playerspaceship]);
                tenemyspaceship.handleMines([this.playerspaceship]);
                tenemyspaceship.handleMissiles([this.playerspaceship]);
            }

            tenemyspaceship.render();
            tenemyspaceship.renderWeapons();
            tenemyspaceship.handleWeaponsAgainstSpaceObjets(this.spaceObjects);
            tenemyspaceship.detectBounceCollisions([this.playerspaceship, ...this.enemyspaceships, ...this.spaceObjects]);

        };


        this.calculateLevelAndEnemySpawning();


    }

    private calculateLevelAndEnemySpawning() {
        const game = gGameStore.getState().game;

        // Player must be alive or this no-opts
        if (this.playerspaceship.state === BaseExplodableState.ALIVE) {

            if (this.enemyspaceships.length < 1 && this.betweenGames === true) {
                // if 0 enemy and betweenGames is true spawn enemis Time to Assault the player
                // With a wave of enemies.

                this.betweenGames = false;
                this.timerBetweenLevels = -1;


                for (let i = 0; i < game.currentLevel; ++i) {
                    this.spawnEnemy();
                }


            } else if (this.betweenGames === false &&
                this.enemyspaceships.length < 1 &&
                this.timerBetweenLevels === -1) {
                // In shit scenario all enemies have been destroyed or not yet created.
                // So Ill start the timer.
                this.timerBetweenLevels = Date.now();
                this.playerspaceship.hitpoints = 10;
                if (game.currentLevel > 0) {
                    this.playLevelComplete();
                    this.mainSceneStartGameText.setLevelAnnounceText(`Level ${game.currentLevel} Completed !!!`)
                    this.mainSceneStartGameText.showLevelAnnounceText();
                }




            } else if (this.betweenGames === false &&
                this.enemyspaceships.length < 1 &&
                this.timerBetweenLevels !== -1 &&
                (Date.now() - this.timerBetweenLevels) > this.timerBetweenLevelsWaitCount) {
                // All good to go.  So set all the flags that lets start this level happen

                this.mainSceneStartGameText.hideLevelAnnounceText();
                this.playSuccessSound();
                gGameStore.dispatch(gameActions.incrementCurrentLevel({}));
                this.betweenGames = true;
                this.timerBetweenLevels = Date.now();
                this.createBackgroundImage();
            }
        }
    }

    spawnEnemy() {


        const enemySpaceshipConfig: EnemySpaceshipConfig = {
            // If there isn't a boss already being a boss and there isn't atleast 1 red ship.  No Boss
            thrust: Phaser.Math.Between(.5, .8),
            hitpoints: Phaser.Math.Between(5, 20),
            fireRate: Phaser.Math.Between(800, 2000),
            missileFireRate: Phaser.Math.Between(1000, 7000),
            imageKey: Phaser.Utils.Array.GetRandom(SplashScreen.enemySpaceships)
        };

        this.enemyspaceships.push(new EnemySpaceship(this, window.innerHeight + (this.enemyspaceships.length * 40), this.playerspaceship, enemySpaceshipConfig));
    }

    public createAsteroidsBasedOnScreenSize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const dimendsionsSpaceObject: { width: number; height: number; } = SpaceObject.getMaxSpaceObjectWidthHeight();
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


        numobjects = Phaser.Math.Between(numobjects * 0.6, numobjects);

        for (let i = 0; i < numobjects; i++) {
            const spaceObj = new SpaceObject(this);
            this.spaceObjects.push(spaceObj);
        }

    }


    createBackgroundImage() {

        const currentLevel = gGameStore.getState().game.currentLevel;
        let backgroundName = "background";

        if (currentLevel < 1) {
            backgroundName += 1;
        } else {
            const levelMod = currentLevel % 20;
            backgroundName += (levelMod === 0) ? 20 : levelMod;
        }

        if (this.starsBackgroundImage) {
            this.starsBackgroundImage.destroy();
        }

        this.starsBackgroundImage = this.add.image(window.innerWidth / 2,
            window.innerHeight / 2, backgroundName
        );


        this.resizeStarBackground();
    }


    public resizeStarBackground() {
        if (!this.starsBackgroundImage) {
            return;
        }
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const screenAspectRatio = screenWidth / screenHeight;

        const imageWidth = this.starsBackgroundImage.width;
        const imageHeight = this.starsBackgroundImage.height;
        const imageAspectRatio = imageWidth / imageHeight;

        let newWidth, newHeight;

        if (imageAspectRatio > screenAspectRatio) {
            // The image is wider relative to the screen, set the image width to match the screen width
            newWidth = screenWidth;
            newHeight = newWidth / imageAspectRatio;  // Adjust height proportionally

            // Check if the new height is less than the screen height, if so adjust the dimensions
            if (newHeight < screenHeight) {
                newHeight = screenHeight;
                newWidth = newHeight * imageAspectRatio;  // Adjust width proportionally
            }
        } else {
            // The image is taller relative to the screen, or has the same aspect ratio, set the image height to match the screen height
            newHeight = screenHeight;
            newWidth = newHeight * imageAspectRatio;  // Adjust width proportionally

            // Check if the new width is less than the screen width, if so adjust the dimensions
            if (newWidth < screenWidth) {
                newWidth = screenWidth;
                newHeight = newWidth / imageAspectRatio;  // Adjust height proportionally
            }
        }

        this.starsBackgroundImage.setDisplaySize(newWidth, newHeight);

        // Ensure the image is positioned in the center of the screen

        this.starsBackgroundImage.setPosition(screenWidth / 2, screenHeight / 2);
        this.starsBackgroundImage.setDepth(-1);
    }

}
