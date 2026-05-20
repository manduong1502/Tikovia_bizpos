const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log('Page error: ', err.toString());
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console error: ', msg.text());
    }
  });

  try {
    await page.goto('http://localhost:3000/customers', { waitUntil: 'networkidle0' });
    console.log("Page loaded successfully.");
    
    // Check if error boundary text is present
    const content = await page.content();
    if (content.includes('j is not a function')) {
      console.log("Error text found on page!");
    } else if (content.includes('Đã xảy ra lỗi')) {
      console.log("Some other error found!");
    }
  } catch(e) {
    console.log("Puppeteer error: ", e.toString());
  }

  await browser.close();
})();
