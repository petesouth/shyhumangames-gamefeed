import * as Phaser from 'phaser';
import { Mine } from './mine';
import { BaseExplodableState } from './baseExplodable';
import { SoundPlayer } from './SoundPlayer';
import { Bullet } from './bullet';
import { SpriteHero, SpriteHeroAnimationState } from './SpriteHero';
import { EnemySensorSystem, AIDecision } from './EnemySensorSystem';
import { EnemyProfiles, EnemyAIConfig } from './EnemyAIConfig';

export class EnemyAntiHero {
    protected spriteRun?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteIdle?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteJump?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteAttack?: Phaser.Physics.Arcade.Sprite | null;
    protected spriteSpecialAttack?: Phaser.Physics.Arcade.Sprite | null;
    public soundPlayer: SoundPlayer;

    protected attackRate: number = 200;
    protected scene: Phaser.Scene;
    protected animationState: SpriteHeroAnimationState = SpriteHeroAnimationState.IDLE;

    protected swingingSwordSpecial: boolean = false;
    protected swordAttackRateSpecial: number = 800;

    protected swingingSword: boolean = false;
    protected swordAttackRate: number = 800;

    protected lastMinePlaced: number = 0;
    protected mineRate: number = 2000;
    protected mines: Mine[] = [];

    protected lastBullet: number = 0;
    protected bulletRate: number = 600;
    protected bullets: Bullet[] = [];

    private aiBrain: EnemySensorSystem;
    private currentConfig: EnemyAIConfig;
    private heroTarget: SpriteHero;

    private isJumpLocked: boolean = false;
    private jumpDirectionX: number = 0;

    constructor(
        scene: Phaser.Scene,
        soundPlayer: SoundPlayer,
        hero: SpriteHero,
        profile: EnemyAIConfig = EnemyProfiles.HARD
    ) {
        this.scene = scene;
        this.soundPlayer = soundPlayer;
        this.heroTarget = hero;
        this.currentConfig = profile;
        this.aiBrain = new EnemySensorSystem(profile);
    }

    public setDifficultyProfile(newProfile: EnemyAIConfig): void {
        this.currentConfig = newProfile;
        this.aiBrain.setProfile(newProfile);
    }

    public getActiveSprite(): Phaser.Physics.Arcade.Sprite {
        switch (this.animationState) {
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
        if (!this.spriteIdle || !this.spriteJump || !this.spriteRun || !this.spriteAttack || !this.spriteSpecialAttack) {
            return;
        }
        const sprites: Phaser.Physics.Arcade.Sprite[] = [
            this.spriteIdle, 
            this.spriteJump, 
            this.spriteRun, 
            this.spriteAttack, 
            this.spriteSpecialAttack
        ];
        sprites.forEach((sprite) => {
            applyHandler(sprite);
        });
    }

    showSpriteFromState(animationState: SpriteHeroAnimationState) {
        if (this.animationState === animationState) return;

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
                this.spriteIdle?.setVisible(true);
                this.spriteIdle?.play("enemyidle", true);
                this.soundPlayer?.stopRunningSound();
                this.soundPlayer?.stopFlyingSound();
                break;
            case SpriteHeroAnimationState.RUN:
                this.spriteAttack?.setVisible(false);
                this.spriteIdle?.setVisible(false);
                this.spriteJump?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(false);
                this.spriteRun?.setVisible(true);
                this.spriteRun?.play("enemyrun", true);
                this.soundPlayer?.stopFlyingSound();
                this.soundPlayer?.playRunningSound();
                break;
            case SpriteHeroAnimationState.JUMPING:
                this.spriteAttack?.setVisible(false);
                this.spriteRun?.setVisible(false);
                this.spriteIdle?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(false);
                this.spriteJump?.setVisible(true);
                this.spriteJump?.play("enemyjump", true);
                this.soundPlayer?.stopRunningSound();
                this.soundPlayer?.playFlyingSound();
                break;
            case SpriteHeroAnimationState.ATTACK:
                this.spriteRun?.setVisible(false);
                this.spriteIdle?.setVisible(false);
                this.spriteJump?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(false);
                this.spriteAttack?.setVisible(true);
                this.spriteAttack?.play("enemyattack", true);
                this.soundPlayer?.stopRunningSound();
                this.soundPlayer?.playSwordSound();
                break;
            case SpriteHeroAnimationState.SPECIAL_ATTACK:
                this.spriteRun?.setVisible(false);
                this.spriteIdle?.setVisible(false);
                this.spriteJump?.setVisible(false);
                this.spriteAttack?.setVisible(false);
                this.spriteSpecialAttack?.setVisible(true);
                this.spriteSpecialAttack?.play("enemyspecialattack", true);
                this.soundPlayer?.stopRunningSound();
                this.soundPlayer?.playSword2Sound();
                break;
        }
    }

    drawHeroSprite(
        target?: SpriteHero,
        platforms?: (Phaser.Physics.Arcade.Sprite | Phaser.Physics.Arcade.Image)[]
    ) {
        let decision: AIDecision | null = null;
        const currentHero = target || this.heroTarget;
        const activeSprite = this.getActiveSprite();

        if (currentHero && platforms && activeSprite && activeSprite.active) {
            decision = this.aiBrain.evaluate(
                this.scene.time.now,
                activeSprite,
                currentHero,
                platforms
            );
        }

        this.handleSpriteMovement(decision);
        this.handleCombatActions(decision);
        this.drawMines();
        this.drawBullets();
    }

    private handleSpriteMovement(decision: AIDecision | null) {
        const activeSprite = this.getActiveSprite();
        if (!activeSprite || !activeSprite.body || this.swingingSwordSpecial === true) {
            return;
        }

        const isGrounded = activeSprite.body.touching.down || activeSprite.body.blocked.down;
        const speed = 135;

        if (isGrounded && this.isJumpLocked) {
            this.isJumpLocked = false;
        }

        const currentHero = this.heroTarget;
        const heroActive = currentHero ? currentHero.getActiveSprite() : null;

        // -------------------------------------------------------------
        // SPACING & PURSUIT CALCULATIONS
        // -------------------------------------------------------------
        let moveDir = 0;

        if (this.isJumpLocked) {
            moveDir = this.jumpDirectionX;
        } else if (heroActive && activeSprite) {
            const enemyX = activeSprite.x;
            const heroX = heroActive.x;
            const dx = heroX - enemyX;
            const dy = heroActive.y - activeSprite.y;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            // Desired attack distance offset (60px keeps him at arm's length)
            const targetSpacing = 60;

            if (absDy > 40) {
                // On different platform levels -> pursue horizontally
                moveDir = dx > 0 ? 1 : -1;
            } else {
                // Same level -> target being 60px to left or right of hero
                if (dx > 0) {
                    // Hero is to the RIGHT. Target standing spot is (heroX - 60)
                    const distToTargetSpot = (heroX - targetSpacing) - enemyX;
                    if (distToTargetSpot > 5) moveDir = 1;
                    else if (distToTargetSpot < -5) moveDir = -1;
                    else moveDir = 0;
                } else {
                    // Hero is to the LEFT. Target standing spot is (heroX + 60)
                    const distToTargetSpot = (heroX + targetSpacing) - enemyX;
                    if (distToTargetSpot < -5) moveDir = -1;
                    else if (distToTargetSpot > 5) moveDir = 1;
                    else moveDir = 0;
                }
            }
        } else if (decision) {
            moveDir = decision.moveDirection;
        }

        // -------------------------------------------------------------
        // APPLY VELOCITY & ANIMATIONS
        // -------------------------------------------------------------
        if (moveDir === -1) {
            this.applyToAllSprites(sprite => sprite.setVelocityX(-speed));
            if (isGrounded) {
                this.showSpriteFromState(SpriteHeroAnimationState.RUN);
            } else {
                this.showSpriteFromState(SpriteHeroAnimationState.JUMPING);
            }
        } else if (moveDir === 1) {
            this.applyToAllSprites(sprite => sprite.setVelocityX(speed));
            if (isGrounded) {
                this.showSpriteFromState(SpriteHeroAnimationState.RUN);
            } else {
                this.showSpriteFromState(SpriteHeroAnimationState.JUMPING);
            }
        } else {
            this.applyToAllSprites(sprite => sprite.setVelocityX(0));
            if (isGrounded) {
                this.showSpriteFromState(SpriteHeroAnimationState.IDLE);
            } else {
                this.showSpriteFromState(SpriteHeroAnimationState.JUMPING);
            }
        }

        // -------------------------------------------------------------
        // INITIATE JUMP
        // -------------------------------------------------------------
        if (decision?.shouldJump && isGrounded && !this.isJumpLocked) {
            this.isJumpLocked = true;
            this.jumpDirectionX = moveDir !== 0 ? moveDir : (heroActive && heroActive.x < activeSprite.x ? -1 : 1);

            this.applyToAllSprites(sprite => sprite.setVelocityY(this.currentConfig.jumpVelocityY));
            this.showSpriteFromState(SpriteHeroAnimationState.JUMPING);
        }

        // -------------------------------------------------------------
        // GROUNDED FACING DIRECTION
        // -------------------------------------------------------------
        if (isGrounded && heroActive && activeSprite) {
            const dx = heroActive.x - activeSprite.x;
            this.applyToAllSprites(sprite => sprite.setFlipX(dx < 0));
        }
    }

    private handleCombatActions(decision: AIDecision | null) {
        if (!decision || !this.spriteIdle) return;

        const currentTime = this.scene.time.now;

        if (decision.shouldSpecial && !this.swingingSwordSpecial && !this.swingingSword) {
            this.showSpriteFromState(SpriteHeroAnimationState.SPECIAL_ATTACK);
            this.swingingSwordSpecial = true;
            setTimeout(() => {
                this.swingingSwordSpecial = false;
            }, this.swordAttackRateSpecial);
            return;
        }

        if (decision.shouldMelee && !this.swingingSword && !this.swingingSwordSpecial) {
            this.showSpriteFromState(SpriteHeroAnimationState.ATTACK);
            this.swingingSword = true;
            setTimeout(() => {
                this.swingingSword = false;
            }, this.swordAttackRate);
            return;
        }

        if (decision.shouldMine && (currentTime - this.lastMinePlaced > this.mineRate)) {
            const centroid = this.getCentroidBottomSide();
            const mine = new Mine(this.scene, centroid.x, centroid.y - 20);
            this.mines.push(mine);
            this.lastMinePlaced = currentTime;
            this.soundPlayer.playMissileSound();
        }

        if (decision.shouldBullet && (currentTime - this.lastBullet > this.bulletRate)) {
            const active = this.getActiveSprite();
            const angle: number = active.flipX ? 180 : 0;
            const centroid = this.getCentroid();
            const bullet = new Bullet(this.scene, centroid.x, centroid.y, angle);
            this.bullets.push(bullet);
            this.soundPlayer.playBulletSound();
            this.lastBullet = currentTime;
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
            key: 'enemyrun',
            frames: this.scene.anims.generateFrameNames('enemyrun', {
                prefix: 'run/frame000',
                start: 0,
                end: 8,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: -1
        });
        this.scene.anims.create({
            key: 'enemyjump',
            frames: this.scene.anims.generateFrameNames('enemyjump', {
                prefix: 'jump/frame000',
                start: 0,
                end: 8,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: -1
        });
        this.scene.anims.create({
            key: 'enemyidle',
            frames: this.scene.anims.generateFrameNames('enemyidle', {
                prefix: 'idle/frame000',
                start: 0,
                end: 3,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: -1
        });
        this.scene.anims.create({
            key: 'enemyattack',
            frames: this.scene.anims.generateFrameNames('enemyattack', {
                prefix: 'basicattack/frame000',
                start: 0,
                end: 9,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: -1
        });
        this.scene.anims.create({
            key: 'enemyspecialattack',
            frames: this.scene.anims.generateFrameNames('enemyspecialattack', {
                prefix: 'specialattack/frame000',
                start: 0,
                end: 10,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: -1
        });
    }

    public getStaticXPosition() {
        return (this.scene.scale.width / 4);
    }

    public createHeroSprite() {
        this.loadAnimationConfiguration();

        const xPos = this.scene.scale.width / 2;
        const yPos = 0;

        this.spriteRun = this.scene.physics.add.sprite(xPos, yPos, 'enemyrun');
        this.spriteJump = this.scene.physics.add.sprite(xPos, yPos, 'enemyjump');
        this.spriteIdle = this.scene.physics.add.sprite(xPos, yPos, 'enemyidle');
        this.spriteAttack = this.scene.physics.add.sprite(xPos, yPos, 'enemyattack');
        this.spriteSpecialAttack = this.scene.physics.add.sprite(xPos, yPos, 'enemyspecialattack');

        this.applyToAllSprites((sprite) => {
            sprite.setDisplaySize(156, 120);
            sprite.setBodySize(25, 36);
            sprite.setOffset(50, 20);
            sprite.setVisible(false);
            sprite.setBounce(0.1);
            sprite.setCollideWorldBounds(true);
        });
    }

    public resizeEvent(x: number, y: number) {
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
            (active.getBounds()?.centerY) ? active.getBounds().centerY : 0
        );
    }

    public getCenter(): Phaser.Math.Vector2 {
        const active = this.getActiveSprite();
        if (active && active.body) {
            return new Phaser.Math.Vector2(
                active.x,
                active.y
            );
        }
        return new Phaser.Math.Vector2(0, 0);
    }

    public handleMines() {}
    public handleSwordAttacksSpecial() {}
    public handleSwordAttacks() {}
    public handleBullets() {}
}