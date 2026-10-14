export type RegionCode = "NA" | "EMEA" | "APAC" | "LATAM";
export type RoleCode = "CORPORATE" | "VENDOR" | "RECIPIENT" | "ADMIN";

export const REGIONS: {
  code: RegionCode;
  label: string;
  countries: string;
  hubs: string;
  currencyNote: string;
}[] = [
  {
    code: "NA",
    label: "North America (NA)",
    countries: "United States, Canada, Mexico",
    hubs: "New Jersey, Austin, Toronto",
    currencyNote: "USD / CAD duty-free fulfillment",
  },
  {
    code: "EMEA",
    label: "Europe, Middle East & Africa (EMEA)",
    countries: "UK, Germany, France, Netherlands, UAE, South Africa",
    hubs: "Amsterdam, London, Berlin, Dubai",
    currencyNote: "VAT-inclusive local customs cleared",
  },
  {
    code: "APAC",
    label: "Asia-Pacific (APAC)",
    countries: "Singapore, Japan, Australia, India, South Korea",
    hubs: "Singapore, Tokyo, Sydney, Bengaluru",
    currencyNote: "Local carrier express dispatch",
  },
  {
    code: "LATAM",
    label: "Latin America (LATAM)",
    countries: "Brazil, Colombia, Chile, Argentina",
    hubs: "São Paulo, Bogotá, Santiago",
    currencyNote: "Pre-cleared regional tax compliance",
  },
];

export const BUDGET_TIERS = [
  { cents: 2500, label: "$25 Delight", description: "Thoughtful desk treats, artisanal coffee & books" },
  { cents: 5000, label: "$50 Appreciation", description: "Wellness kits, smart drinkware & gourmet gift boxes" },
  { cents: 10000, label: "$100 Milestone", description: "Premium audio, home espresso gear & luxury throws" },
  { cents: 25000, label: "$250 Executive VIP", description: "Flagship noise-canceling headphones, luggage & espresso machines" },
];

export const OCCASIONS = [
  "Work Anniversary",
  "New Hire Onboarding",
  "Birthday Celebration",
  "Client VIP Appreciation",
  "Spot Recognition",
  "Holiday Gratitude",
];

export const PRODUCT_CATEGORIES = [
  "Tech",
  "Wellness",
  "Gourmet",
  "Home & Living",
  "Apparel & Swag",
  "Experiences",
];

export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

export function parseRegions(csv: string | null | undefined): RegionCode[] {
  if (!csv) return ["NA"];
  const valid = new Set<RegionCode>(["NA", "EMEA", "APAC", "LATAM"]);
  const parsed = csv
    .split(",")
    .map((s) => s.trim().toUpperCase() as RegionCode)
    .filter((code) => valid.has(code));
  return parsed.length > 0 ? Array.from(new Set(parsed)) : ["NA"];
}

export function serializeRegions(regions: string[]): string {
  const valid = new Set(["NA", "EMEA", "APAC", "LATAM"]);
  const filtered = Array.from(
    new Set(regions.map((r) => r.trim().toUpperCase()).filter((r) => valid.has(r)))
  );
  return filtered.length > 0 ? filtered.join(",") : "NA";
}

export function regionSupports(supportedRegionsCsv: string, targetRegion: string): boolean {
  const regions = parseRegions(supportedRegionsCsv);
  return regions.includes(targetRegion.trim().toUpperCase() as RegionCode);
}
