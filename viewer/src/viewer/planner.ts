import { ViewerSimulation } from './sim.js';
import { EmergencyPlanner, type RankedIntervention } from '../../../src/algorithms/emergencyPlanner.js';

const root = document.getElementById('planner')!;
const sim = new ViewerSimulation();
const graph = [
  { from: 'T-01_SPHERE', to: 'P-10', type: 'pipe' },
  { from: 'T-02_SPHERE', to: 'P-10', type: 'pipe' },
  { from: 'P-10', to: 'ESV-101', type: 'pipe' },
  { from: 'ESV-101', to: 'PUMP-01', type: 'pipe' },
  { from: 'PUMP-01', to: 'P-17', type: 'pipe' },
  { from: 'P-17', to: 'V-12', type: 'pipe' },
  { from: 'V-12', to: 'P-22', type: 'pipe' },
  { from: 'P-22', to: 'T-03_BULLET', type: 'pipe' },
  { from: 'P-22', to: 'T-04_BULLET', type: 'pipe' },
  { from: 'T-04_BULLET', to: 'T-05_STORAGE', type: 'pipe' },
  { from: 'PUMP-01', to: 'FLARE-01', type: 'emergency_route' },
  { from: 'DELUGE-01', to: 'P-17', type: 'suppression' },
  { from: 'DELUGE-02', to: 'T-04_BULLET', type: 'suppression' }
];
const planner = new EmergencyPlanner(graph);

const style = document.createElement('style');
style.textContent = `
  *{box-sizing:border-box}body{margin:0;background:#05090e;color:#eef7ff;font:14px/1.45 system-ui,Segoe UI,sans-serif}
  #planner{max-width:1180px;margin:0 auto;padding:28px}.top{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:22px}
  h1{margin:0;color:#40a9ff;font-size:28px}.muted{color:#8492a6}.grid{display:grid;grid-template-columns:1.1fr .9fr;gap:16px}
  .card{background:#0a121c;border:1px solid #203246;border-radius:14px;padding:18px;box-shadow:0 10px 30px #0008}.wide{grid-column:1/-1}
  .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.metric{background:#101b28;border-radius:10px;padding:12px}.metric b{display:block;font-size:22px;margin-top:3px}
  button,select{background:#152436;color:#eef7ff;border:1px solid #2b435c;border-radius:8px;padding:9px 12px;cursor:pointer}button:hover{border-color:#40a9ff}
  .danger{color:#ff7875}.good{color:#73d13d}.warn{color:#ffc53d}.critical{color:#ff4d4f}.row{display:flex;gap:8px;flex-wrap:wrap}.route{padding:8px 10px;background:#101b28;border-radius:8px;margin-top:8px}
  table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:9px;border-bottom:1px solid #203246}th{color:#8fb6d9}.rank{font-weight:700;color:#73d13d}
  @media(max-width:800px){.grid{grid-template-columns:1fr}.metrics{grid-template-columns:1fr 1fr}}
`;
document.head.appendChild(style);

root.innerHTML = `
  <div class="top"><div><h1>HAZARDLENS / EMERGENCY PLANNING LAB</h1><div class="muted">Algorithmic decision support on a deterministic digital-twin simulation</div></div><button id="back">← 3D Twin</button></div>
  <div class="grid">
    <section class="card wide"><div class="row"><button id="leak">🚨 Inject P-17 Leak</button><button id="fire">🔥 Ignite P-17</button><button id="bleve">💥 Heat T-04</button><button id="wind">🌪️ Shift Wind</button><button id="reset">↻ Reset</button></div></section>
    <section class="card"><h2>Live Risk Assessment</h2><div class="metrics" id="metrics"></div><div id="contributors" class="muted"></div></section>
    <section class="card"><h2>Safest Evacuation Routes</h2><div id="routes"></div></section>
    <section class="card wide"><h2>Intervention Optimizer</h2><div class="muted">Ranks candidate actions by simulated loss avoided, crew dose reduction, asset protection and fire reduction over a 45-second horizon.</div><div id="ranking" style="margin-top:12px"></div></section>
  </div>
`;

const metrics = document.getElementById('metrics')!;
const contributors = document.getElementById('contributors')!;
const routes = document.getElementById('routes')!;
const ranking = document.getElementById('ranking')!;

function render() {
  const snapshot = sim.snapshot();
  const risk = planner.assessRisk(snapshot);
  const riskClass = risk.level === 'CRITICAL' ? 'critical' : risk.level === 'HIGH' ? 'danger' : risk.level === 'GUARDED' ? 'warn' : 'good';
  metrics.innerHTML = `
    <div class="metric">Risk Score<b class="${riskClass}">${risk.score}/100</b></div>
    <div class="metric">Level<b class="${riskClass}">${risk.level}</b></div>
    <div class="metric">Active Fires<b>${snapshot.twins.filter(t=>t.kind==='fire'&&t.active).length}</b></div>
    <div class="metric">Failed Assets<b>${snapshot.twins.filter(t=>t.integrity<=.1||t.metadata.failed||t.metadata.ruptured).length}</b></div>`;
  contributors.textContent = `Drivers: ${risk.contributors.join(' • ')}`;

  routes.innerHTML = ['WORKER-ALPHA','WORKER-BRAVO'].map(id => {
    const route = planner.safestRoute(snapshot, id, {x:30,y:0,z:14});
    if (!route) return `<div class="route"><b>${id}</b>: no safe graph route available</div>`;
    return `<div class="route"><b>${id}</b><br>${route.path.join(' → ')}<br><span class="muted">${route.distanceM} m • ${route.estimatedSeconds}s • route risk ${route.riskScore}/100</span></div>`;
  }).join('');

  const candidates = [
    {name:'ESDV Isolation',apply:(r:any)=>r.emit({type:'valve.command',sourceId:'planner',targetId:'ESV-101',payload:{openFraction:0,closed:true}})},
    {name:'Process Deluge',apply:(r:any)=>r.emit({type:'suppression.command',sourceId:'planner',targetId:'DELUGE-01',payload:{strength:15,coolingRateK:30}})},
    {name:'Tank Deluge',apply:(r:any)=>r.emit({type:'suppression.command',sourceId:'planner',targetId:'DELUGE-02',payload:{strength:15,coolingRateK:30}})},
    {name:'ESDV + All Deluge',apply:(r:any)=>{r.emit({type:'valve.command',sourceId:'planner',targetId:'ESV-101',payload:{openFraction:0,closed:true}});r.emit({type:'suppression.command',sourceId:'planner',payload:{strength:15,coolingRateK:30}})}},
    {name:'Crew Evacuation',apply:(r:any)=>r.emit({type:'worker.evacuate',sourceId:'planner',payload:{musterZone:'MUSTER_POINT'}})}
  ];
  const results = planner.rankInterventions(sim.runtime,candidates,45);
  ranking.innerHTML = `<table><thead><tr><th>#</th><th>Intervention</th><th>Loss Avoided</th><th>Dose Reduction</th><th>Assets Saved</th><th>Fires Reduced</th></tr></thead><tbody>${results.map((r:RankedIntervention,i)=>`<tr><td>${i+1}</td><td class="rank">${r.name}</td><td>$${r.lossAvoidedUsd.toFixed(2)}M</td><td>${r.crewDoseReduction}</td><td>${r.assetLossReduction}</td><td>${r.firesReduced}</td></tr>`).join('')}</tbody></table>`;
}

document.getElementById('leak')!.onclick=()=>{sim.breakPipe('P-17',.9);render()};
document.getElementById('fire')!.onclick=()=>{sim.igniteFire({x:7,y:1.2,z:-3},6);render()};
document.getElementById('bleve')!.onclick=()=>{sim.igniteTankFire('T-04_BULLET');render()};
document.getElementById('wind')!.onclick=()=>{sim.shiftWind(4,1.2);render()};
document.getElementById('reset')!.onclick=()=>{sim.reset();render()};
document.getElementById('back')!.onclick=()=>{location.href='/'};

render();
setInterval(()=>{sim.update(.25);render()},1000);
