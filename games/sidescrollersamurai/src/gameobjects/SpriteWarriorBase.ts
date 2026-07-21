import * as Phaser from 'phaser';
import { Mine } from './mine';
import { BaseExplodableState } from './baseExplodable';
import { SoundPlayer } from './SoundPlayer';
import { Bullet } from './bullet';
import { InputController } from './InputController';

export enum SpriteAnimationState {
    IDLE = 0,
    RUN = 1,
    JUMPING = 2,
    ATTACK = 3,
    SPECIAL_ATTACK = 4,
    DEATH = 5,
}

export abstract class SpriteWarriorBase {
    protected spriteRun?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteIdle?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteJump?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteAttack?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteSpecialAttack?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteDeath?: Phaser.Physics.Arcade.Sprite | null;

    public soundPlayer: SoundPlayer;
    protected controller: InputController;
    protected scene: Phaser.Scene;

    protected attackRate: number = 200;
    protected animationState: SpriteAnimationState = SpriteAnimationState.IDLE;

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

    // Keys used by subclasses for animation generation and sprite creation
    protected animKeyIdle: string = 'heroidle';
    protected animKeyRun: string = 'herorun';
    protected animKeyJump: string = 'herojump';
    protected animKeyAttack: string = 'heroattack';
    protected animKeySpecialAttack: string = 'herospecialattack';
    protected animKeyDeath: string = 'herodeath';

    constructor(scene: Phaser.Scene, controller: InputController, soundPlayer: SoundPlayer) {
        this.scene = scene;
        this.controller = controller;
        this.soundPlayer = soundPlayer;
    }

    protected abstract loadAnimationConfiguration(): void;

    public getActiveSprite(): Phaser.Physics.Arcade.Sprite {
        switch (this.animationState) {
            case SpriteAnimationState.DEATH:
                return this.spriteDeath || this.spriteIdle!;
            case SpriteAnimationState.RUN:
                return this.spriteRun || this.spriteIdle!;
            case SpriteAnimationState.JUMPING:
                return this.spriteJump || this.spriteIdle!;
            case SpriteAnimationState.ATTACK:
                return this.spriteAttack || this.spriteIdle!;
            case SpriteAnimationState.SPECIAL_ATTACK:
                return this.spriteSpecialAttack || this.spriteIdle!;
            case SpriteAnimationState.IDLE:
            default:
                return this.spriteIdle!;
        }
    }

    public applyToAllSprites(applyHandler: (sprite: Phaser.Physics.Arcade.Sprite) => void): void {
        if (!this.spriteIdle || !this.spriteJump || !this.spriteRun || !this.spriteAttack || !this.spriteSpecialAttack || !this.spriteDeath) {
            return;
        }
        const sprites: Phaser.Physics.Arcade.Sprite[] = [
            this.spriteIdle, 
            this.spriteJump, 
            this.spriteRun, 
            this.spriteAttack, 
            this.spriteSpecialAttack,
            this.spriteDeath,
        ];
        sprites.forEach((sprite) => {
            applyHandler(sprite);
        });
    }

    public showSpriteFromState(animationState: SpriteAnimationState): void {
        const activeBefore = this.getActiveSprite();
        if (activeBefore) {
            const currentX = activeBefore.x;
            const currentY = activeBefore.y;
            this.applyToAllSprites((sprite) => {
                sprite.setPosition(currentX, currentY);
            });
        }

        this.animationState = animationState;
        switch (this.animationState) {
            case SpriteAnimationState.IDLE:
                this.spriteAttack?.setVisible(false);
                this.spriteRun?.setVisible(false);
                this.spriteJump?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(false);
                this.spriteDeath?.setVisible(false);
                this.spriteIdle?.setVisible(true);
                this.spriteIdle?.play(this.animKeyIdle, true);
                this.soundPlayer?.stopRunningSound();
                this.soundPlayer?.stopFlyingSound();
                break;
            case SpriteAnimationState.RUN:
                this.spriteAttack?.setVisible(false);
                this.spriteIdle?.setVisible(false);
                this.spriteJump?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(false);
                this.spriteDeath?.setVisible(false);
                this.spriteRun?.setVisible(true);
                this.spriteRun?.play(this.animKeyRun, true);
                this.soundPlayer?.stopFlyingSound();
                this.soundPlayer?.playRunningSound();
                break;
            case SpriteAnimationState.JUMPING:
                this.spriteAttack?.setVisible(false);
                this.spriteRun?.setVisible(false);
                this.spriteIdle?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(false);
                this.spriteDeath?.setVisible(false);
                this.spriteJump?.setVisible(true);
                this.spriteJump?.play(this.animKeyJump, true);
                this.soundPlayer?.stopRunningSound();
                this.soundPlayer?.playFlyingSound();
                break;
            case SpriteAnimationState.ATTACK:
                this.spriteRun?.setVisible(false);
                this.spriteIdle?.setVisible(false);
                this.spriteJump?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(false);
                this.spriteDeath?.setVisible(false);
                this.spriteAttack?.setVisible(true);
                this.spriteAttack?.play(this.animKeyAttack, true);
                this.soundPlayer?.stopRunningSound();
                this.soundPlayer?.playSwordSound();
                break;
            case SpriteAnimationState.SPECIAL_ATTACK:
                this.spriteRun?.setVisible(false);
                this.spriteIdle?.setVisible(false);
                this.spriteJump?.setVisible(false);
                this.spriteAttack?.setVisible(false);
                this.spriteDeath?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(true);
                this.spriteSpecialAttack?.play(this.animKeySpecialAttack, true);
                this.soundPlayer?.stopRunningSound();
                this.soundPlayer?.playSword2Sound();
                break;
            case SpriteAnimationState.DEATH:
                this.spriteRun?.setVisible(false);
                this.spriteIdle?.setVisible(false);
                this.spriteJump?.setVisible(false);
                this.spriteAttack?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(false);
                this.spriteDeath?.setVisible(true);
                this.spriteDeath?.play(this.animKeyDeath, true);
                this.soundPlayer?.stopRunningSound();
                this.soundPlayer?.stopFlyingSound();
                break;
        }
    }

    public drawHeroSprite(): void {
        this.handleSpriteMovement();
        this.handleMines();
        this.handleBullets();
        this.handleSwordAttacksSpecial();
        this.handleSwordAttacks();
    }

    protected handleSpriteMovement(): void {
        const activeSprite = this.getActiveSprite();
        if (!activeSprite || !activeSprite.body || this.swingingSwordSpecial === true || this.animationState === SpriteAnimationState.DEATH) {
            return;
        }

        const isGrounded = activeSprite.body.touching.down || activeSprite.body.blocked.down;

        if (this.controller.isLeft()) {
            this.applyToAllSprites(sprite => sprite.setFlipX(true));
            if (isGrounded) {
                this.showSpriteFromState(SpriteAnimationState.RUN);
                this.applyToAllSprites(sprite => sprite.setVelocityX(-160));
            }
        } else if (this.controller.isRight()) {
            this.applyToAllSprites(sprite => sprite.setFlipX(false));
            if (isGrounded) {
                this.showSpriteFromState(SpriteAnimationState.RUN);
                this.applyToAllSprites(sprite => sprite.setVelocityX(160));
            }
        } else {
            this.applyToAllSprites(sprite => sprite.setVelocityX(0));
            if (isGrounded) {
                this.showSpriteFromState(SpriteAnimationState.IDLE);
            } else {
                this.showSpriteFromState(SpriteAnimationState.JUMPING);
            }
        }

        if (this.controller.isUp() && isGrounded) {
            this.applyToAllSprites(sprite => sprite.setVelocityY(-480));
            this.showSpriteFromState(SpriteAnimationState.JUMPING);
        }
    }

    public drawMines(x?: number): void {
        const minesLeft: Mine[] = [];
        this.mines.forEach((mine) => {
            if (mine.state !== BaseExplodableState.DESTROYED) {
                minesLeft.push(mine);
            }
            if (x !== undefined) {
                mine.incrementX(x);
            }
            mine.render();
        });

        this.mines = minesLeft;
    }

    public drawBullets(x?: number): void {
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

    public getStaticXPosition(): number {
        return (this.scene.scale.width / 4);
    }

    public createHeroSprite(): void {
        this.loadAnimationConfiguration();

        const xPos = this.scene.scale.width / 4;
        const yPos = 0;

        this.spriteRun = this.scene.physics.add.sprite(xPos, yPos, this.animKeyRun);
        this.spriteJump = this.scene.physics.add.sprite(xPos, yPos, this.animKeyJump);
        this.spriteIdle = this.scene.physics.add.sprite(xPos, yPos, this.animKeyIdle);
        this.spriteAttack = this.scene.physics.add.sprite(xPos, yPos, this.animKeyAttack);
        this.spriteSpecialAttack = this.scene.physics.add.sprite(xPos, yPos, this.animKeySpecialAttack);
        this.spriteDeath = this.scene.physics.add.sprite(xPos, yPos, this.animKeyDeath);

        this.applyToAllSprites((sprite) => {
            sprite.setDisplaySize(200, 200);
            sprite.setBodySize(25, 36);
            sprite.setOffset(66, 80);
            sprite.setVisible(false);
            sprite.setBounce(0.1);
            sprite.setCollideWorldBounds(true);
        });
    }

    public resizeEvent(x: number, y: number): void {
        this.applyToAllSprites((sprite) => {
            sprite.setPosition(x, y);
            sprite.setDepth(10);
            sprite.setGravityY(300);
            sprite.refreshBody();
        });

        this.showSpriteFromState(this.animationState);
    }

    public getCentroidBottomSide(): Phaser.Math.Vector2 {
        const active = this.getActiveSprite();
        return new Phaser.Math.Vector2(active.getBottomCenter().x, active.getBottomCenter().y);
    }

    public getCentroid(): Phaser.Math.Vector2 {
        const active = this.getActiveSprite();
        return new Phaser.Math.Vector2(
            active.getBounds().centerX, 
            (42) + ((active.getBounds()?.centerY) ? active.getBounds().centerY : 0)
        );
    }

    public handleMines(): void {
        const active = this.getActiveSprite();
        if (!active || this.animationState === SpriteAnimationState.DEATH) {
            return;
        }
        const currentTime = this.scene.time.now;

        if (this.controller.isMineTriggered() && (currentTime - this.lastMinePlaced > this.mineRate)) {
            const centroid = this.getCentroidBottomSide();
            const x = centroid.x;
            const y = centroid.y;
            const mine = new Mine(this.scene, x, y - 20);
            this.mines.push(mine);
            this.lastMinePlaced = currentTime;
            this.soundPlayer.playMissileSound();
        }
    }

    public handleSwordAttacksSpecial(): void {
        const active = this.getActiveSprite();
        if (!active || this.swingingSword === true || this.animationState === SpriteAnimationState.DEATH) {
            return;
        }

        if ((this.controller.isSpecialAttacking() && this.swingingSwordSpecial === false) || this.swingingSwordSpecial === true) {
            this.showSpriteFromState(SpriteAnimationState.SPECIAL_ATTACK);

            if (!this.swingingSwordSpecial) {
                this.swingingSwordSpecial = true;
                setTimeout(() => {
                    this.swingingSwordSpecial = false;
                }, this.swordAttackRateSpecial);
            }
        }
    }

    public handleSwordAttacks(): void {
        const active = this.getActiveSprite();
        if (!active || this.swingingSwordSpecial === true || this.animationState === SpriteAnimationState.DEATH) {
            return;
        }

        if ((this.controller.isAttacking() && this.swingingSword === false) || this.swingingSword === true) {
            this.showSpriteFromState(SpriteAnimationState.ATTACK);

            if (!this.swingingSword) {
                this.swingingSword = true;
                setTimeout(() => {
                    this.swingingSword = false;
                }, this.swordAttackRateSpecial);
            }
        }
    }

    public handleBullets(): void {
        const active = this.getActiveSprite();
        if (!active || this.animationState === SpriteAnimationState.DEATH) {
            return;
        }
        const currentTime = this.scene.time.now;

        if (this.controller.isBulletTriggered() && (currentTime - this.lastBullet > this.bulletRate)) {
            const angle: number = (active.flipX) ? 180 : 0;
            const centroid = this.getCentroid();

            const bullet = new Bullet(this.scene, centroid.x, centroid.y, angle, [0xFF00FF]);
            this.bullets.push(bullet);
            this.soundPlayer.playBulletSound();
            this.lastBullet = currentTime;
        }
    }

    public getCenter(): Phaser.Math.Vector2 {
        const active = this.getActiveSprite();
        if (active) {
            return new Phaser.Math.Vector2(active.x, active.y);
        } else {
            return new Phaser.Math.Vector2(0, 0);
        }
    }
}