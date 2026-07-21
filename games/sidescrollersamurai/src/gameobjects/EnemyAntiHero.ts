import * as Phaser from 'phaser';
import { SpriteWarriorBase } from './SpriteWarriorBase';
import { InputController } from './InputController';
import { SoundPlayer } from './SoundPlayer';

export class EnemyAntiHero extends SpriteWarriorBase {
    constructor(scene: Phaser.Scene, controller: InputController, soundPlayer: SoundPlayer) {
        super(scene, controller, soundPlayer);

        // Bind custom enemy animation sprite keys
        this.animKeyIdle = 'enemyidle';
        this.animKeyRun = 'enemyrun';
        this.animKeyJump = 'enemyjump';
        this.animKeyAttack = 'enemyattack';
        this.animKeySpecialAttack = 'enemyspecialattack';
        this.animKeyDeath = 'enemydeath';
    }

    protected loadAnimationConfiguration(): void {
        if (!this.scene || !this.scene.anims) return;

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
                end: 3,
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
                end: 9,
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
                end: 10,
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

    // Override sprite bounds/offsets to match the AntiHero's specific asset dimensions
    public createHeroSprite(): void {
        this.loadAnimationConfiguration();

        const xPos = this.scene.scale.width / 2;
        const yPos = 0;

        this.spriteRun = this.scene.physics.add.sprite(xPos, yPos, this.animKeyRun);
        this.spriteJump = this.scene.physics.add.sprite(xPos, yPos, this.animKeyJump);
        this.spriteIdle = this.scene.physics.add.sprite(xPos, yPos, this.animKeyIdle);
        this.spriteAttack = this.scene.physics.add.sprite(xPos, yPos, this.animKeyAttack);
        this.spriteSpecialAttack = this.scene.physics.add.sprite(xPos, yPos, this.animKeySpecialAttack);
        this.spriteDeath = this.scene.physics.add.sprite(xPos, yPos, this.animKeyDeath);

        this.applyToAllSprites((sprite) => {
            sprite.setDisplaySize(156, 120);
            sprite.setBodySize(25, 36);
            sprite.setOffset(50, 20);
            sprite.setVisible(false);
            sprite.setBounce(0.1);
            sprite.setCollideWorldBounds(true);
        });
    }
}