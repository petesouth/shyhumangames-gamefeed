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
    isNavigationOverride?: boolean; // When true, overrides combat spacing (for detours & idling)
}

export class EnemySensorSystem {
    private config: EnemyAIConfig;
    private lastDecisionTime: number = 0;
    
    private wallSensor: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();
    private gapSensor: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle();
    private currentDecision: AIDecision = this.getEmptyDecision();

    // -------------------------------------------------------------
    // PERSISTENT DETOUR, DROP & IDLE STATE
    // -------------------------------------------------------------
    private idleUntilTime: number = 0;
    private nextIdleAllowedTime: number = 0;
    private activeDetourGoal: number | null = null;
    private activeDropGoal: number | null = null;

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
        const isAirborne = !isGrounded;
        
        const heroGrounded = heroBody.touching.down || heroBody.blocked.down;
        const heroIsAirborne = !heroGrounded;

        const dx = heroBody.center.x - enemyBody.center.x;
        const dy = heroBody.center.y - enemyBody.center.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const facingRight = dx > 0;

        const meleeRange = 65; 
        const isPlayerBelow = dy > this.config.jumpUpThreshold;
        const isPlayerAbove = dy < -this.config.jumpUpThreshold;

        // -------------------------------------------------------------
        // -0. ANTI-HEAD-RIDING CHECK (Jump off immediately if on hero's head)
        // -------------------------------------------------------------
        const isPerchedOnHead = isGrounded && 
                                (enemyBody.bottom >= heroBody.top - 12) && 
                                (enemyBody.bottom <= heroBody.top + 15) && 
                                (absDx < 40);

        if (isPerchedOnHead) {
            decision.shouldJump = true;
            decision.moveDirection = dx > 0 ? 1 : -1; // Leap away from center
            decision.isNavigationOverride = true;
            this.currentDecision = decision;
            return decision;
        }

        // -------------------------------------------------------------
        // 0. STRICT ABOVE/BELOW IDLE CHECK
        // -------------------------------------------------------------
        const isDirectlyAboveOrBelow = (isPlayerAbove || isPlayerBelow) && absDx < 90;

        if (isDirectlyAboveOrBelow && isGrounded && this.activeDetourGoal === null && this.activeDropGoal === null) {
            if (currentTime < this.idleUntilTime) {
                decision.moveDirection = 0;
                decision.shouldJump = false;
                decision.isNavigationOverride = true;
                this.currentDecision = decision;
                return decision;
            } else if (currentTime > this.nextIdleAllowedTime) {
                const idleDuration = Phaser.Math.Between(1750, 2250);
                this.idleUntilTime = currentTime + idleDuration;
                this.nextIdleAllowedTime = currentTime + idleDuration + 3000;
                
                decision.moveDirection = 0;
                decision.shouldJump = false;
                decision.isNavigationOverride = true;
                this.currentDecision = decision;
                return decision;
            }
        }

        // -------------------------------------------------------------
        // 1. COMBAT ACTIONS (Ground & Aerial Sword Swings, Lasers & Mines)
        // -------------------------------------------------------------
        const roll = Math.random();

        if (absDx <= 75 && absDy < 75) {
            if (roll <= this.config.aggression) {
                if (Math.random() > 0.4) {
                    decision.shouldMelee = true;
                } else {
                    decision.shouldSpecial = true;
                }
            }
        } 
        
        if (absDx > 55 || isAirborne) {
            const distanceFactor = Math.min(absDx / Math.max(this.config.rangedRangeMax, 1), 1.0);
            const laserChance = this.config.aggression * (0.6 + distanceFactor * 0.4);

            if (roll <= laserChance || isAirborne) {
                decision.shouldBullet = true;
            }

            const mineProbability = isAirborne ? 0.75 : this.config.mineDropChance;
            if (Math.random() <= mineProbability) {
                decision.shouldMine = true;
            }
        }

        // -------------------------------------------------------------
        // 2. CEILING DETOUR PATHFINDING
        // -------------------------------------------------------------
        if (this.activeDetourGoal !== null) {
            if (!isPlayerAbove || !isGrounded) {
                this.activeDetourGoal = null;
            } else {
                const distToGoal = this.activeDetourGoal - enemyBody.center.x;
                if (Math.abs(distToGoal) > 12) {
                    decision.moveDirection = distToGoal > 0 ? 1 : -1;
                    decision.shouldJump = false;
                    decision.isNavigationOverride = true;
                    this.currentDecision = decision;
                    return decision;
                } else {
                    decision.moveDirection = dx > 0 ? 1 : -1;
                    decision.shouldJump = true;
                    decision.isNavigationOverride = true;
                    this.activeDetourGoal = null;
                    this.currentDecision = decision;
                    return decision;
                }
            }
        }

        let isDirectJumpBlocked = false;

        if (isPlayerAbove && isGrounded && platforms && platforms.length > 0 && this.activeDetourGoal === null && this.activeDropGoal === null) {
            for (let i = 0; i < platforms.length; i++) {
                const platform = platforms[i];
                if (!platform || !platform.active) continue;
                const bounds = platform.getBounds();

                const isOverhead = bounds.bottom <= enemyBody.top + 15 && bounds.top >= heroBody.bottom - 50;
                const overlapsEnemyX = enemyBody.center.x >= bounds.left - 25 && enemyBody.center.x <= bounds.right + 25;

                if (isOverhead && overlapsEnemyX) {
                    isDirectJumpBlocked = true;
                    
                    const distToLeftEdge = Math.abs(enemyBody.center.x - bounds.left);
                    const distToRightEdge = Math.abs(enemyBody.center.x - bounds.right);

                    const margin = enemyBody.width + 20;
                    if (distToRightEdge <= distToLeftEdge) {
                        this.activeDetourGoal = bounds.right + margin;
                    } else {
                        this.activeDetourGoal = bounds.left - margin;
                    }
                    break;
                }
            }
        }

        if (this.activeDetourGoal !== null) {
            const distToGoal = this.activeDetourGoal - enemyBody.center.x;
            decision.moveDirection = distToGoal > 0 ? 1 : -1;
            decision.shouldJump = false;
            decision.isNavigationOverride = true;
            this.currentDecision = decision;
            return decision;
        }

        // -------------------------------------------------------------
        // 3. PLATFORM DROP PATHFINDING
        // -------------------------------------------------------------
        if (this.activeDropGoal !== null) {
            if (!isPlayerBelow || isAirborne) {
                if (isAirborne || !isPlayerBelow) {
                    this.activeDropGoal = null;
                }
            } else {
                const distToGoal = this.activeDropGoal - enemyBody.center.x;
                decision.moveDirection = distToGoal > 0 ? 1 : -1;
                decision.shouldJump = false;
                decision.isNavigationOverride = true;
                this.currentDecision = decision;
                return decision;
            }
        }

        if (isPlayerBelow && isGrounded && platforms && platforms.length > 0 && this.activeDropGoal === null && this.activeDetourGoal === null) {
            let currentPlatformBounds: Phaser.Geom.Rectangle | null = null;

            for (let i = 0; i < platforms.length; i++) {
                const platform = platforms[i];
                if (!platform || !platform.active) continue;
                const bounds = platform.getBounds();

                const isStandingOn = Math.abs(enemyBody.bottom - bounds.top) <= 15 &&
                                     enemyBody.center.x >= bounds.left - 10 &&
                                     enemyBody.center.x <= bounds.right + 10;
                if (isStandingOn) {
                    currentPlatformBounds = bounds;
                    break;
                }
            }

            if (currentPlatformBounds) {
                const margin = enemyBody.width + 20;
                if (dx > 0) {
                    this.activeDropGoal = currentPlatformBounds.right + margin;
                } else {
                    this.activeDropGoal = currentPlatformBounds.left - margin;
                }
            } else {
                decision.moveDirection = dx > 0 ? 1 : -1;
                decision.shouldJump = false;
                decision.isNavigationOverride = true;
                this.currentDecision = decision;
                return decision;
            }
        }

        if (this.activeDropGoal !== null) {
            const distToGoal = this.activeDropGoal - enemyBody.center.x;
            decision.moveDirection = distToGoal > 0 ? 1 : -1;
            decision.shouldJump = false;
            decision.isNavigationOverride = true;
            this.currentDecision = decision;
            return decision;
        }

        // -------------------------------------------------------------
        // 4. STANDARD PURSUIT, HERO-JUMP REACTION & ENVIRONMENT NAVIGATION
        // -------------------------------------------------------------
        if (absDx > meleeRange || isPlayerAbove) {
            decision.moveDirection = facingRight ? 1 : -1;
        } else {
            decision.moveDirection = 0;
        }

        if (isGrounded && !decision.shouldJump && !isPlayerBelow && platforms) {
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

            const shouldJumpAfterHero = heroIsAirborne && absDx < this.config.maxJumpReachX && !isDirectJumpBlocked;

            if (shouldJumpAfterHero || (isPlayerAbove && !isDirectJumpBlocked && absDx < this.config.maxJumpReachX) || gapAhead || wallAhead) {
                if (this.config.jumpVelocityY !== 0) {
                    decision.shouldJump = true;
                    decision.moveDirection = dx > 0 ? 1 : -1;
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
            shouldBullet: false,
            isNavigationOverride: false
        };
    }
}