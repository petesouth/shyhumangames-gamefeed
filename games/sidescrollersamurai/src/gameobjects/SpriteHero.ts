import * as Phaser from 'phaser';
import { SpriteWarriorBase } from './SpriteWarriorBase';
import { InputController } from './InputController';
import { SoundPlayer } from './SoundPlayer';

export class SpriteHero extends SpriteWarriorBase {
    constructor(scene: Phaser.Scene, controller: InputController, soundPlayer: SoundPlayer) {
        super(scene, controller, soundPlayer);

        this.animKeyIdle = 'heroidle';
        this.animKeyRun = 'herorun';
        this.animKeyJump = 'herojump';
        this.animKeyAttack = 'heroattack';
        this.animKeySpecialAttack = 'herospecialattack';
        this.animKeyDeath = 'herodeath';
    }

    protected loadAnimationConfiguration(): void {
        this.scene.anims.create({
            key: this.animKeyRun,
            frames: this.scene.anims.generateFrameNames(this.animKeyRun, {
                prefix: 'run/frame000',
                start: 0,
                end: 8,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: -1
        });
        this.scene.anims.create({
            key: this.animKeyJump,
            frames: this.scene.anims.generateFrameNames(this.animKeyJump, {
                prefix: 'jump/frame000',
                start: 0,
                end: 8,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: -1
        });
        this.scene.anims.create({
            key: this.animKeyIdle,
            frames: this.scene.anims.generateFrameNames(this.animKeyIdle, {
                prefix: 'idle/frame000',
                start: 0,
                end: 2,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: -1
        });
        this.scene.anims.create({
            key: this.animKeyAttack,
            frames: this.scene.anims.generateFrameNames(this.animKeyAttack, {
                prefix: 'basicattack/frame000',
                start: 0,
                end: 13,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: -1
        });
        this.scene.anims.create({
            key: this.animKeySpecialAttack,
            frames: this.scene.anims.generateFrameNames(this.animKeySpecialAttack, {
                prefix: 'specialattack/frame000',
                start: 0,
                end: 13,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: -1
        });
        this.scene.anims.create({
            key: this.animKeyDeath,
            frames: this.scene.anims.generateFrameNames(this.animKeyDeath, {
                prefix: 'death/frame000',
                start: 0,
                end: 9,
                zeroPad: 1
            }),
            frameRate: 10,
            repeat: 0
        });
    }
}