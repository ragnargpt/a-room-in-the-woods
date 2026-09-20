import * as THREE from 'three';
import {shoreScale} from './lake-world.js';

// A tessellated surface gives the long, shallow waves real height. Fine waves
// are shaded analytically, so their movement does not depend on texture FPS.
export function createWaterGeometry(){
  const rings=96,segments=320,positions=[0,0,0],uvs=[.5,.5],indices=[];
  for(let r=1;r<=rings;r++)for(let a=0;a<segments;a++){
    const angle=a/segments*Math.PI*2,s=shoreScale(angle)*r/rings;
    const x=60*Math.cos(angle)*s,y=62*Math.sin(angle)*s;
    positions.push(x,y,0);uvs.push(x/136+.5,y/140+.5);
  }
  for(let a=0;a<segments;a++)indices.push(0,1+a,1+(a+1)%segments);
  for(let r=1;r<rings;r++)for(let a=0;a<segments;a++){
    const next=(a+1)%segments,A=1+(r-1)*segments+a,B=1+(r-1)*segments+next;
    const C=1+r*segments+a,D=1+r*segments+next;
    indices.push(A,C,D,A,D,B);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
  return g;
}

export const WAVE_GLSL=`
float lakeRatio(vec2 p){float a=atan(p.y/62.,p.x/60.);return length(p/vec2(60.,62.))/(1.+.055*sin(3.*a+.4)+.028*cos(5.*a-.7)+.018*sin(9.*a));}
vec3 longWaves(vec2 p,float t,float wind){
  float a=dot(p,vec2(.47,.67))-t*.82;
  float b=dot(p,vec2(-.32,.89))-t*.97+1.6;
  float c=dot(p,vec2(.83,.36))-t*.73+2.8;
  return wind*(vec3(sin(a),.47*cos(a),.67*cos(a))*.030+vec3(sin(b),-.32*cos(b),.89*cos(b))*.016+vec3(sin(c),.83*cos(c),.36*cos(c))*.014);
}
float lakeHeight(vec2 p,float q,float t,float wind){return longWaves(p,t,wind).x*smoothstep(0.,1.5,(1.-q)*60.);}
`;

export function createFlowShader(legacy){
  const legacyBody=legacy.fragmentShader.split('void main(){')[1].split('#include <tonemapping_fragment>')[0];
  const uniforms={...legacy.uniforms,legacy:{value:0},wind:{value:1},boatVisible:{value:1},dockVisible:{value:1},boatCenter:{value:new THREE.Vector2(5.675,32.725)}};
  return {uniforms,
    vertexShader:`uniform mat4 textureMatrix;uniform float time,wind,legacy;varying vec4 mirrorCoord;varying vec3 world;varying vec2 lakeUV;${WAVE_GLSL}
      void main(){lakeUV=position.xy;mirrorCoord=textureMatrix*vec4(position,1.);vec3 moved=position;vec3 wp=(modelMatrix*vec4(position,1.)).xyz;
      moved.z+=lakeHeight(wp.xz,lakeRatio(position.xy),time,wind)*(1.-legacy);world=(modelMatrix*vec4(moved,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(moved,1.);}`,
    fragmentShader:`uniform sampler2D tDiffuse;uniform float time,night,sunset,sunPower,moonPower,reflected,fogDensity,legacy,wind,boatVisible,dockVisible;uniform vec3 sunDir,moonDir,fogColor;uniform vec2 boatCenter;varying vec4 mirrorCoord;varying vec3 world;varying vec2 lakeUV;
      ${WAVE_GLSL}
      float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise21(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1)),f.x),f.y);}
      vec2 postRipple(vec2 p,vec2 source,float enabled){vec2 d=p-source;float r=length(d);float e=exp(-r*1.15)*smoothstep(.18,.45,r)*enabled;return normalize(d+vec2(.001))*cos(r*15.-time*2.2)*e*.055;}
      void main(){if(legacy>.5){${legacyBody}}else{
        vec2 p=world.xz;float q=lakeRatio(lakeUV),shore=max(0.,(1.-q)*60.);vec3 v=normalize(cameraPosition-world);float distanceToEye=distance(cameraPosition,world);
        // These phases travel across the lake rather than flickering in place.
        vec2 drift=p-vec2(.22,.10)*time;
        float gust=.68+.32*noise21(drift*.075);
        float warp=sin(drift.x*.72+sin(drift.y*.22))*.7+noise21(drift*.6)*1.1;
        float phase1=dot(p,vec2(.65,5.8))-time*1.9+warp;
        float phase2=dot(p,vec2(3.8,4.1))-time*1.63+sin(drift.y*.45)*.55;
        float phase3=dot(p,vec2(-2.8,9.3))-time*2.8+warp*.7;
        // Fade subpixel capillary waves to avoid sparkling / crawling at distance.
        float aa1=1.-smoothstep(.7,2.8,fwidth(phase1));
        float aa2=1.-smoothstep(.7,2.8,fwidth(phase2));
        float aa3=1.-smoothstep(.6,2.5,fwidth(phase3));
        vec2 slope=longWaves(p,time,wind).yz;
        slope+=(vec2(.65,5.8)*cos(phase1)*.023*aa1+vec2(3.8,4.1)*cos(phase2)*.016*aa2+vec2(-2.8,9.3)*cos(phase3)*.006*aa3)*wind*gust;
        slope*=mix(.32,1.,smoothstep(.05,1.2,shore));
        slope+=postRipple(p,vec2(.305,31.765),dockVisible)+postRipple(p,vec2(4.805,31.765),dockVisible)+postRipple(p,vec2(.305,33.615),dockVisible)+postRipple(p,vec2(4.805,33.615),dockVisible);
        vec2 bd=(p-boatCenter)/vec2(.72,1.95);float br=length(bd);slope+=normalize(bd+vec2(.001))*cos(br*12.-time*2.)*.017*exp(-abs(br-1.)*1.9)*smoothstep(.8,1.15,br)*boatVisible;
        vec3 n=normalize(vec3(-slope.x,1.,-slope.y));float ndv=max(dot(n,v),.03);float grazing=pow(1.-ndv,2.7);
        vec2 uv=mirrorCoord.xy/mirrorCoord.w;float distortion=(.026+.034*grazing)*min(1.,42./max(distanceToEye,1.));
        uv+=n.xz*distortion;
        vec2 texel=vec2(1./1024.);float blur=.75+distanceToEye*.009;
        vec3 reflection=texture2D(tDiffuse,clamp(uv,vec2(.002),vec2(.998))).rgb*.5;
        reflection+=texture2D(tDiffuse,clamp(uv+vec2(texel.x*blur,texel.y*.4),vec2(.002),vec2(.998))).rgb*.25;
        reflection+=texture2D(tDiffuse,clamp(uv-vec2(texel.x*blur,texel.y*.4),vec2(.002),vec2(.998))).rgb*.25;
        reflection*=vec3(.68,.86,.89);
        // Blue-green depth and warm stony shallows are independent of reflection.
        float deep=smoothstep(.15,7.,shore);vec3 body=mix(vec3(.10,.19,.16),vec3(.012,.071,.091),deep);
        body=mix(body,vec3(.007,.023,.034),night*.92);body=mix(body,vec3(.095,.036,.056),sunset*.68);
        vec3 sky=mix(vec3(.39,.60,.69),vec3(.025,.065,.115),night);sky=mix(sky,vec3(.72,.31,.24),sunset*.90);
        vec3 reflectedColor=mix(sky*.65,reflection,reflected);
        float fresh=.13+.70*grazing;
        vec3 water=mix(body,reflectedColor,fresh);
        // Broad, broken strokes of reflected sky: a readable painted-water rhythm.
        float facing=dot(n.xz,normalize(v.xz+vec2(.001)));
        float strokes=smoothstep(-.035,.145,facing)*(.6+.4*noise21(drift*.18));
        float strokesWeight=(.10+.43*grazing)*(.55+.45*deep)*wind;
        water=mix(water,sky,strokes*strokesWeight);
        float sunlight=pow(max(dot(reflect(-normalize(sunDir),n),v),0.),95.);
        float moonlight=pow(max(dot(reflect(-normalize(moonDir),n),v),0.),150.);
        water+=sunlight*sunPower*vec3(1.,.76,.46)*.70;
        water+=moonlight*moonPower*vec3(.53,.71,1.)*1.5;
        // Narrow, discontinuous ripples lap toward shore without ocean-like foam.
        float shorePhase=shore*7.+time*1.15+noise21(p*.4)*2.;float shoreAA=max(fwidth(shorePhase),.15);
        float lip=1.-smoothstep(.1,.1+shoreAA,abs(sin(shorePhase)));
        lip*=exp(-shore*1.3)*smoothstep(.03,.18,shore)*smoothstep(.30,.64,noise21(drift*.7));
        water+=lip*mix(vec3(.075,.10,.078),vec3(.007,.014,.019),night);
        float fog=1.-exp(-fogDensity*fogDensity*distanceToEye*distanceToEye);
        gl_FragColor=vec4(mix(water,fogColor,fog*.68),1.);
      }
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`
  };
}

// Match the boat's heave to the same long waves as the water below its hull.
export function sampleWaterHeight(x,z,t,wind=1){
  return wind*(.030*Math.sin(.47*x+.67*z-t*.82)+.016*Math.sin(-.32*x+.89*z-t*.97+1.6)+.014*Math.sin(.83*x+.36*z-t*.73+2.8));
}
