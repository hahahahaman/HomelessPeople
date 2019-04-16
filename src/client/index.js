import './index.css';
import Phaser from 'phaser';

// Data structures from: http://www.collectionsjs.com/
import Deque from 'collections/deque';
import Set from 'collections/set';

import * as globals from './globals';

const worldArray = [
  ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
  ['w', '1', 'a', 'a', 'a', 'a', 'a', 'w'],
  ['w', 'a', 'a', 'a', 'a', 'w', 'a', 'w'],
  ['w', 'a', 's', 'a', 'a', 'w', 'a', 'w'],
  ['w', 'a', 'a', 'a', 'a', 'w', 'a', 'w'],
  ['w', 'a', 's', 'w', 'a', 'a', 'a', 'w'],
  ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
  ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
  ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
  ['w', 'a', 'a', 'c', 'a', 'a', 'a', 'w'],
  ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
  ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
  ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
  ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
  ['w', 'a', 'a', 'a', 'a', 'a', '2', 'w'],
  ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w']
];

/*
const bgWorldArray = [
  ['15', '15', '15', '15', '15', '15', '15', '15'],
  ['15', '59', '04', '06', '02', '02', '60', '15'],
  ['15', '14', '51', '51', '51', '51', '48', '15'],
  ['15', '14', '51', '51', '51', '51', '49', '15'],
  ['15', '14', '51', '51', '51', '51', '50', '15'],
  ['15', '14', '51', '51', '51', '51', '49', '15'],
  ['15', '14', '51', '51', '51', '51', '48', '15'],
  ['15', '14', '51', '51', '51', '51', '47', '15'],
  ['15', '14', '51', '51', '51', '51', '48', '15'],
  ['15', '14', '51', '51', '51', '51', '49', '15'],
  ['15', '61', '54', '55', '54', '53', '46', '15'],
  ['15', '15', '15', '15', '15', '15', '15', '15']
];
*/

const bgWorldArray = [
  ['8', '10', '10', '10', '10', '10', '10', '9'],
  ['11', '14', '14', '14', '14', '14', '14', '48'],
  ['11', '14', '51', '51', '51', '51', '14', '48'],
  ['11', '14', '51', '51', '51', '51', '14', '48'],
  ['11', '14', '51', '51', '51', '51', '14', '48'],
  ['11', '14', '51', '51', '51', '51', '14', '48'],
  ['11', '14', '51', '51', '51', '51', '14', '48'],
  ['11', '14', '51', '51', '51', '51', '14', '48'],
  ['11', '14', '51', '51', '51', '51', '14', '48'],
  ['11', '14', '51', '51', '51', '51', '14', '48'],
  ['11', '14', '14', '14', '14', '14', '14', '48'],
  ['11', '14', '14', '14', '14', '14', '14', '48'],
  ['11', '14', '14', '14', '14', '14', '14', '48'],
  ['11', '14', '14', '14', '14', '14', '14', '48'],
  ['11', '14', '14', '14', '14', '14', '14', '48'],
  ['45', '47', '47', '47', '47', '47', '47', '46']
];

// store actual world
let gridWorld;
const objWorld = [];
for (let h = 0; h < worldArray.length; ++h) {
  objWorld.push([]);
  for (let w = 0; w < worldArray[h].length; ++w) {
    objWorld[h].push(new Set()); // list has O(n) deletion, set has O(1) deletion
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
  PUSHED: 'pushed',
  SPIKE_PREP: 'spike_prep',
  SPIKE_UP: 'spike_up',
  SPIKE_DOWN: 'spike_down',
  EXPLODE: 'explode'
};

const DIRECTION = {
  LEFT: 'left',
  RIGHT: 'right'
};

const TYPE = {
  ROCK: 'obj_rock',
  PLAYER: 'obj_player',
  SPIKE: 'obj_spike',
  TRASH: 'obj_trash',
  COIN: 'obj_coin'
};

let player;
let player2;
let dummy;
let cursors;
let keys;
// let debugText;
let clockText;
let levelTime = 0.0;
let pausedText;
let selectedEntity;
let graphics;
let paused = false;
let eKeyObj;
const offset = globals.OFFSET;
const tileSize = globals.TILE_SIZE;
let worldHeight;
let worldWidth;
let phaser;

function preload() {
  this.load.setBaseURL('../..');
  this.load.image('bg', 'assets/wallpaper.jpg');
  this.load.image('grass', 'assets/grass.jpg');
  this.load.spritesheet('homeless_guy', 'assets/homeless_right.png', {
    frameWidth: 50,
    frameHeight: 50
  });
  this.load.spritesheet('explosion', 'assets/explosion-4.png', {
    frameWidth: 128,
    frameHeight: 128
  });

  this.load.spritesheet('coin', 'assets/coins.png', {
    frameWidth: 16,
    frameHeight: 16
  });

  // 37 columns
  // 28 rows
  this.load.spritesheet('city', 'assets/roguelikeCity.png', {
    frameWidth: 16,
    frameHeight: 16,
    spacing: 1
  });

  for (let i = 1; i <= 64; ++i) {
    this.load.image(
      `bg_${`0${i}`.slice(-2)}`,
      `assets/bg_tiles/generic-rpg-tile${`0${i}`.slice(-2)}.png`
    );
  }
  for (let i = 1; i < 4; ++i) {
    this.load.image(`rock_${i}`, `assets/rock${i}.png`);
  }

  for (let i = 1; i < 5; ++i) {
    this.load.image(`spike_${i}`, `assets/spike${i}.png`);
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

function disableEntity(entity) {
  predisableEntity(entity);
  if (globals.entities.has(entity)) {
    globals.entities.delete(entity);
  }

  entity.visible = false;

  /* also need to do key presses check,
   cause those cause game to crash with both players are dead
   */
}

function predisableEntity(entity) {
  const values = entity.data.values;
  if (objWorld[values.y][values.x].has(entity)) {
    objWorld[values.y][values.x].delete(entity);
  }
  // do a check for selectableenities...
  entity.disableInteractive();

  selectedEntity = null;
  for (let i = 0; i < globals.selectableEntities.length; ++i) {
    if (entity === globals.selectableEntities[i]) {
      globals.selectableEntities[i] = null;
    } else if (selectedEntity === null) {
      selectedEntity = globals.selectableEntities[i];
    }
  }

  values.timeLeftText.setVisible(false);
  values.doneText.setVisible(false);
}

function grid2world(val) {
  return offset + val * tileSize;
}

function setEntity(
  entity,
  {
    type = TYPE.PLAYER,
    x = 0,
    y = 0,
    end_x = 0,
    end_y = 0,
    moveSpeed = 0.5,
    direction = DIRECTION.RIGHT,
    color = 0xfffff,
    state = STATE.IDLE,
    depth = 0,
    actionsDeque = new Deque(),
    idle = () => {},
    timeLeftText = phaser.add.text(0, 0, '', {
      font: '16px Courier',
      fill: '#ffffff'
    }),
    doneText = phaser.add.text(0, 0, '', {
      font: '16px Courier',
      fill: '#ffffff'
    })
  } = {}
) {
  entity.setDataEnabled();
  entity.setInteractive();
  entity.data
    .set('type', type)
    .set('x', x)
    .set('y', y)
    .set('end_x', end_x)
    .set('end_y', end_y)
    .set('moveSpeed', moveSpeed) // seconds per block
    .set('direction', direction)
    .set('color', color)
    .set('state', state)
    .set('depth', depth)
    .set('actionsDeque', actionsDeque)
    .set('idle', idle)
    .set('timeLeftText', timeLeftText)
    .set('doneText', doneText);

  if (timeLeftText) timeLeftText.depth = 1;
  if (doneText) doneText.depth = 1;
  entity.x = grid2world(x);
  entity.y = grid2world(y);
  entity.setDepth(depth);
  entity.on('changedata', (gameObject, key, value) => {
    if (key === 'x') {
      entity.x = grid2world(value);
    } else if (key === 'y') {
      entity.y = grid2world(value);
    } else if (key === 'depth') {
      entity.setDepth(value);
    } else if (key === 'idle') {
      entity.data.values.idle = idle;
    }
  });
}

function setEntityRock(entity, { type = TYPE.ROCK, x = 0, y = 0 } = {}) {
  setEntity(entity, {
    type,
    x,
    y,
    actionsDeque: null,
    timeLeftText: null,
    doneText: null
  });
}

function setEntitySpike(
  entity,
  {
    type = TYPE.SPIKE, x = 0, y = 0, idle = () => {}
  } = {}
) {
  setEntity(entity, {
    type,
    x,
    y,
    timeLeftText: null,
    doneText: null,
    state: STATE.IDLE,
    idle
  });
}

function makeSpikePrepAction(entity) {
  const values = entity.data.values;
  values.actionsDeque.push({
    state: STATE.SPIKE_PREP,
    elapsed: 0.0,
    done: 0.333
  });
}

function makeSpikeUpAction(entity) {
  const values = entity.data.values;
  values.actionsDeque.push({
    state: STATE.SPIKE_UP,
    elapsed: 0.0,
    done: 0.5
  });
}

function makeSpikeIdleAction(entity) {
  const values = entity.data.values;
  values.actionsDeque.push({
    state: STATE.IDLE,
    elapsed: 0.0,
    done: 1.5
  });
}

function makeSpikeDownAction(entity) {
  const values = entity.data.values;
  values.actionsDeque.push({
    state: STATE.SPIKE_DOWN,
    elapsed: 0.0,
    done: 0.5
  });
}

function makeExplodeAction(entity) {
  const values = entity.data.values;
  values.state = STATE.EXPLODE;
  values.actionsDeque.clear();
  values.actionsDeque.push({
    state: STATE.EXPLODE,
    elapsed: 0.0,
    done: 1
  });
}

function makeMoveAction(entity, x, y) {
  let direction = null;
  let invalid = false;

  // check direction
  if (x < 0) {
    direction = DIRECTION.LEFT;
  } else if (x > 0) {
    direction = DIRECTION.RIGHT;
  }

  const values = entity.data.values;
  const end_x = values.end_x;
  const end_y = values.end_y;

  // check if out of bounds of world
  if (!isPosInWorld(end_x + x, end_y + y)) return;

  objWorld[end_y + y][end_x + x].forEach((obj) => {
    if (obj.data.values.type === TYPE.ROCK) {
      invalid = true;
    }
  });

  if (invalid) return;

  values.actionsDeque.push({
    state: STATE.MOVE,
    elapsed: 0.0,
    done: values.moveSpeed,
    x,
    y,
    direction
  });
}

function isPosInWorld(worldX, worldY) {
  if (worldX >= worldWidth || worldX < 0 || worldY >= worldHeight || worldY < 0) return false;

  return true;
}

function isValidMovePos(worldX, worldY) {
  if (!isPosInWorld(worldX, worldY)) return false;

  let valid = true;
  objWorld[worldY][worldX].forEach((obj) => {
    if (
      obj.data.values.type === TYPE.ROCK
      || obj.data.values.type === TYPE.PLAYER
      || obj.data.values.type === TYPE.TRASH
    ) {
      valid = false;
    }
  });
  return valid;
}

function isPushablePos(worldX, worldY) {
  // check if position is pushable

  // out of bounds check
  if (!isPosInWorld(worldX, worldY)) {
    return false;
  }

  // position type check
  let pushable = true;
  objWorld[worldY][worldX].forEach((obj) => {
    if (obj.data.values.type === TYPE.ROCK) {
      pushable = false;
    }
  });
  return pushable;
}

function makePushingAction(entity, x, y) {
  // player has to wait for pushing action to complete
  const values = entity.data.values;
  values.actionsDeque.push({
    state: STATE.PUSHING,
    elapsed: 0.0,
    done: 1.5,
    x,
    y
  });
}

function makePushedAction(entity, moveX, moveY, done = 0.2) {
  // any entity has to take some time to get pushed

  const values = entity.data.values;

  // add to front
  values.actionsDeque.unshift({
    state: STATE.PUSHED,
    elapsed: 0.0,
    done,
    x: moveX, // relative movement
    y: moveY
  });
}

function entityMoveTo(entity, worldX, worldY) {
  const values = entity.data.values;
  objWorld[values.y][values.x].delete(entity);

  values.x = worldX;
  values.y = worldY;

  objWorld[values.y][values.x].add(entity);
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

  let totalTime = 0.0;
  deque.forEach((action) => {
    totalTime += action.done;
    const nextX = movePosX + action.x * tileSize;
    const nextY = movePosY + action.y * tileSize;
    if (action.state === STATE.MOVE) {
      // Draw all the move stuff
      const line = new Phaser.Geom.Line(movePosX, movePosY, nextX, nextY);

      const triangle = new Phaser.Geom.Triangle.BuildEquilateral(
        0,
        0,
        tileSize / 4.0
      );

      // rotate triangle
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
      movePosX = nextX;
      movePosY = nextY;
    } else if (action.state === STATE.PUSHING) {
      const radius = tileSize / 8;
      const line = new Phaser.Geom.Line(movePosX, movePosY, nextX, nextY);
      graphics.lineStyle(2, values.color, 0.9);
      graphics.strokeCircle(nextX, nextY, radius);

      graphics.lineStyle(4, values.color, 0.9); // width, color, alpha
      graphics.strokeLineShape(line);
    } else if (action.state === STATE.PUSHED) {
      // triangle with a cirlce in it?
      // TODO
    }
  });

  if (deque.length > 0) {
    // draw current action indicators
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
    const timeLeftText = values.timeLeftText;
    timeLeftText.setVisible(true);
    timeLeftText.setText(`${totalTime.toFixed(1)}`);
    timeLeftText.setPosition(
      entity.x + entity.width / 2.0,
      entity.y - entity.height / 2.0
    );

    // done time indicator
    const doneText = values.doneText;
    doneText.setVisible(true);
    doneText.setText(`${(levelTime + totalTime).toFixed(1)}`);
    doneText.setPosition(movePosX, movePosY);

    // end position indicator
    const end_x = values.end_x;
    const end_y = values.end_y;
    const endX = grid2world(end_x);
    const endY = grid2world(end_y);

    graphics.lineStyle(2, values.color, 0.7);
    graphics.strokeRect(
      endX - tileSize / 2,
      endY - tileSize / 2,
      tileSize,
      tileSize
    );
  } else {
    // no actions
    // disable text indicator
    values.timeLeftText.setVisible(false);
    values.doneText.setVisible(false);
  }
}

/*
function checkSpriteSpriteOverlap(spriteA, spriteB) {
  const boundsA = spriteA.getBounds();
  const boundsB = spriteB.getBounds();

  return Phaser.Geom.Intersects.RectangleToRectangle(boundsA, boundsB);
}

function checkRectSpriteOverlap(rect, sprite) {
  const bounds = sprite.getBounds();

  return Phaser.Geom.Intersects.RectangleToRectangle(rect, bounds);
}
*/

function isPointRectOverlap(x, y, rX, rY, rW, rH) {
  if (x < rX || x > rX + rW || y < rY || y > rY + rH) return false;

  return true;
}

// World

function makeGridWorld(
  _this,
  width = 10,
  height = 10,
  offset = 1000,
  tileSize = 50
) {
  const world = new Array(width);
  for (let i = 0; i < width; i++) {
    world[i] = new Array(height);
    for (let j = 0; j < height; j++) {
      const tile = _this.add
        .sprite(
          offset + i * tileSize,
          offset + j * tileSize,
          'city',
          bgWorldArray[j][i]
          // `bg_${bgWorldArray[j][i]}`
        )
        .setOrigin(0.5)
        .setScale(3.3);
      // .setInteractive();

      world[i][j] = tile;
    }
  }
  return world;
}

function disableWorld(world) {
  for (let i = 0; i < world.length; i++) {
    for (let j = 0; j < world[i].length; j++) {
      world[i][j].disableInteractive();
    }
  }
}

function enableWorld(grid) {
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
  this.input.keyboard.on('keydown-P', (event) => {
    // pause or unpause
    paused = !paused;
    pausedText.setVisible(paused);
    if (paused) {
      this.cameras.main.setAlpha(0.8);
      disableWorld(gridWorld);
      disableEntities();
    } else {
      this.cameras.main.setAlpha(1);
      enableWorld(gridWorld);
      enableEntities();
    }
  });

  // https://rexrainbow.github.io/phaser3-rex-notes/docs/site/keyboardevents/
  // input for entity
  this.input.keyboard
    .on('keydown-W', (event) => {
      if (!paused && selectedEntity !== null) makeMoveAction(selectedEntity, 0, -1); // up is negative
    })
    .on('keydown-S', (event) => {
      if (!paused && selectedEntity !== null) makeMoveAction(selectedEntity, 0, 1); // down
    })
    .on('keydown-A', (event) => {
      if (!paused && selectedEntity !== null) makeMoveAction(selectedEntity, -1, 0); // left
    })
    .on('keydown-D', (event) => {
      if (!paused && selectedEntity !== null) makeMoveAction(selectedEntity, 1, 0); // right
    })
    // remove actions from actions deque
    /*
    .on('keydown-Z', (event) => {
      selectedEntity.getData('actionsDeque').shift(); // remove from front
    })
    */
    .on('keydown-X', (event) => {
      if (!paused && selectedEntity !== null) {
        if (selectedEntity.getData('actionsDeque').length > 0) {
          selectedEntity.getData('actionsDeque').pop(); // remove from back
        }
      }
    })
    .on('keydown-C', (event) => {
      // clear actions
      if (!paused && selectedEntity !== null) {
        selectedEntity.getData('actionsDeque').clear();
      }
    })
    .on('keydown-ONE', () => {
      if (!paused && globals.selectableEntities[0] !== null) {
        if (selectedEntity === globals.selectableEntities[0]) {
          phaser.cameras.main.centerOn(selectedEntity.x, selectedEntity.y);
        } else {
          selectedEntity = globals.selectableEntities[0];
        }
      }
    })
    .on('keydown-TWO', () => {
      if (!paused && globals.selectableEntities[0] !== null) {
        if (selectedEntity === globals.selectableEntities[1]) {
          phaser.cameras.main.centerOn(selectedEntity.x, selectedEntity.y);
        } else {
          selectedEntity = globals.selectableEntities[1];
        }
      }
    })
    .on('keydown-SPACE', (event) => {
      if (!paused) {
        // center on selected entity
        if (selectedEntity) {
          this.cameras.main.centerOn(selectedEntity.x, selectedEntity.y);
        }
      }
    });

  eKeyObj = phaser.input.keyboard.addKey('E');

  // right click push
  phaser.input.on('pointerdown', (pointer) => {
    if (!paused) {
      if (pointer.rightButtonDown() && eKeyObj.isDown) {
        // push action

        // check if in correct position
        const mouseX = phaser.input.mousePointer.worldX;
        const mouseY = phaser.input.mousePointer.worldY;
        const end_x = selectedEntity.data.values.end_x;
        const end_y = selectedEntity.data.values.end_y;
        const endX = grid2world(end_x);
        const endY = grid2world(end_y);

        // up
        if (
          isPointRectOverlap(
            mouseX,
            mouseY,
            endX - tileSize / 2,
            endY - (3 * tileSize) / 2,
            tileSize,
            tileSize
          )
          && isPushablePos(end_x, end_y - 1)
        ) {
          console.log('push up');
          makePushingAction(selectedEntity, 0, -1);
        }

        // down
        if (
          isPointRectOverlap(
            mouseX,
            mouseY,
            endX - tileSize / 2,
            endY + tileSize / 2,
            tileSize,
            tileSize
          )
          && isPushablePos(end_x, end_y + 1)
        ) {
          console.log('push down');
          makePushingAction(selectedEntity, 0, 1);
        }

        // left
        if (
          isPointRectOverlap(
            mouseX,
            mouseY,

            endX - (3 * tileSize) / 2,
            endY - tileSize / 2,
            tileSize,
            tileSize
          )
          && isPushablePos(end_x - 1, end_y)
        ) {
          console.log('push left');
          makePushingAction(selectedEntity, -1, 0);
        }

        // right
        if (
          isPointRectOverlap(
            mouseX,
            mouseY,

            endX + tileSize / 2,
            endY - tileSize / 2,
            tileSize,
            tileSize
          )
          && isPushablePos(end_x + 1, end_y)
        ) {
          console.log('push right');
          makePushingAction(selectedEntity, 1, 0);
        }
      }
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

  // Make grid based on world size.
  worldHeight = worldArray.length;
  worldWidth = worldArray[0].length;
  gridWorld = makeGridWorld(
    this,
    worldWidth,
    worldHeight,
    globals.OFFSET,
    globals.TILE_SIZE
  );

  //--------------------------------------------
  // Spikes
  //--------------------------------------------
  this.anims.create({
    key: 'spike_prep',
    frames: [
      { key: 'spike_1' },
      { key: 'spike_2' },
      { key: 'spike_3' },
      { key: 'spike_4' }
    ],
    frameRate: 12,
    repeat: 0
  });

  this.anims.create({
    key: 'spike_down',
    frames: [{ key: 'spike_3' }, { key: 'spike_2' }, { key: 'spike_1' }],
    frameRate: 6,
    repeat: 0
  });

  //--------------------------------------------
  // Explosion
  //--------------------------------------------

  this.anims.create({
    key: 'explosion',
    frames: this.anims.generateFrameNumbers('explosion', {
      start: 0,
      end: 11
    }),
    frameRate: 10,
    repeat: 0
  });

  //--------------------------------------------
  // Coin
  //-------------------------------------------
  this.anims.create({
    key: 'coin',
    frames: this.anims.generateFrameNumbers('coin', {
      start: 0,
      end: 8
    }),
    frameRate: 6,
    repeat: -1
    // yoyo: true
  });

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
    setEntity(entity, {
      depth: 1,
      idle: () => {
        entity.anims.play('idle', true);
      }
    }); // initialize data values
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
  for (let y = 0; y < worldArray.length; ++y) {
    for (let x = 0; x < worldArray[y].length; ++x) {
      if (worldArray[y][x] === '1') {
        player.data.values.x = x;
        player.data.values.y = y;
        player.data.values.end_x = x;
        player.data.values.end_y = y;
        objWorld[y][x].add(player);
      }
      if (worldArray[y][x] === '2') {
        player2.data.values.x = x;
        player2.data.values.y = y;
        player2.data.values.end_x = x;
        player2.data.values.end_y = y;
        objWorld[y][x].add(player2);
      }
      if (worldArray[y][x] === 'w') {
        const rock = this.add
          .sprite(0, 0, `rock_${Phaser.Math.Between(1, 3)}`)
          .setScale(1.5);
        setEntityRock(rock, { x, y });
        objWorld[y][x].add(rock);
      }
      if (worldArray[y][x] === 'c') {
        const coin = this.add.sprite(0, 0, 'coin', 0).setScale(2);
        coin.play('coin');
        setEntity(coin, {
          type: TYPE.COIN,
          x,
          y,
          timeLeftText: null,
          doneText: null
        });
        objWorld[y][x].add(coin);
      }
      if (worldArray[y][x] === 's') {
        const spike = this.add.sprite(0, 0, 'spike_1').setScale(2.5);
        setEntitySpike(spike, {
          x,
          y,
          idle: () => {
            spike.setTexture('spike_1');
            makeSpikeIdleAction(spike);
            makeSpikePrepAction(spike);
            makeSpikeUpAction(spike);
            makeSpikeDownAction(spike);
          }
        });
        objWorld[y][x].add(spike);
        globals.entities.add(spike);
      }
    }
    console.log(objWorld);

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

    /*
  debugText = phaser.add
    .text(10, 10, 'Cursors to move', { font: '16px Courier', fill: '#ffffff' })
    .setScrollFactor(0);
    */
  }
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

    // e is the hotkey for push
    if (eKeyObj.isDown) {
      // draw the push UI
      // drawPushUI

      const values = selectedEntity.data.values;

      const end_x = values.end_x;
      const end_y = values.end_y;
      const endX = grid2world(end_x);
      const endY = grid2world(end_y);
      graphics.fillStyle(0x00ff00, 0.5);
      // up
      if (isPushablePos(end_x, end_y - 1)) {
        graphics.fillRect(
          endX - tileSize / 2,
          endY - (3 * tileSize) / 2,
          tileSize,
          tileSize
        );
      }

      // down
      if (isPushablePos(end_x, end_y + 1)) {
        graphics.fillRect(
          endX - tileSize / 2,
          endY + tileSize / 2,
          tileSize,
          tileSize
        );
      }

      // left
      if (isPushablePos(end_x - 1, end_y)) {
        graphics.fillRect(
          endX - (3 * tileSize) / 2,
          endY - tileSize / 2,
          tileSize,
          tileSize
        );
      }

      // right
      if (isPushablePos(end_x + 1, end_y)) {
        graphics.fillRect(
          endX + tileSize / 2,
          endY - tileSize / 2,
          tileSize,
          tileSize
        );
      }
    }

    // call all UI draw function
    globals.drawFuncs.forEach((func) => {
      func();
    });

    // handle all Entities
    globals.entities.forEach((entity) => {
      const values = entity.data.values;
      const deque = values.actionsDeque;

      if (values.type === TYPE.PLAYER && values.state !== STATE.EXPLODE) {
        drawEntityActions(entity);
      }

      // calculate end_x, end_y
      let end_x = values.x;
      let end_y = values.y;
      deque.forEach((action) => {
        if (action.state === STATE.MOVE || action.state === STATE.PUSHED) {
          end_x += action.x;
          end_y += action.y;
        }
      });
      values.end_x = end_x;
      values.end_y = end_y;

      if (deque.length > 0) {
        const action = deque.peek();

        const direction = action.direction;
        const nextX = values.x + action.x;
        const nextY = values.y + action.y;

        // time elapsed
        if (action.elapsed > action.done) {
          if (values.type === TYPE.PLAYER) {
            if (action.state === STATE.MOVE) {
              let stall_action = false;

              objWorld[nextY][nextX].forEach((obj) => {
                if (obj !== entity && obj.data.values.type === TYPE.PLAYER) {
                  stall_action = true;
                }
              });

              if (!isValidMovePos(nextX, nextY)) stall_action = true;

              if (stall_action) {
                return;
              }

              entityMoveTo(entity, nextX, nextY);
            } else if (action.state === STATE.PUSHED) {
              if (isValidMovePos(nextX, nextY)) {
                entityMoveTo(entity, nextX, nextY);
              }
            } else if (action.state === STATE.PUSHING) {
              // push all objects at position
              objWorld[nextY][nextX].forEach((obj) => {
                const objValues = obj.data.values;
                // object has been pushed

                // clear all previous actions
                objValues.actionsDeque.clear();

                // add pushed action to the deque
                makePushedAction(obj, action.x, action.y);
              });
            } else if (action.state === STATE.EXPLODE) {
              disableEntity(entity);
            }
          }

          const extraTime = action.elapsed - action.done;

          deque.shift();
          if (deque.length > 0) {
            // transfer time to next action
            const nextAction = deque.peek();
            nextAction.elapsed += extraTime;

            if (nextAction.state === STATE.SPIKE_PREP) {
              entity.anims.play('spike_prep', false);
              // console.log('prep');
            } else if (nextAction.state === STATE.SPIKE_DOWN) {
              entity.anims.play('spike_down', false);
              // console.log('down');
            } else if (nextAction.state === STATE.SPIKE_UP) {
              entity.setTexture('spike_4');
              // console.log('up');
            }
          }
        } else {
          // action not done, or action execution on start instead of end.
          action.elapsed += dt;
          values.state = action.state;

          if (values.type === TYPE.PLAYER) {
            if (values.state === STATE.MOVE) {
              entity.anims.play('walk_right', true);

              if (direction !== null && direction !== values.direction) {
                entity.flipX = !entity.flipX;
                values.direction = direction;
              }
            } else if (values.state === STATE.EXPLODE) {
              entity.anims
                .play('explosion', true)
                .setScale(0.8)
                .setOrigin(0.5, 0.8);
            }
          } else if (values.type === TYPE.SPIKE) {
            if (action.state === STATE.SPIKE_UP) {
              objWorld[values.y][values.x].forEach((obj) => {
                if (obj !== entity && obj.data.values.type === TYPE.PLAYER) {
                  predisableEntity(obj);
                  makeExplodeAction(obj);
                }
              });
            } else if (action.state === STATE.IDLE) {
              // console.log('idle');
              entity.setTexture('spike_1');
            }
          }
        }
      } else {
        values.state = STATE.IDLE;
        values.idle();
      }
    });

    // set debug text
    /*
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
    */

    clockText.setText(`Time: ${levelTime.toFixed(1)}`);
    clockText.setPosition(
      phaser.cameras.main.width - clockText.displayWidth,
      0
    );
  } else {
    // paused, do something
  }
}
