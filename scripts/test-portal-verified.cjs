const puppeteer = require('puppeteer-core');

async function testGuestPortalDirect() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1920,1080']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Scroll to reveal login card
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await new Promise(r => setTimeout(r, 600));

  // Fill in login
  await page.type('input[type="email"]', 'lead.planner@royalknot.in');
  await page.type('input[type="password"]', 'RoyalKnot#2026');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));

  // Click "✦ Guest Concierge Portal" button
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Guest Concierge Portal'));
    if (btn) { btn.click(); return btn.textContent.trim(); }
    return 'NOT FOUND';
  });
  console.log('Clicked in Dashboard:', clicked);
  await new Promise(r => setTimeout(r, 2500));

  const data = await page.evaluate(() => {
    return {
      title: document.title,
      h1: Array.from(document.querySelectorAll('h1')).map(h => h.innerText),
      h2: Array.from(document.querySelectorAll('h2')).map(h => h.innerText),
      h3: Array.from(document.querySelectorAll('h3')).map(h => h.innerText),
      bodySnippet: document.body.innerText.slice(0, 400)
    };
  });
  console.log('Portal state:', data);

  const screenshotPath = 'C:\\Users\\bhupa\\.gemini\\antigravity\\brain\\f3260598-34fd-4bbb-bc4f-67c21c60f0ed\\guest_portal_verified_look.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Screenshot saved to:', screenshotPath);
  await browser.close();
}

testGuestPortalDirect().catch(console.error);
