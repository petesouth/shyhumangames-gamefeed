import * as Phaser from 'phaser';
import gGameStore from '../store/store';

export class MainSceneStartGameText {
    private levelAnnounceText: Phaser.GameObjects.Text | undefined;
    private gameNameText: Phaser.GameObjects.Text | undefined;
    private instructions: Phaser.GameObjects.Text[] = [];
    private scoreText: Phaser.GameObjects.Text | undefined;

    constructor(private scene: Phaser.Scene) {}

    setLevelAnnounceText(text: string) {
        this.levelAnnounceText?.setText(text);
    }

    showLevelAnnounceText() {
        this.levelAnnounceText?.setVisible(true);
        this.levelAnnounceText?.setDepth(1);
    }

    hideLevelAnnounceText() {
        this.levelAnnounceText?.setVisible(false);
    }

    showLevelInstructionsText() {
        this.gameNameText?.setVisible(true);
        this.instructions?.forEach((instruction) => {
            instruction.setVisible(true);
        });
    }

    hideLevelInstructionsText() {
        this.gameNameText?.setVisible(false);
        this.instructions?.forEach((instruction) => {
            instruction.setVisible(false);
        });
    }

    createStartGameText() {
        const fontString = 'bold 16px Arial'; // Corrected typo from 'Aria' to 'Arial'
        const fontColor = 'black';
        
        this.scoreText = this.scene.add.text(
            100,
            10,
            'Player Kills: 0 - Level: 0',
            { font: fontString, color: fontColor }
        );
        this.scoreText.setDepth(10);

        this.levelAnnounceText = this.scene.add.text(
            (this.scene.scale.width / 2),
            80,
            'Starting level 1',
            { font: fontString, color: fontColor }
        );
        this.levelAnnounceText.setOrigin(0.5);
        this.levelAnnounceText.setVisible(false);
        this.levelAnnounceText.setDepth(1);

        let offset = 90;

        this.gameNameText = this.scene.add.text(
            (this.scene.scale.width / 2),
            offset,
            'ShyHumanGames Software - Side Scroller Samurai',
            { font: fontString, color: fontColor }
        );
        this.gameNameText.setOrigin(0.5);
        this.gameNameText.setDepth(1);
        offset += 40;

        const instructionTexts = [
            '',
            'Special Thanks to the Artist for all the fine Characters',
            'Mattz Art at: https://xzany.itch.io/',
            '',
            'Mobile: Add Game To Homescreen for Fullscreen',
            'Windows: F11 - Fullscreen', // Corrected typo 'Widnows'
            'Mac: Control-⌘-F - Fullscreen',
            'Click Screen - Start Game / Re-spawn',
            '',
            '\u2191 - Jump',
            '\u2190 - Rotate Left',
            '\u2192 - Rotate Right',
            '',
            'M - Ninja Land Mine',
            'F - Ninja Flying Bullet',
            'Space - Attack', 
            '\u2193 - Special Attack', 
        ];

        instructionTexts.forEach(instruction => {
            let text = this.scene.add.text(
                (this.scene.scale.width / 2),
                offset,
                instruction,
                { font: fontString, color: fontColor }
            );
            text.setOrigin(0.5);
            text.setDepth(10);
            this.instructions.push(text);
            offset += 20;
        });
    }

    repositionStartGameText(w: number) {
        let offset = 80;
        this.gameNameText?.setPosition(w / 2, offset);
        this.gameNameText?.setDepth(1);
        offset += 30;

        this.instructions.forEach(instruction => {
            instruction.setPosition(w / 2, offset);
            instruction.setDepth(1);
            offset += 20;
        });
    }

    displayGameText() {
        this.instructions.forEach((instruction) => {
            instruction.setDepth(100);
        });

        const game = gGameStore.getState().game;
        this.scoreText?.setText(`Level: ${game.currentLevel} - Player Kills: ${game.playerSpaceShipKilled} - Highest Level: ${game.highestLevel}`);
        this.scoreText?.setDepth(100);
    }
}