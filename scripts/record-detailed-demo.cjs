const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const RECORDINGS_DIR = path.join(__dirname, '..', 'client', 'public', 'recordings');
const FINAL_VIDEO_PATH = path.join(RECORDINGS_DIR, 'the-royal-knot-official-demo.webm');

if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

// Clean up any old recording files
for (const file of fs.readdirSync(RECORDINGS_DIR)) {
  if (file.endsWith('.webm') || file.endsWith('.mp4')) {
    try { fs.unlinkSync(path.join(RECORDINGS_DIR, file)); } catch (e) {}
  }
}

async function injectHud(page, { badge, title, description, highlight, chapter, current, total }) {
  await page.evaluate(({ badge, title, description, highlight, chapter, current, total }) => {
    let existing = document.getElementById('demo-jury-hud');
    if (existing) existing.remove();

    const hud = document.createElement('div');
    hud.id = 'demo-jury-hud';
    hud.style.cssText = `
      position: fixed;
      bottom: 28px;
      left: 28px;
      z-index: 999999;
      width: 530px;
      background: rgba(15, 10, 9, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(232, 185, 120, 0.45);
      border-left: 6px solid #E8B978;
      border-radius: 16px;
      padding: 18px 22px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65), 0 0 30px rgba(232, 185, 120, 0.2);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #F5EBDD;
      animation: rkHudSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    `;

    hud.innerHTML = `
      <style>
        @keyframes rkHudSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      </style>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(232, 185, 120, 0.2); border: 1px solid rgba(232, 185, 120, 0.45); color: #E8B978; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; padding: 3px 10px; border-radius: 999px;">
          <span>◈</span> ${badge}
        </span>
        <span style="font-size: 11px; color: #CDBB9C; letter-spacing: 0.08em; font-weight: 600;">
          CHAPTER ${current} / ${total} &bull; ${chapter}
        </span>
      </div>
      <h3 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 22px; color: #FFF; margin: 0 0 6px 0; font-weight: 600; line-height: 1.25;">
        ${title}
      </h3>
      <p style="font-size: 12px; color: #CDBB9C; line-height: 1.45; margin: 0 0 8px 0; font-weight: 400;">
        ${description}
      </p>
      <div style="display: flex; align-items: center; gap: 8px; padding-top: 8px; border-top: 1px solid rgba(232, 185, 120, 0.2); font-size: 11px; color: #E8B978; font-weight: 600;">
        <span style="font-size: 14px;">✓</span>
        <span>Jury Insight: ${highlight}</span>
      </div>
    `;

    document.body.appendChild(hud);
  }, { badge, title, description, highlight, chapter, current, total });
}

async function main() {
  console.log('Starting Detailed Royal Knot Video Recording Studio (10 Scenes)...');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: RECORDINGS_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  // -------------------------------------------------------------
  // SCENE 1: LUXURY LANDING PAGE & STORYTELLING SCROLL ANIMATION
  // -------------------------------------------------------------
  console.log('Scene 1: Storytelling Scroll & Landing Page Animation...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await injectHud(page, {
    badge: 'LUXURY BRANDING & ARCHITECTURE',
    current: 1,
    total: 10,
    chapter: 'Storytelling Landing',
    title: 'The Royal Knot — Sovereign Wedding Operations',
    description: 'Bespoke event planning operations designed for royal destination celebrations in the heritage palaces of Jaipur, Udaipur, and Jodhpur.',
    highlight: 'Full-Stack TypeScript Architecture with Dual SQLite & Postgres Parity'
  });
  await page.waitForTimeout(1800);

  // Smooth scroll down the page to trigger cascading rose petals & palace illumination
  const scrollSteps = 40;
  for (let i = 1; i <= scrollSteps; i++) {
    await page.evaluate((fraction) => {
      window.scrollTo(0, document.body.scrollHeight * fraction);
    }, i / scrollSteps);
    await page.waitForTimeout(70);
  }
  await page.waitForTimeout(1000);

  // Authenticate as Lead Planner
  await page.evaluate(async () => {
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: 'lead.planner@royalknot.in', password: 'RoyalKnot#2026' })
    });
  });
  await page.waitForTimeout(400);

  // -------------------------------------------------------------
  // SCENE 2: UNIFIED OPERATIONS COCKPIT & 8 PRIMARY KPIS
  // -------------------------------------------------------------
  console.log('Scene 2: Operations Command Cockpit & 8 KPIs...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await injectHud(page, {
    badge: 'EXECUTIVE OVERVIEW',
    current: 2,
    total: 10,
    chapter: 'Unified Command Center',
    title: 'Operational Cockpit & Relational KPIs',
    description: 'Real-time overview of 37 active luxury weddings, 109 verified service vendors, client billing ledgers, and zero unaddressed day-of incidents.',
    highlight: 'Strict RBAC Enforcement & Zero-Downtime Database Synchronisation'
  });
  await page.waitForTimeout(2800);

  // -------------------------------------------------------------
  // SCENE 3: ADMIN WORKFLOW — WEDDING CREATION & 15-TASK ROADMAP
  // -------------------------------------------------------------
  console.log('Scene 3: Admin & Planning — 15-Stage Task Roadmap Pipeline...');
  await page.evaluate(() => {
    const navButtons = Array.from(document.querySelectorAll('button, a'));
    const wedTab = navButtons.find(b => b.innerText.includes('Weddings & Tasks') || b.innerText.includes('Weddings'));
    if (wedTab) wedTab.click();
  });
  await page.waitForTimeout(1200);

  await injectHud(page, {
    badge: 'ADMIN & PLANNING ENGINE',
    current: 3,
    total: 10,
    chapter: 'Lifecycle Pipeline',
    title: '15-Stage Automated Planning Roadmap',
    description: 'When an admin onboards a wedding, the system automatically provisions 15 critical milestones across Venue Design, Vendors, Logistics, and Execution.',
    highlight: 'Automated 15-Task Milestone Provisioning with Staff Role Assignment'
  });
  await page.waitForTimeout(2000);

  // Open "Onboard Wedding Project" creation modal to show admin form
  await page.evaluate(() => {
    const createBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Onboard Wedding') || b.innerText.includes('Create Wedding') || b.innerText.includes('+ Confirm'));
    if (createBtn) createBtn.click();
  });
  await page.waitForTimeout(1800);

  // Close creation modal
  await page.evaluate(() => {
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cancel') || b.innerText.includes('✕'));
    if (cancelBtn) cancelBtn.click();
  });
  await page.waitForTimeout(600);

  // -------------------------------------------------------------
  // SCENE 4: CRM ENQUIRIES & COUPLE DOSSIERS
  // -------------------------------------------------------------
  console.log('Scene 4: CRM Enquiries & Couple Dossiers...');
  await page.evaluate(() => {
    const navButtons = Array.from(document.querySelectorAll('button, a'));
    const crmTab = navButtons.find(b => b.innerText.includes('CRM Enquiries') || b.innerText.includes('Enquiries'));
    if (crmTab) crmTab.click();
  });
  await page.waitForTimeout(1200);

  await injectHud(page, {
    badge: 'CRM & CLIENT INTAKE',
    current: 4,
    total: 10,
    chapter: 'Client Management',
    title: 'CRM Enquiries & Couple Dossiers',
    description: 'High-net-worth client intake from inquiry to contract. Features safe fallback identity resolution, digital service agreements, and proposal tracking.',
    highlight: 'Zero Data Leaks & Strict Identity Verification Before Contracting'
  });
  await page.waitForTimeout(2500);

  // Return to Dashboard
  await page.evaluate(() => {
    const navButtons = Array.from(document.querySelectorAll('button, a'));
    const dashTab = navButtons.find(b => b.innerText.includes('Dashboard') || b.innerText.includes('Cockpit'));
    if (dashTab) dashTab.click();
  });
  await page.waitForTimeout(1000);

  // -------------------------------------------------------------
  // SCENE 5: FEATURE 1 — WEDDING READINESS & RISK RADAR COCKPIT
  // -------------------------------------------------------------
  console.log('Scene 5: Feature 1 — Wedding Readiness & Risk Radar Cockpit...');
  await page.evaluate(() => {
    const el = document.getElementById('readiness-radar-anchor');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await page.waitForTimeout(800);

  await injectHud(page, {
    badge: 'SPECIAL FEATURE 01 OF 05',
    current: 5,
    total: 10,
    chapter: 'Readiness Radar',
    title: 'Wedding Readiness & Risk Radar Cockpit',
    description: 'Algorithmic 4-pillar audit scoring (0–100) combining task execution, vendor punctuality, day-of timeline integrity, and incident containment.',
    highlight: 'Automated Risk Interventions & Punctuality Scoring Before Arrival'
  });
  await page.waitForTimeout(3000);

  // -------------------------------------------------------------
  // SCENE 6: FEATURE 2 — MULTI-SCENARIO BUDGET SIMULATOR
  // -------------------------------------------------------------
  console.log('Scene 6: Feature 2 — Multi-Scenario Budget & Guest Count Simulator...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const simBtn = buttons.find(b => b.innerText.includes('Budget Simulator'));
    if (simBtn) simBtn.click();
  });
  await page.waitForTimeout(1000);

  await injectHud(page, {
    badge: 'SPECIAL FEATURE 02 OF 05',
    current: 6,
    total: 10,
    chapter: 'Financial Sensitivity Modeling',
    title: 'Multi-Scenario Budget & Guest Count Simulator',
    description: 'Dynamic financial modeling scaling guest counts from 100 to 1,200 across 4 luxury tiers with live profit margin curve protection.',
    highlight: 'Real-Time Margin Protection Curves & Instant Proposal Generation'
  });
  await page.waitForTimeout(1500);

  // Drag guest count slider from 400 to 650
  await page.evaluate(() => {
    const slider = document.querySelector('input[type="range"]');
    if (slider) {
      slider.value = '650';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await page.waitForTimeout(1600);

  // Toggle Luxury Tier to Imperial Grandeur
  await page.evaluate(() => {
    const tierButtons = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const imperialTier = tierButtons.find(b => b.innerText.includes('Imperial') || b.innerText.includes('Grandeur'));
    if (imperialTier) imperialTier.click();
  });
  await page.waitForTimeout(2000);

  // Close simulator
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[aria-label="Close"], button.close, div[style*="position: fixed"] button');
    if (closeBtn) closeBtn.click();
  });
  await page.waitForTimeout(600);

  // -------------------------------------------------------------
  // SCENE 7: FEATURE 3 — PUBLIC GUEST CONCIERGE QR PORTAL (VERIFIED)
  // -------------------------------------------------------------
  console.log('Scene 7: Feature 3 — Public Guest Concierge QR Portal...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const portalBtn = buttons.find(b => b.innerText.includes('Guest Concierge Portal'));
    if (portalBtn) portalBtn.click();
  });
  await page.waitForTimeout(1500);

  await injectHud(page, {
    badge: 'SPECIAL FEATURE 03 OF 05',
    current: 7,
    total: 10,
    chapter: 'Guest Experience',
    title: 'Public Guest Concierge & QR Portal',
    description: 'Isolated guest celebration itinerary with direct Google Maps navigation, multi-day schedules, and instant household RSVP registration.',
    highlight: 'Rate-Limited Public Gateway with Instant Database Synchronisation'
  });
  await page.waitForTimeout(2000);

  // Scroll down through itinerary
  for (let s = 1; s <= 12; s++) {
    await page.evaluate(() => {
      const scrollable = document.querySelector('div[style*="overflow-y: auto"], div[style*="overflowY: auto"]') || window;
      scrollable.scrollBy(0, 160);
    });
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(1500);

  // Fill Household RSVP form with guest name
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const nameInput = inputs.find(i => i.placeholder && i.placeholder.includes('Vikramaditya'));
    if (nameInput) {
      nameInput.value = 'Maharaja Gaj Singh & Family';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForTimeout(1400);

  // Return to operations system
  await page.evaluate(() => {
    const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Back to Planner') || b.innerText.includes('Back'));
    if (backBtn) backBtn.click();
  });
  await page.waitForTimeout(800);

  // -------------------------------------------------------------
  // SCENE 8: FEATURE 4 — CONTINGENCY & EMERGENCY BACKUP PROTOCOLS
  // -------------------------------------------------------------
  console.log('Scene 8: Feature 4 — Contingency & Backup Protocols...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const contBtn = buttons.find(b => b.innerText.includes('Contingency Protocols'));
    if (contBtn) contBtn.click();
  });
  await page.waitForTimeout(1200);

  await injectHud(page, {
    badge: 'SPECIAL FEATURE 04 OF 05',
    current: 8,
    total: 10,
    chapter: 'Day-of Operations Safety',
    title: 'Contingency & Emergency Backup Protocols',
    description: 'Disaster recovery architecture with standby DG generator power, certified backup venues, incident commanders, and single-click schedule relocation.',
    highlight: 'Single-Click Disaster Recovery Relocating Schedules & Filing Incidents'
  });
  await page.waitForTimeout(2800);

  // Switch to Create Protocol tab
  await page.evaluate(() => {
    const createBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Create Contingency'));
    if (createBtn) createBtn.click();
  });
  await page.waitForTimeout(1800);

  // Switch back to List and close modal
  await page.evaluate(() => {
    const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Standby Protocols'));
    if (listBtn) listBtn.click();
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('✕') || b.innerText.includes('Close'));
    if (closeBtn) closeBtn.click();
  });
  await page.waitForTimeout(600);

  // -------------------------------------------------------------
  // SCENE 9: FEATURE 5 — VENDOR RELIABILITY & RISK INTELLIGENCE
  // -------------------------------------------------------------
  console.log('Scene 9: Feature 5 — Vendor Reliability Intelligence...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const venTab = buttons.find(b => b.innerText.trim() === 'Vendors' || b.innerText.includes('Vendor Directory'));
    if (venTab) venTab.click();
  });
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    const relBtns = Array.from(document.querySelectorAll('button, div, span'));
    const relBtn = relBtns.find(b => b.innerText.includes('Reliability') || b.innerText.includes('Risk Index') || b.innerText.includes('Inspect Reliability'));
    if (relBtn) relBtn.click();
  });
  await page.waitForTimeout(1200);

  await injectHud(page, {
    badge: 'SPECIAL FEATURE 05 OF 05',
    current: 9,
    total: 10,
    chapter: 'Procurement Intelligence',
    title: 'Vendor Reliability & Risk Intelligence',
    description: 'Algorithmic partner evaluation tracking historical dispute frequencies, on-time arrivals, reliability tiers, and active contracts before booking.',
    highlight: 'Pre-Contract Dispute Prevention & Audit Trail Scoring'
  });
  await page.waitForTimeout(3000);

  // Close reliability modal
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('✕') || b.innerText.includes('Close'));
    if (closeBtn) closeBtn.click();
  });
  await page.waitForTimeout(600);

  // -------------------------------------------------------------
  // SCENE 10: AUDITABLE DEMO DATA EXPLORER & FINALE
  // -------------------------------------------------------------
  console.log('Scene 10: Auditable Demo Data Explorer & Conclusion...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const expTab = buttons.find(b => b.innerText.includes('Data Explorer') || b.innerText.includes('Database Engine'));
    if (expTab) expTab.click();
  });
  await page.waitForTimeout(1200);

  await injectHud(page, {
    badge: 'SYSTEM INTEGRITY & CONCLUSION',
    current: 10,
    total: 10,
    chapter: 'Database Depth',
    title: 'Auditable Demo Data Explorer — 650+ Records',
    description: 'Safe, read-only verification of 14 relational tables with zero raw database exposure. Proves operational depth across couples, weddings, and finances.',
    highlight: 'Enterprise Ready • Zero Data Resets • Built for Royal Celebrations'
  });
  await page.waitForTimeout(3500);

  console.log('Recording sequence complete. Finalizing video...');
  await page.close();
  await context.close();
  await browser.close();

  // Rename recorded file to official name
  const files = fs.readdirSync(RECORDINGS_DIR);
  const recordedWebm = files.find(f => f.endsWith('.webm') && f !== 'the-royal-knot-official-demo.webm');
  if (recordedWebm) {
    const srcPath = path.join(RECORDINGS_DIR, recordedWebm);
    fs.renameSync(srcPath, FINAL_VIDEO_PATH);
    console.log('Video finalized at:', FINAL_VIDEO_PATH);
  } else {
    console.log('Recorded video ready at:', FINAL_VIDEO_PATH);
  }

  // Copy video to Artifact Directory
  const artifactVideoPath = 'C:\\Users\\bhupa\\.gemini\\antigravity\\brain\\f3260598-34fd-4bbb-bc4f-67c21c60f0ed\\the-royal-knot-official-demo.webm';
  fs.copyFileSync(FINAL_VIDEO_PATH, artifactVideoPath);
  console.log('Copied video to artifacts:', artifactVideoPath);
}

main().catch(err => {
  console.error('Fatal recording error:', err);
  process.exit(1);
});
