import Phaser from 'phaser';
import { gameConfig } from './config';
import { initTestAPI } from './testing/TestAPI';

const game = new Phaser.Game(gameConfig);

// Initialize test API for Playwright testing (dev mode only)
initTestAPI(game);
