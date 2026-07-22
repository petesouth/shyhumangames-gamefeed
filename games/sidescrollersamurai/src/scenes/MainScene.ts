import * as Phaser from 'phaser';
import gGameStore from '../store/store';
import { MainSceneStartGameText } from './MainSceneStartGameText';
import { Utils } from '../utils/utils';
import { SpriteHero } from '../gameobjects/SpriteHero';
import { SoundPlayer } from '../gameobjects/SoundPlayer';
import { EnemyAntiHero } from '../gameobjects/EnemyAntiHero';
import { KeyboardInputController } from '../gameobjects/KeyboardInputController';
import { EnemyAIInputController } from '../gameobjects/EnemyAIInputController';

export class MainScene extends Phaser.Scene {

    public static GOLDEN_RATIO = { width: 2065, height: 1047 };
    public static LEVEL_BONUS = 5;
    public static MAX_ENEMIES: number = 14;
    public static GROUND_HEIGHT = 50;

    private bricksTileSprite?: Phaser.GameObjects.TileSprite | null;
    private mountainRangeSprite?: Phaser.GameObjects.TileSprite | null;
    private skySprite?: Phaser.GameObjects.TileSprite | null;
    private cloudsSprite?: Phaser.GameObjects.TileSprite | null;
    private mainSceneStartGameText: MainSceneStartGameText = new MainSceneStartGameText(this);
    protected spriteHero?: SpriteHero;
    protected enemyAntiHero?: EnemyAntiHero;
    protected enemyAIController?: EnemyAIInputController;

    protected cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
    protected groundGroup?: Phaser.Physics.Arcade.StaticGroup;
    protected groundGroupBody?: Phaser.Physics.Arcade.Sprite;
    protected floatingPlatformBodies: Phaser.Physics.Arcade.Image[] = [];
    protected colliders: Phaser.Physics.Arcade.Collider[] = [];
    protected soundPlayer!: SoundPlayer;
    protected distanceLeft: number = 0;
    protected distanceRight: number = 0;

    private readonly mountainRangeDepth = -10;
    private readonly skySpriteDepth = -11;
    private readonly bricksSpriteDepth = 1;
    private readonly singleTilesPlatformLayerDepth = 10;

    constructor() {
        super('MainScene');
    }

    create() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        this.game.scale.resize(screenWidth, screenHeight);
        this.game.scale.refresh();

        this.cursorKeys = (this.input?.keyboard?.createCursorKeys() as Phaser.Types.Input.Keyboard.CursorKeys);
        this.soundPlayer = new SoundPlayer(this);

        this.soundPlayer.playGameSongSound();
        this.handleWindowResize(screenWidth, screenHeight);

        this.mainSceneStartGameText.createStartGameText();

        setTimeout(() => {
            this.mainSceneStartGameText.hideLevelInstructionsText();
        }, 20000);

        this.createOneSinglePlatform(screenWidth, screenHeight);
    }

    update() {
        if (!this.mountainRangeSprite || !this.cloudsSprite || !this.skySprite || !this.bricksTileSprite) {
            return;
        }

        this.mainSceneStartGameText.displayGameText();
        const distanceIncrement = 4;
        const bgScrollIncrement = distanceIncrement * 0.10;

        if (this.cursorKeys?.left.isDown) {
            this.floatingPlatformBodies.forEach((gameObject) => {
                gameObject.x += distanceIncrement;
                (gameObject.body as Phaser.Physics.Arcade.StaticBody)?.updateFromGameObject();
            });

            // Ground Floor
            this.bricksTileSprite.tilePositionX -= distanceIncrement;

            // Backgrounds (Scrolling at identical slow speed)
            this.mountainRangeSprite.tilePositionX -= distanceIncrement * 0.20;
            this.cloudsSprite.tilePositionX -= distanceIncrement * 0.10;
            this.skySprite.tilePositionX -= distanceIncrement * 0.05;

            this.enemyAntiHero?.shiftPosition(distanceIncrement * 0.8);
            this.spriteHero?.drawMines(distanceIncrement);
            this.spriteHero?.drawBullets(distanceIncrement);
            this.enemyAntiHero?.drawMines(distanceIncrement);
            this.enemyAntiHero?.drawBullets(distanceIncrement);

        } else if (this.cursorKeys?.right.isDown) {
            this.floatingPlatformBodies.forEach((gameObject) => {
                gameObject.x -= distanceIncrement;
                (gameObject.body as Phaser.Physics.Arcade.StaticBody)?.updateFromGameObject();
            });

            // Ground Floor
            this.bricksTileSprite.tilePositionX += distanceIncrement;

            // Backgrounds (Scrolling at identical slow speed)
            this.mountainRangeSprite.tilePositionX += distanceIncrement * 0.20;
            this.cloudsSprite.tilePositionX += distanceIncrement * 0.10;
            this.skySprite.tilePositionX += distanceIncrement * 0.05;


            this.enemyAntiHero?.shiftPosition(-distanceIncrement * 0.8);
            this.spriteHero?.drawMines(-distanceIncrement);
            this.spriteHero?.drawBullets(-distanceIncrement);
            this.enemyAntiHero?.drawMines(-distanceIncrement);
            this.enemyAntiHero?.drawBullets(-distanceIncrement);

        } else {
            this.spriteHero?.drawMines();
            this.spriteHero?.drawBullets();
            this.enemyAntiHero?.drawMines();
            this.enemyAntiHero?.drawBullets();
        }

        this.groundGroup?.refresh();

        this.enemyAIController?.update(this.time.now);
        this.spriteHero?.drawHeroSprite();
        this.enemyAntiHero?.drawHeroSprite();
    }

    removeGroupBodies() {
        if (this.groundGroupBody) {
            this.groundGroup?.remove(this.groundGroupBody);

            this.colliders.forEach((collider) => {
                this.physics.world.removeCollider(collider);
                collider.destroy();
            });
            this.colliders = [];
        }
    }

    public handleWindowResize(screenWidth: number, screenHeight: number) {
        if (!this.cursorKeys) return;

        this.repositionResizeTheGameAndWorld(screenWidth, screenHeight);
        this.resizeCreateUpdateMountainsSkyClouds(screenWidth, screenHeight);
        this.resizeCreateUpdateTheGround(screenWidth, screenHeight);
        this.resizeCreateUpdateCharacters(screenWidth);

        this.generatePlatforms();
        this.repositionPlatforms(screenWidth, screenHeight);

        this.mainSceneStartGameText.repositionStartGameText(screenWidth);
    }

    protected repositionResizeTheGameAndWorld(screenWidth: number, screenHeight: number) {
        const ThirtyPercent = screenWidth * .3;
        this.physics.world.setBounds(ThirtyPercent, 0, screenWidth - (2 * ThirtyPercent), screenHeight);
        this.physics.world.setBoundsCollision(true, true, true, true);
        this.physics.world.update(0, 0);
    }

    protected resizeCreateUpdateMountainsSkyClouds(screenWidth: number, screenHeight: number) {
        if (this.mountainRangeSprite) {
            this.mountainRangeSprite.destroy();
        }

        if (this.cloudsSprite) {
            this.cloudsSprite.destroy();
        }

        if (this.skySprite) {
            this.skySprite.destroy();
        }

        // Sky
        this.skySprite = this.add.tileSprite(0, 0, screenWidth, 320, "sky");
        this.skySprite.setDepth(this.skySpriteDepth);
        Utils.resizeImageToRatio(this.skySprite, screenWidth, screenHeight * .8);

        // Clouds
        this.cloudsSprite = this.add.tileSprite(0, 0, screenWidth, 320, "clouds");
        this.cloudsSprite.setDepth(this.skySpriteDepth);
        Utils.resizeImageToRatio(this.cloudsSprite, screenWidth, screenHeight * .8);

        // Mountains (Positioned using tileScaleY so tilePositionX scrolls properly)
        const targetHeight = screenHeight + (screenHeight * .4);
        this.mountainRangeSprite = this.add.tileSprite(
            screenWidth / 2,
            (screenHeight / 2) - (screenHeight * .2),
            screenWidth,
            targetHeight,
            "grassmountains"
        );
        this.mountainRangeSprite.setDepth(this.mountainRangeDepth);
        this.mountainRangeSprite.tileScaleY = targetHeight / 320;
        this.mountainRangeSprite.setVisible(true);
    }

    protected resizeCreateUpdateTheGround(screenWidth: number, screenHeight: number) {
        if (this.bricksTileSprite) {
            this.bricksTileSprite.destroy();
        }

        const groundY = screenHeight - (MainScene.GROUND_HEIGHT / 2);

        this.bricksTileSprite = this.add.tileSprite(0, 0, screenWidth, MainScene.GROUND_HEIGHT, "bricks2");
        this.bricksTileSprite.setDepth(this.bricksSpriteDepth);

        this.bricksTileSprite.setDisplaySize(screenWidth, MainScene.GROUND_HEIGHT);
        this.bricksTileSprite.setPosition(screenWidth / 2, groundY);
        this.bricksTileSprite.tilePositionX = 0;
        this.bricksTileSprite.tilePositionY = 0;
        this.bricksTileSprite.update();

        if (!this.groundGroup || !this.groundGroupBody) {
            this.groundGroup = this.physics.add.staticGroup();
            this.groundGroupBody = this.groundGroup.create(screenWidth / 2, groundY) as Phaser.Physics.Arcade.Sprite;
        }

        this.groundGroupBody.setDisplaySize(screenWidth * 20, MainScene.GROUND_HEIGHT);
        this.groundGroupBody.setPosition(screenWidth / 2, groundY);
        this.groundGroupBody.setVisible(false);
        this.groundGroupBody.refreshBody();
        this.bricksTileSprite.tilePositionX = 0;
    }

    protected resizeCreateUpdateCharacters(screenWidth: number) {
        if (!this.spriteHero) {
            const playerController = new KeyboardInputController(this);
            this.spriteHero = new SpriteHero(this, playerController, this.soundPlayer);
            this.spriteHero.createHeroSprite();
        } else {
            this.spriteHero.soundPlayer = this.soundPlayer;
        }

        this.spriteHero.resizeEvent(screenWidth / 4, 0);
        this.spriteHero.applyToAllSprites((sprite) => {
            if (this.groundGroup) {
                this.colliders.push(this.physics.add.collider(sprite, this.groundGroup));
            }
        });

        if (!this.enemyAntiHero) {
            const dummyController = new KeyboardInputController(this);
            this.enemyAntiHero = new EnemyAntiHero(this, dummyController, this.soundPlayer);
            this.enemyAntiHero.createHeroSprite();

            const allPlatformsAndGround = [...this.floatingPlatformBodies];
            if (this.groundGroupBody) {
                allPlatformsAndGround.push(this.groundGroupBody as any);
            }

            this.enemyAIController = new EnemyAIInputController(
                this.enemyAntiHero,
                this.spriteHero!,
                allPlatformsAndGround
            );

            (this.enemyAntiHero as any).controller = this.enemyAIController;
        } else {
            this.enemyAntiHero.soundPlayer = this.soundPlayer;
        }

        this.enemyAntiHero.resizeEvent(screenWidth / 2, 0);
        this.enemyAntiHero.applyToAllSprites((sprite) => {
            if (this.groundGroup) {
                this.colliders.push(this.physics.add.collider(sprite, this.groundGroup));
            }
        });
    }

    generatePlatforms() {
        if (!this.groundGroup) {
            return;
        }

        const { screenWidth, screenHeight } = {
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
        };

        const horizontalGapMin = 100;
        const minYPosition = 220;
        const maxYPosition = screenHeight - (MainScene.GROUND_HEIGHT + 40);

        let lastPlatformEndX = 0;

        const displayPlatformHeight = MainScene.GROUND_HEIGHT / 2;
        let isCreated: boolean = (this.floatingPlatformBodies && this.floatingPlatformBodies.length > 0);

        for (let i = 0;
            ((isCreated === false && i < 300) ||
                (isCreated === true && i < this.floatingPlatformBodies.length)); i++) {

            let randomWidth = Phaser.Math.Between(screenWidth * .1, screenWidth * .30);
            const randomYPos = Phaser.Math.Between(minYPosition, maxYPosition);
            let randomXPos = Phaser.Math.Between(lastPlatformEndX + horizontalGapMin, lastPlatformEndX + horizontalGapMin + 200);

            let platform = (isCreated)
                ? this.floatingPlatformBodies[i]
                : this.groundGroup.create(randomXPos, randomYPos, "bricks2") as Phaser.Physics.Arcade.Sprite;

            platform.setDisplaySize(randomWidth, displayPlatformHeight);
            platform.setPosition(randomXPos, randomYPos);
            platform.x = randomXPos;
            platform.y = randomYPos;
            platform.setVisible(true);
            (platform.body as Phaser.Physics.Arcade.StaticBody)?.updateFromGameObject();

            if (isCreated === false) {
                this.floatingPlatformBodies.push(platform as Phaser.Physics.Arcade.Image);
            }

            lastPlatformEndX = platform.x + platform.displayWidth / 2;
        }

        this.spriteHero?.applyToAllSprites((sprite) => {
            if (this.groundGroup) {
                this.physics.add.collider(sprite, this.groundGroup);
                this.enemyAntiHero?.applyToAllSprites((enemySprite) => {
                    if (this.groundGroup) this.physics.add.collider(enemySprite, this.groundGroup);
                    this.physics.add.collider(sprite, enemySprite);
                });
            }
        });
    }

    repositionPlatforms(screenWidth: number, screenHeight: number): void {
        if (!this.spriteHero || !this.enemyAntiHero) {
            return;
        }

        const horizontalGapMin: number = 100;
        let lastPlatformEndX: number = 0;

        this.floatingPlatformBodies.forEach((platform: Phaser.Physics.Arcade.Image) => {
            let randomXPos: number = Phaser.Math.Between(lastPlatformEndX + horizontalGapMin, lastPlatformEndX + horizontalGapMin + 200);
            platform.x = randomXPos;
            (platform.body as Phaser.Physics.Arcade.StaticBody)?.updateFromGameObject();
            lastPlatformEndX = platform.x + platform.displayWidth;
        });
    }

    createOneSinglePlatform(screenWidth: number, screenHeight: number) {
        const map = this.make.tilemap({ key: 'tilemap' });
        const tileset = map.addTilesetImage('tilesetImage');

        if (tileset != null) {
            const platformX = screenWidth / 2;
            const platformY = screenHeight / 2;

            const layer = map.createLayer('layerName', tileset, platformX, platformY);

            if (layer) {
                layer.setDepth(this.singleTilesPlatformLayerDepth);
                layer.setDisplaySize(400, 200);
                layer.setVisible(true);
            }
        }
    }
}