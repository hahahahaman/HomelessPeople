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
const drawFuncs = new Set();
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

function makeMap(_this, width = 10, height = 10) {
  map = new Array(width);
  for (let i = 0; i < width; i++) {
    map[i] = new Array(height);
    for (let j = 0; j < height; j++) {
      const tile = _this.add
        .sprite(offset + i * tileSize, offset + j * tileSize, 'grass')
        .setInteractive()
        .on('mouseDown', (pointer) => {
          if (pointer.rightButtonDown()) {
            tile.setTint(0xaa0000);
            const moveTo = {
              state: STATE.MOVE,
              elapsed: 0.0,
              done: selectedEntity.getData('moveSpeed'),
              x: i,
              y: j
            };
            selectedEntity.getData('actionsDeque').push(moveTo);
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
}

function disableMap() {
  for (let i = 0; i < map.length; i++) {
    for (let j = 0; j < map[i].length; j++) {
      map[i][j].disableInteractive();
    }
  }
}

function enableMap() {
  for (let i = 0; i < map.length; i++) {
    for (let j = 0; j < map[i].length; j++) {
      map[i][j].setInteractive();
    }
  }
}
function disableEntities() {
  entities.forEach((entity) => {
    entity.disableInteractive();
  });
}

function enableEntities() {
  entities.forEach((entity) => {
    entity.setInteractive();
  });
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
  } = {}
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
      disableMap();
      disableEntities();
    } else {
      this.cameras.main.setAlpha(1);
      enableMap();
      enableEntities();
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
      gameObject.emit('mouseOver', pointer);
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
  setEntityData(player);
  function selectEntity(entity) {
    selectedEntity = entity;
  }
  player.on('mouseDown', (pointer) => {
    if (pointer.leftButtonDown()) {
      selectEntity(player);
    }
  });
  function mouseOverPlayer() {
    graphics.lineStyle(2, 0x11aa11, 0.5);
    graphics.strokeCircle(player.x, player.y, tileSize / 2);
  }
  player.on('mouseOver', (pointer) => {
    drawFuncs.add(mouseOverPlayer);
  });
  player.on('mouseOut', (pointer) => {
    drawFuncs.delete(mouseOverPlayer);
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
  entities.add(player2);

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

  if (!paused) {
    handleScrolling(this, camera, dt);

    graphics.clear();

    // draw selection circle
    graphics.lineStyle(2, 0xffffff, 0.7); // width, color, alpha
    graphics.strokeCircle(
      grid2world(selectedEntity.getData('x')),
      grid2world(selectedEntity.getData('y')),
      tileSize / 2
    );

    drawFuncs.forEach((func) => {
      func();
    });

    entities.forEach((entity) => {
      const deque = entity.getData('actionsDeque');
      if (deque.length > 0) {
        const action = deque.peek();
        const values = entity.data.values;
        const x = values.x;
        const y = values.y;

        // redundant move
        if (action.state === STATE.MOVE && (x === action.x && y === action.y)) {
          deque.shift();
          return;
        }

        // time elapsed
        if (action.elapsed > action.done) {
          if (action.state === STATE.MOVE) {
            entity.data.set('state', STATE.MOVE);
            if (x < action.x) {
              values.x++;
            } else if (x > action.x) {
              values.x--;
            } else if (y < action.y) {
              values.y++;
            } else if (y > action.y) {
              values.y--;
            }

            if (x === action.x && y === action.y) {
              // we are there
              deque.shift();
              entity.data.set('state', STATE.IDLE);
              const nextAction = deque.peek();
              if (nextAction) {
                nextAction.elapsed = action.elapsed - action.done;
              }
            } else {
              // keep moving to destination
              action.elapsed -= action.done;
            }
          } else {
          }
        } else {
          // action not done
          action.elapsed += dt;
        }
      } else {
        entity.data.set('state', STATE.IDLE);
      }
    });

    /*   for (let i = 0; i < rects.length; i++) {
    graphics.strokeRectShape(rects[i]);
    graphics.fillRectShape(rects[i]);
  } */

    // misc. variables
    const width = camera.width;
    const height = camera.height;
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
      `selectedEntity, x, y, deque: 
      ${selectedEntity.getData('x')}
      ${selectedEntity.getData('y')}
      ${JSON.stringify(selectedEntity.getData('actionsDeque'))}`
    ]);
  } else {
  }
}
