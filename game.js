const TILE_SIZE = 32;
const GRID_COLS = 15;
const GRID_ROWS = 20;

const config = {
    type: Phaser.AUTO,
    width: TILE_SIZE * GRID_COLS,
    height: TILE_SIZE * GRID_ROWS,
    parent: 'game-container',
    backgroundColor: '#4a7c59',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player;
let cursors;
let wasd;

function preload() {
    document.getElementById('loading').style.display = 'none';
    createProceduralAssets(this);
}

function create() {
    this.gridGroup = this.physics.add.staticGroup();

    for (let x = 0; x < GRID_COLS; x++) {
        for (let y = 0; y < GRID_ROWS; y++) {
            let tileKey = (x + y) % 2 === 0 ? 'grass' : 'dirt';
            let tile = this.add.image(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, tileKey);
            
            let gridLine = this.add.rectangle(tile.x, tile.y, TILE_SIZE, TILE_SIZE);
            gridLine.setStrokeStyle(1, 0x000000, 0.1);
            gridLine.setFillStyle(0x000000, 0);
        }
    }

    player = this.physics.add.sprite((GRID_COLS / 2) * TILE_SIZE, (GRID_ROWS / 2) * TILE_SIZE, 'player');
    player.setCollideWorldBounds(true);

    cursors = this.input.keyboard.createCursorKeys();
    wasd = this.input.keyboard.addKeys('W,A,S,D');
}

function update() {
    const speed = 150;
    player.setVelocity(0);

    if (cursors.left.isDown || wasd.A.isDown) player.setVelocityX(-speed);
    else if (cursors.right.isDown || wasd.D.isDown) player.setVelocityX(speed);

    if (cursors.up.isDown || wasd.W.isDown) player.setVelocityY(-speed);
    else if (cursors.down.isDown || wasd.S.isDown) player.setVelocityY(speed);
}

function createProceduralAssets(scene) {
    let grassCanvas = scene.textures.createCanvas('grass', TILE_SIZE, TILE_SIZE);
    let gCtx = grassCanvas.getContext();
    gCtx.fillStyle = '#5c9e68';
    gCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    gCtx.fillStyle = '#4d8a57';
    gCtx.fillRect(8, 8, 4, 4);
    gCtx.fillRect(24, 20, 4, 4);
    grassCanvas.refresh();

    let dirtCanvas = scene.textures.createCanvas('dirt', TILE_SIZE, TILE_SIZE);
    let dCtx = dirtCanvas.getContext();
    dCtx.fillStyle = '#8b5a2b';
    dCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    dCtx.fillStyle = '#6d451f';
    dCtx.fillRect(4, 12, 8, 6);
    dCtx.fillRect(20, 24, 6, 6);
    dirtCanvas.refresh();

    let playerCanvas = scene.textures.createCanvas('player', TILE_SIZE, TILE_SIZE);
    let pCtx = playerCanvas.getContext();
    pCtx.fillStyle = '#3b82f6';
    pCtx.fillRect(4, 8, 24, 24);
    pCtx.fillStyle = '#fcd34d';
    pCtx.fillRect(4, 4, 24, 4);
    pCtx.fillStyle = '#111827';
    pCtx.fillRect(12, 16, 2, 2);
    pCtx.fillRect(18, 16, 2, 2);
    playerCanvas.refresh();
}
