import {LAKE} from './lake-config.js';
export {LAKE};
const smooth=(a,b,x)=>{let t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
export function shoreScale(a){return 1+.055*Math.sin(3*a+.4)+.028*Math.cos(5*a-.7)+.018*Math.sin(9*a)}
export function lakeQ(x,y){const dx=(x-3)/60,dy=(y+76)/62;return Math.hypot(dx,dy)/shoreScale(Math.atan2(dy,dx));}
export function oldGround(x,y){let r=Math.hypot(x-3,y-1),f=smooth(11,35,r);return -4.64+f*(2.5*Math.sin(x*.057)+1.6*Math.cos(y*.063)+1.4*Math.sin((x+y)*.045)+.014*r)+.025*Math.sin(x*.55)*Math.sin(y*.61)}
export function lakeGround(x,y){const q=lakeQ(x,y),old=oldGround(x,y);if(q<1)return -6.2-11.4*Math.pow(1-q,.78);const bank=y>-9?old:Math.max(old,-6.2+.48+1.35*Math.sin(x*.045)**2);return -6.2+(bank+6.2)*smooth(1,1.15,q)}
export function dockHeight(y){const d=LAKE.dock,t=smooth(0,1,(-y+d.start)/3);return (lakeGround(d.x,d.start)+.13)*(1-t)+d.top*t;}
export function dockSurface(x,y){const d=LAKE.dock;if((Math.abs(x-d.x)<d.width/2-.12&&y<=d.start+.18&&y>=d.end-.1)||(Math.abs(x-d.x)<d.head_width/2-.15&&y<=d.end-.1&&y>=d.end-2.0))return {height:dockHeight(y),material:'wood',zone:'湖畔码头'};return null}
