import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewerSimulation } from './sim.js';
import { WorldRenderer } from './worldRenderer.js';

const app=document.getElementById('app')!;document.body.style.margin='0';document.body.style.overflow='hidden';document.body.style.background='#05070b';
const scene=new THREE.Scene();scene.background=new THREE.Color(0x05070b);scene.fog=new THREE.Fog(0x05070b,35,80);
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,1000);camera.position.set(24,18,28);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;app.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(8,1,0);controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xcfe7ff,0x202020,1.7));const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.position.set(15,25,10);scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(70,50),new THREE.MeshStandardMaterial({color:0x111820,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=-.05;scene.add(ground);scene.add(new THREE.GridHelper(70,35,0x304050,0x202b35));

const sim=new ViewerSimulation();const world=new WorldRenderer(scene);
const hud=document.createElement('div');hud.style.cssText='position:fixed;left:18px;top:18px;color:#e9f3ff;background:#071019dd;border:1px solid #263746;border-radius:14px;padding:14px 16px;font:13px system-ui;min-width:250px;backdrop-filter:blur(12px);z-index:5';document.body.appendChild(hud);
const actions=document.createElement('div');actions.style.cssText='position:fixed;left:18px;bottom:18px;display:flex;gap:8px;z-index:6';document.body.appendChild(actions);
function button(label:string,fn:()=>void){const b=document.createElement('button');b.textContent=label;b.style.cssText='border:1px solid #405466;background:#101c27;color:#eef7ff;padding:10px 14px;border-radius:10px;font:600 12px system-ui;cursor:pointer';b.onclick=fn;actions.appendChild(b)}
button('BREAK P-17',()=>sim.breakPipe());button('INTERVENE',()=>sim.suppress());button('RESET',()=>sim.reset());

let last=performance.now();function frame(now:number){requestAnimationFrame(frame);const dt=(now-last)/1000;last=now;sim.update(dt);const snap=sim.snapshot();world.sync(snap);const fires=snap.twins.filter(t=>t.kind==='fire'&&t.active).length,releases=snap.twins.filter(t=>t.kind==='release'&&t.active).length,critical=snap.twins.filter(t=>t.integrity<.7).length;hud.innerHTML=`<b style="font-size:16px">HAZARDLENS</b><div style="opacity:.6;margin:3px 0 12px">LIVE DIGITAL TWIN</div><div>SIM TIME <b>${snap.time.toFixed(1)}s</b></div><div>ACTIVE FIRES <b>${fires}</b></div><div>RELEASES <b>${releases}</b></div><div>CRITICAL ASSETS <b>${critical}</b></div><div style="margin-top:10px;opacity:.65">Break P-17 and watch the world state generate the incident.</div>`;controls.update();renderer.render(scene,camera)}requestAnimationFrame(frame);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
