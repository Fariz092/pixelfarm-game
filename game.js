// --- SETUP DASAR ---
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

const TILE = 48; 
const COLS = 20; // Map lebih kecil (20 kotak)
const ROWS = 15; // Map lebih kecil (15 kotak)
let VIEW_W, VIEW_H;

// --- LOAD GAMBAR ---
const playerImages = {
    left: { walk1: new Image(), idle: new Image(), walk2: new Image() },
    right: { walk1: new Image(), idle: new Image(), walk2: new Image() },
    up: { walk1: new Image(), idle: new Image(), walk2: new Image() },
    down: { walk1: new Image(), idle: new Image(), walk2: new Image() }
};

playerImages.left.walk1.src = 'kiri_langkah1.png';
playerImages.left.idle.src = 'kiri_diem.png';
playerImages.left.walk2.src = 'kiri_langkah2.png';

playerImages.right.walk1.src = 'kanan_langkah1.png';
playerImages.right.idle.src = 'kanan_diem.png';
playerImages.right.walk2.src = 'kanan_langkah2.png';

playerImages.up.walk1.src = 'atas_langkah1.png';
playerImages.up.idle.src = 'atas_diem.png';
playerImages.up.walk2.src = 'atas_langkah2.png';

playerImages.down.walk1.src = 'bawah_langkah1.png';
playerImages.down.idle.src = 'bawah_diem.png';
playerImages.down.walk2.src = 'bawah_langkah2.png';

// --- DATA MAP ---
const map = [];
for(let y=0;y<ROWS;y++){
  map[y]=[];
  for(let x=0;x<COLS;x++){
    let type = 0; // 0 = Rumput
    // Bikin air di pinggir kiri
    if (x < 2) type = 2; 
    map[y][x] = { type: type };
  }
}

// --- STATE KARAKTER ---
const player = {
  x: Math.floor(COLS/2) * TILE, 
  y: Math.floor(ROWS/2) * TILE,
  speed: 180, 
  w: 64,  // Lebar gambar di layar
  h: 80,  // Tinggi gambar di layar
  facing: 'down', 
  moving: false, 
  animT: 0,
  frame: 'idle'
};

let camera = { x:0, y:0 };

// --- INPUT ---
const keys = {};
addEventListener('keydown', e=>{ keys[e.key.toLowerCase()] = true; });
addEventListener('keyup', e=> keys[e.key.toLowerCase()] = false);

// --- JOYSTICK ---
const joy = document.getElementById('joy'), knob = document.getElementById('knob');
let joyVec = {x:0,y:0}, joyActive = false;
function joyStart(e){ joyActive = true; e.preventDefault(); }
function joyMove(e){
  if(!joyActive) return; e.preventDefault();
  const t = e.touches ? e.touches[0] : e;
  const r = joy.getBoundingClientRect();
  let dx = t.clientX - (r.left+r.width/2);
  let dy = t.clientY - (r.top+r.height/2);
  const max = 30; const len = Math.hypot(dx,dy);
  if(len > max){ dx = dx/len*max; dy = dy/len*max; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  joyVec = {x: dx/max, y: dy/max};
}
function joyEnd(){ joyActive = false; knob.style.transform=''; joyVec={x:0,y:0}; }
joy.addEventListener('mousedown', joyStart); addEventListener('mousemove', joyMove); addEventListener('mouseup', joyEnd);
joy.addEventListener('touchstart', joyStart, {passive:false}); addEventListener('touchmove', joyMove, {passive:false}); addEventListener('touchend', joyEnd);

// --- POPUP UI ---
const popup = document.getElementById('settingsPopup');
document.getElementById('menuBtn').addEventListener('click', () => popup.classList.add('active'));
popup.addEventListener('click', (e) => { if (e.target === popup) popup.classList.remove('active'); });
document.getElementById('exitBtn').addEventListener('click', () => { if(confirm('Keluar?')) window.close(); });
document.getElementById('rotateBtn').addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
    } else { await document.exitFullscreen(); }
    popup.classList.remove('active');
  } catch (err) { alert('Rotate manual aja bre'); }
});

// --- RENDER ---
function px(x){ return Math.floor(x); }

function drawTile(t, sx, sy){
  if(t.type === 0){
    ctx.fillStyle = '#7cb342'; // Rumput
    ctx.fillRect(px(sx), px(sy), TILE, TILE);
    // Detail rumput
    ctx.fillStyle = '#8bc34a';
    for(let i=0;i<4;i++){ 
        const gx = px(sx) + ((i*13)%TILE), gy = px(sy) + ((i*17)%TILE); 
        ctx.fillRect(gx, gy, 3, 5); 
    }
  } else if(t.type === 2){
    ctx.fillStyle = '#0288d1'; // Air
    ctx.fillRect(px(sx),px(sy),TILE,TILE);
  }
}

function drawPlayer(sx, sy){
  // 1. Gambar Bayangan di bawah kaki
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath(); 
  // Bayangan ditaruh pas di tengah bawah
  ctx.ellipse(px(sx + player.w/2), px(sy + player.h - 5), 15, 5, 0,0,Math.PI*2); 
  ctx.fill();

  // 2. Ambil Gambar
  const currentImg = playerImages[player.facing][player.frame];

  if (currentImg && currentImg.complete) {
      // Gambar dari titik kiri-atas (sx, sy)
      // Karena sy itu patokan kita di kaki, kita kurangi tinggi gambar biar pas
      ctx.drawImage(currentImg, px(sx), px(sy) - player.h + TILE, player.w, player.h);
  } else {
      // Fallback kotak biru
      ctx.fillStyle = '#1565c0'; 
      ctx.fillRect(px(sx)+8, px(sy) - player.h + TILE, player.w - 16, player.h);
  }
}

// --- GAME LOOP ---
let last = 0;
function loop(now){
  const dt = Math.min(50, now-last)/1000; last = now;

  let dx=0, dy=0;
  if(keys['w']||keys['arrowup']) dy -= 1;
  if(keys['s']||keys['arrowdown']) dy += 1;
  if(keys['a']||keys['arrowleft']) dx -= 1;
  if(keys['d']||keys['arrowright']) dx += 1;
  dx += joyVec.x; dy += joyVec.y;
  const len = Math.hypot(dx,dy);
  if(len > 1){ dx/=len; dy/=len; }

  player.moving = len > 0.05;
  
  if(player.moving){
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) player.facing = 'right';
        else player.facing = 'left';
    } else {
        if (dy > 0) player.facing = 'down';
        else player.facing = 'up';
    }
    
    player.animT += dt;
    if (player.animT > 0.15) {
        if (player.frame === 'idle' || player.frame === 'walk2') player.frame = 'walk1';
        else player.frame = 'walk2';
        player.animT = 0;
    }
    
    // Gerakin posisi
    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;

    // BATESIN BIAR GAK KELUAR MAP
    if (player.x < 0) player.x = 0;
    if (player.y < 0) player.y = 0;
    if (player.x > (COLS * TILE) - player.w) player.x = (COLS * TILE) - player.w;
    if (player.y > (ROWS * TILE) - player.h) player.y = (ROWS * TILE) - player.h;

  } else {
    player.frame = 'idle';
    player.animT = 0; 
  }

  // KAMERA
  const targetCx = player.x - VIEW_W/2 + player.w/2;
  const targetCy = player.y - VIEW_H/2 + player.h/2;
  
  // Pake lerp biar halus
  camera.x += (targetCx - camera.x) * 0.1;
  camera.y += (targetCy - camera.y) * 0.1;
  
  // Batasin kamera biar gak nembus map
  camera.x = Math.max(0, Math.min(COLS*TILE - VIEW_W, camera.x));
  camera.y = Math.max(0, Math.min(ROWS*TILE - VIEW_H, camera.y));

  // --- DRAW ---
  // Bersihin layar
  ctx.fillStyle = '#111'; 
  ctx.fillRect(0,0,VIEW_W,VIEW_H);

  // Gambar Map
  const startX = Math.max(0, Math.floor(camera.x/TILE));
  const startY = Math.max(0, Math.floor(camera.y/TILE));
  const endX = Math.min(COLS-1, Math.ceil((camera.x+VIEW_W)/TILE));
  const endY = Math.min(ROWS-1, Math.ceil((camera.y+VIEW_H)/TILE));
  
  for(let y=startY;y<=endY;y++){
    for(let x=startX;x<=endX;x++){
      drawTile(map[y][x], x*TILE - camera.x, y*TILE - camera.y);
    }
  }

  // Gambar Player
  drawPlayer(player.x - camera.x, player.y - camera.y);
  
  requestAnimationFrame(loop);
}

// --- RESIZE ---
function resize(){ 
    VIEW_W = cv.width = window.innerWidth; 
    VIEW_H = cv.height = window.innerHeight; 
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => { setTimeout(resize, 300); });
resize();

document.getElementById('hint').addEventListener('click', e=> e.target.remove());
requestAnimationFrame(loop);
