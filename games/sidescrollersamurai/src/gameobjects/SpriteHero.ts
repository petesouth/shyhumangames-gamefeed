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
    SPECIAL_ATTACK = 4,
    DEATH = 5,
}

export class SpriteHero {
    protected spriteRun?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteIdle?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteJump?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteAttack?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteSpecialAttack?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteDeath?: Phaser.Physics.Arcade.Sprite | null;
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

    public getActiveSprite(): Phaser.Physics.Arcade.Sprite {
        switch (this.animationState) {
            case SpriteHeroAnimationState.DEATH:
                return this.spriteDeath || this.spriteIdle!;
            case SpriteHeroAnimationState.RUN:
                return this.spriteRun || this.spriteIdle!;
            case SpriteHeroAnimationState.JUMPING:
                return this.spriteJump || this.spriteIdle!;
            case SpriteHeroAnimationState.ATTACK:
                return this.spriteAttack || this.spriteIdle!;
            case SpriteHeroAnimationState.SPECIAL_ATTACK:
                return this.spriteSpecialAttack || this.spriteIdle!;
            case SpriteHeroAnimationState.IDLE:
            default:
                return this.spriteIdle!;
        }
    }

    applyToAllSprites(applyHandler: (sprite: Phaser.Physics.Arcade.Sprite) => void) {
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

    showSpriteFromState(animationState: SpriteHeroAnimationState) {
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
            case SpriteHeroAnimationState.IDLE:
                this.spriteAttack?.setVisible(false);
                this.spriteRun?.setVisible(false);
                this.spriteJump?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(false);
                this.spriteDeath?.setVisible(false);
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
                this.spriteDeath?.setVisible(false);
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
                this.spriteDeath?.setVisible(false);
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
                this.spriteDeath?.setVisible(false);
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
                this.spriteDeath?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(true);
                this.spriteSpecialAttack?.play("herospecialattack", true);
                this.soundPlayer?.stopRunningSound();
                this.soundPlayer?.playSword2Sound();
                break;
            case SpriteHeroAnimationState.DEATH:
                this.spriteRun?.setVisible(false);
                this.spriteIdle?.setVisible(false);
                this.spriteJump?.setVisible(false);
                this.spriteAttack?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(false);
                this.spriteDeath?.setVisible(true);
                this.spriteDeath?.play("herodeath", true);
                this.soundPlayer?.stopRunningSound();
                this.soundPlayer?.stopFlyingSound();
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
        const activeSprite = this.getActiveSprite();
        if (!activeSprite || !activeSprite.body || this.swingingSwordSpecial === true || this.animationState === SpriteHeroAnimationState.DEATH) {
            return;
        }

        const isGrounded = activeSprite.body.touching.down || activeSprite.body.blocked.down;

        if (this.cursors.left.isDown) {
            this.applyToAllSprites(sprite => sprite.setFlipX(true));
            if (isGrounded) {
                this.showSpriteFromState(SpriteHeroAnimationState.RUN);
                this.applyToAllSprites(sprite => sprite.setVelocityX(-160));
            }
        } else if (this.cursors.right.isDown) {
            this.applyToAllSprites(sprite => sprite.setFlipX(false));
            if (isGrounded) {
                this.showSpriteFromState(SpriteHeroAnimationState.RUN);
                this.applyToAllSprites(sprite => sprite.setVelocityX(160));
            }
        } else {
            this.applyToAllSprites(sprite => sprite.setVelocityX(0));
            if (isGrounded) {
                this.showSpriteFromState(SpriteHeroAnimationState.IDLE);
            } else {
                this.showSpriteFromState(SpriteHeroAnimationState.JUMPING);
            }
        }

        if (this.cursors.up.isDown && isGrounded) {
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
                mine.incrementX(x);
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
        this.scene.anims.create({
            key: 'herodeath',
            frames: this.scene.anims.generateFrameNames('herodeath', {
                prefix: 'death/frame000',
                start: 0,
                end: 9,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: 0
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
        this.spriteDeath = this.scene.physics.add.sprite(xPos, yPos, 'herodeath');

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

    public handleMines() {
        const active = this.getActiveSprite();
        if (!active || this.animationState === SpriteHeroAnimationState.DEATH) {
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
        const active = this.getActiveSprite();
        if (!this.cursors || !active || this.swingingSword === true || this.animationState === SpriteHeroAnimationState.DEATH) {
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
        const active = this.getActiveSprite();
        if (!active || this.swingingSwordSpecial === true || this.animationState === SpriteHeroAnimationState.DEATH) {
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
        const active = this.getActiveSprite();
        if (!active || this.animationState === SpriteHeroAnimationState.DEATH) {
            return;
        }
        const currentTime = this.scene.time.now;

        if ((this.bulletKey?.isDown) && (currentTime - this.lastBullet > this.bulletRate)) {
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