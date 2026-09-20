import * as THREE from 'three';
import {CAMP} from './campfire-config.js';
export function createCampfire(scene,renderer,P){
  const center=P(...CAMP.center),group=new THREE.Group();group.name='V4_篝火实时火焰';group.position.copy(center);scene.add(group);
  const uniforms={time:{value:0},strength:{value:0},motion:{value:1},wind:{value:0}};
  const vertex=`uniform float time,strength,motion,seed,wind;varying float vY;varying vec3 vN;void main(){vec3 p=position;vY=p.y;vN=normal;float w=p.y*p.y;float t=time*motion;
    p.x+=w*(wind*.16*motion+sin(t*3.7+seed+p.y*4.)*.10+sin(t*6.1+seed)*.04);
    p.z+=w*cos(t*3.1+seed+p.y*5.)*.09;
    p.y*=strength*(.91+.09*sin(t*5.3+seed));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
  const fragment=`uniform float strength,seed;varying float vY;varying vec3 vN;void main(){vec3 c=mix(vec3(1.,.73,.18),vec3(1.,.12,.018),smoothstep(.05,.98,vY));float rim=.8+.2*abs(normalize(vN).z);gl_FragColor=vec4(c*rim,clamp(strength,0.,1.)*(.88-.28*vY));}`;
  const profile=[new THREE.Vector2(.018,0),new THREE.Vector2(.105,.08),new THREE.Vector2(.145,.24),new THREE.Vector2(.13,.43),new THREE.Vector2(.09,.62),new THREE.Vector2(.045,.83),new THREE.Vector2(.001,1.06)];
  const geo=new THREE.LatheGeometry(profile,11),flames=[];
  for(let i=0;i<11;i++){
    const m=new THREE.ShaderMaterial({uniforms:{...uniforms,seed:{value:i*1.71}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.NormalBlending,toneMapped:false});
    const o=new THREE.Mesh(geo,m),a=i*2.399,r=i===0?0:.12+(i%3)*.05;o.position.set(Math.cos(a)*r,.15,Math.sin(a)*r);const scale=i===0?.86:.50+(i%4)*.08;o.scale.set(.75+(i%2)*.30,scale,.75+(i%3)*.1);o.rotation.y=a;group.add(o);flames.push(o);
  }
  const emberMaterial=new THREE.MeshBasicMaterial({color:'#ff6622',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  const glow=new THREE.Mesh(new THREE.CircleGeometry(.45,28),emberMaterial);glow.rotation.x=-Math.PI/2;glow.position.y=.12;group.add(glow);
  const count=36,sparkGeo=new THREE.BufferGeometry(),positions=new Float32Array(count*3),sparkSeed=Array.from({length:count},(_,i)=>({phase:i/count,angle:i*2.399,speed:.25+(i%5)*.06}));sparkGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const sparks=new THREE.Points(sparkGeo,new THREE.PointsMaterial({color:'#ffb654',size:.014,sizeAttenuation:true,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));sparks.material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace("#include <color_fragment>","#include <color_fragment>\n diffuseColor.a *= 1.-smoothstep(.15,.5,length(gl_PointCoord-vec2(.5)));");};group.add(sparks);
  const smokeMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{opacity:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;uniform float opacity;void main(){float r=length(v-.5)*2.;gl_FragColor=vec4(.32,.37,.34,pow(max(0.,1.-r*r),3.)*opacity);}' });
  const smoke=[];for(let i=0;i<7;i++){let m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),smokeMaterial.clone());group.add(m);smoke.push(m);}
  const light=new THREE.PointLight('#ff9a46',0,10,2);light.name='V4_篝火实际光源';light.position.copy(center).add(new THREE.Vector3(0,.52,0));light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.near=.08;light.shadow.normalBias=.016;light.shadow.bias=-.00012;light.shadow.radius=3;scene.add(light);
  let lit=false,strength=0,visible=true,motion=true;const emberMats=new Set();
  return {
    setLit(v){lit=v;renderer.shadowMap.needsUpdate=true;},setMotion(v){motion=v;uniforms.motion.value=v?1:0;},
    setVisible(v){if(visible!==v){visible=v;if(!v){strength=0;uniforms.strength.value=0;group.visible=false;light.intensity=0;}renderer.shadowMap.needsUpdate=true;}},
    registerModel(model){emberMats.clear();model.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name==='V4_炭火余烬'){m.emissive.set('#ff5220');emberMats.add(m);}});},
    update(dt,elapsed,camera,wind=0){
      uniforms.wind.value=wind;
      const target=lit&&visible?1:0;strength=THREE.MathUtils.damp(strength,target,target?2.5:1.9,dt);if(Math.abs(strength-target)<.001)strength=target;
      uniforms.time.value=elapsed;uniforms.strength.value=strength;group.visible=strength>.001;
      const flicker=motion?.90+.06*Math.sin(elapsed*11.3)+.04*Math.sin(elapsed*17.1):1;
      light.intensity=8*strength*flicker;emberMaterial.opacity=strength*.30;sparks.material.opacity=strength*.8;
      for(const m of emberMats){m.emissiveIntensity=strength*2.4;m.color.set('#251f1b').lerp(new THREE.Color('#9a341a'),strength);}
      for(let i=0;i<count;i++){const s=sparkSeed[i],t=(s.phase+(motion?elapsed:0)*s.speed)%1;positions[i*3]=Math.cos(s.angle+t*3)*(.08+t*.30)+t*t*wind*.30*(motion?1:0);positions[i*3+1]=.23+t*1.25;positions[i*3+2]=Math.sin(s.angle+t*2)*(.08+t*.25);}
      sparkGeo.attributes.position.needsUpdate=true;
      smoke.forEach((s,i)=>{const t=(i/7+(motion?elapsed:0)*.095)%1;s.position.set(t*t*wind*.7,.75+t*1.8,Math.sin(i+t)*.10);s.scale.setScalar(.23+t*.7);s.quaternion.copy(camera.quaternion);s.material.uniforms.opacity.value=strength*.09*Math.sin(t*Math.PI);});
      const offset=center.clone().sub(camera.position);const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);return{strength,distance:camera.position.distanceTo(center),pan:offset.normalize().dot(right)};
    },
    debug(){return{lit,strength,visible,motion,lightIntensity:light.intensity,castShadow:light.castShadow,center:center.toArray(),flameCount:flames.length};}
  };
}
