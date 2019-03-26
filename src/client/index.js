import './index.css';
import Phaser from 'phaser';

import Deque from 'collections/deque';
import Set from 'collections/set';

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
let player2;
let cursors;
let keys;
let text;
const entities = new Set();
let selectedEntity;
let graphics;
let map;
let paused = false;
const rects = [];
const offset = 1000;
const tileSize = 50;

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
        .sprite(offset + i * tileSize, offset + j * tileSize, 'grass')
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

  /*   for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const rect = new Phaser.Geom.Rectangle(
        offset + i * tileSize,
        offset + j * tileSize,
        tileSize,
        tileSize
      );
      rects.push(rect);
    }
  } */
}

function grid2world(val) {
  return offset + val * tileSize;
}

function setEntityData(
  obj,
  {
    x = 0,
    y = 0,
    moveSpeed = 0.5,
    state = STATE.IDLE,
    actionsDeque = new Deque()
  }
) {
  obj.setDataEnabled();
  obj.data
    .set('x', x)
    .set('y', y)
    .set('moveSpeed', moveSpeed) // seconds per block
    .set('state', state)
    .set('actionTimeElapsed', 0)
    .set('actionsDeque', actionsDeque);
  obj.x = grid2world(x);
  obj.y = grid2world(y);
  obj.on('changedata', (gameObject, key, value) => {
    if (key === 'x') {
      obj.x = grid2world(value);
    } else if (key === 'y') {
      obj.y = grid2world(value);
    }
  });
}

function create() {
  console.log(this);
  // stop the right click menu from popping up
  this.input.mouse.disableContextMenu();

  //  If you disable topOnly it will fire events for all objects the pointer is over
  //  regardless of their place on the display list
  this.input.setTopOnly(true);

  this.input.keyboard.on('keydown-P', (event) => {
    // pause or unpause
    paused = !paused;
    if (paused) {
      this.cameras.main.setAlpha(0.8);
    } else {
      this.cameras.main.setAlpha(1);
    }
  });

  this.input.keyboard.on('keydown-SPACE', (event) => {
    // center on selected entity
    if (selectedEntity) {
      this.cameras.main.centerOn(selectedEntity.x, selectedEntity.y);
    }
  });

  //  If a Game Object is clicked on, this event is fired.
  //  We can use it to emit the 'clicked' event on the game object itself.
  this.input.on(
    'gameobjectdown',
    (pointer, gameObject) => {
      gameObject.emit('mouseDown', pointer);
    },
    this
  );

  this.input.on(
    'gameobjectup',
    (pointer, gameObject) => {
      gameObject.emit('mouseUp', gameObject);
    },
    this
  );

  this.input.on(
    'gameobjectover',
    (pointer, gameObject) => {
      gameObject.emit('mouseOver', gameObject);
    },
    this
  );

  this.input.on(
    'gameobjectout',
    (pointer, gameObject) => {
      gameObject.emit('mouseOut', gameObject);
    },
    this
  );

  this.cameras.main.setBounds(0, 0, 3840, 2160);
  this.physics.world.setBounds(0, 0, 3840, 2160);
  this.add.image(0, 0, 'bg').setOrigin(0);

  cursors = this.input.keyboard.createCursorKeys();
  keys = this.input.keyboard.addKeys('W,A,S,D');

  makeMap(this, 10);

  player = this.add.sprite(1920, 1080, 'dude');
  player.setInteractive();
  setEntityData(player, {});
  function selectEntity(entity) {
    selectedEntity = entity;
  }
  player.on('mouseDown', (pointer) => {
    if (pointer.leftButtonDown()) {
      selectEntity(player);
    }
  });
  player2 = this.add.sprite(0, 0, 'dude');
  player2.setInteractive();
  setEntityData(player2, { x: 5, y: 5 });
  player2.on('mouseDown', (pointer) => {
    if (pointer.leftButtonDown()) {
      selectEntity(player2);
    }
  });

  entities.add(player);

  selectedEntity = player;

  this.cameras.main.centerOn(1000, 1000);

  /*   this.cameras.main.startFollow(player, true, 0.4, 0.4); */

  graphics = this.add.graphics({
    lineStyle: { width: 3, color: 0xffffff, alpha: 0.8 }
    /*     fillStyle: { color: 0x00ff00, alpha: 0.8 } */
  });

  text = this.add
    .text(10, 10, 'Cursors to move', { font: '16px Courier', fill: '#ffffff' })
    .setScrollFactor(0);
}

function handleScrolling(_this, camera, dt) {
  const width = camera.width;
  const height = camera.height;
  const moveThresholdX = width / 6;
  const moveThresholdY = height / 6;
  const mouseX = _this.input.x;
  const mouseY = _this.input.y;

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
    camera.scrollX += Math.cos(rad) * vel * ratioX * dt;
    camera.scrollY += Math.sin(rad) * vel * ratioY * dt;
  }
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

  if (!paused) {
    graphics.clear();

    // draw selection rectangle
    graphics.lineStyle(2, 0xffffff, 0.5); // width, color, alpha
    graphics.strokeCircle(
      grid2world(selectedEntity.getData('x')),
      grid2world(selectedEntity.getData('y')),
      tileSize / 2
    );

    if (player.data.get('state') === STATE.MOVE) {
      const data = player.data;
      const values = player.data.values;
      const movesX = data.get('movesX');
      const movesY = data.get('movesY');
      if (movesX === 0 && movesY === 0) {
        data.set('state', STATE.IDLE);
        data.set('actionTimeElapsed', 0);
      } else {
        const timeElapsed = data.get('actionTimeElapsed') + dt;

        if (timeElapsed >= data.get('moveSpeed')) {
          if (movesX !== 0) {
            if (movesX > 0) {
              values.movesX--;
              values.gridX++;
              /*               data.set('movesX', movesX - 1);
              data.set('gridX', gridX + 1); */
            } else {
              values.movesX++;
              values.gridX--;
              /*               data.set('movesX', movesX + 1);
              data.set('gridX', gridX - 1); */
            }
          } else if (movesY !== 0) {
            if (movesY > 0) {
              values.movesY--;
              values.gridY++;
            } else {
              values.movesY++;
              values.gridY--;
            }
          }
          data.set('actionTimeElapsed', timeElapsed - data.get('moveSpeed'));
        } else {
          data.set('actionTimeElapsed', timeElapsed);
        }
      }
    }

    /*   for (let i = 0; i < rects.length; i++) {
    graphics.strokeRectShape(rects[i]);
    graphics.fillRectShape(rects[i]);
  } */

    handleScrolling(this, camera, dt);

    // misc. variables
    const width = camera.width;
    const height = camera.height;
    const moveThresholdX = width / 6;
    const moveThresholdY = height / 6;
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

    // set debug text
    text.setText([
      `fps: ${game.loop.actualFps}`,
      `dt: ${dt}`,
      `screen x: ${this.input.x}`,
      `screen y: ${this.input.y}`,
      `world x: ${this.input.mousePointer.worldX}`,
      `world y: ${this.input.mousePointer.worldY}`,
      `camera x: ${this.cameras.main.scrollX}`,
      `camera y: ${this.cameras.main.scrollY}`,
      `rad: ${rad}`,
      `ratioX, ratioY: ${ratioX}, ${ratioY}`,
      `actionTimeElapsed: 
      ${player.data.get('actionTimeElapsed')},`
    ]);
  } else {
  }
}
