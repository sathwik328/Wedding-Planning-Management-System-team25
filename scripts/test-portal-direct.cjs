const puppeteer = require('puppeteer-core');

async function checkDom() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1920,1080']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Log in
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    await page.type('input[type="email"]', 'lead.planner@royalknot.in');
    await page.type('input[type="password"]', 'RoyalKnot#2026');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
  }

  const clickedText = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Guest Concierge Portal'));
    if (btn) { btn.click(); return btn.textContent.trim(); }
    return 'BUTTON NOT FOUND';
  });
  console.log('Clicked:', clickedText);
  await new Promise(r => setTimeout(r, 2000));

  const content = await page.evaluate(() => {
    const portalNotice = document.querySelector('h2');
    const allH1 = Array.from(document.querySelectorAll('h1')).map(h => h.innerText);
    const allH2 = Array.from(document.querySelectorAll('h2')).map(h => h.innerText);
    return { allH1, allH2, hasNotice: !!portalNotice };
  });
  console.log('Portal inspection:', JSON.stringify(content, null, 2));

  await page.screenshot({ path: 'C:\\Users\\bhupa\\.gemini\\antigravity\\brain\\f3260598-34fd-4bbb-bc4f-67c21c60f0ed\\portal_state_check.png' });
  await browser.close();
}

checkDom().catch(console.error);
