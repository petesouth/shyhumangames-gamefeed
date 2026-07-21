import * as Phaser from 'phaser';
import { SpriteWarriorBase } from './SpriteWarriorBase';
import { InputController } from './InputController';
import { SoundPlayer } from './SoundPlayer';

export class EnemyAntiHero extends SpriteWarriorBase {
    constructor(scene: Phaser.Scene, controller: InputController, soundPlayer: SoundPlayer) {
        super(scene, controller, soundPlayer);
        
        // PRONOUNCED SPEED CONTRAST:
        // Noticeably slower than the hero (160) and scrolling background (240)
        this.moveSpeed = 110; 
       
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
            
            // MUST BE FALSE: Detaches him from the center world box so he can scroll off-screen
            sprite.setCollideWorldBounds(false);
        });
    }

    public override drawHeroSprite(): void {
        super.drawHeroSprite();
        
        // VOID RESCUE: If he falls into a pit while off-screen, snap him safely
        // back onto the sidewalk so he never permanently vanishes from the game.
        const active = this.getActiveSprite();
        if (active && active.y > this.scene.scale.height) {
            const groundY = this.scene.scale.height - 60; // Just above ground level
            this.applyToAllSprites(sprite => {
                sprite.y = groundY;
                sprite.setVelocityY(0);
            });
        }
    }
}