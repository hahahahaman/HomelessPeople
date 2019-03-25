import './index.css';
import Phaser from 'phaser';

const config = {
  type: Phaser.AUTO,
  width: 600,
  height: 600,
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

const STATE = {
  IDLE: 'idle',
  MOVE: 'move',
  ATTACK: 'attack'
};

let player;
let cursors;
let keys;
let text;
let selectedUnit;
let graphics;
let map;
const rects = [];
const offset = 1000;

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
  this.load.image('grass', 'assets/grass.jpg');
}

function makeMap(_this, n) {
  map = new Array(n);
  for (let i = 0; i < n; i++) {
    map[i] = new Array(n);
    for (let j = 0; j < n; j++) {
      const tile = _this.add
        .sprite(offset + i * 50, offset + j * 50, 'grass')
        .setInteractive()
        .on('pointerdown', (pointer) => {
          if (pointer.rightButtonDown()) {
            tile.setTint(0xff0000);
            const playerGridX = player.data.get('gridX');
            const playerGridY = player.data.get('gridY');
            player.data
              .set('movesX', i - playerGridX)
              .set('movesY', j - playerGridY)
              .set('state', STATE.MOVE);
          }
        })
        .on('pointerup', () => {
          tile.clearTint();
        })
        .on('pointerout', () => {
          tile.clearTint();
        })
        .on('pointerover', () => {
          tile.setTint(0x00ff00);
        });

      map[i][j] = tile;
    }
  }

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
  // stop the right click menu from popping up
  this.input.mouse.disableContextMenu();

  this.cameras.main.setBounds(0, 0, 3840, 2160);
  this.physics.world.setBounds(0, 0, 3840, 2160);
  this.add.image(0, 0, 'bg').setOrigin(0);

  cursors = this.input.keyboard.createCursorKeys();
  keys = this.input.keyboard.addKeys('W,A,S,D');

  graphics = this.add.graphics({
    lineStyle: { width: 3, color: 0xffffff, alpha: 0.8 },
    fillStyle: { color: 0x00ff00, alpha: 0.8 }
  });
  makeMap(this, 10);

  player = this.physics.add.image(1920, 1080, 'dude');
  player.setCollideWorldBounds(true);
  player.setDataEnabled();
  player.data
    .set('gridX', 0)
    .set('gridY', 0)
    .set('movesX', 0)
    .set('movesY', 0)
    .set('moveSpeed', 0.6) // seconds per block
    .set('state', STATE.IDLE)
    .set('actionTimeElapsed', 0);

  selectedUnit = player;

  this.cameras.main.centerOn(1000, 1000);

  /*   this.cameras.main.startFollow(player, true, 0.4, 0.4); */

  text = this.add
    .text(10, 10, 'Cursors to move', { font: '16px Courier', fill: '#00ff00' })
    .setScrollFactor(0);
}

const vel = 500;
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
  if (player.data.get('state') === STATE.MOVE) {
    const data = player.data;
    const movesX = data.get('movesX');
    const movesY = data.get('movesY');
    const gridX = data.get('gridX');
    const gridY = data.get('gridY');
    if (movesX === 0 && movesY === 0) {
      data.set('state', STATE.IDLE);
    } else {
      const timeElapsed = data.get('actionTimeElapsed') + dt;

      if (timeElapsed >= data.get('moveSpeed')) {
        if (movesX !== 0) {
          if (movesX > 0) {
            data.set('movesX', movesX - 1);
            data.set('gridX', gridX + 1);
          } else {
            data.set('movesX', movesX + 1);
            data.set('gridX', gridX - 1);
          }
        } else if (movesY !== 0) {
          if (movesY > 0) {
            data.set('movesY', movesY - 1);
            data.set('gridY', gridY + 1);
          } else {
            data.set('movesY', movesY + 1);
            data.set('gridY', gridY - 1);
          }
        }
        data.set('actionTimeElapsed', 0);
      } else {
        data.set('actionTimeElapsed', timeElapsed);
      }
    }
  }

  player.setPosition(
    offset + 50 * player.data.get('gridX'),
    offset + 50 * player.data.get('gridY')
  );

  graphics.clear();

  /*   for (let i = 0; i < rects.length; i++) {
    graphics.strokeRectShape(rects[i]);
    graphics.fillRectShape(rects[i]);
  } */

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
    `rad: ${rad}`,
    `ratioX, ratioY: ${ratioX}, ${ratioY}`,
    `gridX, gridY, movesX, movesY, actionTimeElapsed: 
      ${player.data.get('gridX')},
      ${player.data.get('gridY')}
      ${player.data.get('movesX')}
      ${player.data.get('movesY')}
      ${player.data.get('actionTimeElapsed')},`
  ]);
}
