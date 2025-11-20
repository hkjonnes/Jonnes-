// Show poem on button
function showPoem() {
  const today = new Date();
  const index = today.getDate() % poems.length;
  document.getElementById("poemBox").innerText = poems[index];
}

function openCamera() { alert("Camera feature coming soon!"); }
function openGallery() { alert("Gallery coming soon!"); }
function openSongs() { alert("Songs section coming soon!"); }
function openChat() { alert("Chat coming soon!"); }
function openGames() { alert("Games coming soon!"); }

// Notification request
if ("Notification" in window) {
  Notification.requestPermission();
}

// Daily poem notification
function sendDailyPoem() {
  const today = new Date();
  const index = today.getDate() % poems.length;

  if (Notification.permission === "granted") {
    new Notification("💜 Your Poem of the Day", {
      body: poems[index],
      icon: "./icons/icon-192.png"
    });
  }
}

// Trigger notification every time app opens
window.onload = sendDailyPoem;

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
} 
/* ====== HKJApp main JS (single-file) ======
   IMPORTANT: Replace the FIREBASE_CONFIG object below with your Firebase project config
   (from Firebase Console -> Project settings -> SDK snippet)
*/

// ---------- PASTE YOUR FIREBASE CONFIG HERE ----------
const FIREBASE_CONFIG = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT.firebaseapp.com",
  projectId: "PASTE_PROJECT",
  storageBucket: "PASTE_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};
// ----------------------------------------------------

/* Initialize Firebase (compat) */
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

/* --- Anonymous sign in --- */
auth.signInAnonymously().catch(()=>{});
auth.onAuthStateChanged(u=>{
  const badge = document.getElementById('userBadge');
  if(u) badge.textContent = `User: ${u.uid.slice(0,8)} (anon)`;
  else badge.textContent = 'not signed in';
});

/* --- Poem of the day --- */
function showPoem(){
  const today = new Date();
  const index = today.getDate() % poems.length;
  document.getElementById('poemBox').innerText = poems[index];
}
document.getElementById('showPoemBtn').addEventListener('click', showPoem);
window.addEventListener('load', ()=>{
  showPoem();
  requestNotificationPermissionAndSend();
});

/* request permission and send today's poem via notification */
function requestNotificationPermissionAndSend(){
  if('Notification' in window){
    if(Notification.permission === 'default') Notification.requestPermission();
    if(Notification.permission === 'granted'){
      const today = new Date();
      const index = today.getDate() % poems.length;
      new Notification('💜 HKJApp — Poem of the day', { body: poems[index], icon: 'icons/icon-192.png' });
    }
  }
}

/* ---------- Camera & upload ---------- */
const video = document.getElementById('video');
const canvas = document.getElementById('captureCanvas');
let streamRef = null;

document.getElementById('startCameraBtn').addEventListener('click', async ()=>{
  try{
    const s = await navigator.mediaDevices.getUserMedia({ video:true, audio:false });
    streamRef = s;
    video.srcObject = s; video.style.display = 'block';
  }catch(e){ alert('Cannot access camera'); }
});
document.getElementById('stopCameraBtn').addEventListener('click', ()=>{
  if(streamRef) streamRef.getTracks().forEach(t=>t.stop());
  video.srcObject = null; video.style.display='none';
});
document.getElementById('captureBtn').addEventListener('click', async ()=>{
  if(!video.srcObject) return alert('Start camera first');
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d'); ctx.drawImage(video,0,0,canvas.width,canvas.height);
  const dataUrl = canvas.toDataURL('image/png');
  const blob = dataURLToBlob(dataUrl);
  const fileName = `capture_${Date.now()}.png`;
  await uploadFileToStorage(blob, `photos/${auth.currentUser.uid}_${fileName}`, fileName, 'photos');
  loadGallery();
});

/* file input -> upload */
document.getElementById('photoFile').addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return;
  uploadFileToStorage(f, `photos/${auth.currentUser.uid}_${Date.now()}_${f.name}`, f.name, 'photos').then(loadGallery);
});

/* upload helper */
async function uploadFileToStorage(fileOrBlob, path, name, collectionName){
  const ref = storage.ref(path);
  await ref.put(fileOrBlob);
  const url = await ref.getDownloadURL();
  // add a doc to firestore collection (photos or songs)
  await db.collection(collectionName).add({ name, url, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
}

/* convert dataURL to blob */
function dataURLToBlob(dataurl){
  const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]); let n = bstr.length; const u8arr = new Uint8Array(n);
  while(n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

/* ---------- Gallery load ---------- */
async function loadGallery(){
  const galleryEl = document.getElementById('gallery');
  galleryEl.innerHTML = 'Loading...';
  const snap = await db.collection('photos').orderBy('createdAt','desc').limit(30).get();
  galleryEl.innerHTML = '';
  snap.forEach(doc=>{
    const d = doc.data();
    const img = document.createElement('img'); img.src = d.url;
    galleryEl.appendChild(img);
  });
}
loadGallery();

/* ---------- Songs upload/list ---------- */
document.getElementById('songFile').addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return uploadFileToStorage(f, `songs/${auth.currentUser.uid}_${Date.now()}_${f.name}`, f.name, 'songs').then(loadSongs);
});

async function loadSongs(){
  const list = document.getElementById('songsList'); list.innerHTML = 'Loading...';
  const snap = await db.collection('songs').orderBy('createdAt','desc').limit(50).get();
  list.innerHTML = '';
  snap.forEach(doc=>{
    const d = doc.data();
    const div = document.createElement('div'); div.className = 'songItem';
    div.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><div style="flex:1">${d.name}</div>
      <audio controls src="${d.url}"></audio>
      <button data-url="${d.url}" data-name="${d.name}">Download</button></div>`;
    const btn = div.querySelector('button');
    btn.addEventListener('click', ()=>downloadUrl(d.url, d.name));
    list.appendChild(div);
  });
}
function downloadUrl(url, name){
  const a = document.createElement('a'); a.href = url; a.download = name || 'song'; a.click();
}
loadSongs();

/* ---------- Chat (realtime) ---------- */
const chatBox = document.getElementById('chatBox');
const chatInput = document.getElementById('chatInput');
document.getElementById('sendChatBtn').addEventListener('click', sendChat);
chatInput.addEventListener('keydown', e=>{ if(e.key==='Enter') sendChat(); });

function sendChat(){
  const text = chatInput.value.trim(); if(!text) return;
  db.collection('chat').add({
    text, uid: auth.currentUser.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  chatInput.value = '';
}

db.collection('chat').orderBy('createdAt','desc').limit(80).onSnapshot(snap=>{
  chatBox.innerHTML = '';
  snap.forEach(doc=>{
    const d = doc.data(); const el = document.createElement('div'); el.className='chatMessage';
    el.textContent = d.text;
    chatBox.appendChild(el);
  });
});

/* ---------- Shared Drawing (real-time) ---------- */
const drawCanvas = document.getElementById('drawCanvas');
const drawCtx = drawCanvas.getContext('2d');
let drawing = false;
let currentPath = [];
let paths = [];

/* resize canvas to container */
function resizeDrawCanvas(){
  drawCanvas.width = drawCanvas.clientWidth; drawCanvas.height = drawCanvas.clientHeight;
  redrawAll();
}
window.addEventListener('resize', resizeDrawCanvas);
resizeDrawCanvas();

drawCanvas.addEventListener('pointerdown', (e)=>{ drawing = true; currentPath = [{x: e.offsetX/drawCanvas.width, y: e.offsetY/drawCanvas.height}]; });
drawCanvas.addEventListener('pointermove', (e)=>{ if(!drawing) return; currentPath.push({x: e.offsetX/drawCanvas.width, y: e.offsetY/drawCanvas.height}); drawCtx.lineJoin='round'; drawCtx.lineCap='round'; drawCtx.lineWidth=3; drawCtx.strokeStyle='#ff66cc';
  const p = currentPath; drawCtx.beginPath(); if(p.length>1){ const a = p[p.length-2], b = p[p.length-1]; drawCtx.moveTo(a.x*drawCanvas.width, a.y*drawCanvas.height); drawCtx.lineTo(b.x*drawCanvas.width, b.y*drawCanvas.height); drawCtx.stroke(); } });
drawCanvas.addEventListener('pointerup', async ()=>{ if(!drawing) return; drawing=false; paths.unshift({points: currentPath, color:'#ff66cc', width:3}); currentPath=[]; await savePathsThrottled(paths); });
drawCanvas.addEventListener('pointerleave', ()=>{ if(drawing){ drawing=false; if(currentPath.length>0){ paths.unshift({points: currentPath, color:'#ff66cc', width:3}); currentPath=[]; savePathsThrottled(paths); } }});

function redrawAll(){
  drawCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
  paths.forEach(path=>{
    drawCtx.beginPath(); drawCtx.lineWidth = path.width || 3; drawCtx.strokeStyle = path.color || '#000';
    path.points.forEach((p,i)=>{ if(i===0) drawCtx.moveTo(p.x*drawCanvas.width, p.y*drawCanvas.height); else drawCtx.lineTo(p.x*drawCanvas.width, p.y*drawCanvas.height); });
    drawCtx.stroke();
  });
}

/* Save drawing to a single doc 'drawings/shared' (overwrite) */
const drawingDocRef = db.collection('drawings').doc('shared');

/* Throttle saves to avoid spamming writes */
let saveTimeout = null;
async function savePathsThrottled(p){
  if(saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async ()=>{
    try{ await drawingDocRef.set({ paths: p, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }catch(e){}
    saveTimeout = null;
  }, 800);
}

/* Listen to remote changes */
drawingDocRef.onSnapshot(doc=>{
  const data = doc.data();
  if(!data) return;
  paths = data.paths || [];
  redrawAll();
});

/* Clear -> save empty */
document.getElementById('clearDrawBtn').addEventListener('click', async ()=>{
  paths = []; redrawAll();
  await drawingDocRef.set({ paths: [], updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
});

/* download JSON */
document.getElementById('downloadDrawBtn').addEventListener('click', ()=>{
  const a = document.createElement('a');
  const blob = new Blob([JSON.stringify(paths)], { type: 'application/json' });
  a.href = URL.createObjectURL(blob); a.download = 'drawing.json'; a.click();
});

/* ---------- Games: TicTacToe (local) ---------- */
function createTicTacToe(){
  const el = document.getElementById('ticTacToe'); el.innerHTML='';
  const board = Array(9).fill(null);
  let xNext = true;
  const grid = document.createElement('div'); grid.style.display='grid'; grid.style.gridTemplateColumns='repeat(3,80px)'; grid.style.gap='6px';
  function render(){
    grid.innerHTML=''; board.forEach((v,i)=>{
      const b = document.createElement('button'); b.style.height='80px'; b.style.fontSize='24px';
      b.textContent = v||'';
      b.addEventListener('click', ()=>{ if(board[i]) return; board[i]= xNext? 'X':'O'; xNext=!xNext; render(); });
      grid.appendChild(b);
    });
  }
  const reset = document.createElement('button'); reset.textContent='Reset'; reset.addEventListener('click', ()=>{ for(let i=0;i<9;i++)board[i]=null; xNext=true; render(); });
  el.appendChild(grid); el.appendChild(reset); render();
}
createTicTacToe();

/* DressUp (simple toggles) */
function createDressUp(){
  const el = document.getElementById('dressUp'); el.innerHTML='';
  const hats = ['🎀','👑','🎩','🌸']; const dresses=['💜','💙','💚','🧡'];
  let hat=0,dress=0;
  const avatar = document.createElement('div'); avatar.style.fontSize='48px'; avatar.style.textAlign='center';
  function render(){ avatar.textContent = `${hats[hat]}\\n👩${dresses[dress]}`; }
  const hatButtons = hats.map((h,i)=>{ const b=document.createElement('button'); b.textContent=h; b.addEventListener('click', ()=>{ hat=i; render(); }); return b; });
  const dressButtons = dresses.map((d,i)=>{ const b=document.createElement('button'); b.textContent=d; b.addEventListener('click', ()=>{ dress=i; render(); }); return b; });
  const container = document.createElement('div'); container.style.display='flex'; container.style.gap='6px';
  const col1 = document.createElement('div'), col2 = document.createElement('div');
  hatButtons.forEach(x=>col1.appendChild(x)); dressButtons.forEach(x=>col2.appendChild(x));
  container.appendChild(col1); container.appendChild(col2);
  el.appendChild(avatar); el.appendChild(container); render();
}
createDressUp();

/* Car race demo (CSS-based) */
function createCarRace(){
  const el = document.getElementById('carRace'); el.innerHTML='';
  const racetrack = document.createElement('div'); racetrack.style.position='relative'; racetrack.style.height='60px'; racetrack.style.background='linear-gradient(90deg,#fff2, #0000)'; racetrack.style.borderRadius='8px'; racetrack.style.overflow='hidden';
  const car = document.createElement('div'); car.textContent='🚗'; car.style.position='absolute'; car.style.left='-40px'; car.style.top='4px'; car.style.fontSize='32px';
  racetrack.appendChild(car); el.appendChild(racetrack);
  car.animate([{left:'-40px'},{left:'100%'}], {duration:4000, iterations:Infinity});
}
createCarRace();

/* ---------- init listeners for realtime sections ---------- */
/* Listen to photos, songs updates and refresh lists live */
db.collection('photos').orderBy('createdAt','desc').limit(30).onSnapshot(()=> loadGallery());
db.collection('songs').orderBy('createdAt','desc').limit(50).onSnapshot(()=> loadSongs());
db.collection('chat').orderBy('createdAt','desc').limit(80).onSnapshot(snap=>{
  chatBox.innerHTML='';
  snap.forEach(doc=>{
    const d = doc.data(); const el = document.createElement('div'); el.className='chatMessage'; el.textContent = d.text; chatBox.appendChild(el);
  });
});

/* register service worker */
if('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});

