const puppeteer = require('puppeteer-core');

async function checkPortal() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1920,1080']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    await page.type('input[type="email"]', 'lead.planner@royalknot.in');
    await page.type('input[type="password"]', 'RoyalKnot#2026');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
  }

  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Guest Portal') || b.textContent.includes('Concierge'));
    if (btn) { btn.click(); return btn.textContent.trim(); }
    return 'NOT FOUND';
  });
  console.log('Clicked button:', clicked);
  await new Promise(r => setTimeout(r, 2500));

  const artifactDir = 'C:\\Users\\bhupa\\.gemini\\antigravity\\brain\\f3260598-34fd-4bbb-bc4f-67c21c60f0ed';
  await page.screenshot({ path: `${artifactDir}\\debug_guest_portal.png` });
  console.log('Saved debug screenshot to debug_guest_portal.png');
  await browser.close();
}

checkPortal().catch(console.error);
