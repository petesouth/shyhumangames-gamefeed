import React, { Component } from 'react';
import './App.css';
// Ensure casing matches your actual file name (e.g., './Game' if the file is Game.ts)
import Game from './game'; 

export default class App extends Component {
  // Explicit type safety
  private game: Game | null = null;

  constructor(props: {}) {
    super(props);
    this.handleResize = this.handleResize.bind(this);
  }

  componentDidMount(): void {
    // Instantiate your Phaser Game
    this.game = new Game();

    // Bind the resize listener safely
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount(): void {
    // Clean up event listeners and destroy the game instance to prevent memory leaks
    window.removeEventListener('resize', this.handleResize);
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
  }

  private handleResize(): void {
    if (this.game && this.game.scale) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.game.scale.setGameSize(w, h);
    }
  }

  render() {
    return (
      <div className="App">
        {/* div height and width set to match window container */}
        <div id="game" style={{ height: "100vh", width: "100vw", overflow: "hidden" }} />
      </div>
    );
  }
}