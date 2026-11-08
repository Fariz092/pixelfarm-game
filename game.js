// --- SETUP & LOAD GAMBAR ---
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

const TILE = 48;
const COLS = 40, ROWS = 30;
let VIEW_W, VIEW_H;

// Load Asset Tanaman
const imgPohon = new Image();
imgPohon.src = 'Pohon.png'; 

const jagungStages = [
    'benih-jagung.png', 'proses1.png', 'proses2.png', 
    'proses3.png', 'proses4.png', 'proses5.png', 'hasil-panen-jagung.png'
];
const jagungImages = jagungStages.map(src => { const img = new Image(); img.src = src; return img; });

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

// Data Map
const map = [];
for(let y=0;y<ROWS;y++){
  map[y]=[];
  for(let x=0;x<COLS;x++){
    let t = 0; 
    // Air di kiri
    if(x < 3 && y > 5 && y < 25) t = 2;
    // Danau di atas
    if(x > 15 && x < 22 && y > 3 && y < 8) t = 2;
    // Jalan setapak
    if(x > 18 && x < 22 && y > 7 && y < 15) t = 1;
    
    let obj = null;
    // Spawn pohon acak, tapi jangan di area tengah (biar spawn aman)
    if(t === 0 && Math.random() < 0.03 && !(x > 10 && x < 30 && y > 10 && y < 20)) {
        obj = { type: 'tree' }; 
    }
    map[y][x] = { type:t, tilled:false, crop:null, plantedAt:0, growth:0, obj: obj };
  }
}

// CARI POSISI SPAWN YANG AMAN (BUKAN AIR)
let spawnX = Math.floor(COLS/2);
let spawnY = Math.floor(ROWS/2);
// Kalau di tengah ada air, geser ke bawah sampai dapet rumput
while(map[spawnY][spawnX].type === 2) {
    spawnY++; 
}

const player = {
  x: spawnX * TILE, y: spawnY * TILE, // Posisi spawn aman
  speed: 180, w: 48, h: 64, 
  facing: 'down', moving: false, animT: 0
};

let camera = { x:0, y:0 };
let coins = 100;
let tool = 'seed';

const CROPS = {
  seed:  {name:'Jagung', cost:5, time:12000, sell:30},
};

// --- INPUT & JOYSTICK ---
const keys = {};
addEventListener('keydown', e=>{ keys[e.key.toLowerCase()] = true; if(e.key === ' ') { e.preventDefault(); doAction(); } });
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
document.getElementById('action').addEventListener('click', doAction);

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

// --- AKSI TANI ---
function doAction(){
  const px = player.x + player.w/2;
  const py = player.y + player.h;
  const fx = px + (player.facing==='left'?-TILE/2:player.facing==='right'?TILE/2:0);
  const fy = py + (player.facing==='up'?-TILE/2:player.facing==='down'?TILE/2:0);
  const tx = Math.floor(fx/TILE), ty = Math.floor(fy/TILE);
  if(ty<0||ty>=ROWS||tx<0||tx>=COLS) return;
  const t = map[ty][tx];
  
  if(t.obj && t.obj.type === 'tree') return toast('Ada pohon!');
  if(t.type !== 0 && t.type !== 1 && !t.tilled) return;
  
  const crop = CROPS[tool];

  if(t.tilled && t.crop && t.growth >= 1){
    coins += crop.sell;
    t.crop = null; t.growth = 0; t.tilled = false;
    toast(`+${crop.sell} Koin`);
  } else if(!t.tilled){
    if(coins < crop.cost) return toast('Koin kurang!');
    coins -= crop.cost;
    t.tilled = true; t.crop = tool; t.plantedAt = performance.now(); t.growth = 0;
    toast(`${crop.name} ditanam`);
  }
  document.getElementById('coins').textContent = coins;
}

function toast(msg){
  const d = document.createElement('div');
  d.textContent = msg;
  d.style.cssText = 'position:fixed;bottom:150px;left:50%;transform:translateX(-50%);background:#3e3227;color:#fff;padding:10px 20px;border-radius:8px;font-weight:bold;font-size:14px;z-index:30;pointer-events:none;transition:opacity .3s;border:2px solid #000;box-shadow:0 4px 0 #1a1511';
  document.body.appendChild(d);
  setTimeout(()=>{d.style.opacity='0';setTimeout(()=>d.remove(),300)},1000);
}

// --- RENDER ---
function px(x){ return Math.floor(x); }

function drawTile(t, sx, sy){
  if(t.type === 0){
    ctx.fillStyle = '#7cb342'; ctx.fillRect(px(sx), px(sy), TILE, TILE);
    ctx.fillStyle = '#8bc34a';
    for(let i=0;i<6;i++){ const gx = px(sx) + ((i*7+13)%TILE), gy = px(sy) + ((i*11+5)%TILE); ctx.fillRect(gx, gy, 3, 5); }
  } else if(t.type === 1 || t.tilled){
    ctx.fillStyle = '#6d4c41'; ctx.fillRect(px(sx),px(sy),TILE,TILE);
    ctx.fillStyle = '#5d4037';
    for(let i=0;i<3;i++) ctx.fillRect(px(sx), px(sy)+i*16+3, TILE, 4);
  } else if(t.type === 2){
    ctx.fillStyle = '#0288d1'; ctx.fillRect(px(sx),px(sy),TILE,TILE);
    ctx.fillStyle = '#4fc3f7';
    const off = (performance.now()/40)%TILE;
    ctx.fillRect(px(sx)+off, px(sy)+8, 12, 3);
    ctx.fillRect(px(sx)+((off+24)%TILE), px(sy)+28, 16, 3);
  }

  if(t.obj && t.obj.type === 'tree' && imgPohon.complete){
    const treeW = 50 * 1.2; 
    const treeH = 61 * 1.2;
    ctx.drawImage(imgPohon, px(sx) + (TILE - treeW)/2, px(sy) - (treeH - TILE), treeW, treeH);
  }
  
  if(t.crop){
    const prog = Math.min(1, (performance.now()-t.plantedAt)/CROPS[t.crop].time);
    t.growth = prog;
    const stageIndex = Math.min(6, Math.floor(prog * 7)); 
    const currentImg = jagungImages[stageIndex];

    if (currentImg && currentImg.complete) {
        const imgRatio = currentImg.width / currentImg.height;
        const drawHeight = TILE * 1.2;
        const drawWidth = drawHeight * imgRatio;
        const offsetX = (TILE - drawWidth) / 2;
        const offsetY = (TILE - drawHeight) / 2;
        ctx.drawImage(currentImg, px(sx) + offsetX, px(sy) + offsetY, drawWidth, drawHeight);
    }
    if(prog >= 1){
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath(); ctx.arc(px(sx)+TILE-8, px(sy)+8, 6, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.stroke();
    }
  }
}

function drawPlayer(sx, sy){
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(px(sx+player.w/2), px(sy+player.h-4), 16, 6, 0,0,Math.PI*2); ctx.fill();

  // Gambar Karakter
  const currentImg = playerImages[player.facing];
  if (currentImg && currentImg.complete) {
      ctx.drawImage(currentImg, px(sx), px(sy) - 16, player.w, player.h);
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
  const margin = 8;
  const corners = [ [nx+margin, ny+margin], [nx+player.w-margin, ny+margin], [nx+margin, ny+player.h-4], [nx+player.w-margin, ny+player.h-4] ];
  for(const [cx,cy] of corners){
    const tx = Math.floor(cx/TILE), ty = Math.floor(cy/TILE);
    if(tx<0||ty<0||tx>=COLS||ty>=ROWS) return false;
    if(map[ty][tx].type === 2) return false; 
    if(map[ty][tx].obj && map[ty][tx].obj.type === 'tree') return false; 
  }
  return true;
}

function resize(){ VIEW_W = cv.width = innerWidth; VIEW_H = cv.height = innerHeight; }
addEventListener('resize', resize);
resize();
document.getElementById('hint').addEventListener('click', e=> e.target.remove());

requestAnimationFrame(loop);
