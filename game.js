const TILE_SIZE = 48; // Diperbesar biar lebih HD
const GRID_COLS = 15;
const GRID_ROWS = 10;

const config = {
    type: Phaser.AUTO,
    width: TILE_SIZE * GRID_COLS,
    height: TILE_SIZE * GRID_ROWS,
    parent: 'game-container',
    backgroundColor: '#4a7c59',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
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
let gridData = []; // Nyimpen data tiap kotak (rumput/tanah)
let cursors;
let wasd;
let joystick;
let actionBtn;

function preload() {
    document.getElementById('loading').style.display = 'none';
    createProceduralAssets(this);
}

function create() {
    // 1. Generate Grid Lahan
    for (let x = 0; x < GRID_COLS; x++) {
        gridData[x] = [];
        for (let y = 0; y < GRID_ROWS; y++) {
            let tileKey = (x + y) % 2 === 0 ? 'grass' : 'grass_dark';
            let tile = this.add.image(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, tileKey);
            
            // Simpan data tile
            gridData[x][y] = {
                sprite: tile,
                type: 'grass', // 'grass' atau 'dirt'
                x: x,
                y: y
            };

            // Garis grid tipis
            let gridLine = this.add.rectangle(tile.x, tile.y, TILE_SIZE, TILE_SIZE);
            gridLine.setStrokeStyle(1, 0x000000, 0.1);
            gridLine.setFillStyle(0x000000, 0);
        }
    }

    // 2. Karakter Player
    player = this.physics.add.sprite((GRID_COLS / 2) * TILE_SIZE, (GRID_ROWS / 2) * TILE_SIZE, 'player');
    player.setCollideWorldBounds(true);
    
    // Bikin karakter lebih "hidup" (efek shadow)
    player.setScale(0.8); // Skala disesuain biar proporsional sama tile

    // 3. Setup Keyboard (Buat ngetes di laptop)
    cursors = this.input.keyboard.createCursorKeys();
    wasd = this.input.keyboard.addKeys('W,A,S,D');

    // 4. Setup Virtual Joystick (Kiri Bawah)
    this.createVirtualJoystick();

    // 5. Setup Tombol Aksi (Kanan Bawah)
    this.createActionButton();
}

function update() {
    const speed = 200;
    let vx = 0;
    let vy = 0;

    // Cek Input Keyboard
    if (cursors.left.isDown || wasd.A.isDown) vx = -speed;
    else if (cursors.right.isDown || wasd.D.isDown) vx = speed;
    if (cursors.up.isDown || wasd.W.isDown) vy = -speed;
    else if (cursors.down.isDown || wasd.S.isDown) vy = speed;

    // Cek Input Joystick
    if (joystick && joystick.forceX !== 0) vx = joystick.forceX * speed;
    if (joystick && joystick.forceY !== 0) vy = joystick.forceY * speed;

    player.setVelocity(vx, vy);

    // Efek "Bounce" pas jalan
    if (vx !== 0 || vy !== 0) {
        player.setScale(0.8, 0.8 + Math.sin(this.time.now / 100) * 0.05);
    } else {
        player.setScale(0.8, 0.8);
    }
}

// --- FUNGSI-FUNGSI BANTUAN ---

// Bikin Analog Virtual
Phaser.Scene.prototype.createVirtualJoystick = function() {
    const baseX = 90;
    const baseY = this.cameras.main.height - 90;

    // Base Joystick
    const base = this.add.circle(baseX, baseY, 50, 0x000000, 0.3).setScrollFactor(0).setInteractive();
    base.setStrokeStyle(4, 0xffffff, 0.5);

    // Knob Joystick
    const knob = this.add.circle(baseX, baseY, 25, 0xffffff, 0.6).setScrollFactor(0);
    
    // Input
    let pointerDown = false;

    this.input.on('pointerdown', (pointer) => {
        // Cek apakah yang disentuh area joystick (radius 100px dari base)
        if (Phaser.Math.Distance.Between(pointer.x, pointer.y, baseX, baseY) < 100) {
            pointerDown = true;
        }
    });

    this.input.on('pointermove', (pointer) => {
        if (pointerDown) {
            const angle = Phaser.Math.Angle.Between(baseX, baseY, pointer.x, pointer.y);
            const distance = Math.min(Phaser.Math.Distance.Between(baseX, baseY, pointer.x, pointer.y), 40);
            
            const knobX = baseX + Math.cos(angle) * distance;
            const knobY = baseY + Math.sin(angle) * distance;
            
            knob.setPosition(knobX, knobY);

            // Simpan arah (normalisasi -1 sampai 1)
            joystick = {
                forceX: Math.cos(angle) * (distance / 40),
                forceY: Math.sin(angle) * (distance / 40)
            };
        }
    });

    this.input.on('pointerup', () => {
        pointerDown = false;
        knob.setPosition(baseX, baseY);
        joystick = { forceX: 0, forceY: 0 };
    });
};

// Bikin Tombol Aksi (Cangkul)
Phaser.Scene.prototype.createActionButton = function() {
    const btnX = this.cameras.main.width - 80;
    const btnY = this.cameras.main.height - 80;

    // Lingkaran Tombol
    const btn = this.add.circle(btnX, btnY, 45, 0x22c55e, 0.8).setScrollFactor(0).setInteractive();
    btn.setStrokeStyle(4, 0xffffff, 0.5);

    // Icon (Pake teks dulu)
    const btnText = this.add.text(btnX, btnY, '⛏️', { fontSize: '32px' }).setOrigin(0.5).setScrollFactor(0);

    // Aksi pas diklik
    btn.on('pointerdown', () => {
        this.tryHoe();
        
        // Animasi tombol pencet
        this.tweens.add({
            targets: [btn, btnText],
            scale: 0.9,
            duration: 50,
            yoyo: true
        });
    });
};

// Logika Nyangkul (Interaksi)
Phaser.Scene.prototype.tryHoe = function() {
    // Cari posisi grid tempat player berdiri
    const gridX = Math.floor(player.x / TILE_SIZE);
    const gridY = Math.floor(player.y / TILE_SIZE);

    // Cek apakah posisi valid
    if (gridX >= 0 && gridX < GRID_COLS && gridY >= 0 && gridY < GRID_ROWS) {
        const tile = gridData[gridX][gridY];
        
        // Kalau masih rumput, ubah jadi tanah
        if (tile.type === 'grass') {
            tile.type = 'dirt';
            tile.sprite.setTexture('dirt'); // Ganti gambar ke tanah
            
            // Efek partikel debu
            this.add.particles(tile.sprite.x, tile.sprite.y, 'particle', {
                speed: { min: 20, max: 50 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.5, end: 0 },
                lifespan: 400,
                quantity: 8
            });
        } else {
            // Kalau udah tanah, balikin jadi rumput (opsional)
            tile.type = 'grass';
            tile.sprite.setTexture('grass');
        }
    }
};

// Bikin Aset Pixel Art Lanjutan (HD)
function createProceduralAssets(scene) {
    // --- ASSET RUMPUT ---
    let grassCanvas = scene.textures.createCanvas('grass', TILE_SIZE, TILE_SIZE);
    let gCtx = grassCanvas.getContext();
    gCtx.fillStyle = '#5c9e68';
    gCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    gCtx.fillStyle = '#4d8a57';
    gCtx.fillRect(12, 12, 6, 6);
    gCtx.fillRect(36, 30, 6, 6);
    grassCanvas.refresh();

    // --- ASSET RUMPUT GELAP ---
    let grassDarkCanvas = scene.textures.createCanvas('grass_dark', TILE_SIZE, TILE_SIZE);
    let gdCtx = grassDarkCanvas.getContext();
    gdCtx.fillStyle = '#52925e';
    gdCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    gdCtx.fillStyle = '#468252';
    gdCtx.fillRect(12, 12, 6, 6);
    gdCtx.fillRect(36, 30, 6, 6);
    grassDarkCanvas.refresh();

    // --- ASSET TANAH BAJAK ---
    let dirtCanvas = scene.textures.createCanvas('dirt', TILE_SIZE, TILE_SIZE);
    let dCtx = dirtCanvas.getContext();
    dCtx.fillStyle = '#8b5a2b';
    dCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    dCtx.fillStyle = '#6d451f';
    dCtx.fillRect(6, 18, 12, 8);
    dCtx.fillRect(30, 36, 10, 8);
    dCtx.fillRect(24, 6, 8, 8);
    dirtCanvas.refresh();

    // --- ASSET PLAYER (Karakter HD dikit) ---
    let playerCanvas = scene.textures.createCanvas('player', TILE_SIZE, TILE_SIZE);
    let pCtx = playerCanvas.getContext();
    // Baju
    pCtx.fillStyle = '#2563eb';
    pCtx.fillRect(12, 16, 24, 24);
    // Kulit / Kepala
    pCtx.fillStyle = '#fcd34d';
    pCtx.fillRect(12, 8, 24, 12);
    // Topi
    pCtx.fillStyle = '#ef4444';
    pCtx.fillRect(8, 4, 32, 8);
    // Mata
    pCtx.fillStyle = '#111827';
    pCtx.fillRect(18, 14, 4, 4);
    pCtx.fillRect(26, 14, 4, 4);
    // Kaki
    pCtx.fillStyle = '#1e3a8a';
    pCtx.fillRect(14, 40, 8, 4);
    pCtx.fillRect(26, 40, 8, 4);
    playerCanvas.refresh();

    // --- ASSET PARTIKEL (Buat Efek Debu) ---
    let particleCanvas = scene.textures.createCanvas('particle', 8, 8);
    let ptCtx = particleCanvas.getContext();
    ptCtx.fillStyle = '#8b5a2b';
    ptCtx.beginPath();
    ptCtx.arc(4, 4, 4, 0, Math.PI * 2);
    ptCtx.fill();
    particleCanvas.refresh();
}
