import * as THREE from 'three';
import {sampleMoment,localHour,LOCATION} from './time-cycle.js';

export function createAtmosphere(scene,renderer,P){
  const initial=new Date(),skyUniforms={night:{value:0},twilight:{value:0},sunset:{value:0},afterglow:{value:0},sunDirection:{value:new THREE.Vector3()},moonDirection:{value:new THREE.Vector3()},moonRadius:{value:.0046},sunVisible:{value:1},moonVisible:{value:1}};
  const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,toneMapped:false,uniforms:skyUniforms,
    vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 vDir;uniform float night,twilight,sunset,afterglow;uniform vec3 sunDirection,moonDirection;uniform float moonRadius,sunVisible,moonVisible;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(vec3(i,3.)),hash(vec3(i+vec2(1.,0.),3.)),f.x),mix(hash(vec3(i+vec2(0.,1.),3.)),hash(vec3(i+vec2(1.,1.),3.)),f.x),f.y);}
      void main(){vec3 d=normalize(vDir);float h=pow(max(0.,d.y),.48);
        vec3 day=mix(vec3(.79,.83,.72),vec3(.25,.52,.61),h);
        vec3 dark=mix(vec3(.055,.10,.155),vec3(.007,.018,.047),h);
        vec3 c=mix(day,dark,night);
        float horizon=pow(1.-max(0.,d.y),4.);float facing=.42+.58*pow(max(0.,dot(d,sunDirection)),3.);
        c=mix(c,vec3(.83,.41,.25),twilight*(.22+.78*horizon)*(.68+.32*facing)*.75);
        c+=vec3(.26,.16,.07)*pow(max(0.,dot(d,sunDirection)),28.)*(1.-night);
        // Broad warm sky: pale peach overhead, coral near the horizon, violet afterglow.
        float height=pow(clamp(d.y,0.,1.),.42);
        vec3 sunsetSky=mix(vec3(.98,.31,.23),vec3(1.,.72,.56),height);
        vec3 duskSky=mix(vec3(.80,.24,.32),vec3(.24,.13,.29),height);
        vec3 warmSky=mix(sunsetSky,duskSky,afterglow);
        float sunsetFacing=.84+.16*pow(max(0.,dot(d,sunDirection)),2.);
        c=mix(c,warmSky,sunset*sunsetFacing);
        float sunR=.00465;float sd=dot(d,sunDirection);float aa=max(.0000005,fwidth(sd));
        float sun=smoothstep(cos(sunR)-aa,cos(sunR)+aa,sd)*smoothstep(-.006,.002,d.y)*sunVisible;
        c=mix(c,vec3(1.,.89,.65),sun);
        vec3 tangent=normalize(cross(vec3(0.,1.,0.),moonDirection));vec3 up=normalize(cross(moonDirection,tangent));
        vec2 q=vec2(dot(d,tangent),dot(d,up))/sin(moonRadius);float rr=dot(q,q);
        float edgeAA=max(.025,fwidth(rr));float disk=(1.-smoothstep(1.-edgeAA,1.+edgeAA,rr))*step(0.,dot(d,moonDirection))*smoothstep(-.006,.002,d.y)*moonVisible;
        // The visible lunar hemisphere is shaded by the actual Sun direction; bright limb faces the Sun.
        vec3 lunarNormal=tangent*q.x+up*q.y-moonDirection*sqrt(max(0.,1.-rr));
        float lit=smoothstep(-.018,.018,dot(lunarNormal,sunDirection));
        float maria=.79+.17*noise2(q*4.3+vec2(7.,2.))+.04*noise2(q*13.7);
        vec3 lunar=mix(c*.78,vec3(.82,.87,.86)*maria,lit);
        c=mix(c,lunar,disk*(.20+.80*night));
        vec2 suv=vec2(atan(d.z,d.x),asin(d.y))*420.;vec2 cell=floor(suv);vec2 offset=vec2(hash(vec3(cell,1.)),hash(vec3(cell,2.)));float sd2=length(fract(suv)-(.25+.5*offset));float pointAA=max(.035,length(fwidth(suv))*.4);float stars=step(.994,hash(vec3(cell,9.)))*(1.-smoothstep(.035,.035+pointAA,sd2))*pow(max(0.,d.y),.4);
        float cloud=sin(d.x*14.+d.z*9.)*.5+sin(d.x*29.-d.z*18.)*.25;float veil=smoothstep(.38,.7,cloud)*smoothstep(.04,.2,d.y)*(1.-smoothstep(.40,.65,d.y));c=mix(c,mix(vec3(.81,.85,.76),vec3(.12,.18,.25),night),veil*.16*(1.-sunset*.65));
        c+=vec3(.45,.57,.72)*stars*night*night*.75;gl_FragColor=vec4(c,1.);}`});
  const sky=new THREE.Mesh(new THREE.SphereGeometry(900,32,16),skyMaterial);sky.name='V44_上海真实日月天空';sky.renderOrder=-10;sky.frustumCulled=false;scene.add(sky);
  scene.background=new THREE.Color('#bed1c1');scene.fog=new THREE.FogExp2('#b2c7b9',.0032);
  const hemi=new THREE.HemisphereLight('#c6e3eb','#50624a',.85);scene.add(hemi);
  const key=new THREE.DirectionalLight('#fff0cd',3.1);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-43,right:43,top:43,bottom:-43,near:.5,far:180});key.shadow.normalBias=.035;key.shadow.bias=-.00008;key.shadow.radius=2;
  key.target.position.copy(P(3,-12,-3));scene.add(key,key.target);
  const moonLight=new THREE.DirectionalLight('#9fbbea',0);moonLight.name='V44_真实月光';moonLight.castShadow=true;moonLight.shadow.mapSize.set(2048,2048);Object.assign(moonLight.shadow.camera,{left:-43,right:43,top:43,bottom:-43,near:.5,far:180});moonLight.shadow.normalBias=.035;moonLight.shadow.bias=-.00008;moonLight.target.position.copy(key.target.position);scene.add(moonLight,moonLight.target);key.name='V44_真实阳光';
  const fill=new THREE.DirectionalLight('#bfdde7',.25);fill.position.copy(P(-7,-3,9));scene.add(fill);
  const practicals=[];
  function practical(name,pos,target,power,angle,distance,shadowSize=512){
    const l=new THREE.SpotLight('#ffca83',0,distance,angle,.6,2);l.name=name;l.position.copy(P(...pos));l.target.position.copy(P(...target));l.castShadow=true;l.shadow.mapSize.set(shadowSize,shadowSize);l.shadow.bias=-.000025;l.shadow.normalBias=.022;l.shadow.radius=3;l.shadow.camera.near=.04;
    scene.add(l,l.target);practicals.push({light:l,power});
  }
  const roomLight=new THREE.PointLight('#ffcb91',0,12,2);roomLight.position.copy(P(2.445,1.165,2.2));roomLight.castShadow=false;scene.add(roomLight);practicals.push({light:roomLight,power:26});
  let instant=initial.getTime(),targetInstant=instant,room=false,roof=true,lastApply=-10,lastShadowInstant=0;let sunShown=true,moonShown=true,paletteEnabled=true;let sunsetStrength=0,afterglow=0;const mountainMaterials=new Map(),landscapeMaterials=new Map();const emitters=new Set();let state=sampleMoment(initial);
  const c=new THREE.Color();
  const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b);
  const mountainWarm=['#77304f','#bd4650','#f0805f'],mountainDusk=['#392541','#643047','#a45465'];
  function apply(forceShadow=false){
    state=sampleMoment(new Date(instant));const hour=state.hour;const {night:n,twilight:t,day,elevation}=state;
    const altitude=state.sunPosition.altitude;
    sunsetStrength=paletteEnabled?smooth(-15,-3,altitude)*(1-smooth(2,18,altitude))*(hour<12?.68:1):0;
    afterglow=1-smooth(-10,2,altitude);
    skyUniforms.sunset.value=sunsetStrength;skyUniforms.afterglow.value=afterglow;
    const sun=new THREE.Vector3(...state.sun).normalize(),moon=new THREE.Vector3(...state.moon).normalize();
    skyUniforms.night.value=n;skyUniforms.twilight.value=t;skyUniforms.sunDirection.value.copy(sun);skyUniforms.moonDirection.value.copy(moon);skyUniforms.moonRadius.value=state.moonRadius;skyUniforms.sunVisible.value=sunShown?1:0;skyUniforms.moonVisible.value=moonShown?1:0;
    hemi.color.set('#c6e3eb').lerp(c.set('#6791b5'),n).lerp(c.set('#efc19c'),t*.55);hemi.groundColor.set('#50624a').lerp(c.set('#192d32'),n);hemi.intensity=THREE.MathUtils.lerp(.88,.40,n);
    key.position.copy(key.target.position).addScaledVector(sun,72);moonLight.position.copy(moonLight.target.position).addScaledVector(moon,72);
    key.color.set('#fff0d0').lerp(c.set('#ffac72'),t*.88);
    key.intensity=sunShown&&state.sunPosition.altitude>-.3?3.2*Math.pow(Math.max(0,elevation),.6):0;
    moonLight.intensity=moonShown&&state.moonPosition.altitude>0?.48*Math.pow(Math.max(0,moon.y),.5)*Math.pow(state.illumination.fraction,1.2)*(.15+.85*n):0;
    fill.intensity=.25*day;
    scene.fog.color.set('#b2c7b9').lerp(c.set('#172d41'),n).lerp(c.set('#b78d83'),t*.65);scene.fog.density=THREE.MathUtils.lerp(.0034,.0048,n)+.0018*Math.exp(-Math.pow((hour-6.5)/1.7,2));
    scene.environmentIntensity=THREE.MathUtils.lerp(.42,.04,n);renderer.toneMappingExposure=THREE.MathUtils.lerp(1.02,1.23,n);
    if(paletteEnabled){
      hemi.color.lerp(c.set('#ffb79c'),sunsetStrength*.92);hemi.groundColor.lerp(c.set('#633849'),sunsetStrength*.75);
      hemi.intensity=THREE.MathUtils.lerp(hemi.intensity,.96-afterglow*.32,sunsetStrength);
      key.color.lerp(c.set('#ff8751'),sunsetStrength*.92);key.intensity*=1+sunsetStrength*.32;
      fill.color.set('#bfdde7').lerp(c.set('#efaa91'),sunsetStrength*.82);
      scene.fog.color.lerp(c.set('#ee9d86').lerp(new THREE.Color('#8e597a'),afterglow),sunsetStrength*.93);
      scene.fog.density+=sunsetStrength*.001;
      scene.environmentIntensity*=1-sunsetStrength*.35;
      for(const [m,{base,target,weight}] of landscapeMaterials)m.color.copy(base).lerp(c.set(target),sunsetStrength*weight);
      for(const [m,base] of mountainMaterials){const idx=Number(m.name.match(/远山_(\d)/)?.[1]||0);m.color.copy(base).lerp(c.set(mountainWarm[idx]).lerp(new THREE.Color(mountainDusk[idx]),afterglow),sunsetStrength*.96);}
    }else{for(const [m,{base}] of landscapeMaterials)m.color.copy(base);fill.color.set('#bfdde7');for(const [m,base] of mountainMaterials)m.color.copy(base);}
    const lights=.015+.985*Math.max(n,t*.65);
    for(const {light,power} of practicals){light.intensity=room?power*lights:0;if(light.name.includes('顶灯')&&!roof)light.intensity=0;}
    for(const m of emitters)m.emissiveIntensity=room?THREE.MathUtils.lerp(.08,3.6,Math.max(n,t*.65)):0;
    if(forceShadow||Math.abs(instant-lastShadowInstant)>15000){renderer.shadowMap.needsUpdate=true;lastShadowInstant=instant;}
  }
  apply();
  return {
    configureRoom(height=2.6){roomLight.position.copy(P(2.445,1.165,height-.28));roomLight.distance=Math.max(12,height*4);},
    setMoment(date,snap=false){targetInstant=date.getTime();if(snap){instant=targetInstant;apply(true);}},
    setCelestialVisibility(sun,moon){if(sun!==sunShown||moon!==moonShown){sunShown=sun;moonShown=moon;apply(true);}},
    update(dt,elapsed,camera){
      sky.position.copy(camera.position);const next=instant+(targetInstant-instant)*(1-Math.exp(-3.4*dt));const delta=Math.abs(next-instant);instant=next;
      if(delta>.01&&elapsed-lastApply>.125){lastApply=elapsed;apply();}
    },
    setVisibility(show,showRoof){if(room!==show||roof!==showRoof){room=show;roof=showRoof;apply(true);}},
    registerModel(model,version='v45'){
      for(const [m,base] of mountainMaterials)m.color.copy(base);mountainMaterials.clear();for(const [m,{base}] of landscapeMaterials)m.color.copy(base);landscapeMaterials.clear();paletteEnabled=['v45','v47','v5'].includes(version);
      model.traverse(o=>{if(o.isMesh&&o.userData.v3_layer==='mountains')for(const m of Array.isArray(o.material)?o.material:[o.material]){m.userData.v45OriginalColor??=m.color.toArray();mountainMaterials.set(m,new THREE.Color().fromArray(m.userData.v45OriginalColor));}});
      model.traverse(o=>{if(!o.isMesh||!['forest','ground','tree'].includes(o.userData.v3_layer))return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(landscapeMaterials.has(m))continue;const leaf=/针叶_|林草_|蕨叶_|灌木/.test(m.name),wood=/树干|根部/.test(m.name);m.userData.v45LandscapeColor??=m.color.toArray();landscapeMaterials.set(m,{base:new THREE.Color().fromArray(m.userData.v45LandscapeColor),target:leaf?'#71394e':wood?'#5c3d44':'#8b625e',weight:leaf?.46:wood?.32:.23});}});emitters.clear();model.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name.includes('暖灯发光罩')||m.name.includes('灯管')){m.emissive.set('#ffcc8c');emitters.add(m);}});apply(true);},
    debug(){return{paletteEnabled,sunsetStrength,afterglow,mountainColors:[...mountainMaterials].map(([m])=>({name:m.name,color:m.color.getHexString()})),fog:scene.fog.color.getHexString(),hour:state.hour,targetHour:localHour(new Date(targetInstant)),instant:state.iso,location:LOCATION,phase:state.phase,night:state.night,sun:state.sun,moon:state.moon,sunPosition:state.sunPosition,moonPosition:state.moonPosition,illumination:state.illumination,sunShown,moonShown,moonIntensity:moonLight.intensity,moonLightPosition:moonLight.position.toArray(),lightTarget:key.target.position.toArray(),photoBackground:false,proceduralSky:true,keyIntensity:key.intensity,keyPosition:key.position.toArray(),practicals:practicals.map(({light})=>({name:light.name,intensity:light.intensity,castShadow:light.castShadow}))};}
  };
}
