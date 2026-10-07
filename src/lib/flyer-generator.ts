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

      // 2. Configure font styles (No background rects, crisp brand green font)
      ctx.fillStyle = "#0F3D24"; // Dark Dignity Agro Farms Green
      ctx.textBaseline = "middle";

      // Line 1: FULL NAME
      ctx.font = "bold 28px 'Inter', Arial, sans-serif";
      ctx.fillText(displayName, 385, 822);

      // Line 2: PHONE NUMBER
      ctx.font = "bold 28px 'Inter', Arial, sans-serif";
      ctx.fillText(displayPhone, 385, 882);

      // Line 3: ORDER DATE
      ctx.font = "bold 26px 'Inter', Arial, sans-serif";
      ctx.fillText(displayDate, 385, 942);

      // Line 4: ITEM(S) ORDERED
      ctx.font = "bold 26px 'Inter', Arial, sans-serif";
      // Truncate if items text is too long for line
      const maxItemsWidth = 560;
      let trimmedItems = displayItems;
      if (ctx.measureText(trimmedItems).width > maxItemsWidth) {
        while (trimmedItems.length > 5 && ctx.measureText(trimmedItems + "...").width > maxItemsWidth) {
          trimmedItems = trimmedItems.slice(0, -1);
        }
        trimmedItems += "...";
      }
      ctx.fillText(trimmedItems, 385, 1002);

      // Line 5: DELIVERY ADDRESS
      ctx.font = "bold 25px 'Inter', Arial, sans-serif";
      let trimmedAddr = displayAddress;
      if (ctx.measureText(trimmedAddr).width > maxItemsWidth) {
        while (trimmedAddr.length > 5 && ctx.measureText(trimmedAddr + "...").width > maxItemsWidth) {
          trimmedAddr = trimmedAddr.slice(0, -1);
        }
        trimmedAddr += "...";
      }
      ctx.fillText(trimmedAddr, 385, 1062);

      resolve();
    };

    img.onerror = (err) => {
      reject(new Error("Failed to load background template image"));
    };
  });
}

export const drawSocialProofFlyerCanvas = drawSocialProofFlyerOnCanvas;
