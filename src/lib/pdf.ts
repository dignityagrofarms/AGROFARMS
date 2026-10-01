import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

export async function downloadPdf(html: string, filename: string) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-9999px";
  container.style.left = "0";
  container.style.zIndex = "-9999";
  
  // Extract just the inner #pdf-receipt-target div and its styles
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Find the style block and the target div
  const styleBlock = temp.querySelector('style');
  const targetDiv = temp.querySelector('#pdf-receipt-target');
  
  if (styleBlock) container.appendChild(styleBlock.cloneNode(true));
  if (targetDiv) container.appendChild(targetDiv.cloneNode(true));
  
  document.body.appendChild(container);

  // Give fonts and images a moment to load
  await new Promise(r => setTimeout(r, 800));

  // html-to-image crashes when trying to parse cross-origin stylesheets (like Google Fonts)
  // because of a bug where it calls .trim() on an undefined error result.
  // We temporarily disable these links before rendering.
  const crossOriginLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .filter(link => {
      const href = link.getAttribute('href') || '';
      return href.startsWith('http') && !href.startsWith(window.location.origin);
    });
    
  crossOriginLinks.forEach(link => link.setAttribute('disabled', 'true'));
  // Also temporarily change the rel attribute so html-to-image ignores it completely
  const linkHrefs = crossOriginLinks.map(link => {
    const href = link.getAttribute('href');
    link.removeAttribute('href');
    return href;
  });

  try {
    const sheet = container.querySelector('.sheet') as HTMLElement;
    if (!sheet) throw new Error("Sheet not found in receipt");

    const dataUrl = await toPng(sheet, { 
      quality: 1.0,
      pixelRatio: 2, // Crisp resolution
      backgroundColor: '#ffffff'
    });
    
    // Create a PDF that is exactly the size of the receipt (1 continuous page)
    const imgProps = new jsPDF().getImageProperties(dataUrl);
    // JS PDF uses mm by default, convert px to mm (1px ≈ 0.264583mm)
    const pxToMm = 0.264583;
    const pdfWidth = imgProps.width * pxToMm / 2; // Divide by pixelRatio
    const pdfHeight = imgProps.height * pxToMm / 2;

    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
  } finally {
    // Restore cross-origin links
    crossOriginLinks.forEach((link, i) => {
      link.removeAttribute('disabled');
      if (linkHrefs[i]) {
        link.setAttribute('href', linkHrefs[i]!);
      }
    });
    // Clean up
    document.body.removeChild(container);
  }
}
