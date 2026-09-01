import type { TwinState } from '../../../src/core/types.js';

export type FocusTwinCallback = (twinId: string) => void;

export class TwinInspector {
  private panel = document.createElement('div');
  private onFocus?: FocusTwinCallback;
  private currentTwinId?: string;

  constructor(onFocus?: FocusTwinCallback) {
    this.onFocus = onFocus;
    this.panel.style.cssText =
      'position:fixed;right:18px;top:18px;width:320px;color:#eef7ff;background:#06101bf2;border:1px solid #1e3144;border-radius:14px;padding:18px;font:13px/1.4 system-ui,monospace;z-index:10;display:none;backdrop-filter:blur(14px);box-shadow:0 12px 36px rgba(0,0,0,0.65);max-height:88vh;overflow-y:auto';
    document.body.appendChild(this.panel);
  }

  setFocusCallback(cb: FocusTwinCallback) {
    this.onFocus = cb;
  }

  show(t?: TwinState) {
    if (!t) {
      this.currentTwinId = undefined;
      this.panel.style.display = 'none';
      return;
    }
    this.currentTwinId = t.id;
    this.panel.style.display = 'block';

    const tempK = t.temperatureK ?? 300;
    const tempC = tempK - 273.15;
    const integrityPct = Math.max(0, Math.min(100, (t.integrity ?? 1) * 100));

    // Temperature bar color
    let tempColor = '#52c41a'; // Green (< 350K)
    if (tempK > 350) tempColor = '#faad14'; // Yellow
    if (tempK > 450) tempColor = '#fa8c16'; // Orange
    if (tempK > 550) tempColor = '#f5222d'; // Red
    const tempFillWidth = Math.min(100, Math.max(0, ((tempK - 280) / 400) * 100));

    // Integrity ring stroke
    let integColor = '#52c41a';
    if (integrityPct < 80) integColor = '#faad14';
    if (integrityPct < 50) integColor = '#fa8c16';
    if (integrityPct < 25) integColor = '#f5222d';
    const strokeDash = (integrityPct / 100) * 175.9; // 2 * PI * 28

    // Status pill
    let statusText = t.active ? 'ACTIVE / ONLINE' : 'INACTIVE / DESTROYED';
    let statusBg = t.active ? '#135200' : '#5c0011';
    let statusColor = t.active ? '#73d13d' : '#ff7875';
    if (t.metadata?.failed) {
      statusText = 'RUPTURED / FAILED';
      statusBg = '#5c0011';
      statusColor = '#ff4d4f';
    }

    // Connections hyperlinks
    const connectionsStr = String(t.metadata?.connections ?? '');
    const connList = connectionsStr && connectionsStr !== 'None' ? connectionsStr.split(',').map(s => s.trim()) : [];

    this.panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div>
          <div style="font-size:18px;font-weight:bold;color:#40a9ff;letter-spacing:0.5px">${t.id}</div>
          <div style="font-size:11px;color:#8c8c8c;text-transform:uppercase">${t.kind} DIGITAL TWIN · FIDELITY F${t.fidelity}</div>
        </div>
        <button id="closeInspectorBtn" style="background:#1f2937;border:1px solid #374151;color:#9ca3af;border-radius:6px;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px">✕</button>
      </div>

      <div style="display:inline-block;padding:3px 8px;border-radius:6px;background:${statusBg};color:${statusColor};font-size:10px;font-weight:bold;margin-bottom:12px;letter-spacing:0.5px">
        ${statusText}
      </div>

      <!-- Real-time Gauges Row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;background:#0d1824;padding:10px;border-radius:8px;border:1px solid #1a2a3a">
        <!-- Integrity Circular Gauge -->
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center">
          <svg width="70" height="70" viewBox="0 0 70 70">
            <circle cx="35" cy="35" r="28" fill="none" stroke="#1f2d3d" stroke-width="6"/>
            <circle cx="35" cy="35" r="28" fill="none" stroke="${integColor}" stroke-width="6"
              stroke-dasharray="175.9" stroke-dashoffset="${175.9 - strokeDash}"
              stroke-linecap="round" transform="rotate(-90 35 35)"/>
            <text x="35" y="39" font-size="12" font-weight="bold" fill="#fff" text-anchor="middle">${integrityPct.toFixed(0)}%</text>
          </svg>
          <div style="font-size:10px;color:#8c8c8c;margin-top:2px">INTEGRITY</div>
        </div>

        <!-- Temperature Gauge -->
        <div style="display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:11px;color:#8c8c8c;margin-bottom:3px">CORE TEMPERATURE</div>
          <div style="font-size:16px;font-weight:bold;color:${tempColor}">${tempK.toFixed(0)} K <span style="font-size:11px;color:#8c8c8c">(${tempC.toFixed(0)}°C)</span></div>
          <div style="width:100%;height:6px;background:#1f2d3d;border-radius:3px;margin-top:6px;overflow:hidden">
            <div style="width:${tempFillWidth}%;height:100%;background:${tempColor};border-radius:3px;transition:width 0.3s"></div>
          </div>
          <div style="font-size:9px;color:#595959;display:flex;justify-content:space-between;margin-top:2px">
            <span>300K</span><span>500K</span><span>700K</span>
          </div>
        </div>
      </div>

      <!-- Facility Zone & Camera Focus -->
      <div style="display:flex;justify-content:space-between;align-items:center;background:#0d1824;padding:8px 10px;border-radius:8px;margin-bottom:12px;border:1px solid #1a2a3a">
        <div>
          <div style="font-size:10px;color:#8c8c8c">LOCATION ZONE</div>
          <div style="font-size:12px;font-weight:bold;color:#e6f7ff">${t.metadata?.zone ?? 'General Yard'}</div>
        </div>
        <button id="focusTwinBtn" style="background:#1890ff;border:none;color:#fff;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:bold;cursor:pointer">🎯 FOCUS</button>
      </div>

      <!-- Topology & Relationship Links -->
      ${
        connList.length
          ? `
        <div style="margin-bottom:12px">
          <div style="font-size:10px;color:#8c8c8c;margin-bottom:4px">CONNECTED TWINS</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${connList
              .map(
                id =>
                  `<button class="connTwinBtn" data-id="${id}" style="background:#1e3144;border:1px solid #2e4760;color:#69c0ff;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer">${id}</button>`
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }

      <!-- Metadata Properties Table -->
      <div style="font-size:11px;font-weight:bold;color:#8c8c8c;margin-bottom:4px;letter-spacing:0.5px">EQUIPMENT PARAMETERS</div>
      <div style="background:#0d1824;border-radius:8px;padding:8px 10px;font-size:11px;border:1px solid #1a2a3a;max-height:160px;overflow-y:auto">
        ${Object.entries(t.metadata ?? {})
          .filter(([k]) => !['zone', 'connections'].includes(k))
          .map(
            ([k, v]) => `
          <div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #162330">
            <span style="color:#8c8c8c">${k}:</span>
            <span style="color:#d9d9d9;font-weight:bold">${typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;

    this.panel.querySelector('#closeInspectorBtn')?.addEventListener('click', () => {
      this.show();
    });

    this.panel.querySelector('#focusTwinBtn')?.addEventListener('click', () => {
      if (this.currentTwinId && this.onFocus) {
        this.onFocus(this.currentTwinId);
      }
    });

    this.panel.querySelectorAll('.connTwinBtn').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id && this.onFocus) {
          this.onFocus(id);
        }
      });
    });
  }
}
