const puppeteer = require('puppeteer-core');

async function testClose() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1920,1080']
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Login
  await page.evaluate(async () => {
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: 'lead.planner@royalknot.in', password: 'RoyalKnot#2026' })
    });
  });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  console.log('1. Opening Guest Portal...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Guest Concierge Portal'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  console.log('2. Closing Guest Portal via #btn-back-to-planner...');
  await page.click('#btn-back-to-planner');
  await new Promise(r => setTimeout(r, 1500));

  const state = await page.evaluate(() => {
    return {
      h1: Array.from(document.querySelectorAll('h1')).map(h => h.innerText),
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean),
      bodyLength: document.body.innerHTML.length
    };
  });
  console.log('3. State after closing portal:', state);

  console.log('4. Navigating to Weddings tab...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText.includes('Weddings & Tasks') || b.innerText.includes('Weddings'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const wedState = await page.evaluate(() => {
    return {
      h1: Array.from(document.querySelectorAll('h1')).map(h => h.innerText),
      h2: Array.from(document.querySelectorAll('h2')).map(h => h.innerText),
      bodyLength: document.body.innerHTML.length
    };
  });
  console.log('5. State on Weddings tab:', wedState);

  await page.screenshot({ path: 'C:\\Users\\bhupa\\.gemini\\antigravity\\brain\\f3260598-34fd-4bbb-bc4f-67c21c60f0ed\\test_close_result.png' });
  await browser.close();
}

testClose().catch(console.error);
