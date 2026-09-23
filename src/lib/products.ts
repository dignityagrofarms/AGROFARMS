// Single source of truth for all products on the site.
// Edit prices, names, or options here and they automatically update
// on the order page AND in Google search results (via JSON-LD schema).

export type ProductOption = {
  label: string;
  price: number;
  qtyLabel?: string;
};

export type Product = {
  id: string;
  name: string;
  unitLabel: string;
  description: string;
  image: string; // absolute URL for SEO/OG
  options: ProductOption[];
};

const BASE = "https://dignityagrofarms.com";

export const PRODUCTS: Product[] = [
  {
    id: "live",
    name: "Live Broiler Chicken (weighed at farm)",
    unitLabel: "per bird",
    description:
      "Healthy, well-raised live broiler chickens sold by the kilogram at farm price in Owerri. Weighed in your presence, never cheated, always fresh.",
    image: `${BASE}/assets/live-broiler.jpg`,
    options: [
      { label: "Small · 1.5 Kg", price: 5250 },
      { label: "Medium · 2 Kg", price: 7000 },
      { label: "Medium plus · 2.5 Kg", price: 8750 },
      { label: "Large · 3 Kg", price: 10500 },
      { label: "Extra Large · 3.5 Kg", price: 12250 },
    ],
  },
  {
    id: "dressed",
    name: "Dressed Chicken (ready-to-cook)",
    unitLabel: "per bird",
    description:
      "Freshly cleaned and dressed broiler chickens, never frozen, delivered straight from our farm to your kitchen in Owerri.",
    image: `${BASE}/assets/dressed-chicken.jpg`,
    options: [
      { label: "Small · 1.5 Kg", price: 6000 },
      { label: "Medium · 2 Kg", price: 8000 },
      { label: "Medium plus · 2.5 Kg", price: 10000 },
      { label: "Large · 3 Kg", price: 12000 },
      { label: "Extra Large · 3.5 Kg", price: 14000 },
    ],
  },
  {
    id: "eggs",
    name: "Fresh Table Eggs",
    unitLabel: "per pack",
    description:
      "Farm-fresh table eggs collected daily from our layer flock. Supplied by the dozen, half crate, or full crate to homes, shops, bakeries and events in Owerri.",
    image: `${BASE}/assets/eggs.jpg`,
    options: [
      { label: "Dozen (12)", price: 1800 },
      { label: "Half crate (15)", price: 2300 },
      { label: "Full crate or tray (30)", price: 4500 },
    ],
  },
  {
    id: "consult",
    name: "Poultry Consultancy",
    unitLabel: "per session",
    description:
      "Professional poultry consultancy sessions covering pen setup, biosecurity, feeding programs and hands-on training for new and growing farmers in Nigeria.",
    image: `${BASE}/assets/farm-life-1.jpg`,
    options: [
      { label: "Starter session (1 hr)", price: 25000 },
      { label: "Farm visit & setup review", price: 50000 },
      { label: "Full training program", price: 120000 },
    ],
  },
];
