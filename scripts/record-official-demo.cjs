const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const RECORDINGS_DIR = path.join(__dirname, '..', 'client', 'public', 'recordings');
const FINAL_VIDEO_PATH = path.join(RECORDINGS_DIR, 'the-royal-knot-official-demo.webm');

if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

// Clean up any previous temp recording files
const oldFiles = fs.readdirSync(RECORDINGS_DIR);
for (const file of oldFiles) {
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
      bottom: 32px;
      left: 32px;
      z-index: 999999;
      width: 520px;
      background: rgba(15, 10, 9, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(232, 185, 120, 0.45);
      border-left: 6px solid #E8B978;
      border-radius: 16px;
      padding: 20px 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(232, 185, 120, 0.18);
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
        <span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(232, 185, 120, 0.2); border: 1px solid rgba(232, 185, 120, 0.45); color: #E8B978; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; padding: 3px 10px; border-radius: 999px;">
          <span>◈</span> ${badge}
        </span>
        <span style="font-size: 11px; color: #CDBB9C; letter-spacing: 0.08em; font-weight: 600;">
          CHAPTER ${current} / ${total} &bull; ${chapter}
        </span>
      </div>
      <h3 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 23px; color: #FFF; margin: 0 0 6px 0; font-weight: 600; line-height: 1.25;">
        ${title}
      </h3>
      <p style="font-size: 12.5px; color: #CDBB9C; line-height: 1.45; margin: 0 0 10px 0; font-weight: 400;">
        ${description}
      </p>
      <div style="display: flex; align-items: center; gap: 8px; padding-top: 10px; border-top: 1px solid rgba(232, 185, 120, 0.2); font-size: 11.5px; color: #E8B978; font-weight: 600;">
        <span style="font-size: 15px;">✓</span>
        <span>Jury Insight: ${highlight}</span>
      </div>
    `;

    document.body.appendChild(hud);
  }, { badge, title, description, highlight, chapter, current, total });
}

async function showCursorClick(page, x, y) {
  await page.evaluate(({ x, y }) => {
    const ring = document.createElement('div');
    ring.style.cssText = `
      position: fixed;
      left: ${x - 20}px;
      top: ${y - 20}px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 3px solid #E8B978;
      background: rgba(232, 185, 120, 0.35);
      z-index: 1000000;
      pointer-events: none;
      animation: rkRipple 0.5s ease-out forwards;
    `;
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes rkRipple {
        0% { transform: scale(0.3); opacity: 1; }
        100% { transform: scale(1.6); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(ring);
    setTimeout(() => { ring.remove(); style.remove(); }, 600);
  }, { x, y });
}

async function main() {
  console.log('Starting The Royal Knot Official Demo Video Recording Studio...');

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
  console.log('Scene 1: Luxury Landing Page & Storytelling Scroll Animation...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await injectHud(page, {
    badge: 'LUXURY BRANDING & ARCHITECTURE',
    current: 1,
    total: 8,
    chapter: 'Storytelling Landing',
    title: 'The Royal Knot — Sovereign Wedding Operations',
    description: 'Bespoke event planning operations designed for royal destination celebrations in the heritage palaces of Jaipur, Udaipur, and Jodhpur.',
    highlight: 'Full-Stack TypeScript Architecture with Dual SQLite & Postgres Parity'
  });
  await page.waitForTimeout(2000);

  // Smooth scroll down the page to trigger cascading rose petals & palace illumination
  const scrollSteps = 45;
  for (let i = 1; i <= scrollSteps; i++) {
    await page.evaluate((fraction) => {
      window.scrollTo(0, document.body.scrollHeight * fraction);
    }, i / scrollSteps);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(1200);

  // Reveal Sign In box and authenticate as Lead Planner
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    console.log('Entering Lead Planner corporate credentials...');
    await page.click('input[type="email"]');
    await page.fill('input[type="email"]', '');
    await page.type('input[type="email"]', 'lead.planner@royalknot.in', { delay: 40 });
    await page.waitForTimeout(300);

    await page.click('input[type="password"]');
    await page.fill('input[type="password"]', '');
    await page.type('input[type="password"]', 'RoyalKnot#2026', { delay: 40 });
    await page.waitForTimeout(400);

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2200);
  }

  // -------------------------------------------------------------
  // SCENE 2: UNIFIED OPERATIONS COCKPIT & 8 PRIMARY KPIS
  // -------------------------------------------------------------
  console.log('Scene 2: Operations Command Cockpit & 8 KPIs...');
  await injectHud(page, {
    badge: 'EXECUTIVE OVERVIEW',
    current: 2,
    total: 8,
    chapter: 'Unified Command Center',
    title: 'Operational Cockpit & Relational KPIs',
    description: 'Real-time overview of 37 active luxury weddings, 109 verified service vendors, client billing ledgers, and zero unaddressed day-of incidents.',
    highlight: 'Strict RBAC Enforcement & Zero-Downtime Database Synchronisation'
  });
  await page.waitForTimeout(3000);

  // -------------------------------------------------------------
  // SCENE 3: FEATURE 1 — WEDDING READINESS & RISK RADAR COCKPIT
  // -------------------------------------------------------------
  console.log('Scene 3: Feature 1 — Wedding Readiness & Risk Radar Cockpit...');
  await page.evaluate(() => {
    const el = document.getElementById('readiness-radar-anchor');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await page.waitForTimeout(800);

  await injectHud(page, {
    badge: 'SPECIAL FEATURE 01 OF 05',
    current: 3,
    total: 8,
    chapter: 'Readiness Radar',
    title: 'Wedding Readiness & Risk Radar Cockpit',
    description: 'Algorithmic 4-pillar audit scoring (0–100) combining task execution, vendor punctuality, day-of timeline integrity, and incident containment.',
    highlight: 'Automated Risk Interventions & Punctuality Scoring Before Arrival'
  });
  await page.waitForTimeout(3500);

  // -------------------------------------------------------------
  // SCENE 4: FEATURE 2 — MULTI-SCENARIO BUDGET SIMULATOR
  // -------------------------------------------------------------
  console.log('Scene 4: Feature 2 — Multi-Scenario Budget & Guest Count Simulator...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const simBtn = buttons.find(b => b.textContent.includes('Budget Simulator') || b.textContent.includes('Multi-Scenario'));
    if (simBtn) simBtn.click();
  });
  await page.waitForTimeout(1000);

  await injectHud(page, {
    badge: 'SPECIAL FEATURE 02 OF 05',
    current: 4,
    total: 8,
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
  await page.waitForTimeout(1800);

  // Toggle Luxury Tier to Imperial Grandeur
  await page.evaluate(() => {
    const tierButtons = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const imperialTier = tierButtons.find(b => b.textContent.includes('Imperial') || b.textContent.includes('Grandeur'));
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
  // SCENE 5: FEATURE 3 — PUBLIC GUEST CONCIERGE QR PORTAL
  // -------------------------------------------------------------
  console.log('Scene 5: Feature 3 — Public Guest Concierge QR Portal...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const portalBtn = buttons.find(b => b.textContent.includes('Guest Portal') || b.textContent.includes('Concierge'));
    if (portalBtn) portalBtn.click();
  });
  await page.waitForTimeout(1200);

  await injectHud(page, {
    badge: 'SPECIAL FEATURE 03 OF 05',
    current: 5,
    total: 8,
    chapter: 'Guest Experience',
    title: 'Public Guest Concierge & QR Portal',
    description: 'Isolated guest celebration itinerary with direct Google Maps navigation, multi-day schedules, and instant household RSVP registration.',
    highlight: 'Rate-Limited Public Gateway with Instant Database Synchronisation'
  });
  await page.waitForTimeout(1800);

  // Scroll down through itinerary
  for (let s = 1; s <= 10; s++) {
    await page.evaluate((step) => {
      const scrollable = document.querySelector('div[style*="overflow-y: auto"], div[style*="overflowY: auto"]') || window;
      scrollable.scrollBy(0, 150);
    }, s);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(1500);

  // Fill Household RSVP form
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const nameInput = inputs.find(i => i.placeholder && i.placeholder.includes('Vikramaditya'));
    if (nameInput) {
      nameInput.value = 'Maharaja Gaj Singh & Family';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForTimeout(1200);

  // Return to operations system
  await page.evaluate(() => {
    const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Back to Planner') || b.textContent.includes('Back'));
    if (backBtn) backBtn.click();
  });
  await page.waitForTimeout(800);

  // -------------------------------------------------------------
  // SCENE 6: FEATURE 4 — CONTINGENCY & EMERGENCY BACKUP PROTOCOLS
  // -------------------------------------------------------------
  console.log('Scene 6: Feature 4 — Contingency & Backup Protocols...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const contBtn = buttons.find(b => b.textContent.includes('Contingency') || b.textContent.includes('Backup'));
    if (contBtn) contBtn.click();
  });
  await page.waitForTimeout(1200);

  await injectHud(page, {
    badge: 'SPECIAL FEATURE 04 OF 05',
    current: 6,
    total: 8,
    chapter: 'Day-of Operations Safety',
    title: 'Contingency & Emergency Backup Protocols',
    description: 'Disaster recovery architecture with standby DG generator power, certified backup venues, incident commanders, and single-click schedule relocation.',
    highlight: 'Single-Click Disaster Recovery Relocating Schedules & Filing Incidents'
  });
  await page.waitForTimeout(3000);

  // Switch to Create Protocol tab
  await page.evaluate(() => {
    const createBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Create Contingency'));
    if (createBtn) createBtn.click();
  });
  await page.waitForTimeout(1800);

  // Switch back to List and close modal
  await page.evaluate(() => {
    const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Standby Protocols'));
    if (listBtn) listBtn.click();
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('✕') || b.textContent.includes('Close'));
    if (closeBtn) closeBtn.click();
  });
  await page.waitForTimeout(600);

  // -------------------------------------------------------------
  // SCENE 7: FEATURE 5 — VENDOR RELIABILITY & RISK INTELLIGENCE
  // -------------------------------------------------------------
  console.log('Scene 7: Feature 5 — Vendor Reliability Intelligence...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const venTab = buttons.find(b => b.textContent.trim() === 'Vendors' || b.textContent.includes('Vendor Directory'));
    if (venTab) venTab.click();
  });
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    const relBtns = Array.from(document.querySelectorAll('button, div, span'));
    const relBtn = relBtns.find(b => b.textContent.includes('Reliability') || b.textContent.includes('Risk Index') || b.textContent.includes('Inspect Reliability'));
    if (relBtn) relBtn.click();
  });
  await page.waitForTimeout(1200);

  await injectHud(page, {
    badge: 'SPECIAL FEATURE 05 OF 05',
    current: 7,
    total: 8,
    chapter: 'Procurement Intelligence',
    title: 'Vendor Reliability & Risk Intelligence',
    description: 'Algorithmic partner evaluation tracking historical dispute frequencies, on-time arrivals, reliability tiers, and active contracts before booking.',
    highlight: 'Pre-Contract Dispute Prevention & Audit Trail Scoring'
  });
  await page.waitForTimeout(3500);

  // Close reliability modal
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('✕') || b.textContent.includes('Close'));
    if (closeBtn) closeBtn.click();
  });
  await page.waitForTimeout(600);

  // -------------------------------------------------------------
  // SCENE 8: AUDITABLE DEMO DATA EXPLORER & FINALE
  // -------------------------------------------------------------
  console.log('Scene 8: Auditable Demo Data Explorer & Conclusion...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const expTab = buttons.find(b => b.textContent.includes('Data Explorer') || b.textContent.includes('Database Engine'));
    if (expTab) expTab.click();
  });
  await page.waitForTimeout(1200);

  await injectHud(page, {
    badge: 'SYSTEM INTEGRITY & CONCLUSION',
    current: 8,
    total: 8,
    chapter: 'Database Depth',
    title: 'Auditable Demo Data Explorer — 650+ Records',
    description: 'Safe, read-only verification of 14 relational tables with zero raw database exposure. Proves operational depth across couples, weddings, and finances.',
    highlight: 'Enterprise Ready • Zero Data Resets • Built for Royal Celebrations'
  });
  await page.waitForTimeout(4000);

  console.log('Walkthrough sequence complete. Closing video recording context...');
  await page.close();
  await context.close();
  await browser.close();

  // Find the generated webm file and rename to the standard official filename
  const files = fs.readdirSync(RECORDINGS_DIR);
  const recordedWebm = files.find(f => f.endsWith('.webm') && f !== 'the-royal-knot-official-demo.webm');
  if (recordedWebm) {
    const srcPath = path.join(RECORDINGS_DIR, recordedWebm);
    fs.renameSync(srcPath, FINAL_VIDEO_PATH);
    console.log('Video finalized at:', FINAL_VIDEO_PATH);
  } else {
    console.log('Recorded video ready at:', FINAL_VIDEO_PATH);
  }

  // Copy video to Artifact Directory as well
  const artifactVideoPath = 'C:\\Users\\bhupa\\.gemini\\antigravity\\brain\\f3260598-34fd-4bbb-bc4f-67c21c60f0ed\\the-royal-knot-official-demo.webm';
  fs.copyFileSync(FINAL_VIDEO_PATH, artifactVideoPath);
  console.log('Copied video to artifacts:', artifactVideoPath);
}

main().catch(err => {
  console.error('Fatal recording error:', err);
  process.exit(1);
});
