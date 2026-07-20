import * as Phaser from 'phaser';
import { EnemyAIConfig } from './EnemyAIConfig';
import { SpriteHero } from './SpriteHero';

export interface AIDecision {
    moveDirection: number;     // -1 (left), 1 (right), 0 (stopped/idle)
    shouldJump: boolean;
    shouldMelee: boolean;
    shouldSpecial: boolean;
    shouldMine: boolean;
    shouldBullet: boolean;
}

export class EnemySensorSystem {
    private config: EnemyAIConfig;
    private lastDecisionTime: number = 0;
    
    private wallSensor: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();
    private gapSensor: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();
    private currentDecision: AIDecision = this.getEmptyDecision();

    constructor(config: EnemyAIConfig) {
        this.config = config;
    }

    public setProfile(newConfig: EnemyAIConfig): void {
        this.config = newConfig;
    }

    public evaluate(
        currentTime: number,
        enemySprite: Phaser.Physics.Arcade.Sprite,
        hero: SpriteHero,
        platforms: (Phaser.Physics.Arcade.Sprite | Phaser.Physics.Arcade.Image)[]
    ): AIDecision {
        if (currentTime - this.lastDecisionTime < this.config.decisionInterval) {
            return this.currentDecision;
        }
        this.lastDecisionTime = currentTime;

        const decision = this.getEmptyDecision();
        const enemyBody = enemySprite.body as Phaser.Physics.Arcade.Body;
        const heroActive = hero ? hero.getActiveSprite() : null;
        const heroBody = heroActive ? (heroActive.body as Phaser.Physics.Arcade.Body) : null;

        if (!enemyBody || !heroBody) return decision;

        const isGrounded = enemyBody.touching.down || enemyBody.blocked.down;
        
        const dx = heroBody.center.x - enemyBody.center.x;
        const dy = heroBody.center.y - enemyBody.center.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const facingRight = dx > 0;

        const meleeRange = 65; 
        const isPlayerBelow = dy > this.config.jumpUpThreshold;
        const isPlayerAbove = dy < -this.config.jumpUpThreshold;

        // -------------------------------------------------------------
        // 1. COMBAT ACTIONS (Triggers when staged near melee range)
        // -------------------------------------------------------------
        const roll = Math.random();

        if (absDx <= 75 && absDy < 60) {
            if (roll <= this.config.aggression) {
                if (Math.random() > 0.4) {
                    decision.shouldMelee = true;
                } else {
                    decision.shouldSpecial = true;
                }
            }
        } else if (absDx > 75 && absDy < 160) {
            const distanceFactor = Math.min(absDx / this.config.rangedRangeMax, 1.0);
            const laserChance = this.config.aggression * (0.5 + distanceFactor * 0.5);

            if (roll <= laserChance) {
                decision.shouldBullet = true;
            }

            if (isGrounded && Math.random() <= this.config.mineDropChance) {
                decision.shouldMine = true;
            }
        }

        // -------------------------------------------------------------
        // 2. GRID PLATFORM PATHFINDING (LEDGE SEEKING)
        // -------------------------------------------------------------
        let targetXGoal: number | null = null;
        let isDirectJumpBlocked = false;

        if (isPlayerAbove && isGrounded && platforms && platforms.length > 0) {
            let blockingPlatformBounds: Phaser.Geom.Rectangle | null = null;

            for (let i = 0; i < platforms.length; i++) {
                const platform = platforms[i];
                if (!platform || !platform.active) continue;
                const bounds = platform.getBounds();

                const isPlatformBetweenY = bounds.bottom < enemyBody.top && bounds.top > heroBody.bottom - 40;
                const overlapsEnemyX = enemyBody.center.x >= bounds.left - 10 && enemyBody.center.x <= bounds.right + 10;

                if (isPlatformBetweenY && overlapsEnemyX) {
                    isDirectJumpBlocked = true;
                    blockingPlatformBounds = bounds;
                    break;
                }
            }

            if (isDirectJumpBlocked && blockingPlatformBounds) {
                const distToLeftEdge = Math.abs(enemyBody.center.x - blockingPlatformBounds.left);
                const distToRightEdge = Math.abs(enemyBody.center.x - blockingPlatformBounds.right);

                if (distToLeftEdge < distToRightEdge) {
                    targetXGoal = blockingPlatformBounds.left - (enemyBody.width + 15);
                } else {
                    targetXGoal = blockingPlatformBounds.right + (enemyBody.width + 15);
                }
            }
        }

        // -------------------------------------------------------------
        // 3. PURSUIT DIRECTION & JUMP INTENT
        // -------------------------------------------------------------
        if (isDirectJumpBlocked && targetXGoal !== null) {
            const distToGoal = targetXGoal - enemyBody.center.x;
            
            if (Math.abs(distToGoal) > 10) {
                decision.moveDirection = distToGoal > 0 ? 1 : -1;
            } else {
                decision.moveDirection = facingRight ? 1 : -1;
                decision.shouldJump = true;
            }
        } else if (absDx > meleeRange || isPlayerBelow || isPlayerAbove) {
            decision.moveDirection = facingRight ? 1 : -1;
        } else {
            decision.moveDirection = 0;
        }

        // -------------------------------------------------------------
        // 4. ENVIRONMENT NAVIGATION (GAP & WALL JUMPS)
        // -------------------------------------------------------------
        if (isGrounded && !decision.shouldJump && platforms) {
            this.wallSensor.setTo(
                facingRight ? enemyBody.right : enemyBody.left - 20,
                enemyBody.top + 10,
                20,
                enemyBody.height - 20
            );

            this.gapSensor.setTo(
                facingRight ? enemyBody.right + this.config.gapLookahead : enemyBody.left - (16 + this.config.gapLookahead),
                enemyBody.bottom + 5,
                16,
                30
            );

            let isWallAhead = false;
            let isGroundAhead = false;

            for (let i = 0; i < platforms.length; i++) {
                const platform = platforms[i];
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

            if (isPlayerBelow) {
                decision.shouldJump = false;
            } else if ((isPlayerAbove && !isDirectJumpBlocked && absDx < this.config.maxJumpReachX) || (gapAhead && !isPlayerBelow) || wallAhead) {
                if (this.config.jumpVelocityY !== 0) {
                    decision.shouldJump = true;
                }
            }
        }

        this.currentDecision = decision;
        return decision;
    }

    private getEmptyDecision(): AIDecision {
        return {
            moveDirection: 0,
            shouldJump: false,
            shouldMelee: false,
            shouldSpecial: false,
            shouldMine: false,
            shouldBullet: false
        };
    }
}