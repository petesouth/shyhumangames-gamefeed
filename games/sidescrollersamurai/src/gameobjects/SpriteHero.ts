import * as Phaser from 'phaser';
import { Mine } from './mine';
import { BaseExplodableState } from './baseExplodable';
import { SoundPlayer } from './SoundPlayer';
import { Bullet } from './bullet';

export enum SpriteHeroAnimationState {
    IDLE = 0,
    RUN = 1,
    JUMPING = 2,
    ATTACK = 3,
    SPECIAL_ATTACK = 4
}

export class SpriteHero {
    protected spriteRun?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteIdle?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteJump?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteAttack?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteSpecialAttack?: Phaser.Physics.Arcade.Sprite | null;
    public soundPlayer: SoundPlayer;

    protected attackRate: number = 200;

    protected cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    protected mineKey?: Phaser.Input.Keyboard.Key;
    protected bulletKey?: Phaser.Input.Keyboard.Key;

    protected scene: Phaser.Scene;

    protected animationState: SpriteHeroAnimationState = SpriteHeroAnimationState.IDLE;

    protected swingingSwordSpecial: boolean = false;
    protected swordAttackRateSpecial: number = 800;

    protected swingingSword: boolean = false;
    protected swordAttackRate: number = 800;

    protected lastMinePlaced: number = 0;
    protected mineRate: number = 500;
    protected mines: Mine[] = [];

    protected lastBullet: number = 0;
    protected bulletRate: number = 500;
    protected bullets: Bullet[] = [];

    constructor(scene: Phaser.Scene, cursors: Phaser.Types.Input.Keyboard.CursorKeys, soundPlayer: SoundPlayer) {
        this.scene = scene;
        this.cursors = cursors;
        this.soundPlayer = soundPlayer;
        this.mineKey = this.scene.input?.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.bulletKey = this.scene.input?.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    }

    applyToAllSprites(applyHandler: (sprite: Phaser.Physics.Arcade.Sprite) => void) {
        if (!this.spriteIdle || !this.spriteJump || !this.spriteRun || !this.spriteAttack || !this.spriteSpecialAttack) {
            return;
        }
        const sprites: Phaser.Physics.Arcade.Sprite[] = [this.spriteIdle, this.spriteJump, this.spriteRun, this.spriteAttack, this.spriteSpecialAttack];
        sprites.forEach((sprite) => {
            applyHandler(sprite);
        });
    }

    showSpriteFromState(animationState: SpriteHeroAnimationState) {
        this.animationState = animationState;
        switch (this.animationState) {
            case SpriteHeroAnimationState.IDLE:
                this.spriteAttack?.setVisible(false);
                this.spriteRun?.setVisible(false);
                this.spriteJump?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(false);
                this.spriteIdle?.setVisible(true);
                this.spriteIdle?.play("heroidle", true);
                this.soundPlayer?.stopRunningSound();
                this.soundPlayer?.stopFlyingSound();
                break;
            case SpriteHeroAnimationState.RUN:
                this.spriteAttack?.setVisible(false);
                this.spriteIdle?.setVisible(false);
                this.spriteJump?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(false);
                this.spriteRun?.setVisible(true);
                this.spriteRun?.play("herorun", true);
                this.soundPlayer?.stopFlyingSound();
                this.soundPlayer?.playRunningSound();
                break;
            case SpriteHeroAnimationState.JUMPING:
                this.spriteAttack?.setVisible(false);
                this.spriteRun?.setVisible(false);
                this.spriteIdle?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(false);
                this.spriteJump?.setVisible(true);
                this.spriteJump?.play("herojump", true);
                this.soundPlayer?.stopRunningSound();
                this.soundPlayer?.playFlyingSound();
                break;
            case SpriteHeroAnimationState.ATTACK:
                this.spriteRun?.setVisible(false);
                this.spriteIdle?.setVisible(false);
                this.spriteJump?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(false);
                this.spriteAttack?.setVisible(true);
                this.spriteAttack?.play("heroattack", true);
                this.soundPlayer?.stopRunningSound();
                this.soundPlayer?.playSwordSound();
                break;
            case SpriteHeroAnimationState.SPECIAL_ATTACK:
                this.spriteRun?.setVisible(false);
                this.spriteIdle?.setVisible(false);
                this.spriteJump?.setVisible(false);
                this.spriteAttack?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(true);
                this.spriteSpecialAttack?.play("herospecialattack", true);
                this.soundPlayer?.stopRunningSound();
                this.soundPlayer?.playSword2Sound();
                break;
        }
    }

    drawHeroSprite() {
        this.handleSpriteMovement();
        this.handleMines();
        this.handleBullets();
        this.handleSwordAttacksSpecial();
        this.handleSwordAttacks();
    }

    private handleSpriteMovement() {
        if (!this.spriteIdle || !this.spriteIdle.body || this.swingingSwordSpecial === true) {
            return;
        }

        if (this.cursors.left.isDown) {
            this.applyToAllSprites(sprite => sprite.setFlipX(true));
            if (this.spriteIdle.body.touching.down) {
                this.showSpriteFromState(SpriteHeroAnimationState.RUN);
                this.applyToAllSprites(sprite => sprite.setVelocityX(-160));
            }
        } else if (this.cursors.right.isDown) {
            this.applyToAllSprites(sprite => sprite.setFlipX(false));
            if (this.spriteIdle.body.touching.down) {
                this.showSpriteFromState(SpriteHeroAnimationState.RUN);
                this.applyToAllSprites(sprite => sprite.setVelocityX(160));
            }
        } else {
            this.applyToAllSprites(sprite => sprite.setVelocityX(0));
            if (this.spriteIdle.body.touching.down) {
                this.showSpriteFromState(SpriteHeroAnimationState.IDLE);
            } else {
                this.showSpriteFromState(SpriteHeroAnimationState.JUMPING);
            }
        }

        if (this.cursors.up.isDown && (this.spriteIdle.body.touching.down)) {
            this.applyToAllSprites(sprite => sprite.setVelocityY(-480));
            this.showSpriteFromState(SpriteHeroAnimationState.JUMPING);
        }
    }

    public drawMines(x?: number) {
        const minesLeft: Mine[] = [];
        this.mines.forEach((mine) => {
            if (mine.state !== BaseExplodableState.DESTROYED) {
                minesLeft.push(mine);
            }
            if (x !== undefined) {
                mine.incrementX(x); // Corrected spelling typo
            }
            mine.render();
        });

        this.mines = minesLeft;
    }

    public drawBullets(x?: number) {
        const bulletsLeft: Bullet[] = [];
        this.bullets.forEach((bullet) => {
            if (bullet.state !== BaseExplodableState.DESTROYED) {
                bulletsLeft.push(bullet);
            }
            if (x !== undefined) {
                bullet.incrementX(x);
            }
            bullet.render();
        });

        this.bullets = bulletsLeft;
    }

    protected loadAnimationConfiguration() {
        this.scene.anims.create({
            key: 'herorun',
            frames: this.scene.anims.generateFrameNames('herorun', {
                prefix: 'run/frame000',
                start: 0,
                end: 8,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: -1
        });
        this.scene.anims.create({
            key: 'herojump',
            frames: this.scene.anims.generateFrameNames('herojump', {
                prefix: 'jump/frame000',
                start: 0,
                end: 8,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: -1
        });
        this.scene.anims.create({
            key: 'heroidle',
            frames: this.scene.anims.generateFrameNames('heroidle', {
                prefix: 'idle/frame000',
                start: 0,
                end: 2,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: -1
        });
        this.scene.anims.create({
            key: 'heroattack',
            frames: this.scene.anims.generateFrameNames('heroattack', {
                prefix: 'basicattack/frame000',
                start: 0,
                end: 13,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: -1
        });
        this.scene.anims.create({
            key: 'herospecialattack',
            frames: this.scene.anims.generateFrameNames('herospecialattack', {
                prefix: 'specialattack/frame000',
                start: 0,
                end: 13,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: -1
        });
    }

    getStaticXPosition() {
        return (this.scene.scale.width / 4);
    }

    createHeroSprite() {
        this.loadAnimationConfiguration();

        const xPos = this.scene.scale.width / 4;
        const yPos = 0;

        this.spriteRun = this.scene.physics.add.sprite(xPos, yPos, 'herorun');
        this.spriteJump = this.scene.physics.add.sprite(xPos, yPos, 'herojump');
        this.spriteIdle = this.scene.physics.add.sprite(xPos, yPos, 'heroidle');
        this.spriteAttack = this.scene.physics.add.sprite(xPos, yPos, 'heroattack');
        this.spriteSpecialAttack = this.scene.physics.add.sprite(xPos, yPos, 'herospecialattack');

        this.applyToAllSprites((sprite) => {
            sprite.setDisplaySize(200, 200);
            sprite.setBodySize(25, 36);
            sprite.setOffset(66, 80);
            sprite.setVisible(false);
            sprite.setBounce(0.1);
            sprite.setCollideWorldBounds(true);
        });
    }

    resizeEvent(x: number, y: number) {
        this.applyToAllSprites((sprite) => {
            sprite.setPosition(x, y);
            sprite.setDepth(10);
            sprite.setGravityY(300);
            sprite.refreshBody();
        });

        this.showSpriteFromState(this.animationState);
    }

    // Migrated Point to Vector2 return values
    public getCentroidBottomSide(): Phaser.Math.Vector2 {
        return new Phaser.Math.Vector2(this.spriteIdle?.getBottomCenter().x, this.spriteIdle?.getBottomCenter().y);
    }

    public getCentroid(): Phaser.Math.Vector2 {
        return new Phaser.Math.Vector2(this.spriteIdle?.getBounds().centerX, (42) + ((this.spriteIdle?.getBounds()?.centerY) ? this.spriteIdle?.getBounds().centerY : 0));
    }

    public handleMines() {
        if (!this.spriteIdle) {
            return;
        }
        const currentTime = this.scene.time.now;

        if ((this.mineKey?.isDown) && (currentTime - this.lastMinePlaced > this.mineRate)) {
            const centroid = this.getCentroidBottomSide();
            const x = centroid.x;
            const y = centroid.y;
            const mine = new Mine(this.scene, x, y - 20);
            this.mines.push(mine);
            this.lastMinePlaced = currentTime;
            this.soundPlayer.playMissileSound();
        }
    }

    public handleSwordAttacksSpecial() {
        if (!this.cursors || !this.spriteIdle || this.swingingSword === true) {
            return;
        }

        if ((this.cursors.down.isDown && this.swingingSwordSpecial === false) || this.swingingSwordSpecial === true) {
            this.showSpriteFromState(SpriteHeroAnimationState.SPECIAL_ATTACK);

            if (!this.swingingSwordSpecial) {
                this.swingingSwordSpecial = true;
                setTimeout(() => {
                    this.swingingSwordSpecial = false;
                }, this.swordAttackRateSpecial);
            }
        }
    }

    public handleSwordAttacks() {
        if (!this.spriteIdle || this.swingingSwordSpecial === true) {
            return;
        }

        if ((this.cursors.space.isDown && this.swingingSword === false) || this.swingingSword === true) {
            this.showSpriteFromState(SpriteHeroAnimationState.ATTACK);

            if (!this.swingingSword) {
                this.swingingSword = true;
                setTimeout(() => {
                    this.swingingSword = false;
                }, this.swordAttackRateSpecial);
            }
        }
    }

    public handleBullets() {
        if (!this.spriteIdle) {
            return;
        }
        const currentTime = this.scene.time.now;

        if ((this.bulletKey?.isDown) && (currentTime - this.lastBullet > this.bulletRate)) {
            const angle: number = (this.spriteIdle.flipX) ? 180 : 0;
            const centroid = this.getCentroid();

            const bullet = new Bullet(this.scene, centroid.x, centroid.y, angle, [0xFF00FF]);
            this.bullets.push(bullet);
            this.soundPlayer.playBulletSound();
            this.lastBullet = currentTime;
        }
    }

    // Migrated Point to Vector2 return value
    public getCenter(): Phaser.Math.Vector2 {
        if (this.spriteIdle) {
            const centerX = this.spriteIdle.x + this.spriteIdle.displayWidth / 2;
            const centerY = this.spriteIdle.y + this.spriteIdle.displayHeight / 2;
            return new Phaser.Math.Vector2(centerX, centerY);
        } else {
            return new Phaser.Math.Vector2(0, 0);
        }
    }
}