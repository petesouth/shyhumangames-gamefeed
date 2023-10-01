import Phaser from 'phaser';
import { BaseSpaceship, halfBaseWidth, halfHeight } from './basespaceship';


export class PlayerSpaceship extends BaseSpaceship {
    
    constructor(scene: Phaser.Scene) {
        super(scene, window.innerWidth / 2);

    }  
        
    
}
