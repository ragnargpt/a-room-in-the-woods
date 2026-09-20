import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {createAtmosphere} from './environment.js';
import {createForestMotion,windAt} from './forest-motion.js';
import {createCampfire} from './campfire.js';
import {createLake} from './lake.js';
import {createSoundscape} from './soundscape.js';
import {messages,CITIES} from './i18n.js';
import {LOCATION,setLocation,dateKey,localHour,dateAtHour,formatHour,dayEvents} from './time-cycle.js';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],clone=v=>JSON.parse(JSON.stringify(v));
let personal={schemaVersion:1,name:'My room in the woods',language:'en',stage:'references',layoutConfirmed:false,room:{},location:null,environment:false,model:null,objects:[]},online=false,demo=false,lang='en',config,repo='https://github.com/',busy=false;
try{const r=await fetch('/api/project');if(r.ok){personal=await r.json();online=true;}}catch{}
try{repo=(await (await fetch('./repository.json')).json()).url;}catch{}
lang=personal.language||'en';config=clone(personal);
const t=k=>messages[lang][k]??k,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,3300);}
function error(err){$('#loading').hidden=true;$('#error-text').textContent=err.message||String(err);if(!$('#error-dialog').open)$('#error-dialog').showModal();}
$('#dismiss').onclick=()=>$('#error-dialog').close();window.addEventListener('unhandledrejection',e=>{e.preventDefault();error(e.reason)});window.addEventListener('error',e=>error(e.error||e.message));
let saveQueue=Promise.resolve();
async function api(path,data){const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),result=await r.json();if(!r.ok)throw Error(result.error);return result;}
function persist(){if(demo||!online)return;personal=clone(config);const value=clone(config);saveQueue=saveQueue.catch(()=>{}).then(()=>api('project',value)).then(()=>toast(t('saved'))).catch(error);}
function translate(){document.documentElement.lang=lang==='zh'?'zh-CN':'en';all('[data-t]').forEach(el=>el.textContent=t(el.dataset.t));$('#start-prompt').textContent=t('startPrompt');$('#guide-link').href=repo+'/blob/main/docs/'+lang+'/START_HERE.md';$('#source-link').href=repo;renderPanel();}
$('#language').onclick=()=>{lang=lang==='en'?'zh':'en';config.language=lang;translate();persist();};
$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(t('startPrompt'));toast(t('copied'));}catch{const r=document.createRange();r.selectNodeContents($('#start-prompt'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(r);}};
$('#begin').onclick=()=>$('#steps').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
$('#refresh').onclick=()=>location.reload();
const optional=['tent','hammock','campfire','camp_seats','wood_chair','boat','dock'];
let scene,renderer,camera,controls,atmosphere,forestMotion,fire,lake,audio,library,roomModel,clock,lastElapsed=0,manual=null,following=true,moving=!matchMedia('(prefers-reduced-motion:reduce)').matches,fireLit=false,soundOn=false,targetView=null;
const registry=new Map(),P=(x,y,z)=>new THREE.Vector3(x-2.445,z,1.165-y);
let generation=0;
function initScene(){
 if(renderer)return;
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(45,1,.15,1600);camera.position.set(10,7,16);
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.debug.onShaderError=()=>error(new Error(lang==='zh'?'画面着色器未能加载，请更新浏览器后重试。':'A scene shader did not compile. Please update your browser and try again.'));
 renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','3D view. Arrow keys rotate. Plus and minus zoom.');$('#canvas').append(renderer.domElement);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();error(new Error('Graphics context lost. Reload the studio.'));});
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=.8;controls.maxDistance=330;controls.maxPolarAngle=Math.PI*.92;controls.target.set(0,1.2,0);controls.addEventListener('change',()=>lake?.invalidate());controls.addEventListener('start',()=>targetView=null);
 renderer.domElement.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key))return;e.preventDefault();const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);if(e.key==='ArrowLeft')s.theta-=.12;if(e.key==='ArrowRight')s.theta+=.12;if(e.key==='ArrowUp')s.phi=Math.max(.05,s.phi-.10);if(e.key==='ArrowDown')s.phi=Math.min(Math.PI-.05,s.phi+.10);if(e.key==='+'||e.key==='=')s.radius*=.9;if(e.key==='-')s.radius*=1.1;camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));controls.update();});
 const pmrem=new THREE.PMREMGenerator(renderer),env=new RoomEnvironment();scene.environment=pmrem.fromScene(env,.04).texture;env.dispose();pmrem.dispose();
 atmosphere=createAtmosphere(scene,renderer,P);forestMotion=createForestMotion(renderer);fire=createCampfire(scene,renderer,P);lake=createLake(scene,renderer,P);audio=createSoundscape();audio.setMuted(true);fire.setVisible(false);lake.setVisible({lake:false,dock:false,boat:false});
 new ResizeObserver(()=>{const el=$('#canvas'),w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);lake.invalidate();}).observe($('#canvas'));
 forestMotion.setEnabled(moving);fire.setMotion(moving);lake.setMotion(moving);clock=new THREE.Clock();renderer.setAnimationLoop(animate);
 document.addEventListener('visibilitychange',()=>{audio.setPageVisible(!document.hidden);clock.getDelta();});
}
async function loadGLB(url){const r=await fetch(url);if(!r.ok)throw Error('Could not load '+url);let buffer;if(url.split('?')[0].endsWith('.gz')){if(!globalThis.DecompressionStream)throw Error('This browser needs gzip support. Use a current Chrome, Safari, Edge or Firefox.');buffer=await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}else buffer=await r.arrayBuffer();return (await new GLTFLoader().parseAsync(buffer,new URL('.',location.href).href)).scene;}
function instanceWoodland(root){
 root.updateMatrixWorld(true);const groups=new Map(),inverse=root.matrixWorld.clone().invert();
 root.traverse(o=>{if(!o.isMesh||o.userData.item_id!=='environment'||Array.isArray(o.material))return;const key=[o.geometry.uuid,o.material.uuid,o.userData.v3_layer].join('/');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);});
 for(const objects of groups.values()){if(objects.length<2)continue;const first=objects[0],mesh=new THREE.InstancedMesh(first.geometry,first.material,objects.length);mesh.name='Woodland instances';mesh.userData={...first.userData};objects.forEach((o,i)=>mesh.setMatrixAt(i,inverse.clone().multiply(o.matrixWorld)));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.3;objects.forEach(o=>o.removeFromParent());root.add(mesh);}
}
function disposeRoom(root){const gs=new Set(),ms=new Set(),ts=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){ms.add(m);for(const value of Object.values(m))if(value?.isTexture)ts.add(value);}});root.removeFromParent();gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());}
async function enter(isExample){
 if(busy)return;busy=true;const current=++generation;
 try{
 demo=isExample;config=clone(personal);if(demo){config={...config,name:t('sample'),stage:'woodland',environment:true,model:'example',location:CITIES[6],room:{width:4.6,depth:3.4,height:2.6},objects:optional.map(id=>({id,added:true,visible:true}))};}
 if(!demo&&!config.model){$('#workspace').hidden=true;$('#welcome').hidden=false;audio?.setMuted(true);translate();return;}
 $('#welcome').hidden=true;$('#workspace').hidden=false;$('#loading').hidden=false;initScene();
 if(config.location)setLocation(config.location);following=true;manual=null;
 if(!library){library=await loadGLB('./assets/woodland.glb.gz');library.position.set(-2.445,0,1.165);instanceWoodland(library);scene.add(library);forestMotion.registerModel(library);atmosphere.registerModel(library,'v5');fire.registerModel(library);lake.registerModel(library,'v5');}
 if(roomModel)disposeRoom(roomModel);
 const path=demo?'./assets/example-room.glb.gz':'/workspace/'+config.model+'?v='+Date.now();roomModel=await loadGLB(path);if(current!==generation)return;roomModel.position.set(-2.445,0,1.165);scene.add(roomModel);atmosphere.configureRoom(config.room.height||2.6);
 registry.clear();for(const root of [library,roomModel])root.traverse(o=>{const id=o.userData.item_id;if(!id||id==='environment'||id==='mooring')return;if(!registry.has(id))registry.set(id,[]);registry.get(id).push(o);if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 library.traverse(o=>{if(o.isMesh){o.castShadow=o.userData.v3_layer!=='ground';o.receiveShadow=true;}});
 translate();applyVisibility();view(demo?'camp':'room',true);$('#loading').hidden=true;
 }catch(e){error(e)}finally{busy=false;}
}
$('#example').onclick=()=>enter(true);$('#my-room').onclick=()=>enter(false);
function objectState(id){return config.objects?.find(o=>o.id===id)||{id,added:!optional.includes(id),visible:!['ceiling'].includes(id)};}
function setObject(id,patch){config.objects??=[];let item=config.objects.find(o=>o.id===id);if(!item){item={...objectState(id)};config.objects.push(item);}Object.assign(item,patch);applyVisibility();renderObjects();persist();}
function visible(id){const s=objectState(id);return s.added!==false&&s.visible!==false;}
function applyVisibility(){if(!renderer)return;const forest=!!config.environment;library.visible=forest;for(const [id,objects]of registry){let on=visible(id);if(id==='architecture')on&&=forest;for(const obj of objects)obj.visible=on;}fire.setVisible(forest&&visible('campfire'));lake.setVisible({lake:forest&&visible('lake'),boat:forest&&visible('boat'),dock:forest&&visible('dock')});audio.setLake(forest&&visible('lake'));audio.setAmbient(soundOn&&forest);audio.setMuted(!soundOn||!forest);atmosphere.setCelestialVisibility(visible('sun'),visible('moon'));atmosphere.setVisibility(visible('room'),visible('ceiling'));renderer.shadowMap.needsUpdate=true;lake.invalidate();}
function label(id){const f=personal.room?.furniture?.find(f=>f.id===id),entry=config.objects?.find(o=>o.id===id);return entry?.label?.[lang]||entry?.label?.en||(id==='room'?t('roomObject'):messages[lang][id])||f?.name||id;}
function renderObjects(){if(!registry.size)return;const ids=[...new Set([...registry.keys(),'lake','sun','moon'])];$('#object-list').innerHTML=ids.filter(id=>objectState(id).added!==false).map(id=>`<div class="object-row"><label class="toggle"><input type="checkbox" data-item="${esc(id)}" ${visible(id)?'checked':''}><span>${esc(label(id))}</span></label><button data-focus="${esc(id)}" aria-label="${esc(t('focus')+' '+label(id))}">↗</button></div>`).join('');$('#library-list').innerHTML=optional.map(id=>`<div class="object-row"><span>${esc(label(id))}</span><button data-add="${esc(id)}" ${objectState(id).added!==false?'disabled':''}>${t(objectState(id).added!==false?'added':'add')}</button></div>`).join('');all('[data-item]').forEach(el=>el.onchange=()=>setObject(el.dataset.item,{visible:el.checked}));all('[data-add]').forEach(el=>el.onclick=()=>setObject(el.dataset.add,{added:true,visible:true}));all('[data-focus]').forEach(el=>el.onclick=()=>focus(el.dataset.focus));}
function renderPanel(){
 $('#scene-title').textContent=demo?t('brand'):config.name;$('#demo-note').hidden=!demo;$('#preview-note').hidden=online;$('#save').disabled=demo||!online;$('#version-panel').hidden=demo;$('#forest').checked=!!config.environment;$('#follow').checked=following;$('#motion').checked=moving;$('#sound').checked=soundOn;$('#fire').checked=fireLit;
 const stages=['references','layout','room','materials','woodland','details'];$('#journey').innerHTML=stages.map((s,i)=>`<li class="${config.stage===s?'active':''}">${i+1}. ${t(s)}</li>`).join('');$('#next-step').textContent=demo?t('demoNote'):config.nextStep||t('remaining');
 $('#city').innerHTML=`<option value="">${t('choose')}</option>`+CITIES.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join('')+`<option value="custom">${config.location&&!CITIES.some(c=>c.lat===config.location.lat&&c.lon===config.location.lon)?esc(config.location.name):t('custom')}</option>`;
 const city=CITIES.findIndex(c=>c.lat===config.location?.lat&&c.lon===config.location?.lon);$('#city').value=config.location?(city<0?'custom':String(city)):'';
 $('#date').value=dateKey(manual||new Date());$('#time').value=formatHour(localHour(manual||new Date()));renderObjects();updateClock();
}
function updateClock(){const date=manual||new Date();$('#clock').textContent=formatHour(localHour(date));if(atmosphere)$('#phase').textContent=t(atmosphere.debug().phase);if(following){$('#date').value=dateKey(date);$('#time').value=formatHour(localHour(date));}try{const e=dayEvents(dateKey(date));$('#events').textContent=`${t('sunrise')} ${e.sunrise} · ${t('sunsetTime')} ${e.sunset}\n${t('moonrise')} ${e.moonrise} · ${t('moonset')} ${e.moonset}`;}catch{$('#events').textContent='—';}}
function useLocation(value){try{setLocation(value);config.location=value;manual=null;following=true;$('#custom-location').hidden=true;renderPanel();persist();atmosphere?.setMoment(new Date(),true);}catch(e){error(e);}}
$('#city').onchange=e=>{if(e.target.value==='custom'){$('#custom-location').hidden=false;$('#timezone').value=config.location?.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone;return;}if(e.target.value!=='')useLocation(CITIES[Number(e.target.value)]);};
$('#custom-location').onsubmit=e=>{e.preventDefault();useLocation({name:$('#place-name').value,lat:Number($('#latitude').value),lon:Number($('#longitude').value),timeZone:$('#timezone').value.trim()});};
function setTime(h){try{manual=dateAtHour($('#date').value||dateKey(),h);following=false;$('#follow').checked=false;$('#time').value=formatHour(localHour(manual));$('#date').value=dateKey(manual);atmosphere?.setMoment(manual,true);updateClock();}catch(e){error(e);}}
$('#follow').onchange=e=>{following=e.target.checked;manual=following?null:new Date();updateClock();};$('#date').onchange=$('#time').onchange=()=>{const [h,m]=$('#time').value.split(':').map(Number);setTime(h+m/60);};
all('[data-hour]').forEach(el=>el.onclick=()=>{let h=Number(el.dataset.hour);if(el.dataset.hour==='sunset'){const s=dayEvents($('#date').value||dateKey()).sunset;if(s==='—')return toast(lang==='zh'?'这一天没有日落。':'No sunset at this location on this date.');const [hour,min]=s.split(':').map(Number);h=Math.max(0,hour+(min-16)/60);}setTime(h);});
$('#forest').onchange=e=>{config.environment=e.target.checked;applyVisibility();persist();};$('#motion').onchange=e=>{moving=e.target.checked;forestMotion.setEnabled(moving);fire.setMotion(moving);lake.setMotion(moving);};$('#fire').onchange=e=>{fireLit=e.target.checked;fire.setLit(fireLit);};$('#quality').onchange=e=>{lake.setQuality(e.target.checked);renderer.setPixelRatio(e.target.checked?1:Math.min(devicePixelRatio,1.75));};
$('#sound').onchange=async e=>{soundOn=e.target.checked;if(soundOn&&!(await audio.unlock())){soundOn=false;e.target.checked=false;error(new Error('Audio could not start. Please try again.'));}applyVisibility();};
$('#save').onclick=async()=>{try{await saveQueue;await api('snapshot',{label:lang==='zh'?'手动存档':'Saved in the studio'});toast(t('saved'));await loadVersions();}catch(e){error(e)}};
async function loadVersions(){if(!online||demo)return;const result=await(await fetch('/api/versions')).json();$('#version-list').innerHTML=result.slice(0,30).map(v=>`<div class="version-row">${esc(v.label)}<time>${esc(new Date(v.created).toLocaleString(lang))}</time><button data-restore="${esc(v.id)}">${t('restore')}</button></div>`).join('')||t('noVersions');all('[data-restore]').forEach(el=>el.onclick=async()=>{if(!confirm(t('restoreConfirm')))return;try{await saveQueue;await api('restore',{id:el.dataset.restore});location.reload();}catch(e){error(e)}});}
$('#version-panel').ontoggle=()=>{if($('#version-panel').open)loadVersions().catch(error)};
function view(name,snap=false){const h=config.room.height||2.6,w=config.room.width||4.6,d=config.room.depth||3.4;const views={room:[[w*1.3,h*1.4,d*2],[0,h*.42,0]],camp:[[19,8,29],[0,-1,4]],lake:[[1,-4.65,28],[2,-5.0,76]],overview:[[75,48,113],[2,-4,39]]},v=views[name]||views.room;targetView={position:new THREE.Vector3(...v[0]),target:new THREE.Vector3(...v[1])};if(snap){camera.position.copy(targetView.position);controls.target.copy(targetView.target);controls.update();targetView=null;}}
function focus(id){if(id==='lake')return view('lake');if(id==='sun'||id==='moon'){const direction=new THREE.Vector3(...atmosphere.debug()[id]);targetView={position:camera.position.clone(),target:camera.position.clone().addScaledVector(direction,50)};return;}const nodes=registry.get(id);if(!nodes?.length)return;scene.updateMatrixWorld(true);const box=new THREE.Box3();nodes.filter(o=>o.isMesh).forEach(o=>box.union(new THREE.Box3().setFromObject(o)));if(box.isEmpty())return;const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()).length();targetView={position:center.clone().add(new THREE.Vector3(.75,.45,1).multiplyScalar(Math.max(size*1.2,1.7))),target:center};}
all('[data-view]').forEach(el=>el.onclick=()=>view(el.dataset.view));
function animate(){const dt=Math.min(clock.getDelta(),.05),elapsed=clock.elapsedTime;if(document.hidden||$('#workspace').hidden)return;if(targetView){const a=moving?1-Math.exp(-3*dt):1;camera.position.lerp(targetView.position,a);controls.target.lerp(targetView.target,a);if(camera.position.distanceTo(targetView.position)<.01)targetView=null;}controls.update();atmosphere.setMoment(manual||new Date());atmosphere.update(dt,elapsed,camera);forestMotion.update(elapsed);const cycle=atmosphere.debug(),wind=windAt(elapsed,camera.position.x,camera.position.z),flame=fire.update(dt,elapsed,camera,wind);lake.update(dt,elapsed,cycle);audio.update(flame.strength,flame.distance,cycle.night,flame.pan,{wind,x:camera.position.x+2.445,y:1.165-camera.position.z,inside:camera.position.y>0&&Math.abs(camera.position.x)<(config.room.width||4.6)/2&&Math.abs(camera.position.z)<(config.room.depth||3.4)/2?1:0,yaw:camera.rotation.y});renderer.render(scene,camera);if(elapsed-lastElapsed>1){lastElapsed=elapsed;updateClock();if(new URLSearchParams(location.search).has('qa'))renderer.domElement.dataset.diagnostics=JSON.stringify({...window.woodland.report(),camera:camera.position.toArray(),target:controls.target.toArray(),aspect:camera.aspect});}}
// Inspectable diagnostics; no photos or account data. Useful for Codex's QA.
window.woodland={report:()=>({demo,language:lang,stage:config.stage,location:LOCATION,objects:[...registry.keys()],render:renderer?{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}:null,atmosphere:atmosphere?.debug(),lake:lake?.debug(),fire:fire?.debug(),audio:audio?.debug()}),view};
translate();if(personal.model)await enter(false);if(new URLSearchParams(location.search).get('example')==='1')await enter(true);
