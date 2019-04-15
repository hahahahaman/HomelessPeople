import './index.css';
import Phaser from 'phaser';

import Deque from 'collections/deque';
import Set from 'collections/set';

import * as globals from './globals';

const config = {
  type: Phaser.AUTO,
  scale: {
    parent: 'game-container', // Don't know why but without this theres a gap at the bottom
    mode: Phaser.Scale.FIT, // Fit to screen, retain ratio
    autoCenter: Phaser.Scale.CENTER_BOTH, // center both vert and horiz
    width: 600,
    height: 600
  },
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
  PUSHING: 'pushing',
  PUSHED: 'pushed'
};

const DIRECTION = {
  LEFT: 'left',
  RIGHT: 'right'
}

let player;
let player2;
let cursors;
let keys;
let text;
let selectedEntity;
let graphics;
let gridMap;
let paused = false;
const offset = globals.OFFSET;
const tileSize = globals.TILE_SIZE;

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
  this.load.spritesheet('homeless_guy', 'assets/homeless_right.png',
    { frameWidth: 50, frameHeight: 50});
}

function disableEntities() {
  globals.entities.forEach((entity) => {
    entity.disableInteractive();
  });
}

function enableEntities() {
  globals.entities.forEach((entity) => {
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
    direction = DIRECTION.RIGHT,
    state = STATE.IDLE,
    actionsDeque = new Deque()
  } = {}
) {
  obj.setDataEnabled();
  obj.data
    .set('x', x)
    .set('y', y)
    .set('moveSpeed', moveSpeed) // seconds per block
    .set('direction', direction)
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

function moveAction(x, y) {
  return {
    state: STATE.MOVE,
    elapsed: 0.0,
    done: selectedEntity.getData('moveSpeed'),
    x,
    y,
    direction: x != 0 ? (x == -1 ? DIRECTION.LEFT : DIRECTION.RIGHT) : null
  };
}

function pushAction(entity, action) {
  entity.getData('actionsDeque').push(action);
}

function makeGrid(
  _this,
  width = 10,
  height = 10,
  offset = 1000,
  tileSize = 50
) {
  const grid = new Array(width);
  for (let i = 0; i < width; i++) {
    grid[i] = new Array(height);
    for (let j = 0; j < height; j++) {
      const tile = _this.add
        .sprite(offset + i * tileSize, offset + j * tileSize, 'grass')
        .setInteractive();
      /*
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
          tile.clearTint();
        })
        .on('pointerout', () => {
          tile.clearTint();
        })
        .on('mouseOver', () => {
          tile.setTint(0x00ff00);
        });
        */

      grid[i][j] = tile;
    }
  }
  return grid;
}

function disableGrid(grid) {
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      grid[i][j].disableInteractive();
    }
  }
}

function enableGrid(grid) {
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      grid[i][j].setInteractive();
    }
  }
}

function create() {
  // stop the right click menu from popping up
  this.input.mouse.disableContextMenu();

  //  If you disable topOnly it will fire events for all objects the pointer is over
  //  regardless of their place on the display list
  this.input.setTopOnly(true);

  /*
    Handle Input
  */
  this.input.keyboard
    .on('keydown-P', (event) => {
      // pause or unpause
      paused = !paused;
      if (paused) {
        this.cameras.main.setAlpha(0.8);
        disableGrid(gridMap);
        disableEntities();
      } else {
        this.cameras.main.setAlpha(1);
        enableGrid(gridMap);
        enableEntities();
      }
    })
    .on('keydown-SPACE', (event) => {
      // center on selected entity
      if (selectedEntity) {
        this.cameras.main.centerOn(selectedEntity.x, selectedEntity.y);
      }
    });

  // WASD input
  this.input.keyboard
    .on('keydown-W', (event) => {
      pushAction(selectedEntity, moveAction(0, -1)); // up is negative
    })
    .on('keydown-S', (event) => {
      pushAction(selectedEntity, moveAction(0, 1)); // down
    })
    .on('keydown-A', (event) => {
      pushAction(selectedEntity, moveAction(-1, 0)); // left
    })
    .on('keydown-D', (event) => {
      pushAction(selectedEntity, moveAction(1, 0)); // right
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

  gridMap = makeGrid(this, 5, 10, globals.OFFSET, globals.TILE_SIZE);

  this.anims.create({
    key: 'idle',
    frames: this.anims.generateFrameNumbers('homeless_guy', { start: 0, end: 3 }),
    frameRate: 6,
    repeat: -1 // Tells the animation to repeat, -1
  })

  this.anims.create({
    key: 'walk_right',
    frames: this.anims.generateFrameNumbers('homeless_guy', { start: 4, end: 7 }),
    frameRate: 6,
    repeat: -1 // Tells the animation to repeat, -1
  })

  player = this.add.sprite(1920, 1080, 'homeless_guy');
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
    globals.drawFuncs.add(mouseOverPlayer);
  });
  player.on('mouseOut', (pointer) => {
    globals.drawFuncs.delete(mouseOverPlayer);
  });
  player2 = this.add.sprite(0, 0, 'homeless_guy');
  player2.setInteractive();
  setEntityData(player2, { x: 5, y: 5 });
  player2.on('mouseDown', (pointer) => {
    if (pointer.leftButtonDown()) {
      selectEntity(player2);
    }
  });

  globals.entities.add(player);
  globals.entities.add(player2);

  globals.selectableEntities.push(player);
  globals.selectableEntities.push(player2);

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

// Handle the camera scrolling
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

  // misc. variables
  const width = camera.width;
  const height = camera.height;
  const mouseX = this.input.x;
  const mouseY = this.input.y;
  const mouseWorldX = this.input.mousePointer.worldX;
  const mouseWorldY = this.input.mousePointer.worldY;
  const gridPosX = Math.floor((mouseWorldX - tileSize / 2.0) / tileSize)
    - (offset - tileSize / 2.0) / tileSize;
  const gridPosY = Math.floor((mouseWorldY - tileSize / 2.0) / tileSize)
    - (offset - tileSize / 2.0) / tileSize;

  const gridX = gridPosX + 0.5;
  const gridY = gridPosY + 0.5;

  const x = mouseX - width / 2;
  const y = mouseY - height / 2;
  const rad = Math.atan2(y, x);
  const golden = 1.618;

  // Exponential increase in camera scroll speed
  const distX = Math.min(Math.abs(x), width / 2) ** golden;
  const distY = Math.min(Math.abs(y), height / 2) ** golden;
  const ratioX = distX / Math.pow(width / 2, golden);
  const ratioY = distY / Math.pow(height / 2, golden);

  if (!paused) {
    handleScrolling(this, camera, dt);

    graphics.clear();

    // draw selection circle
    graphics.lineStyle(2, 0xffffff, 0.7); // width, color, alpha
    graphics.strokeRect(
      grid2world(selectedEntity.getData('x')) - selectedEntity.width / 2.0,
      grid2world(selectedEntity.getData('y')) - selectedEntity.height / 2.0,
      selectedEntity.width,
      selectedEntity.height
    );

    graphics.strokeRect(
      tileSize * gridPosX + offset,
      tileSize * gridPosY + offset,
      tileSize,
      tileSize
    );

    // call all UI draw function
    globals.drawFuncs.forEach((func) => {
      func();
    });

    // handle all Entities
    globals.entities.forEach((entity) => {
      const deque = entity.getData('actionsDeque');   

      if (deque.length > 0) {
        let movePosX = grid2world(entity.getData('x'));
        let movePosY = grid2world(entity.getData('y'));
        deque.forEach((action) => {
          if (action.state === STATE.MOVE) {
            const line = new Phaser.Geom.Line(
              movePosX,
              movePosY,
              movePosX + action.x * tileSize,
              movePosY + action.y * tileSize
            );

            const triangle = new Phaser.Geom.Triangle.BuildEquilateral(
              0,
              0,
              tileSize / 4.0
            );

            if (action.x > 0) {
              Phaser.Geom.Triangle.Rotate(triangle, Math.PI / 2);
            } else if (action.x < 0) {
              Phaser.Geom.Triangle.Rotate(triangle, -Math.PI / 2);
            }

            if (action.y > 0) {
              Phaser.Geom.Triangle.Rotate(triangle, Math.PI);
            }
            Phaser.Geom.Triangle.CenterOn(
              triangle,
              movePosX + (action.x * tileSize) / 2.0,
              movePosY + (action.y * tileSize) / 2.0
            );

            graphics.lineStyle(2, 0xffffff, 0.7); // width, color, alpha
            graphics.strokeTriangleShape(triangle);

            graphics.lineStyle(3, 0xffffff, 0.5); // width, color, alpha
            graphics.strokeLineShape(line);
            movePosX += action.x * tileSize;
            movePosY += action.y * tileSize;
          }
        });
        const action = deque.peek();
        const values = entity.data.values;
        
        let direction = action.direction;

        // time elapsed
        if (action.elapsed > action.done) {
          if (action.state === STATE.MOVE) {
            entity.data.set('state', STATE.MOVE);
            values.x += action.x;
            values.y += action.y;
            entity.anims.play('walk_right', true)

            if (direction != null && direction != values.direction) {
              entity.flipX = !entity.flipX; 
              values.direction = direction
            }
            
          } else if (action.state === STATE.PUSHED) {
            entity.data.set('state', STATE.PUSHED);
          }
          const extraTime = action.elapsed - action.done;

          deque.shift();
          if (deque.length > 0) {
            // transfer time to next action
            const nextAction = deque.peek();
            nextAction.elapsed += extraTime;
          }
        } else {
          // action not done
          action.elapsed += dt;
        }
      } else {
        entity.data.set('state', STATE.IDLE);
        entity.anims.play('idle', true);
      }
    });

    /*   for (let i = 0; i < rects.length; i++) {
    graphics.strokeRectShape(rects[i]);
    graphics.fillRectShape(rects[i]);
  } */

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
      `grid x, y: ${gridX} ${gridY}`,
      `rad: ${rad}`,
      `ratioX, ratioY: ${ratioX}, ${ratioY}`,
      `selectedEntity, x, y, deque: 
      ${selectedEntity.getData('x')}
      ${selectedEntity.getData('y')}
      ${JSON.stringify(selectedEntity.getData('actionsDeque'))}`
    ]);
  } else {
    // paused, do something
  }
}
