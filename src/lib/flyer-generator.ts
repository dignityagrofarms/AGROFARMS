export function maskName(name: string): string {
  if (!name || name.trim().length === 0) return "Verified Customer";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const first = parts[0];
    return first.length > 3 ? `${first.slice(0, 3)}****` : `${first}****`;
  }
  const firstName = parts[0];
  const lastPart = parts[parts.length - 1];
  const lastInitial = lastPart[0] ? lastPart[0].toUpperCase() : "";
  return `${firstName} ${lastInitial}.*****`;
}

export function maskPhone(phone: string): string {
  if (!phone || phone.trim().length === 0) return "0803*****78";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return `${digits.slice(0, 3)}*****`;
  return `${digits.slice(0, 4)}*****${digits.slice(-2)}`;
}

export function maskAddress(address: string): string {
  if (!address || address.trim().length === 0) return "Owerri, Imo State";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const areaCity = parts.slice(-2).join(", ");
    return `${areaCity} (Address *****)`;
  }
  if (address.length > 15) {
    return `${address.slice(0, 15)}*****`;
  }
  return `${address} (Area *****)`;
}

export interface SocialProofFlyerOptions {
  customerName: string;
  phone: string;
  orderDate?: string;
  itemsText: string;
  address: string;
  orderCode?: string;
  maskData?: boolean;
}

export async function drawSocialProofFlyerOnCanvas(
  canvas: HTMLCanvasElement,
  options: SocialProofFlyerOptions
): Promise<void> {
  const width = 1067;
  const height = 1280;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2d context from canvas");

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/social_proof_template.png";

    img.onload = () => {
      // 1. Draw template background poster image
      ctx.drawImage(img, 0, 0, width, height);

      const doMask = options.maskData !== false;
      const displayName = doMask ? maskName(options.customerName) : options.customerName;
      const displayPhone = doMask ? maskPhone(options.phone) : options.phone;
      const displayAddress = doMask ? maskAddress(options.address) : options.address;
      const displayDate = options.orderDate || new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const displayItems = options.itemsText || "Poultry Produce Order";

      // 2. Base styles
      ctx.fillStyle = "#0F3D24"; // Dark Dignity Agro Farms Green
      ctx.textBaseline = "middle";

      // Uniform X coordinate after colons, max width before white box right border
      const startX = 355;
      const maxWidth = 560; // Max allowed width (X=355 + 560 = 915px, well inside right border X=940px)

      // Helper function to draw text with dynamic font scaling & overflow truncation
      const drawAutoScaledText = (text: string, x: number, y: number, initialSize: number) => {
        let fontSize = initialSize;
        ctx.font = `bold ${fontSize}px 'Inter', Arial, sans-serif`;

        // Scale down font size if text width exceeds max width boundary
        while (ctx.measureText(text).width > maxWidth && fontSize > 15) {
          fontSize -= 1;
          ctx.font = `bold ${fontSize}px 'Inter', Arial, sans-serif`;
        }

        // If text still exceeds max width at minimum font size, truncate with trailing dots (...)
        let finalText = text;
        if (ctx.measureText(finalText).width > maxWidth) {
          while (finalText.length > 4 && ctx.measureText(finalText + "...").width > maxWidth) {
            finalText = finalText.slice(0, -1);
          }
          finalText += "...";
        }

        ctx.fillText(finalText, x, y);
      };

      // Line 1: FULL NAME (Y: 816)
      drawAutoScaledText(displayName, startX, 816, 27);

      // Line 2: PHONE NUMBER (Y: 874)
      drawAutoScaledText(displayPhone, startX, 874, 27);

      // Line 3: ORDER DATE (Y: 932)
      drawAutoScaledText(displayDate, startX, 932, 25);

      // Line 4: ITEM(S) ORDERED (Y: 990)
      drawAutoScaledText(displayItems, startX, 990, 24);

      // Line 5: DELIVERY ADDRESS (Y: 1046 - nicely aligned above bottom border)
      drawAutoScaledText(displayAddress, startX, 1046, 24);

      resolve();
    };

    img.onerror = (err) => {
      reject(new Error("Failed to load background template image"));
    };
  });
}

export const drawSocialProofFlyerCanvas = drawSocialProofFlyerOnCanvas;
