import * as Phaser from 'phaser';
import { InputController } from './InputController';

export class KeyboardInputController extends InputController {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private mineKey?: Phaser.Input.Keyboard.Key;
    private bulletKey?: Phaser.Input.Keyboard.Key;

    constructor(scene: Phaser.Scene) {
        super();
        
        if (scene.input && scene.input.keyboard) {
            this.cursors = scene.input.keyboard.createCursorKeys();
            this.mineKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
            this.bulletKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        } else {
            this.cursors = {} as Phaser.Types.Input.Keyboard.CursorKeys;
        }
    }

    public isLeft(): boolean {
        return !!this.cursors.left?.isDown;
    }

    public isRight(): boolean {
        return !!this.cursors.right?.isDown;
    }

    public isUp(): boolean {
        return !!this.cursors.up?.isDown;
    }

    public isDown(): boolean {
        return !!this.cursors.down?.isDown;
    }

    public isAttacking(): boolean {
        return !!this.cursors.space?.isDown;
    }

    public isSpecialAttacking(): boolean {
        return !!(this.cursors.down?.isDown);
    }

    public isMineTriggered(): boolean {
        return !!this.mineKey?.isDown;
    }

    public isBulletTriggered(): boolean {
        return !!this.bulletKey?.isDown;
    }
}