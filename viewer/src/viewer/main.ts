import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewerSimulation } from './sim.js';
import { WorldRenderer } from './worldRenderer.js';
import { TwinInspector } from './inspector.js';
import { createFacility } from './facility.js';
import { FacilityGraph } from './facilityGraph.js';

const app = document.getElementById('app')!;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06090e);
scene.fog = new THREE.Fog(0x06090e, 45, 125);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(22, 24, 38);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(10, 2, -1);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xddeeff, 0x182028, 1.8));
const dirLight = new THREE.DirectionalLight(0xfffaed, 2.2);
dirLight.position.set(25, 35, 20);
scene.add(dirLight);

const ambientLight = new THREE.AmbientLight(0x223344, 0.8);
scene.add(ambientLight);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(140, 100),
  new THREE.MeshStandardMaterial({ color: 0x0c1117, roughness: 0.95 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

createFacility(scene);
const facility = new FacilityGraph();
const sim = new ViewerSimulation();
const world = new WorldRenderer(scene);

// Smooth Camera Target Interpolation
let targetCamPos: THREE.Vector3 | null = null;
let targetLookAt: THREE.Vector3 | null = null;

function flyCameraTo(pos: { x: number; y: number; z: number }) {
  targetLookAt = new THREE.Vector3(pos.x, pos.y + 1.5, pos.z);
  targetCamPos = new THREE.Vector3(pos.x + 8, pos.y + 10, pos.z + 14);
}

const inspector = new TwinInspector((twinId: string) => {
  const twin = sim.runtime.get(twinId);
  if (twin) {
    flyCameraTo(twin.state.position);
    const selected = twin.state;
    const zone = facility.findZone(selected.id);
    selected.metadata.zone = zone?.name ?? 'Facility General';
    const neighbors = facility.neighbors(selected.id);
    selected.metadata.connections = neighbors.length ? neighbors.join(', ') : 'None';
    inspector.show(selected);
  }
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// ─── HUD Panel (Top Left) ───────────────────────────────────────────────────
const hud = document.createElement('div');
hud.style.cssText =
  'position:fixed;left:18px;top:18px;color:#eef7ff;background:#06101bdd;padding:14px 18px;border-radius:12px;border:1px solid #1e3144;font:13px/1.5 system-ui,monospace;z-index:5;backdrop-filter:blur(10px);box-shadow:0 8px 24px rgba(0,0,0,0.5);min-width:280px';
document.body.appendChild(hud);

// ─── Collapsible Tabbed Control Panel (Bottom Left) ─────────────────────────
const panel = document.createElement('div');
panel.style.cssText =
  'position:fixed;left:18px;bottom:75px;z-index:5;display:flex;flex-direction:column;gap:8px;max-width:94vw;background:#06101bee;padding:10px 14px;border-radius:14px;border:1px solid #1e3144;backdrop-filter:blur(12px);box-shadow:0 8px 30px rgba(0,0,0,0.6)';
document.body.appendChild(panel);

// Navigation Tabs Header
const tabsHeader = document.createElement('div');
tabsHeader.style.cssText = 'display:flex;align-items:center;gap:6px;border-bottom:1px solid #1e3144;padding-bottom:8px;margin-bottom:4px';
panel.appendChild(tabsHeader);

let activeTab = 'intervene';
let isMinimized = false;

const contentContainer = document.createElement('div');
contentContainer.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:6px';
panel.appendChild(contentContainer);

function makeBtn(container: HTMLElement, label: string, color: string, fn: () => void) {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText = `background:${color};color:#fff;border:none;padding:6px 11px;border-radius:6px;font:bold 11px system-ui,monospace;cursor:pointer;transition:transform 0.1s,opacity 0.2s;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap`;
  b.onmouseenter = () => (b.style.opacity = '0.85');
  b.onmouseleave = () => (b.style.opacity = '1.0');
  b.onclick = fn;
  container.appendChild(b);
  return b;
}

// Tab Buttons definition
const tabs = [
  { id: 'intervene', label: '🛡️ INTERVENE', color: '#52c41a' },
  { id: 'faults', label: '🚨 DISTURBANCE', color: '#fa8c16' },
  { id: 'domino', label: '💥 DOMINO', color: '#ff4d4f' },
  { id: 'analytics', label: '🔬 DECISION & ERP', color: '#722ed1' }
];

const tabElements: HTMLButtonElement[] = [];

tabs.forEach(t => {
  const tb = document.createElement('button');
  tb.textContent = t.label;
  tb.style.cssText = `background:#152230;color:#8c8c8c;border:1px solid #233446;padding:4px 10px;border-radius:6px;font:bold 11px system-ui;cursor:pointer`;
  tb.onclick = () => {
    activeTab = t.id;
    isMinimized = false;
    renderTabContent();
  };
  tabsHeader.appendChild(tb);
  tabElements.push(tb);
});

const minBtn = document.createElement('button');
minBtn.textContent = '— HIDE';
minBtn.style.cssText = `margin-left:auto;background:#1f1f1f;color:#8c8c8c;border:1px solid #333;padding:3px 8px;border-radius:6px;font:10px monospace;cursor:pointer`;
minBtn.onclick = () => {
  isMinimized = !isMinimized;
  minBtn.textContent = isMinimized ? '▲ SHOW' : '— HIDE';
  contentContainer.style.display = isMinimized ? 'none' : 'flex';
};
tabsHeader.appendChild(minBtn);

// ─── Render Active Tab Content ──────────────────────────────────────────────
function renderTabContent() {
  contentContainer.innerHTML = '';
  if (isMinimized) {
    contentContainer.style.display = 'none';
    return;
  }
  contentContainer.style.display = 'flex';

  tabs.forEach((t, i) => {
    if (t.id === activeTab) {
      tabElements[i].style.background = `${t.color}33`;
      tabElements[i].style.color = t.color;
      tabElements[i].style.borderColor = t.color;
    } else {
      tabElements[i].style.background = '#152230';
      tabElements[i].style.color = '#8c8c8c';
      tabElements[i].style.borderColor = '#233446';
    }
  });

  if (activeTab === 'intervene') {
    makeBtn(contentContainer, '🛑 CLOSE ESV-101', '#fa541c', () => { addEventBookmark('ESV Closed', '#fa541c'); sim.closeESV(); });
    makeBtn(contentContainer, '✅ OPEN ESV-101', '#13c2c2', () => sim.openESV());
    makeBtn(contentContainer, '🎛️ THROTTLE V-12 (50%)', '#fa8c16', () => sim.throttleValve('V-12', 0.5));
    makeBtn(contentContainer, '🌊 DELUGE PROCESS (#01)', '#1890ff', () => { addEventBookmark('Deluge #01', '#1890ff'); sim.triggerDeluge('DELUGE-01'); });
    makeBtn(contentContainer, '🌊 DELUGE TANKS (#02)', '#2f54eb', () => { addEventBookmark('Deluge #02', '#2f54eb'); sim.triggerDeluge('DELUGE-02'); });
    makeBtn(contentContainer, '🌊 ALL DELUGE', '#096dd9', () => { addEventBookmark('All Deluge', '#096dd9'); sim.triggerDeluge(); });
    makeBtn(contentContainer, '🏃 EVACUATE CREW', '#52c41a', () => { addEventBookmark('Evacuate', '#52c41a'); sim.evacuateWorkers(); });
    makeBtn(contentContainer, '🔥 RELIEF FLARING', '#eb2f96', () => { addEventBookmark('Flaring', '#eb2f96'); sim.triggerFlare(); });
    makeBtn(contentContainer, '🧯 FOAM ATTACK', '#389e0d', () => sim.extinguishAll());
  } else if (activeTab === 'faults') {
    makeBtn(contentContainer, '⚡ LEAK PIPE P-17', '#d9363e', () => { addEventBookmark('P-17 Leak', '#d9363e'); sim.breakPipe('P-17', 0.7); });
    makeBtn(contentContainer, '💥 RUPTURE FEED P-10', '#cf1322', () => { addEventBookmark('P-10 Rupture', '#cf1322'); sim.ruptureFeedLine(1.8); });
    makeBtn(contentContainer, '🔥 IGNITE FIRE AT P-17', '#ff4d4f', () => { addEventBookmark('Ignition', '#ff4d4f'); sim.igniteFire({ x: 7, y: 1.2, z: -3 }, 6); });
    makeBtn(contentContainer, '🔥 IMPINGE TANK T-04', '#d4380d', () => { addEventBookmark('T-04 Fire', '#d4380d'); sim.igniteTankFire('T-04_BULLET'); });
    makeBtn(contentContainer, '⚙️ OVERHEAT PUMP-01', '#d46b08', () => { addEventBookmark('Pump Trip', '#d46b08'); sim.tripPump(); });
    makeBtn(contentContainer, '🌪️ SHIFT WIND TO TANKS', '#722ed1', () => sim.shiftWind(4.0, 1.2));
  } else if (activeTab === 'domino') {
    makeBtn(contentContainer, '🌋 FULL CASCADE (Pipe→BLEVE→VCE)', '#7b0000', () => {
      addEventBookmark('Full Domino', '#7b0000');
      sim.breakPipe('P-17', 0.9);
      sim.shiftWind(3.5, 0.8);
    });
    makeBtn(contentContainer, '🔥 TANK BLEVE CASCADE', '#8b1a1a', () => {
      addEventBookmark('BLEVE Cascade', '#8b1a1a');
      sim.igniteTankFire('T-03_BULLET');
      sim.shiftWind(2.5, 1.5);
    });
    makeBtn(contentContainer, '💨 VAPOR + SHOCK DETONATION', '#4a1880', () => {
      addEventBookmark('Shock Detonation', '#4a1880');
      sim.ruptureFeedLine(2.5);
      sim.igniteTankFire('T-03_BULLET');
    });
  } else if (activeTab === 'analytics') {
    // Threat Perimeter Toggle
    const threatBtn = makeBtn(contentContainer, `🎯 THREAT PERIMETER (ERP): ${world.showThreatZones ? 'ON' : 'OFF'}`, world.showThreatZones ? '#722ed1' : '#1e3144', () => {
      world.showThreatZones = !world.showThreatZones;
      renderTabContent();
    });

    makeBtn(contentContainer, '⚡ FORK & COMPARE INTERVENTION', '#531dab', () => {
      openCounterfactualModal();
    });
  }
}

// ─── Counterfactual Modal ───────────────────────────────────────────────────
const modalBackdrop = document.createElement('div');
modalBackdrop.style.cssText =
  'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:20;display:none;align-items:center;justify-content:center;backdrop-filter:blur(8px)';
document.body.appendChild(modalBackdrop);

const modalContent = document.createElement('div');
modalContent.style.cssText =
  'background:#06101bee;border:1px solid #1e3144;border-radius:16px;padding:24px;width:90%;max-width:680px;color:#eef7ff;font:13px/1.5 system-ui,monospace;box-shadow:0 16px 48px rgba(0,0,0,0.8);position:relative';
modalBackdrop.appendChild(modalContent);

function openCounterfactualModal() {
  const res = sim.evaluateCounterfactual('Emergency Deluge + ESDV Isolation', s => {
    s.emit({ type: 'valve.command', sourceId: 'operator', targetId: 'ESV-101', payload: { openFraction: 0, closed: true } });
    s.emit({ type: 'suppression.command', sourceId: 'operator', payload: { strength: 15, coolingRateK: 30 } });
    s.emit({ type: 'worker.evacuate', sourceId: 'operator', payload: { musterZone: 'MUSTER_POINT' } });
  }, 45);

  modalContent.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div>
        <div style="font-size:18px;font-weight:bold;color:#b37feb;letter-spacing:0.5px">⚡ COUNTERFACTUAL DECISION ENGINE</div>
        <div style="font-size:11px;color:#8c8c8c">45-Second Horizon Forward Simulation Comparison</div>
      </div>
      <button id="closeModalBtn" style="background:#1f2937;border:1px solid #374151;color:#9ca3af;border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:14px">✕</button>
    </div>

    <!-- Loss Saved Banner -->
    <div style="background:linear-gradient(90deg, #135200, #237804);border:1px solid #52c41a;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:11px;color:#b7eb8f;font-weight:bold">ESTIMATED DIRECT LOSS AVOIDED</div>
        <div style="font-size:24px;font-weight:bold;color:#fff">$${res.lossAvoidedUsd.toFixed(2)}M USD</div>
      </div>
      <div style="font-size:12px;text-align:right;color:#e8ffea">
        <div>BLEVE Cascades Prevented: <b>${res.blevePrevented ? '✅ YES' : '🛡️ ISOLATED'}</b></div>
        <div>Crew Max Thermal Dose: <b>${res.crewMaxDoseMitigated} vs ${res.crewMaxDoseBaseline}</b></div>
      </div>
    </div>

    <!-- Comparative Table -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <!-- Path A: Unmitigated -->
      <div style="background:#1f1315;border:1px solid #820014;border-radius:10px;padding:12px">
        <div style="font-weight:bold;color:#ff4d4f;margin-bottom:6px">🔴 PATH A: NO INTERVENTION</div>
        <div style="font-size:12px;color:#d9d9d9;display:flex;flex-direction:column;gap:4px">
          <div>Direct Asset Loss: <b style="color:#ff7875">$${res.unmitigatedLossUsd}M</b></div>
          <div>Equipment Ruptured: <b style="color:#ff7875">${res.assetsDestroyedBaseline} Units</b></div>
          <div>Active Conflagration Fires: <b style="color:#ff7875">${res.totalFiresBaseline}</b></div>
          <div>Worst-Case Consequence: <b style="color:#ff4d4f">Full Domino BLEVE</b></div>
        </div>
      </div>

      <!-- Path B: Mitigated -->
      <div style="background:#092b00;border:1px solid #237804;border-radius:10px;padding:12px">
        <div style="font-weight:bold;color:#73d13d;margin-bottom:6px">🟢 PATH B: ESDV + DELUGE</div>
        <div style="font-size:12px;color:#d9d9d9;display:flex;flex-direction:column;gap:4px">
          <div>Direct Asset Loss: <b style="color:#95de64">$${res.mitigatedLossUsd}M</b></div>
          <div>Equipment Ruptured: <b style="color:#95de64">${res.assetsDestroyedMitigated} Units</b></div>
          <div>Active Conflagration Fires: <b style="color:#95de64">${res.totalFiresMitigated}</b></div>
          <div>Mitigation Outcome: <b style="color:#52c41a">Contained / Extinguished</b></div>
        </div>
      </div>
    </div>

    <div style="font-size:11px;color:#8c8c8c;text-align:center">
      Simulation engine uses deterministic state clones with real-time physical rate integration.
    </div>
  `;

  modalBackdrop.style.display = 'flex';
  modalContent.querySelector('#closeModalBtn')?.addEventListener('click', () => {
    modalBackdrop.style.display = 'none';
  });
}

modalBackdrop.addEventListener('click', e => {
  if (e.target === modalBackdrop) modalBackdrop.style.display = 'none';
});

// ─── VCR Time Scrubber & Event Bookmarks ────────────────────────────────────
const bookmarksContainer = document.createElement('div');
bookmarksContainer.style.cssText =
  'position:fixed;left:18px;right:18px;bottom:58px;display:flex;gap:6px;overflow-x:auto;z-index:6;pointer-events:auto';
document.body.appendChild(bookmarksContainer);

interface EventBookmark {
  time: number;
  label: string;
  color: string;
}
const bookmarks: EventBookmark[] = [];

function addEventBookmark(label: string, color: string) {
  const t = Number(sim.snapshot().time.toFixed(1));
  bookmarks.push({ time: t, label, color });
  renderBookmarks();
}

function renderBookmarks() {
  bookmarksContainer.innerHTML = '';
  bookmarks.slice(-6).forEach(bm => {
    const chip = document.createElement('button');
    chip.textContent = `📍 ${bm.time}s: ${bm.label}`;
    chip.style.cssText = `background:${bm.color}33;color:#fff;border:1px solid ${bm.color};border-radius:12px;padding:2px 8px;font:10px monospace;cursor:pointer;white-space:nowrap;backdrop-filter:blur(6px)`;
    chip.onclick = () => {
      sim.scrubTo(bm.time);
      updateScrubberUI();
    };
    bookmarksContainer.appendChild(chip);
  });
}

const scrubberBar = document.createElement('div');
scrubberBar.style.cssText =
  'position:fixed;left:18px;right:18px;bottom:14px;background:#06101bee;border:1px solid #1e3144;border-radius:12px;padding:8px 16px;display:flex;align-items:center;gap:10px;backdrop-filter:blur(10px);z-index:6;box-shadow:0 4px 20px rgba(0,0,0,0.5)';
document.body.appendChild(scrubberBar);

let isPaused = false;
const playPauseBtn = document.createElement('button');
playPauseBtn.textContent = '⏸️';
playPauseBtn.style.cssText =
  'background:#262626;color:#fff;border:1px solid #434343;padding:4px 10px;border-radius:6px;font:bold 12px system-ui;cursor:pointer';
playPauseBtn.onclick = () => {
  isPaused = !isPaused;
  playPauseBtn.textContent = isPaused ? '▶️' : '⏸️';
  playPauseBtn.style.background = isPaused ? '#1890ff' : '#262626';
};
scrubberBar.appendChild(playPauseBtn);

const speedBtn = document.createElement('button');
speedBtn.textContent = '1x';
speedBtn.style.cssText =
  'background:#1f1f1f;color:#8c8c8c;border:1px solid #333;padding:4px 8px;border-radius:6px;font:bold 11px monospace;cursor:pointer';
speedBtn.onclick = () => {
  sim.speed = sim.speed === 1 ? 2 : sim.speed === 2 ? 5 : 1;
  speedBtn.textContent = `${sim.speed}x`;
};
scrubberBar.appendChild(speedBtn);

const timeSlider = document.createElement('input');
timeSlider.type = 'range';
timeSlider.min = '0';
timeSlider.max = '60';
timeSlider.step = '0.1';
timeSlider.value = '0';
timeSlider.style.cssText = 'flex:1;cursor:pointer;accent-color:#40a9ff';
scrubberBar.appendChild(timeSlider);

const timeDisplay = document.createElement('span');
timeDisplay.style.cssText = 'font:bold 11px monospace;color:#eef7ff;min-width:65px';
timeDisplay.textContent = '0.0s';
scrubberBar.appendChild(timeDisplay);

const liveBadge = document.createElement('span');
liveBadge.style.cssText =
  'font:bold 10px system-ui;color:#52c41a;background:#135200;padding:3px 8px;border-radius:4px;letter-spacing:0.5px;cursor:pointer';
liveBadge.textContent = '● LIVE';
liveBadge.onclick = () => {
  sim.stopScrubbing();
  updateScrubberUI();
};
scrubberBar.appendChild(liveBadge);

const branchBtn = document.createElement('button');
branchBtn.textContent = '🔀 RESUME FROM HERE';
branchBtn.style.cssText =
  'display:none;background:#722ed1;color:#fff;border:none;padding:3px 8px;border-radius:4px;font:bold 10px system-ui;cursor:pointer';
branchBtn.onclick = () => {
  sim.resumeFromScrubbed();
  updateScrubberUI();
};
scrubberBar.appendChild(branchBtn);

function updateScrubberUI() {
  if (sim.scrubbedSnapshot) {
    liveBadge.style.background = '#fa8c16';
    liveBadge.style.color = '#fff';
    liveBadge.textContent = '⏪ REPLAY';
    branchBtn.style.display = 'inline-block';
  } else {
    liveBadge.style.background = '#135200';
    liveBadge.style.color = '#52c41a';
    liveBadge.textContent = '● LIVE';
    branchBtn.style.display = 'none';
  }
}

timeSlider.addEventListener('input', () => {
  const t = Number(timeSlider.value);
  sim.scrubTo(t);
  updateScrubberUI();
});

const resetBtn = document.createElement('button');
resetBtn.textContent = '🔄 RESET';
resetBtn.style.cssText =
  'background:#1f1f1f;color:#ff7875;border:1px solid #434343;padding:4px 10px;border-radius:6px;font:bold 11px system-ui;cursor:pointer';
resetBtn.onclick = () => {
  sim.reset();
  inspector.show();
  bookmarks.length = 0;
  renderBookmarks();
  updateScrubberUI();
};
scrubberBar.appendChild(resetBtn);

// ─── Raycast Picking ────────────────────────────────────────────────────────
renderer.domElement.addEventListener('pointerdown', e => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  const selected = world.pick(raycaster, camera, pointer);
  if (selected) {
    const zone = facility.findZone(selected.id);
    selected.metadata.zone = zone?.name ?? 'Facility General';
    const neighbors = facility.neighbors(selected.id);
    selected.metadata.connections = neighbors.length ? neighbors.join(', ') : 'None';
  }
  inspector.show(selected);
});

// ─── Main Render Frame Loop ─────────────────────────────────────────────────
let last = performance.now();
renderTabContent();

function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = (now - last) / 1000;
  last = now;

  if (!isPaused) {
    sim.update(dt);
  }

  const snap = sim.snapshot();
  world.sync(snap);

  // Smooth camera fly-to interpolation
  if (targetCamPos && targetLookAt) {
    camera.position.lerp(targetCamPos, 0.08);
    controls.target.lerp(targetLookAt, 0.08);
    if (camera.position.distanceTo(targetCamPos) < 0.2) {
      targetCamPos = null;
      targetLookAt = null;
    }
  }

  // Update time scrubber slider
  if (!sim.scrubbedSnapshot) {
    timeSlider.max = String(Math.max(30, snap.time + 5));
    timeSlider.value = String(snap.time);
    timeDisplay.textContent = `${snap.time.toFixed(1)}s`;
  } else {
    timeDisplay.textContent = `${snap.time.toFixed(1)}s`;
  }

  // Asset telemetry counts
  const tanks = snap.twins.filter(t => t.kind === 'tank');
  const pipes = snap.twins.filter(t => t.kind === 'pipe');
  const valves = snap.twins.filter(t => t.kind === 'valve');
  const pumps = snap.twins.filter(t => t.kind === 'pump');
  const workers = snap.twins.filter(t => t.kind === 'worker');
  const suppressions = snap.twins.filter(t => t.kind === 'suppression');
  const flares = snap.twins.filter(t => t.kind === 'flare');
  const fires = snap.twins.filter(t => t.kind === 'fire' && t.active);
  const releases = snap.twins.filter(t => t.kind === 'release' && t.active);
  const blasts = snap.twins.filter(t => t.kind === 'blast' && t.active);

  // Derive domino cascade stage and status
  const failedAssets = snap.twins.filter(t => t.integrity <= 0.1 || t.metadata?.failed || t.metadata?.ruptured);
  const bleveCount = snap.twins.filter(t => t.kind === 'blast').length;

  let cascadeStage = '🟢 NORMAL OPERATION';
  let cascadeColor = '#52c41a';
  if (releases.length > 0 && fires.length === 0) {
    cascadeStage = '🟡 VAPOUR CLOUD RELEASE';
    cascadeColor = '#faad14';
  }
  if (fires.length === 1) {
    cascadeStage = '🟠 JET / POOL FIRE';
    cascadeColor = '#fa8c16';
  }
  if (fires.length >= 2 || failedAssets.length >= 2) {
    cascadeStage = '🔴 MULTI-FIRE CASCADE';
    cascadeColor = '#f5222d';
  }
  if (bleveCount > 0) {
    cascadeStage = '🔴 BLEVE — BLAST WAVE ACTIVE';
    cascadeColor = '#ff4d4f';
  }
  if (fires.length >= 3 || failedAssets.length >= 4) {
    cascadeStage = '💀 FULL DOMINO — MASS CASUALTY';
    cascadeColor = '#ff0000';
  }

  hud.innerHTML = `
    <div style="font-size:15px;font-weight:bold;color:#40a9ff;margin-bottom:4px">HAZARDLENS DIGITAL TWIN</div>
    <div style="color:#8c8c8c;margin-bottom:2px">SIM TIME: <span style="color:#fff;font-weight:bold">${snap.time.toFixed(1)}s</span> ${
    isPaused ? '<span style="color:#faad14">[PAUSED]</span>' : ''
  } ${sim.scrubbedSnapshot ? '<span style="color:#fa8c16">[REPLAY]</span>' : ''}</div>
    <div style="font:bold 12px system-ui;color:${cascadeColor};margin:6px 0;padding:4px 6px;background:${cascadeColor}22;border-radius:4px;border-left:3px solid ${cascadeColor}">${cascadeStage}</div>
    <div style="height:1px;background:#1e3144;margin:6px 0"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px">
      <div>📦 Tanks: <b>${tanks.length}</b></div>
      <div>🚰 Pipes: <b>${pipes.length}</b></div>
      <div>🔒 Valves: <b>${valves.length}</b></div>
      <div>⚙️ Pumps: <b>${pumps.length}</b></div>
      <div>🌊 Deluge: <b>${suppressions.length}</b></div>
      <div>🔥 Flares: <b>${flares.length}</b></div>
      <div>👷 Crew: <b>${workers.length}</b></div>
      <div>🧱 Walls: <b>${snap.twins.filter(t => t.kind === 'wall').length}</b></div>
    </div>
    <div style="height:1px;background:#1e3144;margin:6px 0"></div>
    <div style="font-size:12px;display:grid;grid-template-columns:1fr 1fr;gap:3px">
      <div style="color:${fires.length ? '#ff4d4f' : '#52c41a'}">🔥 Fires: <b>${fires.length}</b></div>
      <div style="color:${releases.length ? '#ffa940' : '#52c41a'}">💨 Clouds: <b>${releases.length}</b></div>
      <div style="color:${bleveCount ? '#ff4d4f' : '#8c8c8c'}">💥 Blasts: <b>${bleveCount}</b></div>
      <div style="color:${failedAssets.length ? '#f5222d' : '#8c8c8c'}">⚠️ Failed: <b>${failedAssets.length}</b></div>
    </div>
  `;

  controls.update();
  renderer.render(scene, camera);
}

requestAnimationFrame(frame);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
