
const PIN_HASH = "f342368f3d3dfcb3794ef4fb638613b46f0e6568843f5b841e3c27fce4b5007b";
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let stream = null;
let facingMode = "environment";
let currentFilter = "none";
let currentFilterCss = "none";
let compareMode = false;
let compareSelection = [];
let galleryItems = JSON.parse(localStorage.getItem("lumaGallery") || "[]");
let customFilters = JSON.parse(localStorage.getItem("lumaFilters") || "[]");

const builtInFilters = [
  ["None","none"],
  ["Clean","brightness(1.05) contrast(.96) saturate(.94)"],
  ["Sunday","brightness(1.06) contrast(.90) saturate(.88) sepia(.06)"],
  ["Golden","brightness(1.02) contrast(.96) saturate(1.08) sepia(.16)"],
  ["Digicam","contrast(1.12) saturate(1.10) brightness(1.01)"],
  ["Cozy","brightness(.98) contrast(.91) saturate(.86) sepia(.18)"],
  ["City","contrast(1.10) saturate(.88) brightness(.98)"],
  ["Flash","brightness(1.12) contrast(1.08) saturate(.92)"],
  ["Soft","brightness(1.08) contrast(.84) saturate(.90) blur(.25px)"],
  ["Film","contrast(.94) saturate(.78) sepia(.12)"],
  ["Night","brightness(.90) contrast(1.18) saturate(.82)"],
  ["Euro Summer","brightness(1.05) contrast(.95) saturate(1.17) sepia(.07)"],
  ["Old Money","brightness(1.02) contrast(.94) saturate(.78) sepia(.13)"],
  ["Model Off Duty","contrast(1.12) saturate(.73) brightness(.96)"],
  ["Angel","brightness(1.13) contrast(.82) saturate(.88) blur(.35px)"],
];

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

function renderKeypad() {
  const digits = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  $("#keypad").innerHTML = digits.map(d => d ? `<button class="key">${d}</button>` : "<span></span>").join("");
  let code = "";
  const drawDots = () => $("#dots").innerHTML = Array.from({length:6},(_,i)=>`<span class="dot ${i<code.length?"on":""}"></span>`).join("");
  drawDots();
  $$("#keypad .key").forEach(btn => btn.addEventListener("click", async () => {
    const v = btn.textContent;
    if (v === "⌫") code = code.slice(0,-1);
    else if (code.length < 6) code += v;
    drawDots();
    if (code.length === 6) {
      if (await sha256(code) === PIN_HASH) {
        sessionStorage.setItem("lumaUnlocked","1");
        $("#lockScreen").classList.add("hidden");
        $("#app").classList.remove("hidden");
        await startCamera();
      } else {
        $("#lockMessage").textContent = "Wrong code";
        code = "";
        setTimeout(()=>{ $("#lockMessage").textContent=""; drawDots(); },700);
      }
    }
  }));
}

async function startCamera() {
  if (stream) stream.getTracks().forEach(t=>t.stop());
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1920 },
        height: { ideal: 2560 }
      },
      audio:false
    });
    $("#video").srcObject = stream;
    $("#filterPreview").srcObject = stream;
    $("#cameraError").classList.add("hidden");
    await renderZoom();
  } catch (e) {
    $("#cameraError").textContent = "Camera unavailable. Check Safari camera permission and reopen the app.";
    $("#cameraError").classList.remove("hidden");
  }
}

async function renderZoom() {
  const wrap = $("#zoomButtons");
  wrap.innerHTML = "";
  if (!stream) return;
  const track = stream.getVideoTracks()[0];
  const caps = track.getCapabilities ? track.getCapabilities() : {};
  const settings = track.getSettings ? track.getSettings() : {};
  let options = [];

  if (caps.zoom) {
    const min = caps.zoom.min ?? 1, max = caps.zoom.max ?? 1;
    [0.5,1,2,3,4,max].forEach(z=>{
      if (z >= min && z <= max && !options.some(x=>Math.abs(x-z)<.05)) options.push(z)
    });
    if (!options.length) options=[min,max].filter((v,i,a)=>a.indexOf(v)===i);
  } else {
    options = [1];
  }

  options.sort((a,b)=>a-b);
  options.forEach((z,i)=>{
    const b=document.createElement("button");
    b.className="zoom-btn"+((settings.zoom ? Math.abs(settings.zoom-z)<.05 : z===1)?" active":"");
    b.textContent=(Math.round(z*10)/10)+"×";
    b.onclick=async()=>{
      if (caps.zoom) {
        try { await track.applyConstraints({advanced:[{zoom:z}]}); } catch(e){}
      }
      $$(".zoom-btn").forEach(x=>x.classList.remove("active")); b.classList.add("active");
    };
    wrap.appendChild(b);
  });
}

function allFilters() {
  return [...builtInFilters, ...customFilters.map(f=>[f.name,f.css])];
}

function renderFilters() {
  const strip=$("#filterStrip");
  strip.innerHTML="";
  allFilters().forEach(([name,css],i)=>{
    const b=document.createElement("button");
    b.className="filter-chip"+(name===currentFilter?" active":"");
    b.textContent=name;
    b.onclick=()=>{
      currentFilter=name; currentFilterCss=css; $("#video").style.filter=css;
      renderFilters();
    };
    strip.appendChild(b);
  });

  $("#myFilters").innerHTML = customFilters.length
    ? customFilters.map((f,i)=>`<div class="my-filter-card">${f.name} <button data-del="${i}" style="border:0;background:none">×</button></div>`).join("")
    : `<span class="muted">No custom filters yet.</span>`;
  $$("[data-del]").forEach(b=>b.onclick=()=>{
    customFilters.splice(+b.dataset.del,1); localStorage.setItem("lumaFilters",JSON.stringify(customFilters)); renderFilters();
  });
}

function customCss() {
  const bright=+$("#fBrightness").value/100;
  const contrast=+$("#fContrast").value/100;
  const sat=+$("#fSaturation").value/100;
  const warmth=+$("#fWarmth").value/100;
  const soft=+$("#fSoftness").value;
  const sepia=(+$("#fSepia").value/100)+(warmth*.25);
  return `brightness(${bright}) contrast(${contrast}) saturate(${sat}) sepia(${sepia.toFixed(2)}) blur(${soft}px)`;
}
function updateFilterPreview() { $("#filterPreview").style.filter = customCss(); }

function renderGallery() {
  const grid=$("#galleryGrid");
  $("#emptyGallery").classList.toggle("hidden",galleryItems.length>0);
  grid.innerHTML=galleryItems.map((it,i)=>`
    <div class="gallery-item ${compareSelection.includes(i)?"selected":""}" data-item="${i}">
      <img src="${it.data}" alt="">
      <button class="fav-btn" data-fav="${i}">${it.favorite?"♥":"♡"}</button>
    </div>`).join("");

  $$("[data-fav]").forEach(b=>b.onclick=(e)=>{
    e.stopPropagation(); const i=+b.dataset.fav;
    galleryItems[i].favorite=!galleryItems[i].favorite; saveGallery();
  });
  $$("[data-item]").forEach(el=>el.onclick=()=>{
    if(!compareMode) return;
    const i=+el.dataset.item;
    if(compareSelection.includes(i)) compareSelection=compareSelection.filter(x=>x!==i);
    else if(compareSelection.length<2) compareSelection.push(i);
    renderGallery();
    if(compareSelection.length===2) openCompare();
  });
}
function saveGallery() {
  try {
    localStorage.setItem("lumaGallery",JSON.stringify(galleryItems.slice(-40)));
  } catch(e) {
    // localStorage is intentionally a simple V1 store; large galleries will move to IndexedDB later.
  }
  renderGallery();
}
function addPhoto(data) {
  galleryItems.unshift({data, favorite:false, created:Date.now()});
  if(galleryItems.length>30) galleryItems=galleryItems.slice(0,30);
  saveGallery();
}

function openCompare(){
  const [a,b]=compareSelection;
  $("#compareA").src=galleryItems[a].data; $("#compareB").src=galleryItems[b].data;
  $("#compareOverlay").classList.remove("hidden");
  $("#compareSlider").value=50; updateCompare(50);
}
function updateCompare(v){
  $("#compareB").style.clipPath=`inset(0 0 0 ${v}%)`;
  $("#compareDivider").style.left=v+"%";
}

function capture(){
  const video=$("#video"), canvas=$("#canvas");
  if(!video.videoWidth) return;
  canvas.width=video.videoWidth; canvas.height=video.videoHeight;
  const ctx=canvas.getContext("2d");
  if(facingMode==="user") {
    ctx.translate(canvas.width,0); ctx.scale(-1,1);
  }
  // Canvas filters support the same CSS filter syntax in modern Safari.
  ctx.filter=currentFilterCss || "none";
  ctx.drawImage(video,0,0,canvas.width,canvas.height);
  ctx.filter="none";
  addPhoto(canvas.toDataURL("image/jpeg",.88));
  if(navigator.vibrate) navigator.vibrate(20);
}

async function focusAt(ev){
  if(!stream) return;
  const stage=ev.currentTarget, rect=stage.getBoundingClientRect();
  const x=ev.clientX-rect.left, y=ev.clientY-rect.top;
  const ring=$("#focusRing"); ring.style.left=x+"px"; ring.style.top=y+"px"; ring.classList.remove("hidden");
  setTimeout(()=>ring.classList.add("hidden"),700);

  const track=stream.getVideoTracks()[0];
  const caps=track.getCapabilities ? track.getCapabilities() : {};
  const nx=x/rect.width, ny=y/rect.height;
  try {
    const adv={};
    if(caps.focusMode?.includes("single-shot")) adv.focusMode="single-shot";
    if("pointsOfInterest" in caps) adv.pointsOfInterest=[{x:nx,y:ny}];
    if(Object.keys(adv).length) await track.applyConstraints({advanced:[adv]});
  } catch(e){}
}

function bind(){
  $("#gridBtn").onclick=()=>$("#grid").classList.toggle("hidden");
  $("#switchBtn").onclick=async()=>{ facingMode=facingMode==="environment"?"user":"environment"; await startCamera(); };
  $("#shutterBtn").onclick=capture;

  $("#traceInput").onchange=e=>{
    const f=e.target.files[0]; if(!f)return;
    const r=new FileReader(); r.onload=()=>{$("#traceImage").src=r.result;$("#traceImage").classList.remove("hidden");$("#traceOpacityWrap").classList.remove("hidden")};r.readAsDataURL(f);
  };
  $("#traceOpacity").oninput=e=>$("#traceImage").style.opacity=e.target.value/100;
  $("#cameraView .camera-stage").addEventListener("click",focusAt);

  $("#galleryImportBtn").onclick=()=>$("#galleryInput").click();
  $("#galleryInput").onchange=e=>[...e.target.files].forEach(f=>{
    const r=new FileReader();r.onload=()=>addPhoto(r.result);r.readAsDataURL(f);
  });

  $("#editFiltersBtn").onclick=()=>activateView("filtersView");
  ["fBrightness","fContrast","fSaturation","fWarmth","fSoftness","fSepia"].forEach(id=>$("#"+id).oninput=updateFilterPreview);
  $("#saveFilterBtn").onclick=()=>{
    const name=$("#customFilterName").value.trim() || "My filter";
    customFilters.push({name,css:customCss()});
    localStorage.setItem("lumaFilters",JSON.stringify(customFilters));
    $("#customFilterName").value="";
    renderFilters();
  };

  $("#compareModeBtn").onclick=()=>{
    compareMode=!compareMode; compareSelection=[];
    $("#compareModeBtn").textContent=compareMode?"Pick 2":"Compare"; renderGallery();
  };
  $("#compareSlider").oninput=e=>updateCompare(+e.target.value);
  $("#closeCompare").onclick=()=>{$("#compareOverlay").classList.add("hidden");compareSelection=[];renderGallery();};

  $$(".tab").forEach(b=>b.onclick=()=>activateView(b.dataset.view));
}

function activateView(id){
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===id));
  $$(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===id));
}

function boot(){
  renderKeypad(); renderFilters(); renderGallery(); bind(); updateFilterPreview();
  if(sessionStorage.getItem("lumaUnlocked")==="1"){
    $("#lockScreen").classList.add("hidden"); $("#app").classList.remove("hidden"); startCamera();
  }
  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
}
boot();
