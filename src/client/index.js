import './index.css';
import Phaser from 'phaser';

// Data structures from: http://www.collectionsjs.com/
import Deque from 'collections/deque';
import Set from 'collections/set';

import * as globals from './globals';

const STATE = {
  IDLE: 'idle',
  MOVE: 'move',
  PUSHING: 'pushing',
  PUSHED: 'pushed',
  SPIKE_PREP: 'spike_prep',
  SPIKE_UP: 'spike_up',
  SPIKE_DOWN: 'spike_down',
  EXPLODE: 'explode',
  EXPLODE_SMALL: 'explode_small',
  CANNON_FIRE: 'cannon_fire'
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
  COIN: 'obj_coin',
  TUTORIAL: 'obj_tutorial',
  CANNON: 'obj_cannon',
  FIREBALL: 'obj_fireball'
};

const volume = 0.2;
const offset = globals.OFFSET;
const tileSize = globals.TILE_SIZE;

const worldArray = [
  ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
  ['w', 'c', 'a', 'a', 'a', 'a', 'a', 'w'],
  ['w', 'a', 'a', 'a', 'a', 'w', 'a', 'w'],
  ['w', 'a', 'a', 'a', 'a', 'w', 'a', 'w'],
  ['w', 'a', 'a', 'a', 'a', 'w', 'a', 'w'],
  ['w', 't', 'a', 'w', 'w', 'a', 'a', 'w'],
  ['w', 'a', 'a', 'w', 'w', 'a', 'a', 'w'],
  ['w', 's', 'w', 'a', 'w', 'a', 'a', 'w'],
  ['w', 'a', 's', 'a', 'w', 'a', 'a', 'w'],
  ['w', 'w', 'w', 't', 'w', 'w', 'w', 'w'],
  ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
  ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
  ['w', 'a', 'a', 's', 't', 'a', 'a', 'w'],
  ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
  ['w', 'a', 'a', 'a', 'a', '1', '2', 'w'],
  ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w']
];

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
let objWorld;

let player;
let player2;
let tutorial;
let dummy;
let cursors;
let keys;
// let debugText;
let clockText;
let coinText;
let stuckText;
let levelTime = 0.0;
let pausedText;
let selectedEntity;
let graphics;
let paused = false;
let eKeyObj;
let worldHeight;
let worldWidth;

let coins;
let win = false;
let gameOver = false;
let entities;
let selectableEntities;
let drawFuncs;
let restarting = true;

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

function disableEntity(entity) {
  if (entity.data.values.type === TYPE.COIN) {
    coins--;
  }

  predisableEntity(entity);
  if (entities.has(entity)) {
    entities.delete(entity);
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
  entity.disableInteractive();

  if (values.timeLeftText) values.timeLeftText.setVisible(false);
  if (values.doneText) values.doneText.setVisible(false);

  if (values.type === TYPE.PLAYER) {
    // do a check for selectableentities...
    let switchedEntity = false;
    for (let i = 0; i < selectableEntities.length; ++i) {
      if (entity === selectableEntities[i]) {
        selectableEntities[i] = null;
      } else if (selectableEntities[i] !== null && !switchedEntity) {
        selectedEntity = selectableEntities[i];
        switchedEntity = true;
      }
    }

    if (!switchedEntity) {
      // can't switch entity
      // game over
      console.log('game over');
      gameOver = true;
    }
  }
}

function grid2world(val) {
  return offset + val * tileSize;
}

function setEntity(
  scene,
  entity,
  {
    type = TYPE.PLAYER,
    x = 0,
    y = 0,
    end_x = 0,
    end_y = 0,
    action_elapsed_time = 0,
    action_total_time = 0,
    moveSpeed = 0.5,
    direction = DIRECTION.RIGHT,
    cannon_x = 0,
    cannon_y = -1,
    color = 0xffffff,
    state = STATE.IDLE,
    depth = 0,
    stalled = false,
    actionsDeque = new Deque(),
    idle = () => {},
    timeLeftText = scene.add.text(0, 0, '', {
      font: '16px Courier',
      fill: '#ffffff'
    }),
    doneText = scene.add.text(0, 0, '', {
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
    .set('action_elapsed_time', action_elapsed_time)
    .set('action_total_time', action_total_time)
    .set('moveSpeed', moveSpeed) // seconds per block
    .set('direction', direction)
    .set('cannon_x', cannon_x)
    .set('cannon_y', cannon_y)
    .set('color', color)
    .set('state', state)
    .set('depth', depth)
    .set('stalled', stalled)
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
  objWorld[y][x].add(entity);
}

function setEntityTutorial(scene, entity, { type = TYPE.TUTORIAL, x = 0, y = 0 } = {}) {
  setEntity(scene, entity, {
    type,
    x,
    y,
    timeLeftText: null,
    doneText: null
  });
}

function setEntityRock(scene, entity, { type = TYPE.ROCK, x = 0, y = 0 } = {}) {
  setEntity(scene, entity, {
    type,
    x,
    y,
    actionsDeque: null,
    timeLeftText: null,
    doneText: null
  });
}

function setEntitySpike(
  scene,
  entity,
  {
    type = TYPE.SPIKE, color = 0xff0000, x = 0, y = 0, idle = () => { },
    depth = -2
  } = {}
) {
  setEntity(scene, entity, {
    type,
    x,
    y,
    color,
    depth,
    /*
    timeLeftText: null,
    doneText: null,
    */
    state: STATE.IDLE,
    idle
  });
}

function setEntityFireball(
  scene,
  entity,
  {
    type = TYPE.FIREBALL, x = 0, y = 0, cannon_x = 0, cannon_y = 1, idle = () => {}
  } = {}
) {
  setEntity(scene, entity, {
    type,
    x,
    y,
    cannon_x,
    cannon_y,
    /*
    timeLeftText: null,
    doneText: null,
    */
    state: STATE.MOVE,
    idle
  });
}

function setEntityCannon(
  scene,
  entity,
  {
    type = TYPE.CANNON, color = 0xff0000, x = 0, y = 0, idle = () => {}
  } = {}
) {
  setEntity(scene, entity, {
    type,
    x,
    y,
    color,
    /*
    timeLeftText: null,
    doneText: null,
    */
    state: STATE.IDLE,
    idle
  });
}

function makeTutorialAction(entity, x, y, nextActionTrigger = () => {}, image = '', scale = 1, done = 0) {
  const values = entity.data.values;
  values.actionsDeque.push({
    scale,
    image,
    x,
    y,
    nextActionTrigger,
    elapsed: 0.0,
    done
  });
}

function makeFireballAction(entity) {
  const values = entity.data.values;
  values.actionsDeque.push({
    state: STATE.MOVE,
    x: values.cannon_x,
    y: values.cannon_y,
    elapsed: 0,
    done: 0.4
  });
}

function makeCannonFireAction(entity) {
  const values = entity.data.values;
  values.actionsDeque.push({
    state: STATE.CANNON_FIRE,
    elapsed: 0.0,
    done: 0.6
  });
}

function makeCannonIdleAction(entity) {
  const values = entity.data.values;
  values.actionsDeque.push({
    state: STATE.IDLE,
    elapsed: 0.0,
    done: 2 / values.moveSpeed
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

function makeExplodeAction(entity, state = STATE.EXPLODE, done = 1) {
  const values = entity.data.values;
  values.state = state;
  let rotateBack = 0;

  if (values.type === TYPE.CANNON || values.type === TYPE.FIREBALL) {
    if (values.cannon_x === 1) {
      rotateBack = 90;
    } else if (values.cannon_x === -1) {
      rotateBack = -90;
    } else if (values.cannon_y === -1) {
      rotateBack = 180;
    }
  
    entity.angle += rotateBack;
  }
  
  values.actionsDeque.clear();
  values.actionsDeque.push({
    state,
    elapsed: 0.0,
    done
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

function isValidMovePos(entity, worldX, worldY) {
  if (!isPosInWorld(worldX, worldY)) return false;

  const values = entity.data.values;

  let valid = true;
  objWorld[worldY][worldX].forEach((obj) => {
    const objValues = obj.data.values;
    if (values.type === TYPE.COIN) {
      if (objValues.type === TYPE.ROCK) valid = false;
    } else if (values.type === TYPE.FIREBALL) {
      if (objValues.type === TYPE.ROCK) valid = false;
    } else if (
      objValues.type === TYPE.ROCK
        || objValues.type === TYPE.PLAYER
        || objValues.type === TYPE.TRASH
        || objValues.type === TYPE.CANNON
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

function shouldShowGreenPushIndicator(entity, worldX, worldY, dirX, dirY) {
  if (!isPosInWorld(worldX, worldY)) {
    return false;
  }

  let pushable = false;
  objWorld[worldY][worldX].forEach((obj) => {
    if ((obj.data.values.type === TYPE.PLAYER && obj !== entity)
      || obj.data.values.type === TYPE.SPIKE
      || obj.data.values.type === TYPE.TRASH
      || obj.data.values.type === TYPE.FIREBALL
      || obj.data.values.type === TYPE.CANNON
      || obj.data.values.type === TYPE.COIN) {
      pushable = true;
    }
  });
  objWorld[worldY + dirY][worldX + dirX].forEach((obj) => {
    if ((obj.data.values.type === TYPE.PLAYER)
      || obj.data.values.type === TYPE.TRASH
      || obj.data.values.type === TYPE.CANNON
      || obj.data.values.type === TYPE.ROCK) {
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

  if (values.type === TYPE.PLAYER) {
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
      const w = tileSize / 10.0;
      const h = tileSize * (1.0 - action.elapsed / action.done);

      // bar indicator for current action
      graphics.fillStyle(values.color, 0.8);
      graphics.fillRect(
        entity.x - tileSize / 2.0,
        entity.y - tileSize / 2.0,
        w,
        h
      );

      // elapsed time text
      totalTime -= action.elapsed;
      const timeLeftText = values.timeLeftText;
      timeLeftText.setVisible(true);
      timeLeftText.setText(`${totalTime.toFixed(1)}`);
      timeLeftText.setPosition(
        entity.x + tileSize / 2.0,
        entity.y - tileSize / 2.0
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
  } else if (values.type === TYPE.SPIKE || values.type === TYPE.CANNON) {
    if (values.action_elapsed_time > values.action_total_time) {
      values.timeLeftText.setVisible(false);
      values.doneText.setVisible(false);
    } else {
      const w = tileSize / 10.0;
      const h = tileSize
        * (1.0 - values.action_elapsed_time / values.action_total_time);
      graphics.fillStyle(values.color, 0.8);
      graphics.fillRect(
        entity.x - tileSize / 2.0,
        entity.y - tileSize / 2.0,
        w,
        h
      );

      // elapsed time text
      totalTime = values.action_total_time - values.action_elapsed_time;
      const timeLeftText = values.timeLeftText;
      timeLeftText.setVisible(true);
      timeLeftText.setText(`${totalTime.toFixed(1)}`);
      timeLeftText.setPosition(
        entity.x + tileSize / 2.0,
        entity.y - tileSize / 2.0
      );

      // done time indicator
      const doneText = values.doneText;
      doneText.setVisible(true);
      doneText.setText(`${(levelTime + totalTime).toFixed(1)}`);
      doneText.setPosition(
        entity.x + tileSize / 2.0,
        entity.y + tileSize / 5.0
      );
    }
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
          _this.bgWorldArray[j][i]
          // `bg_${bgWorldArray[j][i]}`
        )
        .setOrigin(0.5)
        .setScale(3.3)
        .setDepth(-4);
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

// Handle the camera scrolling
function handleScrolling(_this, camera, dt) {
  const vel = 500;
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

function restart(_this) {
  restarting = true;
  console.log('restarting level');
  _this.scene.restart();

  entities = [];
  drawFuncs = [];
  selectableEntities = [];
}

// --------------------------------------
// Scenes
// --------------------------------------

class LevelIntro extends Phaser.Scene {
  title;

  preload() {
    this.load.setBaseURL('./');
  }

  create() {}

  update(time, delta) {}
}

class Level extends Phaser.Scene {
  // { key: 'Level1' }

  worldArray = [
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
    ['w', 'c', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'w', 'a', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'w', 'a', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'w', 'a', 'w'],
    ['w', 't', 'a', 'w', 'w', 'a', 'a', 'w'],
    ['w', 'a', 'a', 'w', 'w', 'a', 'a', 'w'],
    ['w', 's', 'w', 'a', 'w', 'a', 'a', 'w'],
    ['w', 'a', 's', 'a', 'w', 'a', 'a', 'w'],
    ['w', 'w', 'w', 't', 'w', 'w', 'w', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 's', 't', 'a', 'a', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 'a', 'a', '1', '2', 'w'],
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w']
  ];

  bgWorldArray = [
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

  nextSceneKey;

  coinSounds;

  explosionSounds;

  music;

  preload() {
    this.load.setBaseURL('./');
    this.load.image('bg', 'assets/wallpaper.jpg');
    //this.load.image('grass', 'assets/grass.jpg');
    this.load.spritesheet('homeless_guy', 'assets/homeless_right.png', {
      frameWidth: 50,
      frameHeight: 50
    });
    this.load.spritesheet('cannon', 'assets/cannon.png', {
      frameWidth: 48,
      frameHeight: 48
    });
    // this.load.spritesheet('fireball', 'assets/fireball.png', {
    //   frameWidth: 48,
    //   frameHeight: 48
    // });
    this.load.spritesheet('explosion', 'assets/explosion-4.png', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('explosion_s', 'assets/explosion-1.png', {
      frameWidth: 32,
      frameHeight: 32
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

    this.load.spritesheet('dungeon', 'assets/assets_dungeon.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    // for (let i = 1; i <= 64; ++i) {
    //   this.load.image(
    //     `bg_${`0${i}`.slice(-2)}`,
    //     `assets/bg_tiles/generic-rpg-tile${`0${i}`.slice(-2)}.png`
    //   );
    // }
    // for (let i = 1; i < 4; ++i) {
    //   this.load.image(`rock_${i}`, `assets/rock${i}.png`);
    // }

    for (let i = 1; i < 5; ++i) {
      this.load.image(`spike_${i}`, `assets/spike${i}.png`);
    }

    for (let i = 1; i < 6; ++i) {
      this.load.image(`fireball_${i}`, `assets/FB500-${i}.png`);
    }

    this.load.image('tut_clicktoselect', 'assets/tut_clicktoselect.png');
    this.load.image('tut_wasd', 'assets/tut_wasd.png');
    this.load.image('tut_clicktopush', 'assets/tut_clicktopush.png');
    this.load.image('tut_tips', 'assets/tut_tips.png');
    this.load.image('tut_escapepoverty', 'assets/tut_escapepoverty.png');
    this.load.image('tut_scroll', 'assets/tut_scroll.png');

    this.load.audio('bitconnect1', ['assets/audio/bitconnect1.ogg']);
    this.load.audio('bitconnect2', ['assets/audio/bitconnect2.ogg']);
    this.load.audio('bitconnect3', ['assets/audio/woah.ogg']);

    this.load.audio('explosion1', ['assets/audio/explosion1.mp3']);
    this.load.audio('explosion2', ['assets/audio/explosion2.mp3']);
    this.load.audio('explosion3', ['assets/audio/explosion3.mp3']);
    this.load.audio('explosion4', ['assets/audio/explosion4.mp3']);
    this.load.audio('explosion5', ['assets/audio/explosion5.mp3']);
    this.load.audio('explosion6', ['assets/audio/explosion6.mp3']);

    this.load.audio('music', ['assets/audio/caravan.ogg']);
  }

  create() {
    // stop the right click menu from popping up
    this.input.mouse.disableContextMenu();

    //  If you disable topOnly it will fire events for all objects the pointer is over
    //  regardless of their place on the display list
    this.input.setTopOnly(true);

    paused = false;
    restarting = false;
    levelTime = 0.0;

    coins = 0;
    win = false;
    gameOver = false;

    entities = new Set();
    drawFuncs = new Set();

    selectableEntities = [];

    this.coinSounds = [
      this.sound.add('bitconnect1', { volume }),
      this.sound.add('bitconnect2', { volume }),
      this.sound.add('bitconnect3', { volume })
    ];

    this.explosionSounds = [
      this.sound.add('explosion1', { volume }),
      this.sound.add('explosion2', { volume }),
      this.sound.add('explosion3', { volume }),
      this.sound.add('explosion4', { volume }),
      this.sound.add('explosion5', { volume }),
      this.sound.add('explosion6', { volume }),
    ];

    this.music = this.sound.add('music', { loop: true });
    this.music.play();

    /*
    Handle Input
  */
    this.input.keyboard.on('keydown-P', (event) => {
      // pause or unpause
      paused = !paused;
      pausedText.setVisible(paused);
      if (paused) {
        this.cameras.main.setAlpha(0.7);
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

            if (selectedEntity.getData('actionsDeque').length === 0) {
              // can't be stuck anymore
              stuckText.setVisible(false);
            }
          }
        }
      })
      .on('keydown-C', (event) => {
        // clear actions
        if (!paused && selectedEntity !== null) {
          selectedEntity.getData('actionsDeque').clear();

          // can't be stuck anymore
          stuckText.setVisible(false);
        }
      })
      .on('keydown-ONE', () => {
        if (!paused && selectableEntities[0] !== null) {
          if (selectedEntity === selectableEntities[0]) {
            this.cameras.main.centerOn(selectedEntity.x, selectedEntity.y);
          } else {
            selectedEntity = selectableEntities[0];
          }
        }
      })
      .on('keydown-TWO', () => {
        if (!paused && selectableEntities[1] !== null) {
          if (selectedEntity === selectableEntities[1]) {
            this.cameras.main.centerOn(selectedEntity.x, selectedEntity.y);
          } else {
            selectedEntity = selectableEntities[1];
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
      })
      .on('keydown-R', () => {
        restart(this);
      });

    eKeyObj = this.input.keyboard.addKey('E');

    // right click push
    this.input.on('pointerdown', (pointer) => {
      if (!paused) {
        if (eKeyObj.isDown) {
          // push action

          // check if in correct position
          const mouseX = this.input.mousePointer.worldX;
          const mouseY = this.input.mousePointer.worldY;
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

    // animations

    //--------------------------------------------
    // Cannon animation
    //--------------------------------------------
    this.anims.create({
      key: 'cannon_fire',
      frames: this.anims.generateFrameNumbers('cannon', {
        start: 0,
        end: 5
      }),
      frameRate: 10,
      repeat: 0
    });

    this.anims.create({
      key: 'fireball',
      frames: [
        { key: 'fireball_1' },
        { key: 'fireball_2' },
        { key: 'fireball_3' },
        { key: 'fireball_4' },
        { key: 'fireball_5' }
      ],
      frameRate: 10.8,
      repeat: -1
    });

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
        end: 12
      }),
      frameRate: 10,
      repeat: 0
    });

    this.anims.create({
      key: 'explosion_s',
      frames: this.anims.generateFrameNumbers('explosion_s', {
        start: 0,
        end: 7
      }),
      frameRate: 15,
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

    // Make grid based on world size.
    worldHeight = this.worldArray.length;
    worldWidth = this.worldArray[0].length;
    gridWorld = makeGridWorld(
      this,
      worldWidth,
      worldHeight,
      globals.OFFSET,
      globals.TILE_SIZE
    );
    objWorld = [];

    for (let h = 0; h < this.worldArray.length; ++h) {
      objWorld.push([]);
      for (let w = 0; w < this.worldArray[h].length; ++w) {
        objWorld[h].push(new Set()); // list has O(n) deletion, set has O(1) deletion
      }
    }

    // bounds
    this.cameras.main.setBounds(
      0,
      0,
      worldWidth * tileSize + offset * 2,
      worldHeight * tileSize + offset * 2
    );
    this.physics.world.setBounds(
      0,
      0,
      worldWidth * tileSize + offset * 2,
      worldHeight * tileSize + offset * 2
    );


    player = this.add.sprite(0, 0, 'homeless_guy');
    player2 = this.add.sprite(0, 0, 'homeless_guy');

    // initialize all selectable entities
    selectableEntities.push(player, player2);
    selectableEntities.forEach((entity) => {
      function drawClicked() {
        graphics.lineStyle(2, entity.getData('color'), 0.5);
        graphics.strokeCircle(entity.x, entity.y, tileSize / 2);
      }
      entity
        .on('mouseDown', (pointer) => {
          if (pointer.leftButtonDown()) {
            selectedEntity = entity;
            drawFuncs.add(drawClicked);
          }
        })
        .on('mouseUp', (pointer) => {
          drawFuncs.delete(drawClicked);
        })
        .on('mouseOver', (pointer) => {})
        .on('mouseOut', (pointer) => {
          drawFuncs.delete(drawClicked);
        });
    });

    // Position Players based on world data.
    for (let y = 0; y < this.worldArray.length; ++y) {
      for (let x = 0; x < this.worldArray[y].length; ++x) {
        if (this.worldArray[y][x] === '1') {
          // initialize data values
          setEntity(this, player, {
            x, y, end_x: x, end_y: y, color: 0x0000ff,
            depth: 1,
            idle: () => {
              player.anims.play('idle', true);
            }
          }); 

          entities.add(player);
          /*
          player.data.values.x = x;
          player.data.values.y = y;
          player.data.values.end_x = x;
          player.data.values.end_y = y;
          */
        }
        if (this.worldArray[y][x] === '2') {
          // initialize data values
          setEntity(this, player2, {
            x, y, end_x: x, end_y: y, color: 0x00baba,
            depth: 1,
            idle: () => {
              player2.anims.play('idle', true);
            }
          }); 
          
          entities.add(player2);
          /*
          player2.data.values.x = x;
          player2.data.values.y = y;
          player2.data.values.end_x = x;
          player2.data.values.end_y = y;
          */
        }
        if (this.worldArray[y][x] === 'w') {
          const rock = this.add
            .sprite(0, 0, 'dungeon', '6')
            .setScale(1.5);
          setEntityRock(this, rock, { x, y });
        }
        if (this.worldArray[y][x] === 'c') {
          const coin = this.add.sprite(0, 0, 'coin', 0).setScale(1.5);
          coin.play('coin');
          setEntity(this, coin, {
            type: TYPE.COIN,
            x,
            y,
            depth: 2
          });
          entities.add(coin);
          coins++;
        }
        if (this.worldArray[y][x] === 's') {
          const spike = this.add.sprite(0, 0, 'spike_1').setScale(2.5);
          spike.width = tileSize;
          spike.height = tileSize;
          setEntitySpike(this, spike, {
            x,
            y,
            idle: () => {
              spike.setTexture('spike_1');
              spike.data.set('action_elapsed_time', 0);
              spike.data.set('action_total_time', 1.833); // time until spike up.
              makeSpikeIdleAction(spike);
              makeSpikePrepAction(spike);
              makeSpikeUpAction(spike);
              makeSpikeDownAction(spike);
            }
          });
          entities.add(spike);
        }
        if (this.worldArray[y][x] === 't') {
          const trash = this.add
            .sprite(0, 0, 'city', Phaser.Math.Between(143, 145))
            .setScale(2.5);
          setEntity(this, trash, {
            x,
            y,
            type: TYPE.TRASH,
            color: 0x000000,
          });
          entities.add(trash);
        }
        if (this.worldArray[y][x][0] === 'r') {
          const cannon = this.add.sprite(0, 0, 'cannon', '0');
          const rotation = this.worldArray[y][x][1];
          const speed = this.worldArray[y][x][2];

          setEntityCannon(this, cannon, {
            x,
            y,
            idle: () => {
              cannon.setTexture('cannon', '0');
              cannon.data.set('action_elapsed_time', 0);
              cannon.data.set('action_total_time', 2 / speed); // time until spike up.
              makeCannonIdleAction(cannon);
              makeCannonFireAction(cannon);
            }
          });

          const val = cannon.data.values;

          if (rotation === 'r') {
            cannon.angle += 90 * 3;
            val.cannon_x = 1;
            val.cannon_y = 0;
          } else if (rotation === 'u') {
            cannon.angle += 90 * 2;
            val.cannon_x = 0;
            val.cannon_y = -1;
          } else if (rotation === 'l') {
            cannon.angle += 90 * 1;
            val.cannon_x = -1;
            val.cannon_y = 0;
          } else {
            val.cannon_x = 0;
            val.cannon_y = 1;
          }

          val.moveSpeed = speed;

          entities.add(cannon);
        }
      }
      // console.log(objWorld);


      selectedEntity = player;

      this.cameras.main.centerOn(selectedEntity.x, selectedEntity.y);

      /*   this.cameras.main.startFollow(player, true, 0.4, 0.4); */

      graphics = this.add.graphics({
        lineStyle: { width: 3, color: 0xffffff, alpha: 0.8 }
        /*     fillStyle: { color: 0x00ff00, alpha: 0.8 } */
      });

      // Text UI
      pausedText = this.add
        .text(0, 0, 'PAUSE\n  P', {
          font: '40px Courier',
          fill: '#ffffff',
          stroke: '#000000',
          strokeThickness: 1
        })
        .setScrollFactor(0)
        .setDepth(10);
      pausedText.setPosition(
        this.cameras.main.width / 2.0 - pausedText.displayWidth / 2.0,
        this.cameras.main.height / 2.0 - pausedText.displayHeight / 2.0
      );
      pausedText.setVisible(false);

      clockText = this.add
        .text(0, 0, '', {
          font: '35px Courier',
          fill: '#ffffff'
        })
        .setScrollFactor(0)
        .setDepth(100);

      coinText = this.add
        .text(0, 0, '', {
          font: '20px Courier',
          fill: '#ffffff'
        })
        .setScrollFactor(0)
        .setDepth(100);

      stuckText = this.add
        .text(0, 0, 'Press C or X to get UNSTUCK.\nYour queue of actions led you to be stuck.\n\nC clears ALL actions.\nX undoes an action.', {
          font: 'bold 20px Arial',
          fill: '#ffffff',
        })
        .setScrollFactor(0)
        .setDepth(1337)
        .setStroke('#000000', 4)
        .setVisible(false);

    }
  }

  update(time, delta) {
    if (restarting) return;

    if (coins === 0) {
      if (!win) {
        win = true;

        setTimeout(() => {
          if (this.nextSceneKey){
            this.music.stop();
            this.scene.start(this.nextSceneKey);
          } 
          else restart(this);
        }, 6000);
      }
    }

    if (gameOver && !win && !restarting) {
      restart(this);
      return;
    }

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
          if (!shouldShowGreenPushIndicator(selectedEntity, end_x, end_y - 1, 0, -1)) {
            graphics.fillStyle(0xff0000, 0.5);
          }
          graphics.fillRect(
            endX - tileSize / 2,
            endY - (3 * tileSize) / 2,
            tileSize,
            tileSize
          );
          graphics.fillStyle(0x00ff00, 0.5);
        }

        // down
        if (isPushablePos(end_x, end_y + 1)) {
          if (!shouldShowGreenPushIndicator(selectedEntity, end_x, end_y + 1, 0, 1)) {
            graphics.fillStyle(0xff0000, 0.5);
          }
          graphics.fillRect(
            endX - tileSize / 2,
            endY + tileSize / 2,
            tileSize,
            tileSize
          );
          graphics.fillStyle(0x00ff00, 0.5);
        }

        // left
        if (isPushablePos(end_x - 1, end_y)) {
          if (!shouldShowGreenPushIndicator(selectedEntity, end_x - 1, end_y, -1, 0)) {
            graphics.fillStyle(0xff0000, 0.5);
          }
          graphics.fillRect(
            endX - (3 * tileSize) / 2,
            endY - tileSize / 2,
            tileSize,
            tileSize
          );
          graphics.fillStyle(0x00ff00, 0.5);
        }

        // right
        if (isPushablePos(end_x + 1, end_y)) {
          if (!shouldShowGreenPushIndicator(selectedEntity, end_x + 1, end_y, 1, 0)) {
            graphics.fillStyle(0xff0000, 0.5);
          }
          graphics.fillRect(
            endX + tileSize / 2,
            endY - tileSize / 2,
            tileSize,
            tileSize
          );
          graphics.fillStyle(0x00ff00, 0.5);
        }
      }

      // call all UI draw function
      drawFuncs.forEach((func) => {
        func();
      });

      // handle all Entities
      entities.forEach((entity) => {
        if (!entity.data) {
          console.log(`Dataless entity:`);
          console.log(entity)
          console.log(`Entities:`);
          console.log(entities);
        } 
        const values = entity.data.values;
        const deque = values.actionsDeque;

        if (values.state !== STATE.EXPLODE && values.type !== TYPE.TUTORIAL && values.type !== TYPE.FIREBALL) {
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
          if (action.elapsed > action.done && values.type !== TYPE.TUTORIAL) {
            // rocks cannot be moved around
            if (values.type !== TYPE.ROCK) {
              if (action.state === STATE.MOVE) {
                if (values.type === TYPE.FIREBALL) {
                  let hit = false;
                  objWorld[values.y][values.x].forEach((obj) => {
                    const obj_val = obj.data.values;
                    if (obj !== entity) {
                      if (obj_val.type === TYPE.TRASH
                        || obj_val.type === TYPE.COIN
                        || obj_val.type === TYPE.CANNON
                        || (obj_val.type === TYPE.FIREBALL && obj_val.state !== STATE.EXPLODE_SMALL)) {
                        disableEntity(obj);
                        hit = true;
                        console.log(obj_val.type);
                      } else if (obj_val.type === TYPE.ROCK) {
                        hit = true;
                      } else if (obj_val.type === TYPE.PLAYER) {
                        hit = true;
                        predisableEntity(obj);
                        makeExplodeAction(obj);
                        console.log('player hit');
                      }
                    }
                  });
                  if (hit) {
                    predisableEntity(entity);
                    makeExplodeAction(entity, STATE.EXPLODE_SMALL, 0.46);
                    entity.setTexture('explosion_s', '0');
                  } else {
                    if (isPosInWorld(nextX, nextY)) {
                      entityMoveTo(entity, nextX, nextY);
                      makeFireballAction(entity);
                    } else {
                      disableEntity(entity);
                    }
                  }
                } else if ( values.type === TYPE.PLAYER ) {
                  let stall_action = false;

                  objWorld[nextY][nextX].forEach((obj) => {
                    if (
                      obj !== entity
                      && (obj.data.values.type === TYPE.PLAYER
                        || obj.data.values.type === TYPE.TRASH)
                    ) {
                      stall_action = true;
                    }
                  });

                  if (!isValidMovePos(entity, nextX, nextY)) stall_action = true;

                  values.stalled = stall_action;
                  if (stall_action) {
                    stuckText.setVisible(true);
                    stuckText.setPosition(
                      this.cameras.main.width / 2.0 - stuckText.displayWidth / 2.0,
                      this.cameras.main.height / 2.0 - stuckText.displayHeight / 2.0
                    );

                    return;
                  }

                  let removeUnstuckText = true;
                  selectableEntities.forEach((e) => {
                    if (e !== null) {
                      if (e.data.values.stalled) removeUnstuckText = false;
                    }
                  });
                  if (removeUnstuckText) {
                    stuckText.setVisible(false);
                  }


                  entityMoveTo(entity, nextX, nextY);
                }
              } else if (action.state === STATE.PUSHED) {
                if (isValidMovePos(entity, nextX, nextY)) {
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
              } else if (action.state === STATE.EXPLODE || action.state === STATE.EXPLODE_SMALL) {
                disableEntity(entity);
              }
            }

            const extraTime = action.elapsed - action.done;

            if (values.type !== TYPE.FIREBALL || values.state !== STATE.EXPLODE_SMALL) {
              deque.shift();
            }

            if (deque.length > 0) {
              // transfer time to next action
              const nextAction = deque.peek();
              
              nextAction.elapsed += extraTime;
              //console.log("here: " + values.type + nextAction.elapsed)

              if (nextAction.state === STATE.SPIKE_PREP) {
                entity.anims.play('spike_prep', false);
                // console.log('prep');
              } else if (nextAction.state === STATE.SPIKE_DOWN) {
                entity.anims.play('spike_down', false);
                // console.log('down');
              } else if (nextAction.state === STATE.SPIKE_UP) {
                entity.setTexture('spike_4');
                // console.log('up');
              } else if (nextAction.state === STATE.CANNON_FIRE) {
                entity.anims.play('cannon_fire', false);
                const fireball = this.add.sprite(0, 0, 'fireball', '0');
                setEntityFireball(this, fireball, {
                  x: values.x + values.cannon_x,
                  y: values.y + values.cannon_y,
                  cannon_x: values.cannon_x,
                  cannon_y: values.cannon_y
                });

                let rotatation = 0;
                if (values.cannon_x === 1) {
                  rotatation = 90;
                } else if (values.cannon_x === -1) {
                  rotatation = -90;
                } else if (values.cannon_y === -1) {
                  rotatation = 180;
                }
                fireball.angle -= rotatation;

                entities.add(fireball);
                fireball.anims.play('fireball', true).setScale(0.08);
                makeFireballAction(fireball);
              }
            }
          } else if (values.type !== TYPE.TUTORIAL) {
            // action not done, or action execution on start instead of end.
            action.elapsed += dt;
            values.state = action.state;
            //console.log("EVER HERE???" + values.type)
            if (values.state === STATE.EXPLODE) {
              entity.anims
                .play('explosion', true)
                .setScale(0.8)
                .setOrigin(0.5, 0.8)
                .setDepth(10);


              // play explosion sound
              this.explosionSounds[Phaser.Math.Between(0, this.explosionSounds.length - 1)].play();
            } else if (values.state === STATE.MOVE && values.type === TYPE.PLAYER) {
              entity.anims.play('walk_right', true);

              if (direction !== null && direction !== values.direction) {
                entity.flipX = !entity.flipX;
                values.direction = direction;
              }
            } else if (values.state === STATE.EXPLODE_SMALL) {
              //console.log('hit small explode');
              entity.anims
                .play('explosion_s', true)
                .setScale(0.8)
                .setOrigin(0.5, 0.8)
                .setDepth(10);
            }

            if (values.type === TYPE.SPIKE) {
              values.action_elapsed_time += dt;
              if (action.state === STATE.SPIKE_UP) {
                objWorld[values.y][values.x].forEach((obj) => {
                  if (obj !== entity) {
                    const obj_val = obj.data.values;
                    predisableEntity(obj);
                    if (obj_val.type === TYPE.FIREBALL) {
                      makeExplodeAction(obj, STATE.EXPLODE_SMALL, 0.46);
                    } else {
                      makeExplodeAction(obj);
                    }
                  }
                });
              } else if (action.state === STATE.IDLE) {
                // console.log('idle');
                entity.setTexture('spike_1');
              }
            }

            if (values.type === TYPE.CANNON) {
              values.action_elapsed_time += dt;

              if (action.state === STATE.IDLE) {
                // console.log('idle');
                entity.setTexture('cannon', '0');
              }
            }
          } else if (values.type === TYPE.TUTORIAL) {
            values.action_total_time = action.done;
            values.action_elapsed_time += dt;

            entity.setTexture(action.image).setScale(action.scale);
            values.x = action.x;
            values.y = action.y;

            if (action.nextActionTrigger() === true) {
              deque.shift();
              values.action_elapsed_time = 0;
              if (deque.length <= 0) {
                disableEntity(entity);
              }
            }
          }
        } else {
          // no actions in deque
          values.state = STATE.IDLE;
          values.idle();
          if (values.type === TYPE.FIREBALL) {
            console.log('fireball');
            let hit = false;
            objWorld[values.y][values.x].forEach((obj) => {
              const obj_val = obj.data.values;
              if (obj !== entity) {
                if (obj_val.type === TYPE.TRASH
                  || obj_val.type === TYPE.COIN
                  || obj_val.type === TYPE.CANNON
                  || (obj_val.type === TYPE.FIREBALL && obj_val.state !== STATE.EXPLODE_SMALL)) {
                  disableEntity(obj);
                  hit = true;
                  console.log(obj_val.type);
                } else if (obj_val.type === TYPE.ROCK) {
                  hit = true;
                } else if (obj_val.type === TYPE.PLAYER) {
                  hit = true;
                  predisableEntity(obj);
                  makeExplodeAction(obj);
                  console.log('player hit');
                }
              }
            });
            if (hit) {
              predisableEntity(entity);
              makeExplodeAction(entity, STATE.EXPLODE_SMALL, 0.46);
              entity.setTexture('explosion_s', '0');
            }
          }
        }

        // coin collection
        if (values.type === TYPE.PLAYER) {
          objWorld[values.y][values.x].forEach((obj) => {
            if (obj.data.values.type === TYPE.COIN) {
              disableEntity(obj);
              this.coinSounds[Phaser.Math.Between(0, this.coinSounds.length - 1)].play();
            }
          });
        }
      });


      clockText.setText(`Time: ${levelTime.toFixed(1)}`);
      clockText.setPosition(
        this.cameras.main.width / 2.0 - clockText.displayWidth / 2.0,
        0
      );
      clockText.setDepth(100);

      coinText.setText(`Coins Left: ${coins}`);
      coinText.setPosition(
        0,
        0
      );
      coinText.setDepth(100);

      // draw rect around
      graphics.lineStyle(2, 0xffffff, 0.9);
      graphics.strokeRect(
        this.cameras.main.scrollX + this.cameras.main.width / 2.0 - clockText.displayWidth / 2.0,
        this.cameras.main.scrollY,
        clockText.displayWidth,
        clockText.displayHeight
      );
    } else {
      // paused, do something
    }
  }
}

class LevelLogo extends LevelIntro {
  constructor() {
    super({ key: 'LevelLogo' });
  }

  preload() {
    this.load.audio('heyheyhey', ['assets/audio/heyheyhey.ogg']);
    this.load.image('shadybasement', 'assets/shadybasement.png');
  }

  create() {
    this.cameras.main.setBackgroundColor('#141414');
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    this.logo = this.add.sprite(width / 2.0, height / 2.0, 'shadybasement').setScale(0.3);

    // this.logo.setPosition(
    //   width / 2.0 - this.logo.displayWidth / 2.0,
    //   height / 2.0 - this.logo.displayHeight / 2.0
    // );

    const music = this.sound.add('heyheyhey');
    music.play();

    setTimeout(() => {
      this.scene.start('LevelIntro1');
    }, 5000);
  }
}

class LevelIntro1 extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntro1' });
  }

  preload() {
    this.load.audio('heyheyhey', ['assets/audio/heyheyhey.ogg']);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.title = this.add
      .text(
        0,
        0,
        'Homeless People\n\nDiscretely Getting Money\n\nto Invest in BitConnect.',
        {
          font: '20px Courier',
          fill: '#ffffff',
          stroke: '#000000',
          strokeThickness: 4
        }
      )
      .setScrollFactor(0);

    this.title.setPosition(
      width / 2.0 - this.title.displayWidth / 2.0,
      height / 2.0 - this.title.displayHeight / 2.0
    );

    const music = this.sound.add('heyheyhey');
    music.play();

    setTimeout(() => {
      this.scene.start('Level1');
    }, 3700);
  }
}

class Level1 extends Level {
  constructor() {
    super({ key: 'Level1' });
    this.nextSceneKey = 'LevelIntro2';
  }

  worldArray = [
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
    ['w', 'a', 'a', 'a', 'c', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 't', 't', 'w', 'w', 'w', 'w', 'w', 'w'],
    ['w', 'a', 'a', 'w', 'w', 'w', 'w', 'w', 'w'],
    ['w', 'a', 'a', 'a', 'w', 'w', 'w', 'w', 'w'],
    ['w', 'a', 'a', 'a', 'w', 'w', 'w', 'w', 'w'],
    ['w', 'w', 'w', 't', 'w', 'w', 'w', 'w', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 's', 't', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 'a', 'a', '1', '2', 'a', 'w'],
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w']
  ];

  bgWorldArray = [
    ['792', '832', '832', '832', '832', '832', '832', '832', '793'],
    ['795', '714', '714', '714', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '714', '714', '714', '794'],
    ['795', '824', '823', '823', '823', '823', '823', '824', '794'],
    ['795', '716', '716', '716', '716', '716', '716', '716', '794'],
    ['795', '824', '823', '823', '823', '823', '823', '824', '794'],
    ['795', '714', '714', '714', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '714', '714', '714', '794'],
    ['829', '831', '831', '831', '831', '831', '831', '831', '830']
  ];

  // TUTORIAL TRIGGER HELPER VARIABLES
  trashToExplode;

  create() {
    // put background first or make background depth negative so that it is in the back
    super.create();
    this.add
      .image(0, 0, 'bg')
      .setOrigin(0)
      .setDepth(-10);
    // level stuff
    // Tutorial entity
    tutorial = this.add.sprite(0, 0, 'tut_escapepoverty').setScale(0.5);
    entities.add(tutorial);
    setEntityTutorial(this, tutorial, { depth: 0, x: 4, y: 2 });

    // Setups for triggers for tutorial actions
    makeTutorialAction(tutorial, 4, 11, () => {
      const values = tutorial.data.values;
      if (values.action_elapsed_time > values.action_total_time) {
        console.log('time up');
        return true;
      }
      if (selectedEntity.data.values.state === STATE.MOVE) {
        return true;
      }
      return false;
    }, 'tut_clicktoselect', 0.5, 10);

    makeTutorialAction(tutorial, 4, 11, () => {
      const values = tutorial.data.values;
      if (values.action_elapsed_time > values.action_total_time) {
        console.log('time up');
        return true;
      }
      return false;
    }, 'tut_scroll', 1, 10);

    makeTutorialAction(tutorial, 4, 11, () => {
      const values = tutorial.data.values;
      if (values.action_elapsed_time > values.action_total_time) {
        console.log('time up');
        return true;
      }
      return false;
    }, 'tut_wasd', 0.5, 25);

    objWorld[12][4].forEach((entity) => {
      if (entity.data.values.type === TYPE.TRASH) {
        this.trashToExplode = entity;
      }
    });
    makeTutorialAction(tutorial, 4, 11, () => {
      if (this.trashToExplode.data.values.state === STATE.EXPLODE) {
        return true;
      }
      return false;
    }, 'tut_clicktopush', 0.5, 25);

    makeTutorialAction(tutorial, 4, 11, () => {
      const values = tutorial.data.values;
      if (values.action_elapsed_time > values.action_total_time) {
        console.log('time up');
        return true;
      }

      let trueFlag = false;
      entities.forEach((entity) => {
        const v = entity.data.values;
        if (v.type === TYPE.PLAYER && v.y <= 8) {
          trueFlag = true;
        }
      });
      return trueFlag;
    }, 'tut_tips', 0.5, 25);

    makeTutorialAction(tutorial, 4, 2, () => {}, 'tut_escapepoverty', 0.5);
  }

  update(time, delta) {
    super.update(time, delta);
  }
}

class LevelIntro2 extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntro2' });
  }

  preload() {
    this.load.audio('coming', ['assets/audio/we_are_coming.ogg']);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.title = this.add
      .text(0, 0, 'We are coming.', {
        font: '20px Courier',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setScrollFactor(0);

    this.title.setPosition(
      width / 2.0 - this.title.displayWidth / 2.0,
      height / 2.0 - this.title.displayHeight / 2.0
    );

    const music = this.sound.add('coming', { volume });
    music.play();

    setTimeout(() => {
      this.scene.start('Level2');
    }, 4000);
  }
}

class Level2 extends Level {
  worldArray = [
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
    ['w', '1', 'w', 'a', 'a', 's', 'a', 'a', 'w', 'a', 'a', 't', 'a', 'a', 'w', 's', 'c', 'w'],
    ['w', '2', 'a', 'a', 'w', 's', 'c', 'a', 't', 'a', 'a', 'w', 'a', 'a', 't', 's', 'w', 'w'],
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
  ];

  bgWorldArray = [
    ['8', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '9'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['45', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '46']
  ];

  constructor() {
    super({ key: 'Level2' });
    this.nextSceneKey = 'LevelIntro3';
  }

  create() {
    // put background first or make background depth negative so that it is in the back
    super.create();
    this.add
      .image(0, 0, 'bg')
      .setOrigin(0)
      .setDepth(-10);
    // level stuff
  }
}

class LevelIntro3 extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntro3' });
  }

  preload() {
    this.load.audio('wife', ['assets/audio/wife_still_doesnt_believe.ogg']);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.title = this.add
      .text(0, 0, 'Fuck my Wife.', {
        font: '20px Courier',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setScrollFactor(0);

    this.title.setPosition(
      width / 2.0 - this.title.displayWidth / 2.0,
      height / 2.0 - this.title.displayHeight / 2.0
    );

    const music = this.sound.add('wife', { volume });
    music.play();

    setTimeout(() => {
      this.scene.start('Level3');
    }, 4000);
  }
}

class Level3 extends Level {
  worldArray = [
    ['w', 'w', 'w', 'w', ],
    ['w', 'c', 's', 'w', ],
    ['w', 's', 'c', 'w', ],
    ['w', 'c', 's', 'w', ],
    ['w', 's', 'c', 'w', ],
    ['w', 'c', 's', 'w', ],
    ['w', 's', 's', 'w', ],
    ['w', 's', 's', 'w', ],
    ['w', 's', 's', 'w', ],
    ['w', 's', 's', 'w', ],
    ['w', 's', 's', 'w', ],
    ['w', 's', 's', 'w', ],
    ['w', 's', 's', 'w', ],
    ['w', 'a', 'a', 'w', ],
    ['w', 's', 's', 'w', ],
    ['w', 's', 's', 'w', ],
    ['w', 's', 's', 'w', ],
    ['w', 's', 's', 'w', ],
    ['w', '2', '1', 'w', ],
    ['w', 'w', 'w', 'w', ],
  ];

  bgWorldArray = [
    ['792', '832', '832', '793'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['795', '714', '714', '794'],
    ['829', '831', '831', '830']
  ];

  constructor() {
    super({ key: 'Level3' });
    this.nextSceneKey = 'LevelIntro4';
  }

  create() {
    // put background first or make background depth negative so that it is in the back
    super.create();
    this.add
      .image(0, 0, 'bg')
      .setOrigin(0)
      .setDepth(-10);
    // level stuff
  }
}

class LevelIntro4 extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntro4' });
  }

  preload() {
    this.load.audio('whats', ['assets/audio/whats_up_bitconnect.ogg']);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.title = this.add
      .text(0, 0, 'Got BitConnect?', {
        font: '20px Courier',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setScrollFactor(0);

    this.title.setPosition(
      width / 2.0 - this.title.displayWidth / 2.0,
      height / 2.0 - this.title.displayHeight / 2.0
    );

    const music = this.sound.add('whats', { volume });
    music.play();

    setTimeout(() => {
      this.scene.start('Level4');
    }, 4000);
  }
}

class Level4 extends Level {
  worldArray = [
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
    ['w', '1', 's', 'a', 't', 'a', 'a', 'a', 'w', 'a', 'a', 't', 'a', 'c', 'w', 's', 'c', 'w'],
    ['w', 's', 's', 'a', 'w', 'a', 'c', 'a', 't', 'a', 'a', 'w', 'a', 'a', 't', 'c', 's', 'w'],
    ['w', 's', 's', 'c', 't', 'a', 'a', 'a', 'w', 'a', 'a', 't', 'a', 'a', 'w', 's', 'c', 'w'],
    ['w', 'a', 's', 'w', 'w', 'a', 'a', 'c', 't', 'a', 'a', 'w', 'a', 'a', 'w', 's', 'w', 'w'],
    ['w', 's', 's', 'a', 't', 'a', 'a', 'a', 'w', 'a', 'a', 't', 'a', 'a', 'w', 's', 'w', 'w'],
    ['w', 's', 's', 'a', 't', 'a', 'a', 'a', 'w', 'a', 'c', 't', 'a', 'a', 'w', 's', 'c', 'w'],
    ['w', 's', 's', 'a', 't', 'a', 'a', 'a', 'w', 'a', 'a', 't', 'a', 'a', 'w', 's', 'c', 'w'],
    ['w', 'a', 's', 'a', 'w', 'a', 'a', 'a', 't', 'a', 'a', 'w', 'a', 'a', 'w', 's', 'w', 'w'],
    ['w', 'a', 's', 'a', 'w', 'a', 'a', 'a', 't', 'a', 'a', 'w', 'a', 'a', 'w', 's', 'w', 'w'],
    ['w', 'c', 's', 'a', 't', 'a', 'a', 'a', 't', 'a', 'a', 'w', 'a', 'a', 'w', 's', '2', 'w'],
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
  ];

  bgWorldArray = [
    ['8', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '9'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['45', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '46']
  ];

  constructor() {
    super({ key: 'Level4' });
    this.nextSceneKey = 'LevelIntro5';
  }

  create() {
    // put background first or make background depth negative so that it is in the back
    super.create();
    this.add
      .image(0, 0, 'bg')
      .setOrigin(0)
      .setDepth(-10);
    // level stuff
  }
}

class LevelIntro5 extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntro5' });
  }

  preload() {
    this.load.audio('reaching', ['assets/audio/right_now_i_am_reaching.ogg']);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.title = this.add
      .text(0, 0, 'Cut through the Trash.\nMake $$$.', {
        font: '20px Courier',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setScrollFactor(0);

    this.title.setPosition(
      width / 2.0 - this.title.displayWidth / 2.0,
      height / 2.0 - this.title.displayHeight / 2.0
    );

    const music = this.sound.add('reaching', { volume });
    music.play();

    setTimeout(() => {
      this.scene.start('Level5');
    }, 4000);
  }
}

class Level5 extends Level {
  worldArray = [
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
    ['w', '1', 'a', 'a', 'a', 'rd4', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', '2', 'a', 'a', 'rd3', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 'rd2', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'rd1', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 'w'],
    ['w', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 'w'],
    ['w', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 't', 'w'],
    ['w', 'c', 't', 't', 't', 't', 't', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 't', 't', 't', 't', 't', 'a', 'a', 'a', 'a', 'a', 'c', 'a', 'c', 'a', 'c', 'w'],
    ['w', 'c', 't', 't', 't', 't', 't', 'a', 'a', 'a', 'a', 'a', 'a', 'c', 'a', 'c', 'a', 'w'],
    ['w', 'a', 't', 't', 't', 't', 't', 'a', 'a', 'a', 'a', 'a', 'c', 'a', 'c', 'a', 'c', 'w'],
    ['w', 'c', 't', 't', 't', 't', 't', 'a', 'a', 'a', 'a', 'a', 'a', 'c', 'a', 'c', 'a', 'w'],
    ['w', 'a', 't', 't', 't', 't', 't', 'a', 'a', 'a', 'a', 'a', 'c', 'a', 'c', 'a', 'c', 'w'],
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
  ];

  bgWorldArray = [
    ['8', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '9'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['45', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '46']
  ];

  constructor() {
    super({ key: 'Level5' });
    this.nextSceneKey = 'LevelIntro6';
  }

  create() {
    // put background first or make background depth negative so that it is in the back
    super.create();
    this.add
      .image(0, 0, 'bg')
      .setOrigin(0)
      .setDepth(-10);
    // level stuff
  }

}

class LevelIntro6 extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntro6' });
  }

  preload() {
    this.load.audio('financially', ['assets/audio/financially_independently.ogg']);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.title = this.add
      .text(0, 0, 'Financially Independently.', {
        font: '20px Courier',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setScrollFactor(0);

    this.title.setPosition(
      width / 2.0 - this.title.displayWidth / 2.0,
      height / 2.0 - this.title.displayHeight / 2.0
    );

    const music = this.sound.add('financially', { volume });
    music.play();

    setTimeout(() => {
      this.scene.start('Level6');
    }, 4000);
  }
}

class Level6 extends Level {
  // dodge spikes and fireballs easy
  worldArray = [
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
    ['w', 'c', 'a', 'a', 's', 's', 'w', 's', 'a', 'a', 'rd1', 'w', 'rd1', 'a', 'a', 'a', 'c', 'w'],
    ['w', 'a', 'a', 'a', 'w', 'a', 'w', 's', 'w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 's', 'w', 'c', 'w', 's', 'w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'w', 'w', 'a', 'w', 'a', 'w', 's', 'w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', '1', 'a', 's', 'w', 's', 'w', 'c', 'w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'c', 'w'],
    ['w', '2', 'a', 'w', 'w', 's', 's', 'a', 'w', 'w', 'a', 'a', 'a', 'ru1', 'w', 'ru4', 'w', 'w'],
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
  ];

  bgWorldArray = [
    ['8', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '9'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['45', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '46']
  ];

  constructor() {
    super({ key: 'Level6' });
    this.nextSceneKey = 'LevelIntro7';
  }

  create() {
    // put background first or make background depth negative so that it is in the back
    super.create();
    this.add
      .image(0, 0, 'bg')
      .setOrigin(0)
      .setDepth(-10);
    // level stuff
  }
}

class LevelIntro7 extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntro7' });
  }

  preload() {
    this.load.audio('saying', ['assets/audio/saying.ogg']);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.title = this.add
      .text(0, 0, 'I am saying...', {
        font: '20px Courier',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setScrollFactor(0);

    this.title.setPosition(
      width / 2.0 - this.title.displayWidth / 2.0,
      height / 2.0 - this.title.displayHeight / 2.0
    );

    const music = this.sound.add('saying');
    music.play();

    setTimeout(() => {
      this.scene.start('Level7');
    }, 4000);
  }
}

class Level7 extends Level { 
  // dodge spikes and fireballs more
  worldArray = [
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
    ['w', '1', 'a', 'rd5', 'a', 'a', 'a', 'w', 'c', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'c', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'c', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'c', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'c', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'c', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'c', 'w'],
    ['w', '2', 'ru5', 'a', 'a', 'a', 'a', 'w', 'c', 'w'],
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
  ];

  bgWorldArray = [
    [ '8', '10', '10', '10', '10', '10', '10', '10', '10', '9'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['45', '47', '47', '47', '47', '47', '47', '47', '47', '46']
  ];

  constructor() {
    super({ key: 'Level7' });
    this.nextSceneKey = 'LevelIntro8';
  }

  create() {
    // put background first or make background depth negative so that it is in the back
    super.create();
    this.add
      .image(0, 0, 'bg')
      .setOrigin(0)
      .setDepth(-10);
    // level stuff
  }
}

class LevelIntro8 extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntro8' });
  }

  preload() {
    this.load.audio('miss_me', ['assets/audio/miss_me_with_that.ogg']);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.title = this.add
      .text(0, 0, '...miss me with that bullshit.', {
        font: '20px Courier',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setScrollFactor(0);

    this.title.setPosition(
      width / 2.0 - this.title.displayWidth / 2.0,
      height / 2.0 - this.title.displayHeight / 2.0
    );

    const music = this.sound.add('miss_me');
    music.play();

    setTimeout(() => {
      this.scene.start('Level8');
    }, 4000);
  }
}

class Level8 extends Level {
  worldArray = [
    ['w', 'w', 'w', 'w', 'w', 'w'],
    ['w', 's', 'c', 'c', 's', 'w'],
    ['w', 'c', 's', 's', 'c', 'w'],
    ['w', 's', 'c', 'c', 's', 'w'],
    ['w', 'c', 's', 's', 'c', 'w'],
    ['w', 'c', 'rl1', 'rr1', 'a', 'w'],
    ['w', 'a', 'rl1', 'rr1', 'a', 'w'],
    ['w', 's', 's', 's', 's', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'rr9', 'a', 'a', 'rl9', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'w'],
    ['w', '1', 'a', 'a', '2', 'w'],
    ['w', 'w', 'w', 'w', 'w', 'w'],
  ];

  bgWorldArray = [
    ['792', '832', '832', '832', '832', '793'],
    ['795', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '794'],
    ['829', '831', '831', '831', '831', '830']
  ];

  constructor() {
    super({ key: 'Level8' });
    this.nextSceneKey = 'LevelIntro9';
  }

  create() {
    // put background first or make background depth negative so that it is in the back
    super.create();
    this.add
      .image(0, 0, 'bg')
      .setOrigin(0)
      .setDepth(-10);
    // level stuff
  }
}

class LevelIntro9 extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntro9' });
  }

  preload() {
    this.load.audio('murder_everything', ['assets/audio/murder_everything.ogg']);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.title = this.add
      .text(0, 0, 'chitty chitty bang', {
        font: '20px Courier',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setScrollFactor(0);

    this.title.setPosition(
      width / 2.0 - this.title.displayWidth / 2.0,
      height / 2.0 - this.title.displayHeight / 2.0
    );

    const music = this.sound.add('murder_everything');
    music.play();

    setTimeout(() => {
      this.scene.start('Level9');
    }, 4000);
  }
}

class Level9 extends Level { 

  worldArray = [
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
    ['w', 'c', 'a', 'a', 'a', 'rd2', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'rd2', 'a', 'w', 'a', 'w'],
    ['w', 'a', 'w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w', 'c', 'w'],
    ['w', 'c', 'w', 'a', 'a', 'a', 'rr2', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w', 'a', 'w'],
    ['w', 'a', 'w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'rl4', 'w', 'c', 'w'],
    ['w', 'c', 'w', 'rr4', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w', 'a', 'w'],
    ['w', 'a', 'w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w', 'c', 'w'],
    ['w', 'c', 'w', 'a', 'a', 'a', 'a', 'a', 't', 't', 'a', 'a', 'a', 'a', 'a', 'w', 'a', 'w'],
    ['w', 'a', 'w', 'a', 'a', 'a', 'a', 't', '1', '2', 't', 'a', 'a', 'a', 'a', 'w', 'c', 'w'],
    ['w', 'c', 'w', 'a', 'a', 'a', 'a', 'a', 't', 't', 'a', 'a', 'a', 'a', 'a', 'w', 'a', 'w'],
    ['w', 'a', 'w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w', 'c', 'w'],
    ['w', 'c', 'w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'rl4', 'w', 'a', 'w'],
    ['w', 'a', 'w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w', 'c', 'w'],
    ['w', 'c', 'w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w', 'a', 'w'],
    ['w', 'a', 'w', 'a', 'a', 'a', 'a', 'ru2', 'a', 'a', 'ru2', 'a', 'a', 'a', 'a', 'a', 'c', 'w'],
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
  ];

  bgWorldArray = [
    ['8', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '9'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['45', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '46']
  ];

  constructor() {
    super({ key: 'Level9' });
    this.nextSceneKey = 'LevelIntro10';
  }

  create() {
    // put background first or make background depth negative so that it is in the back
    super.create();
    this.add
      .image(0, 0, 'bg')
      .setOrigin(0)
      .setDepth(-10);
    // level stuff
  }

}

class LevelIntro10 extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntro10' });
  }

  preload() {
    this.load.audio('scam', ['assets/audio/thats_a_scam.ogg']);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.title = this.add
      .text(0, 0, 'No One Would Throw Me Under The Bus.', {
        font: '20px Courier',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setScrollFactor(0);

    this.title.setPosition(
      width / 2.0 - this.title.displayWidth / 2.0,
      height / 2.0 - this.title.displayHeight / 2.0
    );

    const music = this.sound.add('scam');
    music.play();

    setTimeout(() => {
      this.scene.start('Level10');
    }, 4000);
  }
}

class Level10 extends Level {
  //scam
  worldArray = [
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
    ['w', '2', 'rd1', 'rd1', 'a', 'a', 'c', 'w'],
    ['w', '1', 'a', 'a', 't', 'a', 'a', 'w'],
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
  ];

  bgWorldArray = [
    ['792', '832', '832', '832', '832', '832', '832', '793'],
    ['795', '714', '714', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '714', '714', '794'],
    ['795', '714', '714', '714', '714', '714', '714', '794'],
    ['829', '831', '831', '831', '831', '831', '831', '830']
  ];

  constructor() {
    super({ key: 'Level10' });
    this.nextSceneKey = 'LevelIntro11';
  }

  create() {
    // put background first or make background depth negative so that it is in the back
    super.create();
    this.add
      .image(0, 0, 'bg')
      .setOrigin(0)
      .setDepth(-10);
    // level stuff
  }
 }

class LevelIntro11 extends LevelIntro {

  constructor() {
    super({ key: 'LevelIntro11' });
  }

  preload() {
    this.load.audio('faith', ['assets/audio/faith_and_belief.ogg']);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.title = this.add
      .text(0, 0, 'Believe In Your Timing.', {
        font: '20px Courier',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setScrollFactor(0);

    this.title.setPosition(
      width / 2.0 - this.title.displayWidth / 2.0,
      height / 2.0 - this.title.displayHeight / 2.0
    );

    const music = this.sound.add('faith');
    music.play();

    setTimeout(() => {
      this.scene.start('Level11');
    }, 4000);
  }

}

class Level11 extends Level {

  // tricky timing
  // push trash while on spike puzzle a,t,s,1
  worldArray = [
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
    ['w', '1', 's', 't', 's', 's', 'a', 'a', 'w', 'a', 'a', 's', 't', 's', 'w', 'w', 'w', 'w'],
    ['w', 'w', 'w', 'w', 'w', 's', 'a', 'c', 'w', 'c', 'a', 'w', 's', 't', 's', 's', '2', 'w'],
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
  ];

  bgWorldArray = [
    ['8', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '9'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['45', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '46']
  ];

  constructor() {
    super({ key: 'Level11' });
    this.nextSceneKey = 'LevelIntro12';
  }

  create() {
    // put background first or make background depth negative so that it is in the back
    super.create();
    this.add
      .image(0, 0, 'bg')
      .setOrigin(0)
      .setDepth(-10);
    // level stuff
  }
}

class LevelIntro12 extends LevelIntro {

  constructor() {
    super({ key: 'LevelIntro12' });
  }

  preload() {
    this.load.audio('going', ['assets/audio/hey_youre_going.ogg']);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.title = this.add
      .text(0, 0, 'Push through.\nRed doesn\'t mean you can\'t.', {
        font: '20px Courier',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setScrollFactor(0);

    this.title.setPosition(
      width / 2.0 - this.title.displayWidth / 2.0,
      height / 2.0 - this.title.displayHeight / 2.0
    );

    const music = this.sound.add('going', { volume });
    music.play();

    setTimeout(() => {
      this.scene.start('Level12');
    }, 3000);
  }

}

class Level12 extends Level {
  // push fire ball into other cannons
  worldArray = [
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
    ['w', 'a', 'a', 'a', 'w', 'a', 'a', 'w', 'a', 'w'],
    ['w', 'a', 'a', 'a', 'rl1', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 'a', 'rl1', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 'a', 'rl1', 'a', 'a', 'a', 'c', 'w'],
    ['w', 'a', 'a', 'a', 'rl1', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 'a', 'w', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 'ru9', 'w', 'a', 'a', 'a', 'a', 'w'],
    ['w', '2', '1', 'a', 'w', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
  ];

  bgWorldArray = [
    [ '8', '10', '10', '10', '10', '10', '10', '10', '10', '9'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['45', '47', '47', '47', '47', '47', '47', '47', '47', '46']
  ];

  constructor() {
    super({ key: 'Level12' });
    this.nextSceneKey = 'LevelIntro13';
  }

  create() {
    // put background first or make background depth negative so that it is in the back
    super.create();
    this.add
      .image(0, 0, 'bg')
      .setOrigin(0)
      .setDepth(-10);
    // level stuff
  }
}

class LevelIntro13 extends LevelIntro {

  constructor() {
    super({ key: 'LevelIntro13' });
  }

  preload() {
    this.load.audio('love', ['assets/audio/i_love.ogg']);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.title = this.add
      .text(0, 0, 'Homelessness or:\nHow I Learned to Stop Worrying\nand Love BitConnect?', {
        font: '20px Courier',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setScrollFactor(0);

    this.title.setPosition(
      width / 2.0 - this.title.displayWidth / 2.0,
      height / 2.0 - this.title.displayHeight / 2.0
    );

    const music = this.sound.add('love', { volume });
    music.play();

    setTimeout(() => {
      this.scene.start('Level13');
    }, 5000);
  }

}

class Level13 extends Level {
  worldArray = [
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
    ['w', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'rr2', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'rl2', 'a', 'w'],
    ['w', 'a', 'a', 't', 't', 't', 'a', 't', 't', 't', 'a', 't', 't', 't', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 't', 'c', 't', 'a', 'a', 't', 'a', 'a', 'a', 't', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 't', 't', 't', 'a', 'a', 't', '2', 'a', 'a', 't', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 't', 'a', 't', 'a', 'a', 't', '1', 'a', 'a', 't', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'a', 'a', 't', 't', 't', 'a', 't', 't', 't', 'a', 'a', 't', 'a', 'a', 'a', 'a', 'w'],
    ['w', 'rr9', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'rl9', 'w'],
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
  ];

  bgWorldArray = [
    ['8', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '10', '9'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '51', '14', '14', '51', '51', '51', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['11', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '14', '48'],
    ['45', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '47', '46']
  ];

  constructor() {
    super({ key: 'Level13' });
    this.nextSceneKey = 'LevelIntroEnd';
  }

  create() {
    // put background first or make background depth negative so that it is in the back
    super.create();
    this.add
      .image(0, 0, 'bg')
      .setOrigin(0)
      .setDepth(-10);
    // level stuff
  }
}

class LevelIntroEnd extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntroEnd' });
  }

  preload() {
    this.load.audio('loser', ['assets/audio/whatafuckingloser.ogg']);
    this.load.audio('outro', ['assets/audio/disneybitconnect.ogg']);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.title = this.add
      .text(0, 0, 'Unfortunately Bitconnect is a scam.\n\nYou lose.', {
        font: '20px Courier',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setScrollFactor(0);

    this.title.setPosition(
      width / 2.0 - this.title.displayWidth / 2.0,
      height / 2.0 - this.title.displayHeight / 2.0
    );

    const music = this.sound.add('loser', { volume: 0.8 });
    const outro = this.sound.add('outro', { volume });
    music.play();
    music.on('complete', () => { 
      outro.play();
    });

    setTimeout(() => {
      this.scene.start('LevelLogo');
    }, 10000);
  }

  update(time, delta) { }
}

// --------------------------------------
// Game Init
// --------------------------------------

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
  scene: [LevelLogo,
     LevelIntro1, Level1,
     LevelIntro2, Level2,
     LevelIntro3, Level3,
     LevelIntro4, Level4,
     LevelIntro5, Level5,
     LevelIntro6, Level6,
     LevelIntro7, Level7,
     LevelIntro8, Level8,
     LevelIntro9, Level9,
     LevelIntro10, Level10,
     LevelIntro11, Level11,
     LevelIntro12, Level12,
     LevelIntro13, Level13
  ]
  //scene: [Level9]
};

const game = new Phaser.Game(config); // main process
