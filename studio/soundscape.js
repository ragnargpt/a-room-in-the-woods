import {cricketSamples,shoreSamples} from './night-audio.js';
import {lakeQ} from './lake-world.js';
// Original synthesized wood crackles and gentle forest ambience. No third-party audio.
function random(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function fireSamples(rate,seconds=24){
  const n=Math.floor(rate*seconds),data=new Float32Array(n),rnd=random(411),events=[];let low=0,slow=0;
  for(let i=0;i<n;i++){
    const white=rnd()*2-1;low=.965*low+.035*white;slow=.999*slow+.001*white;
    const t=i/rate;data[i]=low*.95+white*.013*(.7+.3*Math.sin(t*1.7))+slow*.6;
  }
  // Small crackles overlap at irregular intervals, with occasional deeper wood pops.
  for(let t=.1;t<seconds;t+=.035+rnd()*.26){
    const start=Math.floor(t*rate),big=rnd()>.88,len=Math.floor(rate*(big?.09:.012+rnd()*.045));let filter=0;const amp=big?.48:.08+rnd()*.22;
    events.push(start);
    for(let j=0;j<len&&start+j<n;j++){
      const noise=rnd()*2-1;filter=.60*filter+.40*noise;const env=Math.exp(-j/(len*.20))*Math.min(1,j/(rate*.0008));
      data[start+j]+=filter*env*amp;
    }
  }
  // Crossfade the tail into the first 160 ms; loop playback resumes after this lead-in.
  const fade=Math.floor(rate*.16);
  for(let i=0;i<fade;i++){const t=i/fade,a=data[i],b=data[n-fade+i],mix=b*(1-t)+a*t;data[n-fade+i]=mix;}
  return data;
}
export function createSoundscape(){
 let nightGains=[],waterGain,nightEnabled=true,lakeEnabled=true;let ctx,master,analyser,fireGain,ambientGain,windGain,filter,firePan;let unlocked=false,muted=false,ambient=false,volume=.55,visible=true,fire=0,distance=20,night=0,inside=0,wind=.2,nextBird=8,lastStep=-10,birds=0,steps=0,lastMaterial='',sourceAngle=0,listenerYaw=0,sourceDistance=12,sourceX=20,sourceY=20,listenerX=0,listenerY=0;const sources=[];
 async function unlock(){try{if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=.75;analyser=ctx.createAnalyser();master.connect(analyser);analyser.connect(ctx.destination);fireGain=ctx.createGain();fireGain.gain.value=0;firePan=ctx.createStereoPanner();fireGain.connect(firePan);firePan.connect(master);ambientGain=ctx.createGain();ambientGain.gain.value=0;filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=7000;ambientGain.connect(filter);filter.connect(master);windGain=ctx.createGain();windGain.connect(ambientGain);
 const buf=ctx.createBuffer(1,ctx.sampleRate*24,ctx.sampleRate);buf.copyToChannel(fireSamples(ctx.sampleRate),0);const source=ctx.createBufferSource();source.buffer=buf;source.loop=true;source.loopStart=.16;source.connect(fireGain);source.start();sources.push(source);
 const wb=ctx.createBuffer(1,ctx.sampleRate*18,ctx.sampleRate),data=wb.getChannelData(0),rnd=random(774);let l=0;for(let i=0;i<data.length;i++){l=.975*l+.025*(rnd()*2-1);data[i]=l;}const w=ctx.createBufferSource();w.buffer=wb;w.loop=true;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1100;w.connect(lp);lp.connect(windGain);w.start();sources.push(w);nextBird=ctx.currentTime+5;
 for(let i=0;i<3;i++){const data=cricketSamples(ctx.sampleRate,28+i*2,812+i*37),b=ctx.createBuffer(1,data.length,ctx.sampleRate);b.copyToChannel(data,0);const src=ctx.createBufferSource(),g=ctx.createGain(),p=ctx.createStereoPanner();p.pan.value=[-.72,.64,.12][i];g.gain.value=0;src.buffer=b;src.loop=true;src.connect(g);g.connect(p);p.connect(ambientGain);src.start(0,i*1.2);nightGains.push(g);sources.push(src);}
 const shore=shoreSamples(ctx.sampleRate),sb=ctx.createBuffer(1,shore.length,ctx.sampleRate);sb.copyToChannel(shore,0);const ws=ctx.createBufferSource();waterGain=ctx.createGain();waterGain.gain.value=0;ws.buffer=sb;ws.loop=true;ws.connect(waterGain);waterGain.connect(ambientGain);ws.start();sources.push(ws);
 }await ctx.resume();unlocked=ctx.state==='running';return unlocked;}catch{return false;}}
 function gains(){if(!ctx)return;const at=ctx.currentTime,allow=!muted&&visible;master.gain.setTargetAtTime(allow?.75:0,at,.045);fireGain.gain.setTargetAtTime(allow?fire*volume*1.65/(1+.06*distance)*(1-.65*inside):0,at,.2);ambientGain.gain.setTargetAtTime(allow&&ambient?volume*(1-.65*inside):0,at,.35);filter.frequency.setTargetAtTime(inside>.5?1300:7000,at,.45);windGain.gain.setTargetAtTime((.07+.30*wind)*(1-night*.45),at,.7);nightGains.forEach((g,i)=>g.gain.setTargetAtTime(nightEnabled?Math.pow(night,2)*[.14,.11,.07][i]:0,at,.7));if(waterGain)waterGain.gain.setTargetAtTime(lakeEnabled?.9/(1+Math.abs(lakeQ(listenerX,listenerY)-1)*80):0,at,.6);}
 function chirp(at,pan,gain){const o=ctx.createOscillator(),g=ctx.createGain(),p=ctx.createStereoPanner();p.pan.value=pan;o.type='sine';o.frequency.setValueAtTime(2350,at);o.frequency.exponentialRampToValueAtTime(3650,at+.07);o.frequency.exponentialRampToValueAtTime(2700,at+.18);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(gain,at+.025);g.gain.exponentialRampToValueAtTime(.0001,at+.21);o.connect(g);g.connect(p);p.connect(ambientGain);o.start(at);o.stop(at+.24);o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();};}
 return {unlock,setNight(v){nightEnabled=v;gains();},setLake(v){lakeEnabled=v;gains();},setMuted(v){muted=v;gains();},setAmbient(v){ambient=v;gains();},setVolume(v){volume=Math.max(0,Math.min(1,v));gains();},async setPageVisible(v){visible=v;gains();if(ctx&&unlocked)await (v?ctx.resume():ctx.suspend()).catch(()=>{});},
 update(strength,dist,n,pan=0,env={}){fire=strength;distance=dist;night=n;inside=env.inside||0;wind=env.wind??.2;listenerYaw=env.yaw||0;listenerX=env.x||0;listenerY=env.y||0;sourceDistance=Math.hypot(sourceX-listenerX,sourceY-listenerY);sourceAngle=Math.atan2(-(sourceX-listenerX),sourceY-listenerY);if(!ctx)return;gains();firePan.pan.setTargetAtTime(Math.max(-.85,Math.min(.85,pan)),ctx.currentTime,.2);
 if(ambient&&!muted&&visible&&night<.35&&ctx.state==='running'&&ctx.currentTime>nextBird){nextBird=ctx.currentTime+15+Math.random()*18;sourceAngle=Math.random()*Math.PI*2;sourceDistance=8+Math.random()*25;sourceX=listenerX-Math.sin(sourceAngle)*sourceDistance;sourceY=listenerY+Math.cos(sourceAngle)*sourceDistance;const bp=Math.sin(sourceAngle-listenerYaw),g=.040/(1+sourceDistance*.05);chirp(ctx.currentTime+.03,bp,g);chirp(ctx.currentTime+.29,bp,g*.8);birds++;}},
 footstep(material){if(!ctx||!ambient||muted||!visible||ctx.state!=='running'||ctx.currentTime-lastStep<.32)return;lastStep=ctx.currentTime;steps++;lastMaterial=material;const b=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.14),ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*.027));let o=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.buffer=b;f.type='lowpass';f.frequency.value=material==='wood'?500:material==='stone'?2100:material==='grass'?900:1500;g.gain.value=.05*volume;o.connect(f);f.connect(g);g.connect(master);o.start();o.onended=()=>{o.disconnect();f.disconnect();g.disconnect();};},
 debug(){let rms=0;if(analyser){let a=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(a);rms=Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length);}return{night,nightEnabled,lakeEnabled,nightGains:nightGains.map(g=>g.gain.value),waterGain:waterGain?.gain.value||0,unlocked,state:ctx?.state||'not-created',muted,ambient,volume,fireStrength:fire,fireGain:fireGain?.gain.value||0,rms,visible,sources:sources.length,inside,wind,birds,sourceDistance,sourcePan:Math.sin(sourceAngle-listenerYaw),steps,lastMaterial};},dispose(){sources.forEach(s=>s.stop());ctx?.close();}};
}
