import * as Phaser from 'phaser';
import { InputController } from './InputController';
import { SpriteWarriorBase } from './SpriteWarriorBase';
import { EnemyAIConfig, EnemyProfiles } from './EnemyAIConfig';

export interface AIDecision {
    moveDirection: number;     // -1 (left), 1 (right), 0 (stopped/idle)
    shouldJump: boolean;
    shouldMelee: boolean;
    shouldSpecial: boolean;
    shouldMine: boolean;
    shouldBullet: boolean;
    isNavigationOverride?: boolean;
}

export class EnemyAIInputController extends InputController {
    private config: EnemyAIConfig;
    private aiUnit: SpriteWarriorBase;
    private targetUnit: SpriteWarriorBase;
    private platforms: (Phaser.Physics.Arcade.Sprite | Phaser.Physics.Arcade.Image)[];

    private lastDecisionTime: number = 0;
    private lastMineTime: number = 0;
    private lastBulletTime: number = 0;
    private wallSensor: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();
    private gapSensor: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();
    private currentDecision: AIDecision = this.getEmptyDecision();

    // Cached boolean flags derived from the latest evaluate() pass
    private leftFlag: boolean = false;
    private rightFlag: boolean = false;
    private upFlag: boolean = false;
    private downFlag: boolean = false;
    private attackFlag: boolean = false;
    private specialAttackFlag: boolean = false;
    private mineFlag: boolean = false;
    private bulletFlag: boolean = false;

    constructor(
        aiUnit: SpriteWarriorBase,
        targetUnit: SpriteWarriorBase,
        platforms: (Phaser.Physics.Arcade.Sprite | Phaser.Physics.Arcade.Image)[] = [],
        profile: EnemyAIConfig = EnemyProfiles.HARD
    ) {
        super();
        this.aiUnit = aiUnit;
        this.targetUnit = targetUnit;
        this.platforms = platforms;
        this.config = profile;
    }

    public setProfile(newConfig: EnemyAIConfig): void {
        this.config = newConfig;
    }

    public update(currentTime: number): void {
        const aiSprite = this.aiUnit.getActiveSprite();
        const targetSprite = this.targetUnit.getActiveSprite();

        if (!aiSprite || !targetSprite || !aiSprite.active) {
            this.resetFlags();
            return;
        }

        const decision = this.evaluateDecision(currentTime, aiSprite, targetSprite);

        this.leftFlag = decision.moveDirection === -1;
        this.rightFlag = decision.moveDirection === 1;
        this.upFlag = decision.shouldJump;
        this.downFlag = decision.shouldSpecial;
        this.attackFlag = decision.shouldMelee;
        this.specialAttackFlag = decision.shouldSpecial;
        this.mineFlag = decision.shouldMine;
        this.bulletFlag = decision.shouldBullet;
    }

    private evaluateDecision(
        currentTime: number,
        enemySprite: Phaser.Physics.Arcade.Sprite,
        heroSprite: Phaser.Physics.Arcade.Sprite
    ): AIDecision {
        if (currentTime - this.lastDecisionTime < this.config.decisionInterval) {
            return this.currentDecision;
        }
        this.lastDecisionTime = currentTime;

        const decision = this.getEmptyDecision();
        const enemyBody = enemySprite.body as Phaser.Physics.Arcade.Body;
        const heroBody = heroSprite.body as Phaser.Physics.Arcade.Body;

        if (!enemyBody || !heroBody) return decision;

        const isGrounded = enemyBody.touching.down || enemyBody.blocked.down;
        const isAirborne = !isGrounded;
        const heroIsAirborne = !(heroBody.touching.down || heroBody.blocked.down);

        const dx = heroBody.center.x - enemyBody.center.x;
        const dy = heroBody.center.y - enemyBody.center.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const facingRight = dx > 0;

        const meleeRange = 65;
        const isPlayerBelow = dy > this.config.jumpUpThreshold;
        const isPlayerAbove = dy < -this.config.jumpUpThreshold;

        // 1. Anti-Head-Riding Check
        if (this.checkHeadPerching(isGrounded, enemyBody, heroBody, absDx, dx, decision)) {
            this.currentDecision = decision;
            return decision;
        }

        // 2. Combat Actions (Melee / Special)
        this.evaluateCombatActions(absDx, absDy, decision);

        // 3. Ranged Actions (Bullets / Mines)
        this.evaluateRangedActions(absDx, isAirborne, currentTime, decision);

        // 4. Pursuit & Environmental Navigation
        this.evaluateMovementAndNavigation(absDx, meleeRange, isPlayerAbove, isPlayerBelow, isGrounded, heroIsAirborne, enemyBody, dx, facingRight, decision);

        this.currentDecision = decision;
        return decision;
    }

    private checkHeadPerching(
        isGrounded: boolean,
        enemyBody: Phaser.Physics.Arcade.Body,
        heroBody: Phaser.Physics.Arcade.Body,
        absDx: number,
        dx: number,
        decision: AIDecision
    ): boolean {
        const isPerchedOnHead = isGrounded &&
            (enemyBody.bottom >= heroBody.top - 12) &&
            (enemyBody.bottom <= heroBody.top + 15) &&
            (absDx < 40);

        if (isPerchedOnHead) {
            decision.shouldJump = true;
            decision.moveDirection = dx > 0 ? 1 : -1;
            decision.isNavigationOverride = true;
            return true;
        }
        return false;
    }

    private evaluateCombatActions(absDx: number, absDy: number, decision: AIDecision): void {
        if (absDx > 75 || absDy >= 75) return;

        if (Math.random() <= this.config.aggression) {
            if (Math.random() > 0.4) {
                decision.shouldMelee = true;
            } else {
                decision.shouldSpecial = true;
            }
        }
    }

    private evaluateRangedActions(absDx: number, isAirborne: boolean, currentTime: number, decision: AIDecision): void {
        if (absDx <= 55 && !isAirborne) return;

        // 1. Enforce a 2.5-second (2500ms) cooldown between AI bullet decisions
        const bulletCooldown = 2500;
        if (currentTime - this.lastBulletTime > bulletCooldown) {
            const distanceFactor = Math.min(absDx / Math.max(this.config.rangedRangeMax, 1), 1.0);
            
            // 2. Lower the scaling multiplier so aggression doesn't guarantee a shot
            const laserChance = (this.config.aggression * 0.35) * (0.5 + distanceFactor * 0.5);

            // 3. Give airborne shots a 30% chance instead of an automatic 100% guarantee
            const airborneShot = isAirborne && Math.random() <= 0.30;

            if (Math.random() <= laserChance || airborneShot) {
                decision.shouldBullet = true;
                this.lastBulletTime = currentTime;
            }
        }

        const mineProbability = isAirborne ? 0.75 : this.config.mineDropChance;
        const mineCooldown = 4000;
        if (Math.random() <= mineProbability && (currentTime - this.lastMineTime > mineCooldown)) {
            decision.shouldMine = true;
            this.lastMineTime = currentTime;
        }
    }

    private evaluateMovementAndNavigation(
        absDx: number,
        meleeRange: number,
        isPlayerAbove: boolean,
        isPlayerBelow: boolean,
        isGrounded: boolean,
        heroIsAirborne: boolean,
        enemyBody: Phaser.Physics.Arcade.Body,
        dx: number,
        facingRight: boolean,
        decision: AIDecision
    ): void {
        if (absDx > meleeRange || isPlayerAbove) {
            decision.moveDirection = facingRight ? 1 : -1;
        } else {
            decision.moveDirection = 0;
        }

        if (!isGrounded || decision.shouldJump || isPlayerBelow || !this.platforms) return;

        this.wallSensor.setTo(
            facingRight ? enemyBody.right : enemyBody.left - 20,
            enemyBody.top + 10,
            20,
            enemyBody.height - 20
        );

        const dynamicLookahead = this.config.gapLookahead + Math.abs(enemyBody.velocity.x * 0.05);
        this.gapSensor.setTo(
            facingRight ? enemyBody.right + dynamicLookahead : enemyBody.left - (16 + dynamicLookahead),
            enemyBody.bottom + 5,
            16,
            30
        );

        let isWallAhead = false;
        let isGroundAhead = false;

        for (const platform of this.platforms) {
            if (!platform || !platform.active) continue;
            const bounds = platform.getBounds();

            if (!isWallAhead && Phaser.Geom.Intersects.RectangleToRectangle(this.wallSensor, bounds)) {
                isWallAhead = true;
            }
            if (!isGroundAhead && Phaser.Geom.Intersects.RectangleToRectangle(this.gapSensor, bounds)) {
                isGroundAhead = true;
            }
        }

        const gapAhead = !isGroundAhead && decision.moveDirection !== 0;
        const wallAhead = isWallAhead && decision.moveDirection !== 0;
        const shouldJumpAfterHero = heroIsAirborne && absDx < this.config.maxJumpReachX;

        if (shouldJumpAfterHero || (isPlayerAbove && absDx < this.config.maxJumpReachX) || gapAhead || wallAhead) {
            if (this.config.jumpVelocityY !== 0) {
                decision.shouldJump = true;
                decision.moveDirection = dx > 0 ? 1 : -1;
            }
        }
    }

    private getEmptyDecision(): AIDecision {
        return {
            moveDirection: 0,
            shouldJump: false,
            shouldMelee: false,
            shouldSpecial: false,
            shouldMine: false,
            shouldBullet: false,
            isNavigationOverride: false
        };
    }

    private resetFlags(): void {
        this.leftFlag = false;
        this.rightFlag = false;
        this.upFlag = false;
        this.downFlag = false;
        this.attackFlag = false;
        this.specialAttackFlag = false;
        this.mineFlag = false;
        this.bulletFlag = false;
    }

    public isLeft(): boolean { return this.leftFlag; }
    public isRight(): boolean { return this.rightFlag; }
    public isUp(): boolean { return this.upFlag; }
    public isDown(): boolean { return this.downFlag; }
    public isAttacking(): boolean { return this.attackFlag; }
    public isSpecialAttacking(): boolean { return this.specialAttackFlag; }
    public isMineTriggered(): boolean { return this.mineFlag; }
    public isBulletTriggered(): boolean { return this.bulletFlag; }
}