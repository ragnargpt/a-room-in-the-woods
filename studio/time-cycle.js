import {getPosition,getMoonPosition,getMoonIllumination,getTimes,getMoonTimes} from './vendor/suncalc.js';
// Coordinates and civil timezone are explicit; IP location is never requested.
export const LOCATION={name:'London',lat:51.5074,lon:-.1278,timeZone:'Europe/London'};
export function setLocation(value){
 if(!value||!Number.isFinite(value.lat)||!Number.isFinite(value.lon)||Math.abs(value.lat)>90||Math.abs(value.lon)>180)throw Error('Invalid coordinates');
 new Intl.DateTimeFormat('en',{timeZone:value.timeZone}).format(new Date());
 Object.assign(LOCATION,value);
}
function parts(date){return Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:LOCATION.timeZone,year:'numeric',month:'2-digit',day:'2-digit',hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));}
export const wrapHour=h=>((h%24)+24)%24;
export function dateKey(date=new Date()){const p=parts(date);return `${p.year}-${p.month}-${p.day}`;}
export function localHour(date=new Date()){const p=parts(date);return Number(p.hour)+Number(p.minute)/60+Number(p.second)/3600+date.getMilliseconds()/3600000;}
// Convert civil wall time to an instant. On DST fallback select the earlier match;
// reject nonexistent spring-forward times rather than silently shifting shadows.
export function dateAtHour(key,h){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(key);if(!m||!Number.isFinite(h)||h<0||h>=24)throw Error('Invalid date/time');
 const minute=Math.round(h*60),target=Date.UTC(+m[1],+m[2]-1,+m[3],0,minute);
 if(new Date(Date.UTC(+m[1],+m[2]-1,+m[3])).toISOString().slice(0,10)!==key)throw Error('Invalid date');
 const offsets=new Set();
 for(const delta of [-36,-12,0,12,36]){const t=target+delta*3600000,p=parts(new Date(t));offsets.add(Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)-t);}
 const candidates=[...offsets].map(o=>new Date(target-o)).filter(d=>dateKey(d)===key&&Math.round(localHour(d)*60)===minute).sort((a,b)=>a-b);
 if(!candidates.length)throw Error('This local time does not exist because the clocks move forward. Choose a later time.');
 return candidates[0];
}
export function formatHour(h){const m=Math.floor(wrapHour(h)*60+1e-7)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function horizontalDirection(azimuth,altitude){const a=azimuth*Math.PI/180,h=altitude*Math.PI/180;return [Math.sin(a)*Math.cos(h),Math.sin(h),-Math.cos(a)*Math.cos(h)];}
export function sampleMoment(date){
 const sunPosition=getPosition(date,LOCATION.lat,LOCATION.lon),moonPosition=getMoonPosition(date,LOCATION.lat,LOCATION.lon),illumination=getMoonIllumination(date),hour=localHour(date),alt=sunPosition.altitude;
 const day=smooth(-7,4,alt),twilight=Math.exp(-Math.pow((alt+.8)/6.5,2))*.85;
 const phase=alt>8?'day':alt>-4?(hour<12?'dawn':'sunset'):alt>-12?'twilight':'night';
 return {iso:date.toISOString(),hour,date:dateKey(date),elevation:Math.sin(alt*Math.PI/180),day,night:1-day,twilight,phase,sun:horizontalDirection(sunPosition.azimuth,alt),moon:horizontalDirection(moonPosition.azimuth,moonPosition.altitude),sunPosition,moonPosition,illumination,moonRadius:Math.asin(1737.4/moonPosition.distance)};
}
export const sampleCycle=(h,key=dateKey())=>sampleMoment(dateAtHour(key,h));
export function dayEvents(key){
 const midday=dateAtHour(key,12),start=dateAtHour(key,0).getTime();
 const tomorrow=new Date(Date.parse(key+'T12:00:00Z')+86400000).toISOString().slice(0,10),end=dateAtHour(tomorrow,0).getTime();
 const suns=[-1,0,1].map(n=>getTimes(new Date(midday.getTime()+n*86400000),LOCATION.lat,LOCATION.lon));
 const moons=[-1,0,1].map(n=>getMoonTimes(new Date(midday.getTime()+n*86400000),LOCATION.lat,LOCATION.lon));
 const pick=(all,k)=>all.map(s=>s[k]).find(d=>d instanceof Date&&Number.isFinite(d.getTime())&&d>=start&&d<end);
 const fmt=d=>d?formatHour(localHour(d)):'—',sr=pick(suns,'sunrise'),ss=pick(suns,'sunset'),mr=pick(moons,'rise'),ms=pick(moons,'set');
 return {sunrise:fmt(sr),sunset:fmt(ss),moonrise:fmt(mr),moonset:fmt(ms)};
}
