export abstract class InputController {
    // Movement Axis & Direction Controls
    public abstract isLeft(): boolean;
    public abstract isRight(): boolean;
    public abstract isUp(): boolean;
    public abstract isDown(): boolean;

    // Combat & Weapon Triggers
    public abstract isAttacking(): boolean;        // Basic Sword Attack (Space)
    public abstract isSpecialAttacking(): boolean; // Special Sword Attack (Down + Space/Action)
    public abstract isMineTriggered(): boolean;    // Mine Placement (M)
    public abstract isBulletTriggered(): boolean;  // Ranged Bullet (F)
}