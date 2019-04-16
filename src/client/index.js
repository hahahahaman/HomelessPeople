import './index.css';
import Phaser from 'phaser';

// Data structures from: http://www.collectionsjs.com/
import Deque from 'collections/deque';
import List from 'collections/list';

import * as globals from './globals';

let world = [
  [ 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w' ],
  [ 'w', '1', 'a', 'a', 'a', 'a', 'a', 'w' ],
  [ 'w', 'a', 'a', 'a', 'a', 'w', 'a', 'w' ],
  [ 'w', 'a', 'a', 'a', 'a', 'w', 'a', 'w' ],
  [ 'w', 'a', 'a', 'a', 'a', 'w', 'a', 'w' ],
  [ 'w', 'a', 'a', 'w', 'a', 'a', 'a', 'w' ],
  [ 'w', 'a', 'a', 'a', 'a', 'a', 'a', 'w' ],
  [ 'w', 'a', 'a', 'a', 'a', 'a', 'a', 'w' ],
  [ 'w', 'a', 'a', 'a', 'w', 'a', 'a', 'w' ],
  [ 'w', 'a', 'a', 'a', 'a', 'a', 'a', 'w' ],
  [ 'w', 'a', 'a', 'a', 'a', 'a', '2', 'w' ],
  [ 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w' ],
];

let bg_world = [
  [ '15', '15', '15', '15', '15', '15', '15', '15' ],
  [ '15', '59', '04', '06', '02', '02', '60', '15' ],
  [ '15', '14', '51', '51', '51', '51', '48', '15' ],
  [ '15', '14', '51', '51', '51', '51', '49', '15' ],
  [ '15', '14', '51', '51', '51', '51', '50', '15' ],
  [ '15', '14', '51', '51', '51', '51', '49', '15' ],
  [ '15', '14', '51', '51', '51', '51', '48', '15' ],
  [ '15', '14', '51', '51', '51', '51', '47', '15' ],
  [ '15', '14', '51', '51', '51', '51', '48', '15' ],
  [ '15', '14', '51', '51', '51', '51', '49', '15' ],
  [ '15', '61', '54', '55', '54', '53', '46', '15' ],
  [ '15', '15', '15', '15', '15', '15', '15', '15' ],
];

let obj_world = []
for (let h = 0; h < world.length; ++h) {
  obj_world.push([])
  for (let w = 0; w < world[h].length; ++w) {
    obj_world[h].push(new List())
  }
}



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
};

let player;
let player2;
let cursors;
let keys;
let debugText;
let clockText;
let levelTime = 0.0;
let pausedText;
let selectedEntity;
let graphics;
let gridMap;
let paused = false;
const offset = globals.OFFSET;
const tileSize = globals.TILE_SIZE;
let worldHeight;
let worldWidth;
let phaser;

let rocks = [];



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
  this.load.spritesheet('homeless_guy', 'assets/homeless_right.png', {
    frameWidth: 50,
    frameHeight: 50
  });

  for (let i = 1; i <= 64; ++i) {
    this.load.image('bg_'+("0" + i).slice(-2), 'assets/bg_tiles/generic-rpg-tile' + ("0" + i).slice(-2) +'.png')
  }
  for (let i = 1; i < 4; ++i) {
    this.load.image('rock_'+i, 'assets/rock' + i + '.png'); 
  }

  phaser = this;
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

function setEntityRock(
  obj,
  {
    name = 'obj_rock',
    x = 0,
    y = 0
  } = {}
) {
  obj.setDataEnabled();
  obj.data
    .set('name', name)
  obj.x = grid2world(x);
  obj.y = grid2world(y);
}

function setEntityData(
  obj,
  {
    name = 'obj_player',
    x = 0,
    y = 0,
    end_x = 0,
    end_y = 0,
    moveSpeed = 0.5,
    direction = DIRECTION.RIGHT,
    color = 0xfffff,
    state = STATE.IDLE,
    actionsDeque = new Deque(),
    text = phaser.add.text(0, 0, '', { font: '16px Courier', fill: '#ffffff' }),
    doneText = phaser.add.text(0, 0, '', {
      font: '16px Courier',
      fill: '#ffffff'
    })
  } = {}
) {
  obj.setDataEnabled();
  obj.data
    .set('name', name)
    .set('x', x)
    .set('y', y)
    .set('end_x', end_x)
    .set('end_y', end_y)
    .set('moveSpeed', moveSpeed) // seconds per block
    .set('direction', direction)
    .set('color')
    .set('state', state)
    .set('actionsDeque', actionsDeque)
    .set('text', text)
    .set('doneText', doneText);
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

function moveAction(entity, x, y) {
  let direction = null;
  let invalid = false;

  if (x < 0) {
    direction = DIRECTION.LEFT;
  } else if (x > 0) {
    direction = DIRECTION.RIGHT;
  }

  if (
    entity.data.values.end_x + x >= worldWidth
    || entity.data.values.end_x + x < 0
    || entity.data.values.end_y + y >= worldHeight
    || entity.data.values.end_y + y < 0
  ) return null;

  obj_world[entity.data.values.end_y + y][entity.data.values.end_x + x].forEach((obj) => {
    if (obj.data.values.name === 'obj_rock' ||
        obj.data.values.name === 'obj_player') {
      invalid = true;
    }
  })

  if (invalid) return null;

  entity.data.values.end_x += x;
  entity.data.values.end_y += y;

  return {
    state: STATE.MOVE,
    elapsed: 0.0,
    done: selectedEntity.getData('moveSpeed'),
    x,
    y,
    direction
  };
}

function pushAction(entity, action) {
  if (action) entity.getData('actionsDeque').push(action);
}

function drawEntityActions(entity) {
  // draw all kinds of indicators for actions
  // timer for the current actions
  // movement indicators
  // push indicators
  // warning indicators?
  let movePosX = entity.x;
  let movePosY = entity.y;

  const values = entity.data.values;
  const deque = values.actionsDeque;

  deque.forEach((action) => {
    if (action.state === STATE.MOVE) {
      // Draw all the move stuff
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

      graphics.lineStyle(2, values.color, 0.7); // width, color, alpha
      graphics.strokeTriangleShape(triangle);

      graphics.lineStyle(3, values.color, 0.5); // width, color, alpha
      graphics.strokeLineShape(line);
      movePosX += action.x * tileSize;
      movePosY += action.y * tileSize;
    }
  });

  if (deque.length > 0) {
    // draw current action indicators
    let totalTime = 0.0;

    deque.forEach((action) => {
      totalTime += action.done;
    });

    const action = deque.peek();
    const w = entity.width / 10.0;
    const h = entity.height * (1.0 - action.elapsed / action.done);

    // bar indicator for current action
    graphics.fillStyle(values.color, 0.8);
    graphics.fillRect(
      entity.x - entity.width / 2.0,
      entity.y - entity.height / 2.0,
      w,
      h
    );

    // elapsed time text
    totalTime -= action.elapsed;
    const elapsedText = values.text;
    elapsedText.setVisible(true);
    elapsedText.setText(`${totalTime.toFixed(1)}`);
    elapsedText.setPosition(
      entity.x + entity.width / 2.0,
      entity.y - entity.height / 2.0
    );

    // done time indicator
    const doneText = values.doneText;
    doneText.setVisible(true);
    doneText.setText(`${(levelTime + totalTime).toFixed(1)}`);
    doneText.setPosition(movePosX, movePosY);
  } else {
    // disable text indicator
    values.text.setVisible(false);
    values.doneText.setVisible(false);
  }
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
        .sprite(offset + i * tileSize, offset + j * tileSize, 'bg_' + bg_world[j][i])
        .setOrigin(0.5)
        .setScale(3.4)
        .setInteractive();

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
      pausedText.setVisible(paused);
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
      pushAction(selectedEntity, moveAction(selectedEntity, 0, -1)); // up is negative
    })
    .on('keydown-S', (event) => {
      pushAction(selectedEntity, moveAction(selectedEntity, 0, 1)); // down
    })
    .on('keydown-A', (event) => {
      pushAction(selectedEntity, moveAction(selectedEntity, -1, 0)); // left
    })
    .on('keydown-D', (event) => {
      pushAction(selectedEntity, moveAction(selectedEntity, 1, 0)); // right
    })
    // remove actions from actions deque
    /*
    .on('keydown-Z', (event) => {
      selectedEntity.getData('actionsDeque').shift(); // remove from front
    })
    */
    .on('keydown-X', (event) => {
      const last_action = selectedEntity.getData('actionsDeque').pop(); // remove from back
      selectedEntity.data.values.end_x -= last_action.x;
      selectedEntity.data.values.end_y -= last_action.y;
    })
    .on('keydown-C', (event) => {
      // clear actions
      selectedEntity.data.values.end_x = selectedEntity.data.values.x;
      selectedEntity.data.values.end_y = selectedEntity.data.values.y;
      selectedEntity.getData('actionsDeque').clear();
    })
    .on('keydown-ONE', () => {
      if (selectedEntity === globals.selectableEntities[0]) {
        phaser.cameras.main.centerOn(selectedEntity.x, selectedEntity.y);
      } else {
        selectedEntity = globals.selectableEntities[0];
      }
      console.log(1);
    })
    .on('keydown-TWO', () => {
      if (selectedEntity === globals.selectableEntities[1]) {
        phaser.cameras.main.centerOn(selectedEntity.x, selectedEntity.y);
      } else {
        selectedEntity = globals.selectableEntities[1];
      }
      console.log(2);
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

  // Make grid based on world size.
  worldHeight = world.length;
  worldWidth = world[0].length;
  gridMap = makeGrid(
    this,
    worldWidth,
    worldHeight,
    globals.OFFSET,
    globals.TILE_SIZE
  );

  //--------------------------------------------
  // Players
  //--------------------------------------------

  this.anims.create({
    key: 'idle',
    frames: this.anims.generateFrameNumbers('homeless_guy', {
      start: 0,
      end: 3
    }),
    frameRate: 6,
    repeat: -1 // Tells the animation to repeat, -1
  });

  this.anims.create({
    key: 'walk_right',
    frames: this.anims.generateFrameNumbers('homeless_guy', {
      start: 4,
      end: 7
    }),
    frameRate: 6,
    repeat: -1 // Tells the animation to repeat, -1
  });

  player = this.add.sprite(0, 0, 'homeless_guy');
  player2 = this.add.sprite(0, 0, 'homeless_guy');

  // initialize entities
  globals.entities.add(player);
  globals.entities.add(player2);

  globals.entities.forEach((entity) => {
    setEntityData(entity); // initialize data values
    entity.setInteractive();
  });

  player.data.set('color', 0xff0000);
  player2.data.set('color', 0x0000ff);

  // initialize all selectable entities
  globals.selectableEntities.push(player, player2);
  globals.selectableEntities.forEach((entity) => {
    function drawClicked() {
      graphics.lineStyle(2, entity.getData('color'), 0.5);
      graphics.strokeCircle(entity.x, entity.y, tileSize / 2);
    }
    entity
      .on('mouseDown', (pointer) => {
        if (pointer.leftButtonDown()) {
          selectedEntity = entity;
          globals.drawFuncs.add(drawClicked);
        }
      })
      .on('mouseUp', (pointer) => {
        globals.drawFuncs.delete(drawClicked);
      })
      .on('mouseOver', (pointer) => {})
      .on('mouseOut', (pointer) => {
        globals.drawFuncs.delete(drawClicked);
      });
  });

  // Position Players based on world data. 
  // + Parse world data into entities.
  for (let y = 0; y < world.length; ++y) {
    for (let x = 0; x < world[y].length; ++x) {
      if (world[y][x] === '1') {
        player.data.values.x = x;
        player.data.values.y = y;
        player.data.values.end_x = x;
        player.data.values.end_y = y;
        obj_world[y][x].push(player);
      }
      if (world[y][x] === '2') {
        player2.data.values.x = x;
        player2.data.values.y = y;
        player2.data.values.end_x = x;
        player2.data.values.end_y = y;
        obj_world[y][x].push(player2);
      }
      if (world[y][x] === 'w') {
        console.log("hit world") 
        const rock = this.add.sprite(0, 0, 'rock_' + Phaser.Math.Between(1, 3)).setScale(1.5);
        setEntityRock(rock, { x : x, y : y }); 
        obj_world[y][x].push(rock);
      }
    }
  }
  console.log(obj_world)

  selectedEntity = player;

  this.cameras.main.centerOn(1000, 1000);

  /*   this.cameras.main.startFollow(player, true, 0.4, 0.4); */

  graphics = this.add.graphics({
    lineStyle: { width: 3, color: 0xffffff, alpha: 0.8 }
    /*     fillStyle: { color: 0x00ff00, alpha: 0.8 } */
  });

  // Text UI
  pausedText = phaser.add
    .text(0, 0, 'PAUSE\n  P', { font: '40px Courier', fill: '#ffffff' })
    .setScrollFactor(0);
  pausedText.setPosition(
    phaser.cameras.main.width / 2.0 - pausedText.displayWidth / 2.0,
    phaser.cameras.main.height / 2.0 - pausedText.displayHeight / 2.0
  );
  pausedText.setVisible(false);

  clockText = phaser.add
    .text(0, 0, `Time: ${levelTime.toFixed(2)}`, {
      font: '20px Courier',
      fill: '#ffffff'
    })
    .setScrollFactor(0);

  debugText = phaser.add
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
    levelTime += dt;

    handleScrolling(this, camera, dt);

    graphics.clear();

    // draw selection rect
    graphics.lineStyle(2, 0xe5e4e2, 1.0); // width, color, alpha
    graphics.strokeRect(
      grid2world(selectedEntity.getData('x')) - selectedEntity.width / 2.0,
      grid2world(selectedEntity.getData('y')) - selectedEntity.height / 2.0,
      selectedEntity.width,
      selectedEntity.height
    );

    // mouse over rect
    graphics.lineStyle(2, 0xffffff, 1.0); // width, color, alpha
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
      // draw indicators for actions
      drawEntityActions(entity);

      const values = entity.data.values;
      const deque = values.actionsDeque;

      if (deque.length > 0) {
        const action = deque.peek();

        const direction = action.direction;

        // time elapsed
        if (action.elapsed > action.done) {
          if (action.state === STATE.MOVE) {
            values.state = STATE.MOVE;
            
            let stall_action = false;

            obj_world[values.y + action.y][values.x + action.x].forEach((obj) => {
              if (obj != entity && obj.data.values.name == 'obj_player') {
                stall_action = true;
              }
            })

            if (stall_action) {
              return;
            }

            obj_world[values.y][values.x].delete(entity);

            values.x += action.x;
            values.y += action.y;

            obj_world[values.y][values.x].push(entity);

            entity.anims.play('walk_right', true);

            if (direction !== null && direction !== values.direction) {
              entity.flipX = !entity.flipX;
              values.direction = direction;
            }
          } else if (action.state === STATE.PUSHED) {
            values.state = STATE.PUSHED;
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
        values.state = STATE.IDLE;
        entity.anims.play('idle', true);
      }
    });

    // set debug text
    debugText.setText([
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
      `
      // ${JSON.stringify(selectedEntity.getData('actionsDeque'))}
    ]);
    clockText.setText(`Time: ${levelTime.toFixed(1)}`);
    clockText.setPosition(
      phaser.cameras.main.width - clockText.displayWidth,
      0
    );
  } else {
    // paused, do something
  }
}
