// --- SETUP ---
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

const TILE = 48;
const COLS = 40, ROWS = 30;
let VIEW_W, VIEW_H;

// Load Asset Karakter (1=Bawah, 2=Atas, 3=Kiri, 4=Kanan)
const playerImages = {
    down: new Image(),
    up: new Image(),
    left: new Image(),
    right: new Image()
};
playerImages.down.src = '1.png';
playerImages.up.src = '2.png';
playerImages.left.src = '3.png';
playerImages.right.src = '4.png';

// Data Map Kosong (Cuma Rumput & Air di pinggir)
const map = [];
for(let y=0;y<ROWS;y++){
  map[y]=[];
  for(let x=0;x<COLS;x++){
    let t = 0; 
    // Air di kiri
    if(x < 3 && y > 5 && y < 25) t = 2;
    map[y][x] = { type:t };
  }
}

// Spawn Karakter di Tengah
const player = {
  x: Math.floor(COLS/2) * TILE, 
  y: Math.floor(ROWS/2) * TILE,
  speed: 200, w: 64, h: 96, // Karakter dibuat agak gede
  facing: 'down', moving: false, animT: 0
};

let camera = { x:0, y:0 };

// --- INPUT & JOYSTICK ---
const keys = {};
addEventListener('keydown', e=>{ 
  keys[e.key.toLowerCase()] = true; 
});
addEventListener('keyup', e=> keys[e.key.toLowerCase()] = false);

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

// --- POPUP LOGIC ---
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
    // Rumput
    ctx.fillStyle = '#7cb342'; ctx.fillRect(px(sx), px(sy), TILE, TILE);
    ctx.fillStyle = '#8bc34a';
    for(let i=0;i<6;i++){ const gx = px(sx) + ((i*7+13)%TILE), gy = px(sy) + ((i*11+5)%TILE); ctx.fillRect(gx, gy, 3, 5); }
  } else if(t.type === 2){
    // Air
    ctx.fillStyle = '#0288d1'; ctx.fillRect(px(sx),px(sy),TILE,TILE);
    ctx.fillStyle = '#4fc3f7';
    const off = (performance.now()/40)%TILE;
    ctx.fillRect(px(sx)+off, px(sy)+8, 12, 3);
    ctx.fillRect(px(sx)+((off+24)%TILE), px(sy)+28, 16, 3);
  }
}

function drawPlayer(sx, sy){
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(px(sx+player.w/2), px(sy+player.h-8), 20, 8, 0,0,Math.PI*2); ctx.fill();

  // Gambar Karakter
  const currentImg = playerImages[player.facing];
  if (currentImg && currentImg.complete) {
      // Gambar di tengah kotak
      ctx.drawImage(currentImg, px(sx), px(sy) - 20, player.w, player.h);
  } else {
      // Fallback
      ctx.fillStyle = '#1565c0'; ctx.fillRect(px(sx)+8, px(sy)+16, 32, 40);
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
    if(Math.abs(dx) > Math.abs(dy)) player.facing = dx>0?'right':'left';
    else player.facing = dy>0?'down':'up';
    player.animT += dt;
    
    const nx = player.x + dx*player.speed*dt;
    const ny = player.y + dy*player.speed*dt;
    
    // Cek tabrakan simpel
    if(canWalk(nx, player.y)) player.x = nx;
    if(canWalk(player.x, ny)) player.y = ny;
  }

  const targetCx = player.x - VIEW_W/2 + player.w/2;
  const targetCy = player.y - VIEW_H/2 + player.h/2;
  camera.x += (targetCx - camera.x)*0.12;
  camera.y += (targetCy - camera.y)*0.12;
  camera.x = Math.max(0, Math.min(COLS*TILE - VIEW_W, camera.x));
  camera.y = Math.max(0, Math.min(ROWS*TILE - VIEW_H, camera.y));

  ctx.fillStyle = '#0288d1'; ctx.fillRect(0,0,VIEW_W,VIEW_H);

  const startX = Math.floor(camera.x/TILE), startY = Math.floor(camera.y/TILE);
  const endX = Math.ceil((camera.x+VIEW_W)/TILE), endY = Math.ceil((camera.y+VIEW_H)/TILE);
  for(let y=startY;y<=endY;y++){
    for(let x=startX;x<=endX;x++){
      if(y<0||y>=ROWS||x<0||x>=COLS) continue;
      drawTile(map[y][x], x*TILE - camera.x, y*TILE - camera.y);
    }
  }

  drawPlayer(player.x - camera.x, player.y - camera.y);
  requestAnimationFrame(loop);
}

function canWalk(nx, ny){
  const cx = nx + player.w/2;
  const cy = ny + player.h/2;
  const points = [ [cx, cy-10], [cx, cy+10], [cx-15, cy], [cx+15, cy] ];
  
  for(const [px, py] of points){
    const tx = Math.floor(px/TILE), ty = Math.floor(py/TILE);
    if(tx<0||ty<0||tx>=COLS||ty>=ROWS) return false;
    if(map[ty][tx].type === 2) return false; // Cek air
  }
  return true;
}

function resize(){ 
    VIEW_W = cv.width = window.innerWidth; 
    VIEW_H = cv.height = window.innerHeight; 
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => { setTimeout(resize, 300); });
resize();

document.getElementById('hint').addEventListener('click', e=> e.target.remove());

requestAnimationFrame(loop);
