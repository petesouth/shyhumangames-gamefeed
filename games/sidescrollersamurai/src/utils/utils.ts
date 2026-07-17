import * as Phaser from 'phaser';

export class Utils {

    public static resizeImageToRatio(
        image: Phaser.GameObjects.Image | Phaser.Physics.Arcade.Sprite | Phaser.GameObjects.TileSprite,
        screenWidth: number, 
        screenHeight: number
    ) {
        if (!image) {
            return;
        }
        const imageWidth = image.width;
        const imageHeight = image.height;
        const imageAspectRatio = imageWidth / imageHeight;

        let newWidth, newHeight;

        newWidth = screenWidth;
        newHeight = newWidth / imageAspectRatio;

        if (newHeight < screenHeight) {
            newHeight = screenHeight;
            newWidth = newHeight * imageAspectRatio;
        }
        image.setDisplaySize(newWidth, newHeight);
        image.setPosition(screenWidth / 2, screenHeight / 2);
    }

    // Removed the MainScene import to prevent circular compilation locks.
    // Pass the golden ratio width/height context configurations explicitly.
    public static computeRatioValue(speed: number, baseWidth: number, baseHeight: number): number {
        const scale = Math.max(window.innerWidth, window.innerHeight);
        const origScale = Math.max(baseWidth, baseHeight);
        let percentDifference = scale / origScale;
        return speed * percentDifference;
    }

    public static computeWidthHeightRatioMax(
        width: number, 
        height: number, 
        baseWidth: number, 
        baseHeight: number
    ): { ratioWidth: number, ratioHeight: number } {
        return { 
            ratioWidth: Utils.computeRatioValue(width, baseWidth, baseHeight), 
            ratioHeight: Utils.computeRatioValue(height, baseWidth, baseHeight) 
        };
    }
}