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

/**
 * Transforms raw database item records or comma-separated item strings
 * into clean, punchy, high-converting social media wording.
 * e.g. "Broiler Chicken Medium × 5" -> "5 Whole Broilers"
 */
export function formatSocialProofQuantity(
  rawText?: string,
  items?: Array<{ product: string; qty: number }>
): string {
  if (items && items.length > 0) {
    const parts = items.map((item) => {
      const p = item.product.toLowerCase();
      let label = "Broilers";
      if (p.includes("egg")) {
        label = item.qty === 1 ? "Crate Fresh Eggs" : "Crates Fresh Eggs";
      } else if (p.includes("jumbo")) {
        label = item.qty === 1 ? "Jumbo Broiler" : "Jumbo Broilers";
      } else if (p.includes("chicken") || p.includes("broiler") || p.includes("bird")) {
        label = item.qty === 1 ? "Whole Broiler" : "Whole Broilers";
      } else {
        label = item.product;
      }
      return `${item.qty} ${label}`;
    });
    return parts.join(", ");
  }

  if (!rawText || !rawText.trim()) {
    return "10 Whole Broilers";
  }

  let text = rawText.trim();

  // If text is formatted as "Product × Qty" or "Product x Qty"
  if (text.includes("×") || text.includes(" x ") || text.includes(" X ")) {
    text = text.replace(/([^\d,]+)\s*[×xX]\s*(\d+)/g, "$2 $1").trim();
  }

  // Simplify verbose product names for punchy social media impact
  text = text
    .replace(/broiler chicken (medium|large|jumbo)/gi, "Broilers")
    .replace(/dressed chicken/gi, "Broilers")
    .replace(/broiler chicken/gi, "Broilers")
    .replace(/chicken/gi, "Broilers")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

export interface SocialProofFlyerOptions {
  orderCode?: string;
  quantityText?: string;
  itemsText?: string;
  alignment?: "center" | "left";
  // Legacy fields kept for full backwards compatibility
  customerName?: string;
  phone?: string;
  orderDate?: string;
  address?: string;
  maskData?: boolean;
}

/**
 * Draws the high-converting Dignity Agro Farms Social Proof flyer.
 * Uses 2x supersampled resolution (1224 × 1836) for ultra-sharp retina and mobile downloads.
 */
export async function drawSocialProofFlyerOnCanvas(
  canvas: HTMLCanvasElement,
  options: SocialProofFlyerOptions
): Promise<void> {
  // 2x supersampled resolution of the 612 × 918 template
  const width = 1224;
  const height = 1836;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2d context from canvas");

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/social_proof_template.png";

    img.onload = () => {
      // 1. Draw template background poster image at 2x supersampled size
      ctx.drawImage(img, 0, 0, width, height);

      // 2. Prepare Order Number text (ensuring clean '#' prefix)
      let displayOrderCode = (options.orderCode || "DEC-44851").trim();
      if (displayOrderCode && !displayOrderCode.startsWith("#")) {
        displayOrderCode = `#${displayOrderCode}`;
      }

      // 3. Prepare Quantity wording for social media
      const displayQuantity =
        options.quantityText?.trim() ||
        formatSocialProofQuantity(options.itemsText) ||
        "10 Whole Broilers";

      // 4. Alignment settings
      const align = options.alignment || "center";
      const isCenter = align === "center";

      // 5. Pill Box Coordinates (2x scaled from 612x918 template):
      // - Pill inner bounds: X = [186, 476], Center X = 331, Left X = 210
      // - Max printable text width = 260px (with safe inner padding)
      const pillCenterX = 331;
      const pillLeftX = 210;
      const targetX = isCenter ? pillCenterX : pillLeftX;
      const maxTextWidth = 260;

      // Vertical Centers:
      // Box 1 (ORDER NUMBER): Center Y = 532.0 * 2 = 1064
      // Box 2 (QUANTITY): Center Y = 591.5 * 2 = 1183
      const box1CenterY = 1064;
      const box2CenterY = 1183;

      ctx.fillStyle = "#0B3B1E"; // Dignity Agro Farms brand dark evergreen
      ctx.textAlign = isCenter ? "center" : "left";
      ctx.textBaseline = "middle";

      // Helper function to auto-scale text font size to fit neatly in pill box
      const drawAutoScaledPillText = (
        text: string,
        yCenter: number,
        initialFontSize: number
      ) => {
        let fontSize = initialFontSize;
        ctx.font = `bold ${fontSize}px 'Inter', 'Montserrat', -apple-system, BlinkMacSystemFont, Arial, sans-serif`;

        // Scale down font size if text width exceeds pill boundaries
        while (ctx.measureText(text).width > maxTextWidth && fontSize > 18) {
          fontSize -= 1;
          ctx.font = `bold ${fontSize}px 'Inter', 'Montserrat', -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
        }

        // If text still exceeds at minimum font size, truncate gracefully with ellipsis
        let finalText = text;
        if (ctx.measureText(finalText).width > maxTextWidth) {
          while (
            finalText.length > 3 &&
            ctx.measureText(finalText + "...").width > maxTextWidth
          ) {
            finalText = finalText.slice(0, -1);
          }
          finalText += "...";
        }

        ctx.fillText(finalText, targetX, yCenter);
      };

      // Box 1: ORDER NUMBER (32px initial size)
      drawAutoScaledPillText(displayOrderCode, box1CenterY, 32);

      // Box 2: QUANTITY (30px initial size)
      drawAutoScaledPillText(displayQuantity, box2CenterY, 30);

      resolve();
    };

    img.onerror = () => {
      reject(new Error("Failed to load background template image"));
    };
  });
}

export const drawSocialProofFlyerCanvas = drawSocialProofFlyerOnCanvas;
