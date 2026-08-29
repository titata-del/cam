
const PIN_HASH = "f342368f3d3dfcb3794ef4fb638613b46f0e6568843f5b841e3c27fce4b5007b";
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let stream = null;
let facingMode = "environment";
let currentFilter = "Aucun";
let currentFilterCss = "none";
let compareMode = false;
let compareSelection = [];
let galleryFilter = "all";
let currentViewerIndex = null;
let pendingAlbumMode = "create";
let pinchState = null;
let pinchZoom = 1;
let zoomIndicatorTimer = null;
let appAppearance = localStorage.getItem("lumaAppearance") || "system";
let appLanguage = localStorage.getItem("lumaLanguage") || "fr";
let editingCustomFilterIndex = null;
let timerSeconds = 0;
let cameraExposureValue = 0;
let gallerySelectMode = false;
let galleryBulkSelection = new Set();
let viewerEditFilterName = "Aucun";
let viewerEditFilterCss = "none";
let viewerOriginalData = null;

const translations = {
  fr:{settings:"Réglages",expo:"Exposition",filter:"Intensité",select:"Sélectionner",delete:"Supprimer",edit:"Retoucher",cancel:"Annuler",save:"Enregistrer",holdOriginal:"Maintiens la photo pour voir l’originale",appearance:"Apparence",language:"Langue",auto:"Auto",light:"Clair",dark:"Sombre",camera:"Caméra",gallery:"Galerie",filters:"Filtres",compare:"Comparer",all:"Toutes",favorites:"Favoris",albums:"Albums",createFilter:"Créer un filtre",saveFilter:"Enregistrer le filtre",myFilters:"Mes filtres"},
  en:{settings:"Settings",expo:"Exposure",filter:"Intensity",select:"Select",delete:"Delete",edit:"Edit",cancel:"Cancel",save:"Save",holdOriginal:"Hold the photo to see the original",appearance:"Appearance",language:"Language",auto:"Auto",light:"Light",dark:"Dark",camera:"Camera",gallery:"Gallery",filters:"Filters",compare:"Compare",all:"All",favorites:"Favorites",albums:"Albums",createFilter:"Create a filter",saveFilter:"Save filter",myFilters:"My filters"}
};

let galleryItems = JSON.parse(localStorage.getItem("lumaGallery") || "[]");
let customFilters = JSON.parse(localStorage.getItem("lumaFilters") || "[]").map(f=>({
  ...f,
  favorite: !!f.favorite,
  adjustments: f.adjustments || null
}));
let albums = JSON.parse(localStorage.getItem("lumaAlbums") || "[]");

const builtInFilters = [
  ["Aucun","none",{}],
  ["Clean","brightness(1.05) contrast(.96) saturate(.94)",{}],
  ["Dimanche","brightness(1.06) contrast(.90) saturate(.88) sepia(.06)",{}],
  ["Doré","brightness(1.02) contrast(.96) saturate(1.08) sepia(.16)",{}],
  ["Digicam","contrast(1.12) saturate(1.10) brightness(1.01)",{grain:12}],
  ["Cocooning","brightness(.98) contrast(.91) saturate(.86) sepia(.18)",{}],
  ["City","contrast(1.10) saturate(.88) brightness(.98)",{}],
  ["Flash","brightness(1.12) contrast(1.08) saturate(.92)",{}],
  ["Doux","brightness(1.08) contrast(.84) saturate(.90) blur(.25px)",{}],
  ["Film","contrast(.94) saturate(.78) sepia(.12)",{grain:16,fade:8}],
  ["Vintage","brightness(.98) contrast(.9) saturate(.72) sepia(.22)",{grain:28,fade:12,vignette:16}],
  ["Nuit","brightness(.90) contrast(1.18) saturate(.82)",{}],
  ["Été européen","brightness(1.05) contrast(.95) saturate(1.17) sepia(.07)",{}],
  ["Old Money","brightness(1.02) contrast(.94) saturate(.78) sepia(.13)",{grain:8}],
  ["Model Off Duty","contrast(1.12) saturate(.73) brightness(.96)",{}],
  ["Angel","brightness(1.13) contrast(.82) saturate(.88) blur(.35px)",{}]
];

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
}


function applyAppearance(){
  if(appAppearance==="system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", appAppearance);
  $$("[data-appearance]").forEach(b=>b.classList.toggle("active", b.dataset.appearance===appAppearance));
}

function applyLanguage(){
  const t=translations[appLanguage]||translations.fr;
  $("#settingsTitle").textContent=t.settings;
  $("#appearanceLabel").textContent=t.appearance;
  $("#languageLabel").textContent=t.language;

  const a=$('[data-appearance="system"]'), l=$('[data-appearance="light"]'), d=$('[data-appearance="dark"]');
  if(a)a.textContent=t.auto; if(l)l.textContent=t.light; if(d)d.textContent=t.dark;

  const tabs=$$(".tab"), labels=[t.camera,t.gallery,t.filters];
  tabs.forEach((b,i)=>{if(labels[i])b.textContent=labels[i]});

  const compare=$("#compareModeBtn"); if(compare&&!compareMode)compare.textContent=t.compare;
  const gt=$$(".gallery-tab"), gl=[t.all,t.favorites,t.albums];
  gt.forEach((b,i)=>{if(gl[i])b.textContent=gl[i]});

  const h2=$("#filtersView h2"); if(h2)h2.textContent=t.createFilter;
  const save=$("#saveFilterBtn");
  if(save) save.textContent = editingCustomFilterIndex!==null
    ? (appLanguage==="en"?"Update filter":"Mettre à jour le filtre")
    : t.saveFilter;
  const mft=$("#myFiltersTitle"); if(mft)mft.textContent=t.myFilters;
  const sm=$("#selectModeBtn"); if(sm&&!gallerySelectMode)sm.textContent=t.select;
  const bd=$("#bulkDeleteBtn"); if(bd)bd.textContent=t.delete;
  const ve=$("#viewerEdit"); if(ve)ve.textContent="✦ "+t.edit;
  const vc=$("#viewerEditCancel"); if(vc)vc.textContent=t.cancel;
  const vs=$("#viewerEditSave"); if(vs)vs.textContent=t.save;
  const vh=$("#viewerEditHint"); if(vh)vh.textContent=t.holdOriginal;
  const ae=$("#adjustModeExposure"); if(ae)ae.textContent=t.expo;  renderAdjustmentStrip(); syncActiveAdjustment();

  $$("[data-language]").forEach(b=>b.classList.toggle("active", b.dataset.language===appLanguage));
}

function openSettings(){
  applyAppearance();
  applyLanguage();
  $("#settingsOverlay").classList.remove("hidden");
}

function showZoomIndicator(value){
  const z=$("#zoomIndicator");
  z.textContent=(Math.round(value*10)/10)+"×";
  z.classList.remove("hidden");
  clearTimeout(zoomIndicatorTimer);
  zoomIndicatorTimer=setTimeout(()=>z.classList.add("hidden"),700);
}

async function applyZoomValue(value){
  if(!stream)return;
  const track=stream.getVideoTracks()[0];
  const caps=track.getCapabilities?track.getCapabilities():{};
  if(!caps.zoom)return;
  const min=caps.zoom.min??1, max=caps.zoom.max??1, step=caps.zoom.step||0.1;
  const clamped=Math.max(min,Math.min(max,value));
  const snapped=Math.round(clamped/step)*step;
  try{
    await track.applyConstraints({advanced:[{zoom:snapped}]});
    pinchZoom=snapped;
    showZoomIndicator(snapped);
  }catch(e){}
}

function bindPinchZoom(){
  const stage=$("#cameraView .camera-stage");
  if(!stage)return;
  const dist=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);

  ["gesturestart","gesturechange","gestureend"].forEach(type=>{
    stage.addEventListener(type,e=>e.preventDefault(),{passive:false});
  });

  stage.addEventListener("touchstart", e=>{
    if(e.touches.length!==2||!stream)return;
    e.preventDefault();
    const track=stream.getVideoTracks()[0], caps=track.getCapabilities?track.getCapabilities():{};
    if(!caps.zoom)return;
    const s=track.getSettings?track.getSettings():{};
    pinchZoom=s.zoom||pinchZoom||1;
    pinchState={distance:dist(e.touches[0],e.touches[1]),zoom:pinchZoom};
  },{passive:false});

  stage.addEventListener("touchmove", e=>{
    if(!pinchState||e.touches.length!==2)return;
    e.preventDefault();
    const ratio=dist(e.touches[0],e.touches[1])/pinchState.distance;
    applyZoomValue(pinchState.zoom*ratio);
  },{passive:false});

  stage.addEventListener("touchend", e=>{
    if(e.touches.length<2)pinchState=null;
  },{passive:false});
}



function mixFilterCss(css){
  return (!css || css==="none") ? "none" : css;
}

function currentLiveFilter(){
  return mixFilterCss(currentFilterCss);
}

function applyLiveFilter(){
  const exposureBoost=Math.max(.35,1+cameraExposureValue/95);
  const base=currentLiveFilter();
  $("#video").style.filter=`brightness(${exposureBoost.toFixed(3)}) ${base==="none"?"":base}`;
}

async function applyCameraExposure(value){
  cameraExposureValue=+value;
  if(stream){
    const track=stream.getVideoTracks()[0];
    const caps=track.getCapabilities?track.getCapabilities():{};
    if(caps.exposureCompensation){
      const min=caps.exposureCompensation.min ?? -3;
      const max=caps.exposureCompensation.max ?? 3;
      const target=min+(cameraExposureValue+100)/200*(max-min);
      try{await track.applyConstraints({advanced:[{exposureCompensation:target}]});}catch(e){}
    }
  }
  applyLiveFilter();
}

function updateCameraAdjustPanel(){
  const slider=$("#cameraAdjustSlider");
  const val=$("#cameraAdjustValue");
  slider.min=-100; slider.max=100; slider.value=cameraExposureValue;
  val.textContent=(cameraExposureValue>0?"+":"")+cameraExposureValue;
}

function openCameraAdjust(){
  updateCameraAdjustPanel();
  $("#cameraAdjustPanel").classList.remove("hidden");
}

function cycleTimer(){
  const values=[0,3,5,10];
  const i=values.indexOf(timerSeconds);
  timerSeconds=values[(i+1)%values.length];
  $("#timerBtn").textContent=`⏱ ${timerSeconds}s`;
}





async function takePhotoWithTimer(){
  if(timerSeconds<=0){
    capture();
    return;
  }
  const overlay=$("#countdownOverlay");
  overlay.classList.remove("hidden");
  for(let n=timerSeconds;n>0;n--){
    overlay.textContent=n;
    await new Promise(r=>setTimeout(r,1000));
  }
  overlay.textContent="✦";
  capture();
  setTimeout(()=>overlay.classList.add("hidden"),250);
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
        $("#lockMessage").textContent = "Code incorrect";
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
      video: { facingMode: { ideal: facingMode }, width:{ideal:1920}, height:{ideal:2560} },
      audio:false
    });
    $("#video").srcObject = stream;
    $("#filterPreview").srcObject = stream;
    // Selfie preview should behave like a mirror. Captured output stays correctly oriented.
    $("#video").style.transform = facingMode==="user" ? "scaleX(-1)" : "none";
    $("#filterPreview").style.transform = facingMode==="user" ? "scaleX(-1)" : "none";
    $("#cameraError").classList.add("hidden");
        try{const s=stream.getVideoTracks()[0].getSettings();pinchZoom=s.zoom||1}catch(e){}
  } catch (e) {
    $("#cameraError").textContent = "Caméra indisponible. Vérifie l’autorisation caméra dans Safari puis rouvre l’app.";
    $("#cameraError").classList.remove("hidden");
  }
}



function allFilters() {
  const customSorted=[...customFilters].sort((a,b)=>(b.favorite?1:0)-(a.favorite?1:0));
  return [
    ...customSorted.map(f=>[f.name,f.css,f.fx||{},true]),
    ...builtInFilters.map(f=>[f[0],f[1],f[2]||{},false])
  ];
}
function filterFx(name) {
  const f=allFilters().find(x=>x[0]===name);
  return f ? (f[2]||{}) : {};
}



function openCustomFilterEditor(index){
  const f=customFilters[index];
  if(!f)return;
  editingCustomFilterIndex=index;

  $("#customFilterName").value=f.name || "";
  if(f.adjustments){
    adjustmentDefs.forEach(d=>{
      adjustmentValues[d.id] = Number.isFinite(+f.adjustments[d.id]) ? +f.adjustments[d.id] : d.value;
    });
  } else {
    // For older filters we cannot perfectly reverse-engineer CSS values.
    // Keep current values neutral and preserve the original preview until changed.
    adjustmentDefs.forEach(d=>adjustmentValues[d.id]=d.value);
  }

  activeAdjustmentId="exposure";
  activateView("filtersView");
  renderAdjustmentStrip();
  syncActiveAdjustment();

  if(f.css){
    $("#filterPreview").style.filter=f.css;
  } else {
    updateFilterPreview();
  }

  $("#saveFilterBtn").textContent = appLanguage==="en" ? "Update filter" : "Mettre à jour le filtre";
}

function serializeAdjustments(){
  return Object.fromEntries(adjustmentDefs.map(d=>[d.id, adjustmentValues[d.id]]));
}

function renderFilterDirectory(){
  const box=$("#filterDirectory");
  if(!box)return;
  const sorted=[...customFilters].sort((a,b)=>(b.favorite?1:0)-(a.favorite?1:0));
  if(!sorted.length){
    box.innerHTML=`<span class="muted">${appLanguage==="en"?"No custom filters yet.":"Aucun filtre personnalisé pour le moment."}</span>`;
    return;
  }
  box.innerHTML=sorted.map(f=>{
    const originalIndex=customFilters.indexOf(f);
    return `<div class="filter-directory-item">
      <button class="filter-directory-main" data-use-filter="${originalIndex}">
        <span class="filter-directory-name">${f.name}</span>
      </button>
      <button class="filter-fav" data-fav-filter="${originalIndex}" aria-label="Favori">${f.favorite?"♥":"♡"}</button>
      <button class="filter-delete" data-delete-filter="${originalIndex}" aria-label="Supprimer">×</button>
    </div>`;
  }).join("");

  $$("[data-use-filter]").forEach(b=>b.onclick=()=>{
    openCustomFilterEditor(+b.dataset.useFilter);
  });

  $$("[data-fav-filter]").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.favFilter;
    customFilters[i].favorite=!customFilters[i].favorite;
    localStorage.setItem("lumaFilters",JSON.stringify(customFilters));
    renderFilters();
    renderFilterDirectory();
  });

  $$("[data-delete-filter]").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.deleteFilter;
    if(editingCustomFilterIndex===i) editingCustomFilterIndex=null;
    else if(editingCustomFilterIndex!==null && editingCustomFilterIndex>i) editingCustomFilterIndex--;
    customFilters.splice(i,1);
    localStorage.setItem("lumaFilters",JSON.stringify(customFilters));
    renderFilters();
  });
}

function renderFilters() {
  renderFilterDirectory();
  const strip=$("#filterStrip"); strip.innerHTML="";
  allFilters().forEach(([name,css,fx,isCustom])=>{
    const b=document.createElement("button");
    b.className="filter-chip"+(name===currentFilter?" active":"");
    b.textContent=name;
    b.onclick=()=>{currentFilter=name;currentFilterCss=css;currentFilterCss=css;applyLiveFilter();renderFilters();};
    strip.appendChild(b);
  });
  $("#myFilters").innerHTML = customFilters.length
    ? customFilters.map((f,i)=>`<div class="my-filter-card">${f.name} <button data-del="${i}" style="border:0;background:none">×</button></div>`).join("")
    : `<span class="muted">No custom filters yet.</span>`;
  $$("[data-del]").forEach(b=>b.onclick=()=>{
    customFilters.splice(+b.dataset.del,1);localStorage.setItem("lumaFilters",JSON.stringify(customFilters));renderFilters();
  });
}


const adjustmentDefs = [
  {id:"exposure", fr:"Exposition", en:"Exposure", icon:"☀", min:-100, max:100, value:0},
  {id:"brilliance", fr:"Brillance", en:"Brilliance", icon:"✦", min:-100, max:100, value:0},
  {id:"highlights", fr:"Hautes lumières", en:"Highlights", icon:"◐", min:-100, max:100, value:0},
  {id:"shadows", fr:"Ombres", en:"Shadows", icon:"◑", min:-100, max:100, value:0},
  {id:"contrast", fr:"Contraste", en:"Contrast", icon:"◒", min:-100, max:100, value:0},
  {id:"brightness", fr:"Luminosité", en:"Brightness", icon:"◉", min:-100, max:100, value:0},
  {id:"blackPoint", fr:"Point noir", en:"Black Point", icon:"●", min:0, max:100, value:0},
  {id:"saturation", fr:"Saturation", en:"Saturation", icon:"◈", min:-100, max:100, value:0},
  {id:"vibrance", fr:"Éclat", en:"Vibrance", icon:"✺", min:-100, max:100, value:0},
  {id:"warmth", fr:"Chaleur", en:"Warmth", icon:"♨", min:-100, max:100, value:0},
  {id:"tint", fr:"Teinte", en:"Tint", icon:"◌", min:-100, max:100, value:0},
  {id:"sharpness", fr:"Netteté", en:"Sharpness", icon:"⌁", min:0, max:100, value:0},
  {id:"definition", fr:"Définition", en:"Definition", icon:"◇", min:0, max:100, value:0},
  {id:"noise", fr:"Réduction du bruit", en:"Noise Reduction", icon:"≈", min:0, max:100, value:0},
  {id:"vignette", fr:"Vignettage", en:"Vignette", icon:"◎", min:0, max:100, value:0},
  {id:"grain", fr:"Grain", en:"Grain", icon:"⠿", min:0, max:100, value:0},
  {id:"fade", fr:"Fondu", en:"Fade", icon:"◍", min:0, max:100, value:0}
];
let adjustmentValues = Object.fromEntries(adjustmentDefs.map(d=>[d.id,d.value]));
let activeAdjustmentId = "exposure";

function renderAdjustmentStrip(){
  const strip = $("#adjustmentStrip");
  if(!strip) return;
  strip.innerHTML = adjustmentDefs.map(d=>`
    <button class="adjustment-item ${d.id===activeAdjustmentId?"active":""}" data-adjust="${d.id}">
      <span class="adjustment-icon">${d.icon}</span>
      <span class="adjustment-label">${d[appLanguage] || d.fr}</span>
      <span class="adjustment-mini-value">${adjustmentValues[d.id]}</span>
    </button>`).join("");
  setTimeout(syncAdjustmentScrollbar,0);
  $$("[data-adjust]").forEach(b=>b.onclick=()=>{
    activeAdjustmentId=b.dataset.adjust;
    syncActiveAdjustment();
    renderAdjustmentStrip();
  });
}
function syncAdjustmentScrollbar(){
  const strip=$("#adjustmentStrip");
  const bar=$("#adjustmentScroll");
  if(!strip || !bar) return;
  const maxScroll=Math.max(0, strip.scrollWidth-strip.clientWidth);
  bar.disabled=maxScroll<=0;
  bar.value=maxScroll ? Math.round((strip.scrollLeft/maxScroll)*100) : 0;
}
function bindAdjustmentScrollbar(){
  const strip=$("#adjustmentStrip");
  const bar=$("#adjustmentScroll");
  if(!strip || !bar) return;
  bar.oninput=()=>{
    const maxScroll=Math.max(0, strip.scrollWidth-strip.clientWidth);
    strip.scrollLeft=(+bar.value/100)*maxScroll;
  };
  strip.addEventListener("scroll", syncAdjustmentScrollbar, {passive:true});
  window.addEventListener("resize", syncAdjustmentScrollbar);
}

function syncActiveAdjustment(){
  const def=adjustmentDefs.find(d=>d.id===activeAdjustmentId);
  $("#activeAdjustmentName").textContent=def[appLanguage] || def.fr;
  $("#activeAdjustmentValue").textContent=adjustmentValues[def.id];
  const s=$("#activeAdjustmentSlider");
  s.min=def.min; s.max=def.max; s.value=adjustmentValues[def.id];
}
function av(id){ return +adjustmentValues[id] || 0; }

function customCss() {
  const exposure = 1 + av("exposure")/250;
  const brightness = 1 + av("brightness")/300;
  const contrast = 1 + av("contrast")/250;
  const sat = 1 + av("saturation")/180;
  const brilliance = av("brilliance");
  const vibrance = av("vibrance");
  const warmth = av("warmth");
  const tint = av("tint");
  const highlights = av("highlights");
  const shadows = av("shadows");
  const blackPoint = av("blackPoint");
  const fade = av("fade");
  const sepia = Math.max(0, warmth)/420;
  const hue = tint/4;
  const softContrast = 1 + (brilliance/600) + (blackPoint/500) - (fade/500);
  const finalBrightness = exposure * brightness * (1 + shadows/700) * (1 - highlights/1200);
  const finalSat = sat * (1 + vibrance/300);
  return `brightness(${finalBrightness.toFixed(3)}) contrast(${(contrast*softContrast).toFixed(3)}) saturate(${finalSat.toFixed(3)}) sepia(${sepia.toFixed(3)}) hue-rotate(${hue.toFixed(1)}deg)`;
}
function customFx() {
  return {
    grain:av("grain"), vignette:av("vignette"), sharpness:av("sharpness"),
    definition:av("definition"), noise:av("noise"), fade:av("fade"), warmth:av("warmth")
  };
}
function updateFilterPreview() {
  $("#filterPreview").style.filter=customCss();
  const fx=customFx();
  let bg=[];
  if(fx.vignette>0) bg.push(`radial-gradient(circle at center, transparent ${55-fx.vignette*.2}%, rgba(0,0,0,${(fx.vignette/170).toFixed(2)}) 100%)`);
  if(fx.warmth>0) bg.push(`linear-gradient(rgba(255,133,70,${(fx.warmth/900).toFixed(3)}),rgba(255,133,70,${(fx.warmth/900).toFixed(3)}))`);
  else if(fx.warmth<0) bg.push(`linear-gradient(rgba(70,120,255,${(-fx.warmth/1100).toFixed(3)}),rgba(70,120,255,${(-fx.warmth/1100).toFixed(3)}))`);
  $("#filterPreviewFx").style.background=bg.join(",");
}
function resetAdjustments(){
  adjustmentDefs.forEach(d=>adjustmentValues[d.id]=d.value);
  activeAdjustmentId="exposure";
  renderAdjustmentStrip(); syncActiveAdjustment(); updateFilterPreview();
}

function renderAlbums() {
  const box=$("#albumList");
  if(galleryFilter!=="albums"){box.classList.add("hidden");return;}
  box.classList.remove("hidden");
  box.innerHTML=albums.length?albums.map((a,i)=>{
    const count=galleryItems.filter(x=>(x.albums||[]).includes(a.id)).length;
    return `<button class="album-card-mini" data-album="${a.id}"><strong>${a.name}</strong><span>${count} photos</span></button>`;
  }).join(""):`<div class="muted">Aucun album pour le moment.</div>`;
  $$("[data-album]").forEach(b=>b.onclick=()=>{galleryFilter="album:"+b.dataset.album;renderGallery();});
}

function filteredGalleryIndexes() {
  if(galleryFilter==="favorites") return galleryItems.map((x,i)=>x.favorite?i:null).filter(i=>i!==null);
  if(galleryFilter.startsWith("album:")) {
    const id=galleryFilter.split(":")[1];
    return galleryItems.map((x,i)=>(x.albums||[]).includes(id)?i:null).filter(i=>i!==null);
  }
  return galleryItems.map((_,i)=>i);
}

function renderGallery() {
  renderAlbums();
  const grid=$("#galleryGrid");
  if(galleryFilter==="albums"){grid.innerHTML="";$("#emptyGallery").classList.add("hidden");return;}
  const idxs=filteredGalleryIndexes();
  $("#emptyGallery").classList.toggle("hidden",idxs.length>0);

  grid.innerHTML=idxs.map(i=>{
    const it=galleryItems[i];
    const selected=compareSelection.includes(i);
    const bulkSelected=galleryBulkSelection.has(i);
    const dt=new Date(it.created||Date.now());
    const time=dt.toLocaleTimeString(appLanguage==="en"?"en-GB":"fr-FR",{hour:"2-digit",minute:"2-digit"});
    const badge=selected?`<span class="select-badge">${compareSelection.indexOf(i)===0?"A":"B"}</span>`:"";
    const bulk=gallerySelectMode?`<span class="bulk-select ${bulkSelected?"on":""}">${bulkSelected?"✓":""}</span>`:"";
    return `<div class="gallery-item ${selected?"selected":""} ${bulkSelected?"bulk-selected":""}" data-item="${i}">
      <img src="${it.data}" alt="">
      ${badge}${bulk}
      <button class="fav-btn" data-fav="${i}">${it.favorite?"♥":"♡"}</button>
      <div class="photo-time">${time}</div>
    </div>`;
  }).join("");

  $$("[data-fav]").forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const i=+b.dataset.fav;
    galleryItems[i].favorite=!galleryItems[i].favorite;
    saveGallery();
  });

  $$("[data-item]").forEach(el=>el.onclick=()=>{
    const i=+el.dataset.item;
    if(gallerySelectMode){
      if(galleryBulkSelection.has(i)) galleryBulkSelection.delete(i);
      else galleryBulkSelection.add(i);
      $("#bulkDeleteBtn").classList.toggle("hidden",galleryBulkSelection.size===0);
      renderGallery();
      return;
    }
    if(compareMode){
      if(compareSelection.includes(i)) compareSelection=compareSelection.filter(x=>x!==i);
      else if(compareSelection.length<2) compareSelection.push(i);
      renderGallery();
      if(compareSelection.length===2) openCompare();
    } else openViewer(i);
  });
}

function saveGallery() {
  try{localStorage.setItem("lumaGallery",JSON.stringify(galleryItems.slice(0,60)));}catch(e){}
  renderGallery();
}
function saveAlbums(){localStorage.setItem("lumaAlbums",JSON.stringify(albums));renderGallery();}

function addPhoto(data) {
  galleryItems.unshift({data,favorite:false,created:Date.now(),albums:[]});
  if(galleryItems.length>50)galleryItems=galleryItems.slice(0,50);
  saveGallery();
}


function renderViewerEditFilters(){
  const box=$("#viewerEditFilters");
  if(!box)return;
  const list=allFilters();
  box.innerHTML=list.map(([name,css])=>`
    <button class="viewer-edit-chip ${name===viewerEditFilterName?"active":""}" data-viewer-filter="${encodeURIComponent(name)}">
      ${name}
    </button>`).join("");
  $$("[data-viewer-filter]").forEach(b=>b.onclick=()=>{
    const name=decodeURIComponent(b.dataset.viewerFilter);
    const f=list.find(x=>x[0]===name);
    if(!f)return;
    viewerEditFilterName=name;
    viewerEditFilterCss=f[1]||"none";
    $("#viewerImage").style.filter=viewerEditFilterCss;
    renderViewerEditFilters();
  });
}

function openViewerEdit(){
  if(currentViewerIndex===null)return;
  viewerOriginalData=galleryItems[currentViewerIndex].originalData || galleryItems[currentViewerIndex].data;
  viewerEditFilterName="Aucun";
  viewerEditFilterCss="none";
  $("#viewerImage").style.filter="none";
  $("#viewerEditPanel").classList.remove("hidden");
  renderViewerEditFilters();
}

function closeViewerEdit(reset=true){
  if(reset) $("#viewerImage").style.filter="none";
  $("#viewerEditPanel").classList.add("hidden");
  viewerEditFilterName="Aucun";
  viewerEditFilterCss="none";
}

function saveViewerEdit(){
  if(currentViewerIndex===null)return;
  const img=$("#viewerImage");
  const canvas=$("#canvas");
  const source=new Image();
  source.onload=()=>{
    canvas.width=source.naturalWidth;
    canvas.height=source.naturalHeight;
    const ctx=canvas.getContext("2d");
    ctx.filter=viewerEditFilterCss||"none";
    ctx.drawImage(source,0,0,canvas.width,canvas.height);
    ctx.filter="none";

    const item=galleryItems[currentViewerIndex];
    if(!item.originalData) item.originalData=item.data;
    item.data=canvas.toDataURL("image/jpeg",.92);
    item.lastEditFilter=viewerEditFilterName;
    saveGallery();
    $("#viewerImage").src=item.data;
    $("#viewerImage").style.filter="none";
    closeViewerEdit(false);
  };
  source.src=galleryItems[currentViewerIndex].data;
}

function bindViewerBeforeAfter(){
  const image=$("#viewerImage");
  const showOriginal=()=>{
    if(currentViewerIndex===null)return;
    const item=galleryItems[currentViewerIndex];
    if(!item.originalData)return;
    image.dataset.editedSrc=image.src;
    image.src=item.originalData;
    image.style.filter="none";
  };
  const showEdited=()=>{
    if(image.dataset.editedSrc){
      image.src=image.dataset.editedSrc;
      delete image.dataset.editedSrc;
    }
  };
  image.addEventListener("pointerdown",showOriginal);
  image.addEventListener("pointerup",showEdited);
  image.addEventListener("pointercancel",showEdited);
  image.addEventListener("pointerleave",showEdited);
}

function openViewer(i){
  currentViewerIndex=i;
  $("#viewerImage").src=galleryItems[i].data;
  $("#viewerFavorite").textContent=galleryItems[i].favorite?"♥ Favori":"♡ Favori";
  $("#viewerOverlay").classList.remove("hidden");
}
function closeViewer(){closeViewerEdit(false);$("#viewerOverlay").classList.add("hidden");currentViewerIndex=null;}

function openCompare(){
  const [a,b]=compareSelection;
  $("#compareA").src=galleryItems[a].data;
  $("#compareB").src=galleryItems[b].data;
  $("#compareOverlay").classList.remove("hidden");
  $("#compareSlider").classList.add("hidden");
  $("#compareDivider").classList.add("hidden");
  $("#compareB").style.clipPath="none";
  $("#compareB").style.opacity="0";
  const stage=$(".compare-stage");
  const pressStart=()=>$("#compareB").style.opacity="1";
  const pressEnd=()=>$("#compareB").style.opacity="0";
  stage.onpointerdown=pressStart;
  stage.onpointerup=pressEnd;
  stage.onpointercancel=pressEnd;
  stage.onpointerleave=pressEnd;
}



function capture() {
  const video=$("#video"),canvas=$("#canvas");
  if(!video.videoWidth)return;
  canvas.width=video.videoWidth;
  canvas.height=video.videoHeight;
  const ctx=canvas.getContext("2d");
  const exposureBoost=Math.max(.35,1+cameraExposureValue/95);
  const base=currentLiveFilter();
  ctx.filter=`brightness(${exposureBoost.toFixed(3)}) ${base==="none"?"":base}`;
  ctx.drawImage(video,0,0,canvas.width,canvas.height);
  ctx.filter="none";

  const fx=filterFx(currentFilter);
  if(fx.vignette){
    const g=ctx.createRadialGradient(canvas.width/2,canvas.height/2,Math.min(canvas.width,canvas.height)*.2,canvas.width/2,canvas.height/2,Math.max(canvas.width,canvas.height)*.72);
    g.addColorStop(.55,"rgba(0,0,0,0)");g.addColorStop(1,`rgba(0,0,0,${Math.min(.5,fx.vignette/120)})`);ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
  }
  if(fx.grain){
    const amount=Math.floor((fx.grain/100)*18000);
    ctx.globalAlpha=Math.min(.18,fx.grain/500);
    for(let i=0;i<amount;i++){const x=Math.random()*canvas.width,y=Math.random()*canvas.height,v=Math.random()>0.5?255:0;ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(x,y,1.2,1.2);}
    ctx.globalAlpha=1;
  }
  addPhoto(canvas.toDataURL("image/jpeg",.9));
  const flash=$("#shutterFlash");flash.classList.remove("fire");void flash.offsetWidth;flash.classList.add("fire");
  setTimeout(()=>flash.classList.remove("fire"),220);
}

async function focusAt(ev) {
  if(!stream)return;
  const stage=ev.currentTarget,rect=stage.getBoundingClientRect();
  const x=ev.clientX-rect.left,y=ev.clientY-rect.top;
  const ring=$("#focusRing");ring.style.left=x+"px";ring.style.top=y+"px";ring.classList.remove("hidden");setTimeout(()=>ring.classList.add("hidden"),700);
  const track=stream.getVideoTracks()[0],caps=track.getCapabilities?track.getCapabilities():{};
  try{
    const adv={};
    if(caps.focusMode?.includes("single-shot"))adv.focusMode="single-shot";
    if("pointsOfInterest" in caps)adv.pointsOfInterest=[{x:x/rect.width,y:y/rect.height}];
    if(Object.keys(adv).length)await track.applyConstraints({advanced:[adv]});
  }catch(e){}
}

function openAlbumModal(mode){
  pendingAlbumMode=mode;
  $("#albumOverlay").classList.remove("hidden");
  $("#albumNameInput").value="";
  if(mode==="create"){
    $("#albumOverlayTitle").textContent="Nouvel album";
    $("#albumNameInput").classList.remove("hidden");
    $("#albumChoices").classList.add("hidden");
  } else {
    $("#albumOverlayTitle").textContent="Ajouter à un album";
    $("#albumNameInput").classList.add("hidden");
    $("#albumChoices").classList.remove("hidden");
    $("#albumChoices").innerHTML=albums.length?albums.map(a=>`<button class="album-choice" data-choice="${a.id}">${a.name} <span>＋</span></button>`).join(""):`<div class="muted">Crée d’abord un album.</div>`;
    $$("[data-choice]").forEach(b=>b.onclick=()=>{
      if(currentViewerIndex===null)return;
      const id=b.dataset.choice;
      galleryItems[currentViewerIndex].albums=galleryItems[currentViewerIndex].albums||[];
      if(!galleryItems[currentViewerIndex].albums.includes(id))galleryItems[currentViewerIndex].albums.push(id);
      saveGallery();$("#albumOverlay").classList.add("hidden");
    });
  }
}

function bind() {
  $("#timerBtn").onclick=cycleTimer;  $("#cameraAdjustBtn").onclick=()=>openCameraAdjust();  $("#closeCameraAdjust").onclick=()=>$("#cameraAdjustPanel").classList.add("hidden");
  $("#cameraAdjustSlider").oninput=e=>{
    applyCameraExposure(+e.target.value);
    updateCameraAdjustPanel();
  };

  bindPinchZoom();
  $("#settingsBtn").onclick=openSettings;
  $("#closeSettings").onclick=()=>$("#settingsOverlay").classList.add("hidden");
  $$("[data-appearance]").forEach(b=>b.onclick=()=>{
    appAppearance=b.dataset.appearance;
    localStorage.setItem("lumaAppearance",appAppearance);
    applyAppearance();
  });
  $$("[data-language]").forEach(b=>b.onclick=()=>{
    appLanguage=b.dataset.language;
    localStorage.setItem("lumaLanguage",appLanguage);
    applyLanguage();
  });
  bindAdjustmentScrollbar();
  // Camera controls
  $("#gridBtn").onclick=()=>$("#grid").classList.toggle("hidden");
  $("#switchBtn").onclick=async()=>{facingMode=facingMode==="environment"?"user":"environment";await startCamera();};
  $("#shutterBtn").onclick=takePhotoWithTimer;

  // Calque / photo de référence
  $("#traceInput").onchange=e=>{
    const f=e.target.files[0];
    if(!f)return;
    const r=new FileReader();
    r.onload=()=>{
      $("#traceImage").src=r.result;
      $("#traceImage").classList.remove("hidden");
      $("#traceOpacityWrap").classList.remove("hidden");
      $("#removeTraceBtn").classList.remove("hidden");
    };
    r.readAsDataURL(f);
  };
  $("#traceOpacity").oninput=e=>$("#traceImage").style.opacity=e.target.value/100;
  $("#removeTraceBtn").onclick=()=>{
    $("#traceImage").src="";
    $("#traceImage").classList.add("hidden");
    $("#traceOpacityWrap").classList.add("hidden");
    $("#removeTraceBtn").classList.add("hidden");
    $("#traceInput").value="";
  };
  $("#cameraView .camera-stage").addEventListener("click",focusAt);

  // Editeur façon iPhone
  $("#activeAdjustmentSlider").oninput=e=>{
    adjustmentValues[activeAdjustmentId]=+e.target.value;
    $("#activeAdjustmentValue").textContent=e.target.value;
    renderAdjustmentStrip();
    updateFilterPreview();
  };
  $("#saveFilterBtn").onclick=()=>{
    const name=$("#customFilterName").value.trim()||(appLanguage==="en"?"My filter":"Mon filtre");
    const data={
      name,
      css:customCss(),
      fx:customFx(),
      favorite: editingCustomFilterIndex!==null ? !!customFilters[editingCustomFilterIndex]?.favorite : false,
      adjustments: serializeAdjustments()
    };

    if(editingCustomFilterIndex!==null){
      customFilters[editingCustomFilterIndex]=data;
    } else {
      customFilters.push(data);
    }

    localStorage.setItem("lumaFilters",JSON.stringify(customFilters));
    editingCustomFilterIndex=null;
    $("#customFilterName").value="";
    $("#saveFilterBtn").textContent=(translations[appLanguage]||translations.fr).saveFilter;
    renderFilters();
    renderFilterDirectory();
    resetAdjustments();
  };

  // Comparateur A / B
  $("#selectModeBtn").onclick=()=>{
    gallerySelectMode=!gallerySelectMode;
    galleryBulkSelection.clear();
    $("#selectModeBtn").textContent=gallerySelectMode
      ? (appLanguage==="en"?"Cancel":"Annuler")
      : (appLanguage==="en"?"Select":"Sélectionner");
    $("#bulkDeleteBtn").classList.add("hidden");
    compareMode=false; compareSelection=[];
    renderGallery();
  };
  $("#bulkDeleteBtn").onclick=()=>{
    [...galleryBulkSelection].sort((a,b)=>b-a).forEach(i=>galleryItems.splice(i,1));
    galleryBulkSelection.clear();
    gallerySelectMode=false;
    $("#bulkDeleteBtn").classList.add("hidden");
    $("#selectModeBtn").textContent=appLanguage==="en"?"Select":"Sélectionner";
    saveGallery();
  };
  $("#compareModeBtn").onclick=()=>{
    compareMode=!compareMode;
    compareSelection=[];
    $("#compareModeBtn").textContent=compareMode?"Choisir A + B":"Comparer";
    renderGallery();
  };
  $("#closeCompare").onclick=()=>{
    $("#compareOverlay").classList.add("hidden");
    compareSelection=[];
    compareMode=false;
    $("#compareModeBtn").textContent="Comparer";
    renderGallery();
  };

  // Albums / dossiers
  $("#newAlbumBtn").onclick=()=>openAlbumModal("create");
  $("#cancelAlbumBtn").onclick=()=>$("#albumOverlay").classList.add("hidden");
  $("#confirmAlbumBtn").onclick=()=>{
    if(pendingAlbumMode!=="create")return;
    const name=$("#albumNameInput").value.trim();
    if(!name)return;
    albums.push({id:"a"+Date.now(),name});
    saveAlbums();
    $("#albumOverlay").classList.add("hidden");
    galleryFilter="albums";
    $$(".gallery-tab").forEach(x=>x.classList.toggle("active",x.dataset.galleryFilter==="albums"));
    renderGallery();
  };
  $$(".gallery-tab").forEach(b=>b.onclick=()=>{
    $$(".gallery-tab").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    galleryFilter=b.dataset.galleryFilter;
    compareMode=false;
    compareSelection=[];
    $("#compareModeBtn").textContent="Comparer";
    renderGallery();
  });

  // Viewer photo
  $("#closeViewer").onclick=closeViewer;
  $("#viewerEdit").onclick=openViewerEdit;
  $("#viewerEditCancel").onclick=()=>closeViewerEdit(true);
  $("#viewerEditSave").onclick=saveViewerEdit;
  bindViewerBeforeAfter();
  $("#viewerFavorite").onclick=()=>{
    if(currentViewerIndex===null)return;
    galleryItems[currentViewerIndex].favorite=!galleryItems[currentViewerIndex].favorite;
    saveGallery();
    openViewer(currentViewerIndex);
  };
  $("#viewerDelete").onclick=()=>{
    if(currentViewerIndex===null)return;
    galleryItems.splice(currentViewerIndex,1);
    saveGallery();
    closeViewer();
  };
  $("#viewerAddAlbum").onclick=()=>openAlbumModal("add");

  // Navigation principale
  $$(".tab").forEach(b=>b.onclick=()=>activateView(b.dataset.view));
}
function activateView(id) {
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===id));
  $$(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===id));

  const isCamera = id === "cameraView";
  const canSwitchCamera = id === "cameraView" || id === "filtersView";

  $("#gridBtn").classList.toggle("camera-only-hidden", !isCamera);
  $("#switchBtn").classList.toggle("camera-only-hidden", !canSwitchCamera);

  if(id==="filtersView") {
    renderAdjustmentStrip();
    syncActiveAdjustment();
    updateFilterPreview();
    setTimeout(()=>{
      if(stream){
        $("#filterPreview").srcObject=stream;
        $("#filterPreview").play().catch(()=>{});
      }
      syncAdjustmentScrollbar();
    },30);
  }
}

async function forceFreshV3() {
  if (sessionStorage.getItem("lumaCacheResetV16") === "1") return;
  sessionStorage.setItem("lumaCacheResetV16","1");
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== "luma-v16").map(k => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        try { await reg.update(); } catch(e) {}
      }
    }
  } catch(e) {}
}

function boot() {
  forceFreshV3();
  renderKeypad();renderFilters();renderGallery();renderAdjustmentStrip();syncActiveAdjustment();bind();updateFilterPreview();activateView("cameraView");applyAppearance();applyLanguage();
  if(sessionStorage.getItem("lumaUnlocked")==="1"){$("#lockScreen").classList.add("hidden");$("#app").classList.remove("hidden");startCamera();}
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js?v=16").then(reg => {
      reg.update().catch(()=>{});
    }).catch(()=>{});
  }
}
boot();
