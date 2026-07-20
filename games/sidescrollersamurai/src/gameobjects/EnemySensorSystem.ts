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
    // STRICT ABOVE/BELOW IDLE WAIT TIMER
    // -------------------------------------------------------------
    private idleUntilTime: number = 0;
    private nextIdleAllowedTime: number = 0;

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
        const isAirborne = !isGrounded; // True when jumping or falling through the air
        
        const dx = heroBody.center.x - enemyBody.center.x;
        const dy = heroBody.center.y - enemyBody.center.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const facingRight = dx > 0;

        const meleeRange = 65; 
        const isPlayerBelow = dy > this.config.jumpUpThreshold;
        const isPlayerAbove = dy < -this.config.jumpUpThreshold;

        // -------------------------------------------------------------
        // 0. STRICT ABOVE/BELOW IDLE CHECK (3.5 - 4.5 Seconds)
        // -------------------------------------------------------------
        const isDirectlyAboveOrBelow = (isPlayerAbove || isPlayerBelow) && absDx < 90;

        if (isDirectlyAboveOrBelow && isGrounded) {
            if (currentTime < this.idleUntilTime) {
                decision.moveDirection = 0;
                decision.shouldJump = false;
                decision.isNavigationOverride = true;
                this.currentDecision = decision;
                return decision;
            } else if (currentTime > this.nextIdleAllowedTime) {
                const idleDuration = Phaser.Math.Between(3500, 4500);
                this.idleUntilTime = currentTime + idleDuration;
                this.nextIdleAllowedTime = currentTime + idleDuration + 6000;
                
                decision.moveDirection = 0;
                decision.shouldJump = false;
                decision.isNavigationOverride = true;
                this.currentDecision = decision;
                return decision;
            }
        }

        // -------------------------------------------------------------
        // 1. COMBAT ACTIONS (Ground & Aerial Firepower)
        // -------------------------------------------------------------
        const roll = Math.random();

        if (absDx <= 65 && absDy < 60 && isGrounded) {
            if (roll <= this.config.aggression) {
                if (Math.random() > 0.4) {
                    decision.shouldMelee = true;
                } else {
                    decision.shouldSpecial = true;
                }
            }
        } 
        
        // Ranged & AERIAL ATTACKS: Shoot bullets and drop mines freely while jumping/flying!
        if (absDx > 55 || isAirborne) {
            const distanceFactor = Math.min(absDx / Math.max(this.config.rangedRangeMax, 1), 1.0);
            const laserChance = this.config.aggression * (0.6 + distanceFactor * 0.4);

            // High rate of fire when airborne or in range
            if (roll <= laserChance || isAirborne) {
                decision.shouldBullet = true;
            }

            // Drop landmines while jumping through the air or moving across platforms
            const mineProbability = isAirborne ? 0.75 : this.config.mineDropChance;
            if (Math.random() <= mineProbability) {
                decision.shouldMine = true;
            }
        }

        // -------------------------------------------------------------
        // 2. CEILING DETOUR PATHFINDING (Player Above / Enemy Underneath)
        // -------------------------------------------------------------
        let targetXGoal: number | null = null;
        let isDirectJumpBlocked = false;

        if (isPlayerAbove && isGrounded && platforms && platforms.length > 0) {
            for (let i = 0; i < platforms.length; i++) {
                const platform = platforms[i];
                if (!platform || !platform.active) continue;
                const bounds = platform.getBounds();

                const isOverhead = bounds.bottom <= enemyBody.top + 10 && bounds.top >= heroBody.bottom - 40;
                const overlapsEnemyX = enemyBody.center.x >= bounds.left - 20 && enemyBody.center.x <= bounds.right + 20;

                if (isOverhead && overlapsEnemyX) {
                    isDirectJumpBlocked = true;
                    
                    const distToLeftEdge = Math.abs(enemyBody.center.x - bounds.left);
                    const distToRightEdge = Math.abs(enemyBody.center.x - bounds.right);

                    const margin = enemyBody.width + 15;
                    if (distToRightEdge <= distToLeftEdge) {
                        targetXGoal = bounds.right + margin;
                    } else {
                        targetXGoal = bounds.left - margin;
                    }
                    break;
                }
            }
        }

        // -------------------------------------------------------------
        // 3. STRATEGIC NAVIGATION OVERRIDES
        // -------------------------------------------------------------
        if (isDirectJumpBlocked && targetXGoal !== null) {
            const distToGoal = targetXGoal - enemyBody.center.x;
            
            if (Math.abs(distToGoal) > 12) {
                decision.moveDirection = distToGoal > 0 ? 1 : -1;
                decision.shouldJump = false;
                decision.isNavigationOverride = true;
            } else {
                decision.moveDirection = dx > 0 ? 1 : -1;
                decision.shouldJump = true;
                decision.isNavigationOverride = true;
            }
        } else if (isPlayerBelow) {
            decision.moveDirection = dx > 0 ? 1 : -1;
            decision.shouldJump = false;
            decision.isNavigationOverride = true;
        } else if (absDx > meleeRange || isPlayerAbove) {
            decision.moveDirection = facingRight ? 1 : -1;
        } else {
            decision.moveDirection = 0;
        }

        // -------------------------------------------------------------
        // 4. ENVIRONMENT NAVIGATION (GAP & WALL JUMPS)
        // -------------------------------------------------------------
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

            if ((isPlayerAbove && !isDirectJumpBlocked && absDx < this.config.maxJumpReachX) || gapAhead || wallAhead) {
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
            shouldBullet: false,
            isNavigationOverride: false
        };
    }
}