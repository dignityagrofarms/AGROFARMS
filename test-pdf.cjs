const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8081/');
  
  const html = `
  <!doctype html><html lang="en"><head><meta charset="utf-8">
  <title>Test Receipt</title>
  <style>
  body{margin:0;background:#fff;}
  .sheet{font-family:Arial,Helvetica,sans-serif;color:#0F3D24;background:#fff;max-width:720px;margin:0 auto;border:1px solid #0F3D2422;border-radius:16px;padding:32px;box-sizing:border-box}
  .head{display:flex;justify-content:space-between;border-bottom:1px solid #0F3D2422;padding-bottom:16px}
  h1{font-size:22px;margin:0;letter-spacing:2px}
  .code{font-family:monospace;color:#3F8F3F;font-weight:700}
  </style></head><body><div class="sheet">
  <div class="head">
    <div>
      <img src="http://localhost:8081/src/assets/logo.png" style="height:48px;" />
      <div style="font-weight:700;font-size:16px">Dignity Agro Farms Limited</div>
    </div>
    <div style="text-align:right">
      <h1>PAYMENT RECEIPT</h1>
      <div class="code">DEC-12345</div>
    </div>
  </div>
  </div>
  </body></html>
  `;
  
  await page.setContent(html);
  
  // Inject html-to-image and jspdf via CDN
  await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.js' });
  await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js' });
  
  await page.evaluate(async () => {
    const dataUrl = await window.htmlToImage.toPng(document.querySelector('.sheet'), { quality: 1.0, pixelRatio: 2 });
    const pdf = new window.jspdf.jsPDF({ orientation: "portrait", unit: "in", format: "letter" });
    const margin = 0.3;
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const maxImgWidth = pdfWidth - (margin * 2);
    const imgProps = pdf.getImageProperties(dataUrl);
    const imgHeight = maxImgWidth / (imgProps.width / imgProps.height);
    pdf.addImage(dataUrl, 'PNG', margin, margin, maxImgWidth, imgHeight);
    window.pdfData = pdf.output('datauristring');
  });
  
  const pdfDataUrl = await page.evaluate(() => window.pdfData);
  const base64Data = pdfDataUrl.replace(/^data:application\/pdf;base64,/, "");
  fs.writeFileSync('/home/ritchietech/.gemini/antigravity-ide/brain/83095c46-75a0-4403-a513-9a99873e8240/test_receipt.pdf', base64Data, 'base64');
  console.log("PDF saved to artifacts");
  await browser.close();
})();
