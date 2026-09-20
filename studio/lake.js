import * as THREE from 'three';
import {createWaterGeometry,createFlowShader,WAVE_GLSL,sampleWaterHeight} from './water-surface.js';
import {Reflector} from './vendor/Reflector.js';
import {LAKE,shoreScale,dockHeight} from './lake-world.js';
// One true reflected scene, shaded as quiet inland water. No landscape image.
export function createLake(scene,renderer,P){
 const geometry=createWaterGeometry(),uniforms={color:{value:new THREE.Color('#2a5557')},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},time:{value:0},night:{value:0},sunset:{value:0},sunDir:{value:new THREE.Vector3(0,1,0)},moonDir:{value:new THREE.Vector3(0,1,0)},sunPower:{value:1},moonPower:{value:0},reflected:{value:1},fogColor:{value:new THREE.Color('#b2c7b9')},fogDensity:{value:.0034}};
 const legacyShader={uniforms,vertexShader:`uniform mat4 textureMatrix;varying vec4 mirrorCoord;varying vec3 world;varying vec2 lakeUV;void main(){lakeUV=position.xy;mirrorCoord=textureMatrix*vec4(position,1.);world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform sampler2D tDiffuse;uniform float time,night,sunset,sunPower,moonPower,reflected,fogDensity;uniform vec3 sunDir,moonDir,fogColor;varying vec4 mirrorCoord;varying vec3 world;varying vec2 lakeUV;
 void main(){vec2 p=lakeUV;float a=atan(p.y/62.,p.x/60.);float q=length(p/vec2(60.,62.))/(1.+.055*sin(3.*a+.4)+.028*cos(5.*a-.7)+.018*sin(9.*a));float deep=smoothstep(.79,.985,q);vec3 n=normalize(vec3(.024*sin(world.x*.72+world.z*.35+time*.51)+.013*sin(world.z*1.6-time*.63),1.,.023*cos(world.z*.58-world.x*.18+time*.47)));vec3 v=normalize(cameraPosition-world);float fresnel=.12+.53*pow(1.-max(dot(n,v),0.),2.7);vec4 uv=mirrorCoord;uv.xy+=n.xz*.024*uv.w;vec3 reflection=texture2DProj(tDiffuse,uv).rgb*vec3(.67,.85,.83);
 vec3 base=mix(vec3(.016,.073,.080),vec3(.116,.197,.153),deep*.76);base=mix(base,vec3(.008,.023,.039),night*.83);base=mix(base,vec3(.116,.041,.067),sunset*.62);vec3 water=mix(base,reflection,clamp(fresnel,0.,.79)*reflected);
 float sun=pow(max(dot(reflect(-normalize(sunDir),n),v),0.),180.);float moon=pow(max(dot(reflect(-normalize(moonDir),n),v),0.),260.);water+=sun*sunPower*.45*vec3(1.,.74,.44)+moon*moonPower*.6*vec3(.50,.65,1.);
 float ripple=pow(.5+.5*sin(q*660.-time*.8+sin(a*19.)*.6),18.)*smoothstep(.956,.988,q)*(1.-smoothstep(.992,1.,q));water+=ripple*mix(vec3(.038,.051,.041),vec3(.004,.012,.019),night);
 float glitter=pow(.5+.5*sin(world.z*4.2+world.x*.5-time*.61),22.)*pow(.5+.5*sin(world.x*2.1-world.z*.5+time*.32),12.);water+=glitter*.016*(1.-night*.85);float fog=1.-exp(-fogDensity*fogDensity*distance(cameraPosition,world)*distance(cameraPosition,world));gl_FragColor=vec4(mix(water,fogColor,fog*.66),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`};
 const shader=createFlowShader(legacyShader);
 const water=new Reflector(geometry,{textureWidth:1024,textureHeight:1024,clipBias:.004,shader});water.name='V5_实时倒影湖水';water.rotation.x=-Math.PI/2;water.position.copy(P(3,-76,-6.2));scene.add(water);
 const shadow=new THREE.Mesh(geometry,new THREE.ShadowMaterial({color:'#162b2b',opacity:.35,depthWrite:false}));shadow.rotation.copy(water.rotation);shadow.position.copy(water.position);shadow.position.y+=.006;shadow.receiveShadow=true;shadow.name='V5_水面投影';scene.add(shadow);
 // ShadowMaterial otherwise multiplies even switched-off moon/point lights.
 // Weight only sun/moon projections by their live radiance; oil lights remain
 // in the reflected scene and on the physically lit dock/boat materials.
 shadow.material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,{flowTime:u.time,flowWind:u.wind,flowLegacy:u.legacy});shader.vertexShader='uniform float flowTime,flowWind,flowLegacy;\n'+WAVE_GLSL+'\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=lakeHeight((modelMatrix*vec4(transformed,1.)).xz,lakeRatio(position.xy),flowTime,flowWind)*(1.-flowLegacy);');shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmask_pars_fragment>',`float getShadowMask(){
 float shade=1.0;
 #if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
 DirectionalLightShadow d;float energy,weight,mask;
 #pragma unroll_loop_start
 for(int i=0;i<NUM_DIR_LIGHT_SHADOWS;i++){
 d=directionalLightShadows[i];
 energy=max(max(directionalLights[i].color.r,directionalLights[i].color.g),directionalLights[i].color.b);
 weight=smoothstep(0.0,0.25,energy);
 mask=receiveShadow?getShadow(directionalShadowMap[i],d.shadowMapSize,d.shadowIntensity,d.shadowBias,d.shadowRadius,vDirectionalShadowCoord[i]):1.0;
 shade*=mix(1.0,mask,weight);
 }
 #pragma unroll_loop_end
 #endif
 return shade;
 }`);};
 shadow.material.customProgramCacheKey=()=> 'v51-active-celestial-shadows-waves';
 let boat=null,basePos=null,baseRot=null,placeholder=[],mooring=[],present=false,visible=true,dockShown=true,motion=true,gentle=false,time=0,frames=0,lastReflection=-99,now=0,reflectionRequested=true;
 const reflectedRender=water.onBeforeRender;water.onBeforeRender=function(r,s,c,...args){if(gentle||(!reflectionRequested&&now-lastReflection<1/18))return;lastReflection=now;reflectionRequested=false;const sv=shadow.visible;shadow.visible=false;reflectedRender.call(this,r,s,c,...args);shadow.visible=sv;frames++;};
 const markers=[[3.2,LAKE.dock.end-.48,LAKE.dock.top+.20],[5.67,LAKE.dock.start-.8,dockHeight(LAKE.dock.start-.8)+.20]].map((p,i)=>{const l=new THREE.PointLight('#ffcb8b',0,5.5,2);l.name='V5_码头油灯_'+i;l.position.copy(P(...p));l.castShadow=i===0;l.shadow.mapSize.set(512,512);l.shadow.camera.near=.05;l.shadow.normalBias=.018;l.shadow.bias=-.0001;scene.add(l);return l;});let lampMaterials=new Set();
 const u=water.material.uniforms,mooringMat=new THREE.MeshStandardMaterial({color:'#aaa185',roughness:.94});const ropes=[];
 function ropePath(i){const p=new THREE.Vector3(i===0?-.36:.36,.27,i===0?-1.30:1.30);boat.localToWorld(p);const b=P(i===0?7.02:5.83,i===0?-31.02:-29.14,-5.68);const mid=p.clone().lerp(b,.5);mid.y-=.17;return new THREE.CatmullRomCurve3([p,mid,b]);}
 return {registerModel(root,version){present=version==='v5';boat=null;lampMaterials.clear();placeholder=[];mooring=[];root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name.includes('码头油灯_乳白灯芯'))lampMaterials.add(m);if(o.userData.v5_root==='boat')boat=o;if(o.userData.v5_part==='lake')placeholder.push(o);if(o.userData.v5_part==='mooring')mooring.push(o)});if(boat){boat.userData.v5RestPosition??=boat.position.toArray();boat.userData.v5RestRotation??=boat.rotation.toArray();basePos=new THREE.Vector3().fromArray(boat.userData.v5RestPosition);baseRot=new THREE.Euler().fromArray(boat.userData.v5RestRotation);root.updateMatrixWorld(true);}for(const r of ropes){scene.remove(r);r.geometry.dispose();}ropes.length=0;if(boat)for(let i=0;i<2;i++){const r=new THREE.Mesh(new THREE.TubeGeometry(ropePath(i),16,.009,5,false),mooringMat);r.name='V5_随船轻摆的缆绳';r.castShadow=true;scene.add(r);ropes.push(r);}reflectionRequested=true;},
 setVisible(flags,only=false){dockShown=flags.dock!==false&&!only;visible=flags.lake!==false;u.boatVisible.value=flags.boat!==false&&!only?1:0;u.dockVisible.value=dockShown?1:0;water.visible=shadow.visible=present&&visible;for(const o of placeholder)o.visible=false;for(const o of mooring)o.visible=false;for(const o of ropes)o.visible=present&&flags.boat!==false&&!only;},
 setMotion(v){motion=v;},setStyle(legacy){u.legacy.value=legacy?1:0;reflectionRequested=true;},setWind(v){u.wind.value=THREE.MathUtils.clamp(Number(v)||1,.35,1.8);},setQuality(low){gentle=low;u.reflected.value=low?0:1;reflectionRequested=true;},invalidate(){reflectionRequested=true;},
 update(dt,elapsed,cycle){now=elapsed;const lampPower=present&&dockShown?cycle.night:0;markers.forEach(l=>l.intensity=lampPower*3.8);for(const m of lampMaterials){m.emissive.set('#ffc487');m.emissiveIntensity=lampPower*2.4;}if(motion)time+=dt;u.time.value=time;u.night.value=cycle.night;u.sunset.value=cycle.sunsetStrength;u.sunDir.value.fromArray(cycle.sun);u.moonDir.value.fromArray(cycle.moon);u.sunPower.value=cycle.keyIntensity/3.2;u.moonPower.value=cycle.moonIntensity;u.fogColor.value.copy(scene.fog.color);u.fogDensity.value=scene.fog.density;
 if(boat){boat.position.copy(basePos);const bx=basePos.x-2.445,bz=basePos.z+1.165;u.boatCenter.value.set(bx,bz);boat.position.y+=u.legacy.value>.5?.017*Math.sin(time*.85):sampleWaterHeight(bx,bz,time,u.wind.value)*.72;boat.rotation.copy(baseRot);boat.rotation.x+=(u.legacy.value>.5?.006:.016*u.wind.value)*Math.sin(time*.73);boat.rotation.z+=(u.legacy.value>.5?.009:.012*u.wind.value)*Math.sin(time*.60+.4);boat.updateMatrixWorld(true);if(Math.floor(time*12)!==boat.userData.ropeTick){boat.userData.ropeTick=Math.floor(time*12);ropes.forEach((r,i)=>{r.geometry.dispose();r.geometry=new THREE.TubeGeometry(ropePath(i),16,.009,5,false);});}}
 },debug(){return{waterStyle:u.legacy.value>.5?'v5':'flow',wind:u.wind.value,waterVertices:geometry.attributes.position.count,waterTriangles:geometry.index.count/3,present,visible,reflectionFrames:frames,reflectionResolution:1024,motion,gentle,time,waterLevel:-6.2,maxDepth:11.4,lakeSize:[120,124],boatPosition:boat?.position.toArray(),ropes:ropes.length,markerIntensities:markers.map(l=>l.intensity),placeholderHidden:placeholder.every(o=>!o.visible)};}};
}
