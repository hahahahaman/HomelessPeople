import Phaser from 'phaser';

function preload() {
  this.load.setBaseURL('../..');
  this.load.image('sky', 'assets/sky.png');
  this.load.image('ground', 'assets/platform.png');
  this.load.image('star', 'assets/star.png');
  this.load.image('bomb', 'assets/bomb.png');
  this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
}

let player;
let platforms;
let cursors;
let stars;
let bombs;

let score = 0;
let scoreText;
let gameOver = false;

function collectStar(playerCollided, star) {
  star.disableBody(true, true);

  score += 10;
  scoreText.setText(`Score: ${score}`);

  if (stars.countActive(true) === 0) {
    stars.children.iterate((child) => {
      child.enableBody(true, child.x, 0, true, true); // params: reset(reset body and place at x,y), x, y, enableGameObject(activate game object), showGameObject
    });

    const x = player.x < 400 ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);

    const bomb = bombs.create(x, 16, 'bomb'); // params: x,y,key,frame,visible,active
    bomb.setBounce(1);
    bomb.setCollideWorldBounds(true);
    bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
  }
}

function hitBomb(playerCollided, bomb) {
  this.physics.pause();

  player.setTint(0xff0000);

  player.anims.play('turn');

  gameOver = true;
}

function create() {
  this.add.image(400, 300, 'sky'); // game object's origin is always the center

  platforms = this.physics.add.staticGroup(); // physics object that never moves

  platforms
    .create(400, 568, 'ground')
    .setScale(2)
    .refreshBody(); // refreshBody tells physics world it changed.

  platforms.create(600, 400, 'ground');
  platforms.create(50, 250, 'ground');
  platforms.create(750, 220, 'ground');

  player = this.physics.add.sprite(100, 450, 'dude');

  player.setBounce(0.2); // after landing, player will bounce ever so slightly
  player.setCollideWorldBounds(true); // world bounds, by default, is same as window bound

  this.anims.create({
    key: 'left',
    frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1 // Tells the animation to repeat, -1
  });

  this.anims.create({
    key: 'turn',
    frames: [{ key: 'dude', frame: 4 }],
    frameRate: 20
  });

  this.anims.create({
    key: 'right',
    frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });

  this.physics.add.collider(player, platforms);
  cursors = this.input.keyboard.createCursorKeys();

  stars = this.physics.add.group({
    key: 'star', // sets texture to star image
    repeat: 11, // creates 1 child by default + 11 repeat = 12 children
    setXY: { x: 12, y: 0, stepX: 70 } // each child is create with +70 on x axis
  });

  stars.children.iterate((child) => {
    child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
  });

  this.physics.add.collider(stars, platforms);
  this.physics.add.overlap(player, stars, collectStar, null, this); // params: object1, object2, callback if collided, additional checks for collision if collided, callbackContext

  scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });

  bombs = this.physics.add.group();
  this.physics.add.collider(bombs, platforms);
  this.physics.add.collider(player, bombs, hitBomb, null, this);
}

function update() {
  if (cursors.left.isDown) {
    player.setVelocityX(-160);

    player.anims.play('left', true);
  } else if (cursors.right.isDown) {
    player.setVelocityX(160);

    player.anims.play('right', true);
  } else {
    player.setVelocityX(0);

    player.anims.play('turn');
  }

  if (cursors.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },
      debug: false
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

const game = new Phaser.Game(config); // main process
