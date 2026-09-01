# HazardLens

**HazardLens** is an emergent industrial-disaster digital-twin platform for **DER-02: Threat-Zone Estimation & Counterfactual Decision Support for Industrial Fire and Explosion Response**.

The core idea is fundamentally different from a scripted animation: HazardLens models the **fundamental physics of industrial disasters**. Tanks, pipes, valves, pumps, deluge monitors, flare stacks, structures, weather, workers, and dynamic hazard fields are represented as independent digital twins communicating across an event fabric.

---

## 🏛️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             HAZARDLENS PLATFORM                             │
├───────────────────────────────┬─────────────────────────────────────────────┤
│ 1. Event-Driven Twin Bus      │ 2. Process Safety Physics Models            │
│ • Zero hardcoded scripts      │ • API RP 521 Radiant Thermal Radiation      │
│ • Deterministic state delta   │ • Sadovsky Peak Overpressure Blast Waves    │
│ • Event cascade guard limits  │ • BLEVE Boiling Liquid Explosions           │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ 3. Counterfactual Engine      │ 4. Cyber-Industrial 3D Visualizer           │
│ • Side-by-side branch forks   │ • Dynamic Point-Light Fire & Shockwaves     │
│ • Loss-Avoided ROI ($M USD)   │ • Swirling Deluge Water Mist FX             │
│ • VCR Time-Scrubber Replay    │ • ERPG/ALOHA Threat Zone Heatmap Rings      │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

---

## 🔬 Core Physics & Domino Consequence Equations

1. **Thermal Radiation Field (API RP 521 / SFPE)**:
   $$q(r) = \min\left(80, \frac{I_{\text{fire}} \cdot 120}{r^2}\right) \quad [\text{kW/m}^2]$$
2. **ERPG / ALOHA Threat Zone Perimeters**:
   - **Hot Zone (Lethal in 10s)**: $q \ge 10\text{ kW/m}^2 \implies r_{\text{hot}} = \sqrt{\frac{120 \cdot I}{10}}$
   - **Warm Zone (2nd Degree Burn in 60s)**: $q \ge 5\text{ kW/m}^2 \implies r_{\text{warm}} = \sqrt{\frac{120 \cdot I}{5}}$
   - **Cold Zone (Public Safety Boundary)**: $q \ge 1.6\text{ kW/m}^2 \implies r_{\text{cold}} = \sqrt{\frac{120 \cdot I}{1.6}}$
3. **Sadovsky Overpressure Formulation (Shockwaves & BLEVE)**:
   $$Z = \frac{r}{\sqrt[3]{W_{\text{TNT}}}}, \quad \Delta P(Z) = \frac{100}{Z} + \frac{400}{Z^2} \quad [\text{kPa}]$$
4. **Threat-Repulsion Worker Evacuation Navigation**:
   $$\vec{V}_{\text{egress}} = \text{normalize}\left(\vec{V}_{\text{muster}} + \sum_{i} \frac{\vec{p}_{\text{worker}} - \vec{p}_{\text{fire}_i}}{\|\vec{p}_{\text{worker}} - \vec{p}_{\text{fire}_i}\|^2} \cdot \kappa\right)$$

---

## ⚡ Key Features

* **Side-by-Side Counterfactual Decision Engine**: Click **`⚡ FORK & COMPARE INTERVENTION`** to run a 45-second forward simulation comparing *Unmitigated Worst-Case* vs *Active Response* (calculating Direct Loss Avoided in \$M USD, BLEVE prevention, and crew dose reduction).
* **VCR Time-Travel / Replay Slider**: Scrub backward and forward in time across a circular state buffer to inspect disaster progression frame-by-frame.
* **Animated Cyber-Gauges**: Custom SVG temperature thermometer bars, radial integrity progress rings, and topology connection hyperlinks.
* **Active Deluge Mist**: Swirling 3D water deluge spray particles enveloping equipment during automated suppression.
* **16/16 Verified Automated Tests**: Rigorous unit, integration, and contract tests covering all physical twins and counterfactual algorithms.

---

## 🚀 Quickstart

### 1. Install & Test
```bash
npm install
npm test
```

### 2. Start the 3D Interactive Visualizer
```bash
npm run viewer
```
Open the local URL (e.g. `http://localhost:5173`) in any modern web browser.

### 3. Production Build
```bash
npm run build:all
```
