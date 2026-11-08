// --- SETUP & LOAD GAMBAR ---
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

const TILE = 48;
const COLS = 40, ROWS = 30;
let VIEW_W, VIEW_H;

// Load Asset
const imgPlants = new Image();
imgPlants.src = 'Plants.png';
const imgSupplies = new Image();
imgSupplies.src = 'Supplies.png';

// Data Map
const map = [];
for(let y=0;y<ROWS;y++){
  map[y]=[];
  for(let x=0;x<COLS;x++){
    let t = 0; // 0=Grass, 1=Path, 2=Water
    // Bikin sungai di pinggir kiri
    if(x < 3 && y > 5 && y < 25) t = 2;
    // Bikin danau di tengah atas
    if(x > 15 && x < 22 && y > 3 && y < 8) t = 2;
    // Bikin jalan setapak dari tengah ke atas
    if(x > 18 && x < 22 && y > 7 && y < 15) t = 1;
    
    // Generate Pohon (pakai indeks sprite dari Plants.png)
    let obj = null;
    if(t === 0 && Math.random() < 0.1 && !(x > 10 && x < 30 && y > 10 && y < 20)) {
        obj = { type: 'tree', spriteX: 0, spriteY: 0 };
    }

    map[y][x] = { type:t, tilled:false, crop:null, plantedAt:0, growth:0, obj: obj };
  }
}

const player = {
  x: (COLS/2)*TILE, y: (ROWS/2)*TILE,
  speed: 200, w: 32, h: 40,
  facing: 'down', moving: false, animT: 0
};

let camera = { x:0, y:0 };
let coins = 100;
let tool = 'seed';

const CROPS = {
  seed:  {name:'Bibit',   cost:5,  time:5000,  sell:12, spriteX: 0, spriteY: 0},
  carrot:{name:'Wortel',  cost:10, time:8000,  sell:25, spriteX: 0, spriteY: 0},
  corn:  {name:'Jagung',  cost:20, time:12000, sell:55, spriteX: 0, spriteY: 0},
};

const TOOL_ICONS = {
  seed:  '<svg viewBox="0 0 24 24"><path d="M12 2C9.24 2 7 4.24 7 7v2h10V7c0-2.76-2.24-5-5-5zm-3 9v6c0 2.76 2.24 5 5 5s5-2.24 5-5v-6H9z"/></svg>',
  carrot:'<svg viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z"/></svg>',
  corn:  '<svg viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z"/></svg>'
};

function setTool(newTool) {
  tool = newTool;
  document.getElementById('toolLabel').textContent = CROPS[tool].name;
  document.getElementById('toolIcon').innerHTML = TOOL_ICONS[tool];
}

// --- INPUT ---
const keys = {};
addEventListener('keydown', e=>{
  keys[e.key.toLowerCase()] = true;
  if(e.key === ' ') { e.preventDefault(); doAction(); }
});
addEventListener('keyup', e=> keys[e.key.toLowerCase()] = false);

// --- JOYSTICK ---
const joy = document.getElementById('joy'), knob = document.getElementById('knob');
let joyVec = {x:0,y:0}, joyActive = false;
function joyStart(e){ joyActive = true; e.preventDefault(); }
function joyMove(e){
  if(!joyActive) return;
  e.preventDefault();
  const t = e.touches ? e.touches[0] : e;
  const r = joy.getBoundingClientRect();
  let dx = t.clientX - (r.left+r.width/2);
  let dy = t.clientY - (r.top+r.height/2);
  const max = 30;
  const len = Math.hypot(dx,dy);
  if(len > max){ dx = dx/len*max; dy = dy/len*max; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  joyVec = {x: dx/max, y: dy/max};
}
function joyEnd(){ joyActive = false; knob.style.transform=''; joyVec={x:0,y:0}; }
joy.addEventListener('mousedown', joyStart);
addEventListener('mousemove', joyMove);
addEventListener('mouseup', joyEnd);
joy.addEventListener('touchstart', joyStart, {passive:false});
addEventListener('touchmove', joyMove, {passive:false});
addEventListener('touchend', joyEnd);
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
  // Gambar Dasar (Tanah/Rumput/Air)
  if(t.type === 0){
    ctx.fillStyle = '#7cb342'; ctx.fillRect(px(sx), px(sy), TILE, TILE);
    ctx.fillStyle = '#8bc34a';
    for(let i=0;i<6;i++){
      const gx = px(sx) + ((i*7+13)%TILE), gy = px(sy) + ((i*11+5)%TILE);
      ctx.fillRect(gx, gy, 3, 5);
    }
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

  // Gambar Pohon dari Plants.png (Asumsi pohon di koordinat 0,0 ukuran 32x32)
  if(t.obj && t.obj.type === 'tree' && imgPlants.complete){
    // Scale 32px gambar jadi 48px (TILE)
    ctx.drawImage(imgPlants, 0, 0, 32, 32, px(sx), px(sy)-16, TILE, TILE);
  }
  
  // Gambar Tanaman
  if(t.crop){
    const prog = Math.min(1, (performance.now()-t.plantedAt)/CROPS[t.crop].time);
    t.growth = prog;
    
    if(imgPlants.complete){
        // Gambar bibit (ukuran kecil pas awal, gede pas mau panen)
        let size = TILE * (0.4 + prog*0.6);
        let offset = TILE - size;
        // Ambil contoh gambar dari Plants (gambar tanaman kecil di pojok kiri bawah)
        ctx.drawImage(imgPlants, 0, 300, 32, 32, px(sx)+offset/2, px(sy)+offset/2, size, size);
    }

    if(prog >= 1){
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath(); ctx.arc(px(sx)+TILE-8, px(sy)+8, 6, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.stroke();
    }
  }
}

function drawPlayer(sx, sy){
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(px(sx+player.w/2), px(sy+player.h-2), 16, 6, 0,0,Math.PI*2); ctx.fill();

  const cx = px(sx), cy = px(sy);
  const walk = player.moving ? Math.sin(player.animT*12)*3 : 0;
  ctx.fillStyle = '#3e2723'; ctx.fillRect(cx+6, cy+28+walk, 8, 12); ctx.fillRect(cx+18, cy+28-walk, 8, 12);
  ctx.fillStyle = '#1565c0'; ctx.fillRect(cx+4, cy+14, 24, 18);
  ctx.fillStyle = '#0d47a1'; ctx.fillRect(cx+4, cy+14, 24, 3);
  ctx.fillStyle = '#1565c0'; ctx.fillRect(cx+0, cy+18, 5, 12); ctx.fillRect(cx+27, cy+18, 5, 12);
  ctx.fillStyle = '#ffcc80'; ctx.fillRect(cx+8, cy, 16, 16);
  ctx.fillStyle = '#4e342e'; ctx.fillRect(cx+8, cy, 16, 5); ctx.fillRect(cx+8, cy, 3, 10); ctx.fillRect(cx+21, cy, 3, 10);
  if(player.facing !== 'up'){ ctx.fillStyle = '#000'; ctx.fillRect(cx+12, cy+8, 2, 3); ctx.fillRect(cx+18, cy+8, 2, 3); }
  ctx.fillStyle = '#fbc02d'; ctx.fillRect(cx+4, cy-4, 24, 5); ctx.fillRect(cx+8, cy-8, 16, 5);
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
  const corners = [
    [nx+margin, ny+margin], [nx+player.w-margin, ny+margin],
    [nx+margin, ny+player.h-4], [nx+player.w-margin, ny+player.h-4]
  ];
  for(const [cx,cy] of corners){
    const tx = Math.floor(cx/TILE), ty = Math.floor(cy/TILE);
    if(tx<0||ty<0||tx>=COLS||ty>=ROWS) return false;
    if(map[ty][tx].type === 2) return false; // Air ga bisa dilangkahi
    if(map[ty][tx].obj && map[ty][tx].obj.type === 'tree') return false; // Pohon ga bisa dilangkahi
  }
  return true;
}

function resize(){
  VIEW_W = cv.width = innerWidth;
  VIEW_H = cv.height = innerHeight;
}
addEventListener('resize', resize);
resize();
document.getElementById('hint').addEventListener('click', e=> e.target.remove());

// START GAME
setTool('seed');
requestAnimationFrame(loop);
