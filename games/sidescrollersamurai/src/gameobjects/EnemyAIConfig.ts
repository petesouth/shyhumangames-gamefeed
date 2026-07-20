export interface EnemyAIConfig {
    // Brain & Pacing
    decisionInterval: number;      // How often AI evaluates (ms). Lower = faster reflexes.
    moveSpeedX: number;            // Horizontal movement speed.
    jumpVelocityY: number;         // Vertical jump power.
    
    // Environmental Navigation
    gapLookahead: number;          // How far ahead (in px) to probe for ledges. Must scale with speed!
    jumpUpThreshold: number;       // How much higher (in px) the player must be to trigger a platform ascent jump.
    maxJumpReachX: number;         // Max horizontal distance willing to attempt a jump toward the player.
    
    // Combat & Zoning
    aggression: number;            // 0.0 to 1.0: Probability of attacking vs. hesitating when in range.
    meleeRange: number;            // Distance (px) to trigger melee attacks.
    mineDropChance: number;        // 0.0 to 1.0: Chance to drop landmines when mid-range.
    rangedRangeMin: number;        // Minimum range to start firing projectiles.
    rangedRangeMax: number;        // Maximum range to fire projectiles.
}

export class EnemyProfiles {
    public static readonly EASY: EnemyAIConfig = {
        decisionInterval: 250,
        moveSpeedX: 80,
        jumpVelocityY: -450,
        gapLookahead: 12,          // Slow speed = short lookahead needed
        jumpUpThreshold: 80,       // Only jumps up if player is directly above
        maxJumpReachX: 150,
        aggression: 0.3,           // Hesitates frequently
        meleeRange: 45,
        mineDropChance: 0.1,
        rangedRangeMin: 150,
        rangedRangeMax: 250
    };

    public static readonly MID: EnemyAIConfig = {
        decisionInterval: 150,
        moveSpeedX: 120,
        jumpVelocityY: -500,
        gapLookahead: 18,
        jumpUpThreshold: 65,
        maxJumpReachX: 220,
        aggression: 0.6,
        meleeRange: 55,
        mineDropChance: 0.3,
        rangedRangeMin: 100,
        rangedRangeMax: 350
    };

    public static readonly HARD: EnemyAIConfig = {
        decisionInterval: 80,
        moveSpeedX: 170,
        jumpVelocityY: -540,
        gapLookahead: 24,          // Fast speed = further lookahead to catch ledges
        jumpUpThreshold: 50,
        maxJumpReachX: 300,
        aggression: 0.85,
        meleeRange: 65,
        mineDropChance: 0.5,
        rangedRangeMin: 80,
        rangedRangeMax: 450
    };

    public static readonly SUPER_HARD: EnemyAIConfig = {
        decisionInterval: 40,      // Hyper-responsive reflexes
        moveSpeedX: 210,
        jumpVelocityY: -580,
        gapLookahead: 32,          // Probes wide to clear massive procedural gaps
        jumpUpThreshold: 35,       // Aggressively chases player to higher platforms
        maxJumpReachX: 400,
        aggression: 1.0,           // Zero hesitation
        meleeRange: 75,
        mineDropChance: 0.7,
        rangedRangeMin: 70,
        rangedRangeMax: 550
    };

    // Perfect for simple, non-jumping hazard monsters
    public static readonly GRAPE_MONSTER: EnemyAIConfig = {
        decisionInterval: 300,
        moveSpeedX: 60,
        jumpVelocityY: 0,          // Cannot jump
        gapLookahead: 10,
        jumpUpThreshold: 9999,     // Will never try to jump up platforms
        maxJumpReachX: 0,
        aggression: 0.5,
        meleeRange: 40,
        mineDropChance: 0.0,       // No weapons
        rangedRangeMin: 0,
        rangedRangeMax: 0
    };
}