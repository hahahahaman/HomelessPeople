import './index.css';
import Phaser from 'phaser';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 800,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

const game = new Phaser.Game(config); // main process

let player;
let cursors;
let keys;
let map;
let text;
let selectedUnit;
let graphics;
const rects = [];

function preload() {
  this.load.setBaseURL('../..');
  this.load.image('sky', 'assets/sky.png');
  this.load.image('ground', 'assets/platform.png');
  this.load.image('star', 'assets/star.png');
  this.load.image('bomb', 'assets/bomb.png');
  this.load.spritesheet('dude', 'assets/dude.png', {
    frameWidth: 32,
    frameHeight: 48
  });
  this.load.image('bg', 'assets/wallpaper.jpg');
}

function makeMap(n) {
  map = new Array(n);
  for (let i = 0; i < n; i++) {
    map[i] = new Array(n);
  }

  const offset = 1000;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      /*       graphics.fillRoundedRect(offset + i * 50, offset + j * 50, 50, 50); */
      const rect = new Phaser.Geom.Rectangle(
        offset + i * 50,
        offset + j * 50,
        50,
        50
      );
      rects.push(rect);
    }
  }
}

function create() {
  this.cameras.main.setBounds(0, 0, 3840, 2160);
  this.physics.world.setBounds(0, 0, 3840, 2160);
  this.add.image(0, 0, 'bg').setOrigin(0);

  cursors = this.input.keyboard.createCursorKeys();
  keys = this.input.keyboard.addKeys('W,A,S,D');

  player = this.physics.add.image(1920, 1080, 'dude');
  player.setCollideWorldBounds(true);
  player.gridX = 0;
  player.gridY = 0;
  selectedUnit = player;
  this.cameras.main.centerOn(1000, 1000);

  /*   this.cameras.main.startFollow(player, true, 0.4, 0.4); */

  text = this.add
    .text(10, 10, 'Cursors to move', { font: '16px Courier', fill: '#00ff00' })
    .setScrollFactor(0);

  graphics = this.add.graphics({
    lineStyle: { width: 3, color: 0xffffff, alpha: 0.8 },
    fillStyle: { color: 0x00ff00, alpha: 0.8 }
  });
  makeMap(10);
}

const vel = 1000;
function update(time, delta) {
  const dt = delta / 1000;
  const camera = this.cameras.main;

  /*
  player.setVelocity(0);
  if (cursors.up.isDown) {
    player.setVelocityY(-vel);
  } else if (cursors.down.isDown) {
    player.setVelocityY(vel);
  }

  if (cursors.left.isDown) {
    player.setVelocityX(-vel);
  } else if (cursors.right.isDown) {
    player.setVelocityX(vel);
  }

  if (keys.W.isDown) {
    camera.scrollY -= vel * dt;
  } else if (keys.S.isDown) {
    camera.scrollY += vel * dt;
  }

  if (keys.A.isDown) {
    camera.scrollX -= vel * dt;
  } else if (keys.D.isDown) {
    camera.scrollX += vel * dt;
  }
  */
  graphics.clear();

  for (let i = 0; i < rects.length; i++) {
    graphics.strokeRectShape(rects[i]);
    graphics.fillRectShape(rects[i]);
  }

  const width = camera.width;
  const height = camera.height;
  const moveThresholdX = width / 6;
  const moveThresholdY = height / 6;
  let shouldMove = false;
  const mouseX = this.input.x;
  const mouseY = this.input.y;

  const x = mouseX - width / 2;
  const y = mouseY - height / 2;
  const rad = Math.atan2(y, x);
  const golden = 1.618;

  // Exponential increase in camera scroll speed
  const distX = Math.min(Math.abs(x), width / 2) ** golden;
  const distY = Math.min(Math.abs(y), height / 2) ** golden;
  const ratioX = distX / Math.pow(width / 2, golden);
  const ratioY = distY / Math.pow(height / 2, golden);
  if (
    mouseX < moveThresholdX
    || mouseY < moveThresholdY
    || Math.abs(width - mouseX) < moveThresholdX
    || Math.abs(height - mouseY) < moveThresholdY
  ) {
    shouldMove = true;
    camera.scrollX += Math.cos(rad) * vel * ratioX * dt;
    camera.scrollY += Math.sin(rad) * vel * ratioY * dt;
  }

  text.setText([
    `fps: ${game.loop.actualFps}`,
    `screen x: ${this.input.x}`,
    `screen y: ${this.input.y}`,
    `world x: ${this.input.mousePointer.worldX}`,
    `world y: ${this.input.mousePointer.worldY}`,
    `camera x: ${this.cameras.main.scrollX}`,
    `camera y: ${this.cameras.main.scrollY}`,
    `shouldMove: ${shouldMove}`,
    `rad: ${rad}`,
    `ratioX, ratioY: ${ratioX}, ${ratioY}`
  ]);
}
