const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\bhupa\\.gemini\\antigravity\\brain\\f3260598-34fd-4bbb-bc4f-67c21c60f0ed';

async function injectHud(page, { badge, title, description, highlight, chapter }) {
  await page.evaluate(({ badge, title, description, highlight, chapter }) => {
    let existing = document.getElementById('demo-jury-hud');
    if (existing) existing.remove();

    const hud = document.createElement('div');
    hud.id = 'demo-jury-hud';
    hud.style.cssText = `
      position: fixed;
      bottom: 28px;
      left: 28px;
      z-index: 999999;
      width: 480px;
      background: rgba(15, 10, 9, 0.94);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(232, 185, 120, 0.45);
      border-left: 5px solid #E8B978;
      border-radius: 14px;
      padding: 18px 22px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45), 0 0 20px rgba(232, 185, 120, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #F5EBDD;
      animation: rkFadeIn 0.3s ease-out;
    `;

    hud.innerHTML = `
      <style>
        @keyframes rkFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="display: inline-block; background: rgba(232, 185, 120, 0.18); border: 1px solid rgba(232, 185, 120, 0.4); color: #E8B978; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; padding: 3px 10px; border-radius: 999px;">
          ${badge}
        </span>
        <span style="font-size: 11px; color: #CDBB9C; letter-spacing: 0.05em; font-weight: 500;">
          ${chapter}
        </span>
      </div>
      <h3 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 22px; color: #FFF; margin: 0 0 6px 0; font-weight: 600; line-height: 1.2;">
        ${title}
      </h3>
      <p style="font-size: 12.5px; color: #CDBB9C; line-height: 1.45; margin: 0 0 10px 0;">
        ${description}
      </p>
      <div style="display: flex; align-items: center; gap: 6px; padding-top: 8px; border-top: 1px solid rgba(232, 185, 120, 0.2); font-size: 11.5px; color: #E8B978; font-weight: 600;">
        <span style="font-size: 14px;">◈</span>
        <span>Jury Insight: ${highlight}</span>
      </div>
    `;

    document.body.appendChild(hud);
  }, { badge, title, description, highlight, chapter });
}

async function run() {
  console.log('Launching Chrome to capture jury demo previews...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  // 1. Navigate to Web App
  console.log('1. Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Check if login form is displayed
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    console.log('Signing in as lead.planner@royalknot.in...');
    await page.type('input[type="email"]', 'lead.planner@royalknot.in');
    await page.type('input[type="password"]', 'RoyalKnot#2026');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
  }

  // Ensure artifacts dir exists
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  // -------------------------------------------------------------
  // FEATURE 1: Wedding Readiness & Risk Radar Cockpit
  // -------------------------------------------------------------
  console.log('Capturing Feature 1: Readiness Radar...');
  await page.evaluate(() => {
    const el = document.getElementById('readiness-radar-anchor');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await injectHud(page, {
    badge: 'SPECIAL FEATURE 01 OF 05',
    chapter: 'Cockpit Audit',
    title: 'Wedding Readiness & Risk Radar Cockpit',
    description: 'Real-time 4-pillar algorithmic readiness audit (0–100) dynamically evaluating tasks, vendor logistics, timeline stability, and critical incident escalation.',
    highlight: 'Automated Risk Interventions & Punctuality Scoring'
  });
  await new Promise(r => setTimeout(r, 600));
  const f1Path = path.join(ARTIFACT_DIR, 'sample_feature1_readiness_radar.png');
  await page.screenshot({ path: f1Path });
  console.log('Saved Feature 1 to:', f1Path);

  // -------------------------------------------------------------
  // FEATURE 2: Multi-Scenario Budget & Guest Count Simulator
  // -------------------------------------------------------------
  console.log('Capturing Feature 2: Multi-Scenario Budget Simulator...');
  await page.evaluate(() => {
    // Look for button opening simulator
    const buttons = Array.from(document.querySelectorAll('button'));
    const simBtn = buttons.find(b => b.textContent.includes('Budget Simulator') || b.textContent.includes('Multi-Scenario'));
    if (simBtn) simBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await injectHud(page, {
    badge: 'SPECIAL FEATURE 02 OF 05',
    chapter: 'Financial Modeling',
    title: 'Multi-Scenario Budget & Guest Count Simulator',
    description: 'Dynamic financial sensitivity modeling scaling guest counts from 100 to 1,200 across 4 luxury tiers with real-time margin protection curves.',
    highlight: 'Real-Time Margin Projection & Instant Client Proposal Export'
  });
  await new Promise(r => setTimeout(r, 600));
  const f2Path = path.join(ARTIFACT_DIR, 'sample_feature2_budget_simulator.png');
  await page.screenshot({ path: f2Path });
  console.log('Saved Feature 2 to:', f2Path);

  // Close simulator drawer/modal if open
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[aria-label="Close"], button.close, div[style*="position: fixed"] button');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // -------------------------------------------------------------
  // FEATURE 3: Public Guest Concierge QR Portal
  // -------------------------------------------------------------
  console.log('Capturing Feature 3: Guest Concierge QR Portal...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const portalBtn = buttons.find(b => b.textContent.includes('Guest Portal') || b.textContent.includes('Concierge'));
    if (portalBtn) portalBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await injectHud(page, {
    badge: 'SPECIAL FEATURE 03 OF 05',
    chapter: 'Guest Logistics',
    title: 'Public Guest Concierge & QR Portal',
    description: 'Isolated public itinerary destination with Google Maps navigation, event schedule breakdown, and instant household RSVP capture.',
    highlight: 'Rate-Limited Public Gateway with Instant Database Synchronization'
  });
  await new Promise(r => setTimeout(r, 600));
  const f3Path = path.join(ARTIFACT_DIR, 'sample_feature3_guest_portal.png');
  await page.screenshot({ path: f3Path });
  console.log('Saved Feature 3 to:', f3Path);

  // Close portal view
  await page.evaluate(() => {
    const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Back to Planner') || b.textContent.includes('Back'));
    if (backBtn) backBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // -------------------------------------------------------------
  // FEATURE 4: Contingency & Emergency Backup Protocols
  // -------------------------------------------------------------
  console.log('Capturing Feature 4: Contingency Planner...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const contBtn = buttons.find(b => b.textContent.includes('Contingency') || b.textContent.includes('Backup'));
    if (contBtn) contBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await injectHud(page, {
    badge: 'SPECIAL FEATURE 04 OF 05',
    chapter: 'Day-of Operations',
    title: 'Contingency & Emergency Backup Protocols',
    description: 'Disaster recovery architecture with standby generator power, internal incident commanders, and single-click emergency schedule relocation.',
    highlight: 'Single-Click Venue Relocation & Critical Incident Dispatch'
  });
  await new Promise(r => setTimeout(r, 600));
  const f4Path = path.join(ARTIFACT_DIR, 'sample_feature4_contingency_planner.png');
  await page.screenshot({ path: f4Path });
  console.log('Saved Feature 4 to:', f4Path);

  // Close contingency modal
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('✕') || b.textContent.includes('Close'));
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // -------------------------------------------------------------
  // FEATURE 5: Vendor Reliability & Risk Intelligence
  // -------------------------------------------------------------
  console.log('Capturing Feature 5: Vendor Reliability Intelligence...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const venTab = buttons.find(b => b.textContent.trim() === 'Vendors' || b.textContent.includes('Vendor Directory'));
    if (venTab) venTab.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Click on reliability badge or modal
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, div, span'));
    const relBtn = buttons.find(b => b.textContent.includes('Reliability') || b.textContent.includes('Risk Index') || b.textContent.includes('Inspect Reliability'));
    if (relBtn) relBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  await injectHud(page, {
    badge: 'SPECIAL FEATURE 05 OF 05',
    chapter: 'Procurement Intelligence',
    title: 'Vendor Reliability & Risk Intelligence',
    description: 'Algorithmic partner evaluation tracking historical dispute frequencies, on-time arrivals, reliability tiers, and active contracts before booking.',
    highlight: 'Pre-Contract Dispute Prevention & Audit Trail Scoring'
  });
  await new Promise(r => setTimeout(r, 600));
  const f5Path = path.join(ARTIFACT_DIR, 'sample_feature5_vendor_reliability.png');
  await page.screenshot({ path: f5Path });
  console.log('Saved Feature 5 to:', f5Path);

  await browser.close();
  console.log('All 5 feature previews captured successfully!');
}

run().catch(err => {
  console.error('Error capturing previews:', err);
  process.exit(1);
});
