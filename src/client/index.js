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
  COIN: 'obj_coin',
  TUTORIAL: 'obj_tutorial'
};

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
let objWorld;

let player;
let player2;
let tutorial;
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
let worldHeight;
let worldWidth;

let coins;
let win = false;
let gameOver = false;
let entities;
let selectableEntities;
let drawFuncs;

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
    color = 0xffffff,
    state = STATE.IDLE,
    depth = 0,
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
    type = TYPE.SPIKE, color = 0xff0000, x = 0, y = 0, idle = () => {}
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
  } else if (values.type === TYPE.SPIKE) {
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

// --------------------------------------
// Scenes
// --------------------------------------

class LevelIntro extends Phaser.Scene {
  title;

  preload() {
    this.load.setBaseURL('../..');
  }

  create() {}

  update(time, delta) {}
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
        'Homeless People\n\nDiscretely Getting Money\n\nto Invest in Bitconnect.',
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

  preload() {
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

    this.load.spritesheet('dungeon', 'assets/assets_dungeon.png', {
      frameWidth: 32,
      frameHeight: 32,
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
  }

  create() {
    // stop the right click menu from popping up
    this.input.mouse.disableContextMenu();

    //  If you disable topOnly it will fire events for all objects the pointer is over
    //  regardless of their place on the display list
    this.input.setTopOnly(true);

    levelTime = 0.0;

    coins = 0;
    win = false;
    gameOver = false;

    entities = new Set();
    drawFuncs = new Set();

    selectableEntities = [];

    const volume = 0.3;
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
        console.log('restart');
        this.scene.restart();
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

    // initialize entities
    entities.add(player);
    entities.add(player2);

    entities.forEach((entity) => {
      setEntity(this, entity, {
        depth: 1,
        idle: () => {
          entity.anims.play('idle', true);
        }
      }); // initialize data values
    });

    player.data.set('color', 0x00aaaa);
    player2.data.set('color', 0x0000ff);

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
          player.data.values.x = x;
          player.data.values.y = y;
          player.data.values.end_x = x;
          player.data.values.end_y = y;
        }
        if (this.worldArray[y][x] === '2') {
          player2.data.values.x = x;
          player2.data.values.y = y;
          player2.data.values.end_x = x;
          player2.data.values.end_y = y;
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
            y
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
          font: '20px Courier',
          fill: '#ffffff'
        })
        .setScrollFactor(0);
    }
  }

  update(time, delta) {
    if (coins === 0) {
      if (!win) {
        win = true;

        setTimeout(() => {
          if (this.nextSceneKey) this.scene.start(this.nextSceneKey);
          else this.scene.restart();
        }, 6000);
      }
    }

    if (gameOver && !win) {
      this.scene.restart();
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
      drawFuncs.forEach((func) => {
        func();
      });

      // handle all Entities
      entities.forEach((entity) => {
        const values = entity.data.values;
        const deque = values.actionsDeque;

        if (values.state !== STATE.EXPLODE && values.type !== TYPE.TUTORIAL) {
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
          } else if (values.type !== TYPE.TUTORIAL) {
            // action not done, or action execution on start instead of end.
            action.elapsed += dt;
            values.state = action.state;

            if (values.state === STATE.EXPLODE) {
              entity.anims
                .play('explosion', true)
                .setScale(0.8)
                .setOrigin(0.5, 0.8)
                .setDepth(10);

              // play explosion sound
              this.explosionSounds[Phaser.Math.Between(0, this.explosionSounds.length - 1)].play();
            } else if (values.state === STATE.MOVE) {
              entity.anims.play('walk_right', true);

              if (direction !== null && direction !== values.direction) {
                entity.flipX = !entity.flipX;
                values.direction = direction;
              }
            }

            if (values.type === TYPE.SPIKE) {
              values.action_elapsed_time += dt;
              if (action.state === STATE.SPIKE_UP) {
                objWorld[values.y][values.x].forEach((obj) => {
                  if (obj !== entity) {
                    predisableEntity(obj);
                    makeExplodeAction(obj);
                  }
                });
              } else if (action.state === STATE.IDLE) {
                // console.log('idle');
                entity.setTexture('spike_1');
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
          values.state = STATE.IDLE;
          values.idle();
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
        this.cameras.main.width - clockText.displayWidth,
        0
      );
    } else {
      // paused, do something
    }
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
    ['w', 'a', 'w', 'a', 'w', 'w', 'w', 'w', 'w'],
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
    }, 'tut_scroll', 0.5, 10);

    makeTutorialAction(tutorial, 4, 11, () => {
      const values = tutorial.data.values;
      if (values.action_elapsed_time > values.action_total_time) {
        console.log('time up');
        return true;
      }
      return false;
    }, 'tut_wasd', 0.5, 15);

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

    const music = this.sound.add('coming', { volume: 0.3 });
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

    const music = this.sound.add('wife', { volume: 0.3 });
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

    const music = this.sound.add('coming');
    music.play();

    setTimeout(() => {
      this.scene.start('Level4');
    }, 4000);
  }
}

class Level4 extends Level {
  worldArray = [
    ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
    ['w', '1', 's', 'a', 't', 'a', 'a', 'a', 'w', 'a', 'a', 't', 'a', 'a', 'w', 's', 'c', 'w'],
    ['w', 's', 's', 'a', 'w', 'a', 'c', 'a', 't', 'a', 'a', 'w', 'a', 'a', 't', 's', 'w', 'w'],
    ['w', 'a', 's', 'c', 't', 'a', 'a', 'a', 'w', 'a', 'a', 't', 'a', 'a', 'w', 's', 'c', 'w'],
    ['w', 'a', 's', 'a', 'w', 'a', 'c', 'c', 't', 'a', 'a', 'w', 'a', 'a', 't', 's', 'w', 'w'],
    ['w', 'a', 's', 'w', 't', 'a', 'a', 'a', 'w', 'a', 'a', 't', 'a', 'a', 'w', 's', 'a', 'w'],
    ['w', 'a', 's', 'a', 't', 'a', 'a', 'a', 'w', 'a', 'a', 't', 'a', 'a', 'w', 's', 'c', 'w'],
    ['w', 'a', 's', 'a', 'a', 'a', 'a', 'a', 'w', 'a', 'a', 't', 'a', 'a', 'w', 's', 'c', 'w'],
    ['w', 'a', 's', 'a', 'w', 'a', 'a', 'a', 't', 'a', 'a', 'w', 'a', 'a', 't', 's', 'w', 'w'],
    ['w', 'a', 's', 'a', 'w', 'a', 'a', 'a', 't', 'a', 'a', 'w', 'a', 'a', 't', 's', 'w', 'w'],
    ['w', 'a', 's', 'a', 't', 'a', 'a', 'a', 't', 'a', 'a', 'w', 'a', 'a', 't', 's', '2', 'w'],
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

    const music = this.sound.add('coming');
    music.play();

    setTimeout(() => {
      this.scene.start('Level5');
    }, 4000);
  }
}

class Level5 extends Level { }

class LevelIntro6 extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntro6' });
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

    const music = this.sound.add('coming');
    music.play();

    setTimeout(() => {
      this.scene.start('Level6');
    }, 4000);
  }
}

class Level6 extends Level { }

class LevelIntro7 extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntro7' });
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

    const music = this.sound.add('coming');
    music.play();

    setTimeout(() => {
      this.scene.start('Level7');
    }, 4000);
  }
}

class Level7 extends Level { }

class LevelIntro8 extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntro8' });
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

    const music = this.sound.add('coming');
    music.play();

    setTimeout(() => {
      this.scene.start('Level8');
    }, 4000);
  }
}

class Level8 extends Level {
  worldArray = [
    ['w', 'w', 'w', 'w'],
    ['w', 'c', 's', 'w'],
    ['w', 's', 'c', 'w'],
    ['w', 'c', 's', 'w'],
    ['w', 's', 'c', 'w'],
    ['w', 'c', 's', 'w'],
    ['w', 's', 's', 'w'],
    ['w', 's', 's', 'w'],
    ['w', 's', 's', 'w'],
    ['w', 's', 's', 'w'],
    ['w', 's', 's', 'w'],
    ['w', 's', 's', 'w'],
    ['w', 's', 's', 'w'],
    ['w', 'a', 'a', 'w'],
    ['w', 's', 's', 'w'],
    ['w', 's', 's', 'w'],
    ['w', 's', 's', 'w'],
    ['w', 's', 's', 'w'],
    ['w', '2', '1', 'w'],
    ['w', 'w', 'w', 'w'],
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
    super({ key: 'Level8' });
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

class LevelIntro9 extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntro9' });
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

    const music = this.sound.add('coming');
    music.play();

    setTimeout(() => {
      this.scene.start('Level9');
    }, 4000);
  }
}

class Level9 extends Level { }

class LevelIntro10 extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntro10' });
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

    const music = this.sound.add('coming');
    music.play();

    setTimeout(() => {
      this.scene.start('Level10');
    }, 4000);
  }
}

class Level10 extends Level { }

class LevelIntroEnd extends LevelIntro {
  constructor() {
    super({ key: 'LevelIntroEnd' });
  }

  preload() {
    this.load.audio('outro', ['assets/audio/whatafuckingloser.ogg']);
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

    const music = this.sound.add('outro');
    music.play();

    setTimeout(() => {
      this.scene.start('LevelIntro1');
    }, 5000);
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
  /*
  scene: {
    preload,
    create,
    update
  }
  */
  // scene: [LevelIntro1, Level1, LevelIntro2, Level2, LevelIntro3, Level3]
  scene: [Level1]
};

const game = new Phaser.Game(config); // main process
