import { z } from "zod";

export const regionSchema = z.enum(["NA", "EMEA", "APAC", "LATAM"]);
export const moneySchema = z.number().int().min(1).max(100_000_000);
export const imageSchema = z.string().url().refine((value) => new URL(value).protocol === "https:", "Use an HTTPS image URL.");
export const recipientSchema = z.object({
  recipientName: z.string().trim().min(1).max(100),
  recipientEmail: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  preferredRegion: regionSchema.optional(),
  personalMessage: z.string().trim().max(2000).optional(),
});
export const recipientsSchema = z.array(recipientSchema).max(500).refine(
  (items) => new Set(items.map((item) => item.recipientEmail)).size === items.length,
  "Each recipient may appear only once per dispatch.",
);
export const productSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  category: z.string().trim().min(1).max(100),
  categoryId: z.string().min(1).nullable().optional(),
  sku: z.string().trim().max(100).optional(),
  merchandisingBadge: z.string().trim().max(100).optional(),
  tags: z.array(z.string().trim().max(50)).max(30).optional(),
  variants: z.array(z.object({ name: z.string().trim().min(1).max(50), options: z.array(z.string().trim().min(1).max(100)).min(1).max(50) })).max(10).optional(),
  specifications: z.record(z.unknown()).refine((value) => {
    const weight = value.weightGrams;
    return JSON.stringify(value).length <= 10000 && (weight === undefined || (typeof weight === "number" && Number.isInteger(weight) && weight >= 0 && weight <= 100000));
  }, "Invalid product specifications.").optional(),
  priceCents: moneySchema,
  wholesaleCostCents: z.number().int().min(0).max(100_000_000).optional(),
  imageUrl: imageSchema,
  stockQuantity: z.number().int().min(0).max(1_000_000),
  supportedRegions: z.array(regionSchema).min(1).max(4),
  isFeatured: z.boolean().optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
  active: z.boolean().optional(),
});

export const shippingSchema = z.object({
  shippingName: z.string().trim().min(1).max(100),
  shippingPhone: z.string().trim().max(50).optional(),
  shippingAddressLine1: z.string().trim().min(1).max(200),
  shippingAddressLine2: z.string().trim().max(200).optional(),
  shippingCity: z.string().trim().min(1).max(100),
  shippingState: z.string().trim().max(100).optional(),
  shippingPostalCode: z.string().trim().min(1).max(30),
  shippingCountry: z.string().regex(/^[A-Z]{2}$/, "Use a two-letter country code."),
  deliveryInstructions: z.string().trim().max(1000).optional(),
  selectedVariant: z.string().trim().max(500).optional(),
});
