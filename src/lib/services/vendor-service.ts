import { prisma } from "@/lib/prisma";
import { serializeRegions } from "@/lib/constants";

export async function getVendorDashboard(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      products: {
        orderBy: { createdAt: "desc" },
      },
      giftOrders: {
        include: {
          product: true,
          giftSend: {
            include: {
              company: {
                select: { id: true, name: true, brandColor: true },
              },
              campaign: {
                select: { id: true, title: true, occasion: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!vendor) {
    throw new Error("Vendor profile not found.");
  }

  const globalCollections = await prisma.collection.findMany({
    where: { isGlobal: true },
    orderBy: { budgetTierCents: "asc" },
  });

  const totalOrders = vendor.giftOrders.length;
  const pendingFulfillmentCount = vendor.giftOrders.filter(
    (o) => o.fulfillmentStatus === "PENDING_VENDOR" || o.fulfillmentStatus === "PROCESSING"
  ).length;
  const shippedOrDeliveredCount = vendor.giftOrders.filter(
    (o) => o.fulfillmentStatus === "SHIPPED" || o.fulfillmentStatus === "DELIVERED"
  ).length;
  const grossSalesCents = vendor.giftOrders.reduce((sum, o) => sum + o.retailAmountCents, 0);
  const netEarnedCents = vendor.giftOrders.reduce((sum, o) => sum + o.vendorPayoutCents, 0);

  return {
    vendor,
    globalCollections,
    metrics: {
      totalProducts: vendor.products.length,
      activeProducts: vendor.products.filter((p) => p.active && p.stockQuantity > 0).length,
      totalOrders,
      pendingFulfillmentCount,
      shippedOrDeliveredCount,
      grossSalesCents,
      netEarnedCents,
      payoutBalanceCents: vendor.payoutBalanceCents,
    },
  };
}

export interface CreateVendorProductInput {
  vendorId: string;
  actorUserId?: string;
  title: string;
  description: string;
  category: string;
  priceCents: number;
  wholesaleCostCents?: number;
  imageUrl?: string;
  stockQuantity: number;
  supportedRegions: string[];
  collectionIds?: string[];
}

export async function createVendorProduct(input: CreateVendorProductInput) {
  const vendor = await prisma.vendor.findUnique({ where: { id: input.vendorId } });
  if (!vendor) {
    throw new Error("Vendor not found.");
  }

  const priceCents = Math.max(500, Math.round(input.priceCents));
  const wholesaleCostCents = input.wholesaleCostCents
    ? Math.round(input.wholesaleCostCents)
    : Math.round(priceCents * 0.75);
  const regionsCsv = serializeRegions(
    input.supportedRegions.length > 0
      ? input.supportedRegions
      : vendor.supportedRegions.split(",")
  );

  const defaultSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440" viewBox="0 0 640 440">
      <rect width="640" height="440" rx="28" fill="#1E293B"/>
      <text x="48" y="210" font-family="system-ui, sans-serif" font-size="28" font-weight="800" fill="#ffffff">${input.title
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</text>
      <text x="48" y="255" font-family="system-ui, sans-serif" font-size="16" fill="#94A3B8">${input.category} • ${regionsCsv}</text>
    </svg>`
  )}`;

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        vendorId: vendor.id,
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category.trim() || "Tech",
        priceCents,
        wholesaleCostCents,
        imageUrl: input.imageUrl?.trim() || defaultSvg,
        stockQuantity: Math.max(0, Math.round(input.stockQuantity)),
        supportedRegions: regionsCsv,
        active: true,
      },
    });

    if (input.collectionIds && input.collectionIds.length > 0) {
      for (const collectionId of input.collectionIds) {
        await tx.collectionProduct.upsert({
          where: {
            collectionId_productId: {
              collectionId,
              productId: product.id,
            },
          },
          create: { collectionId, productId: product.id },
          update: {},
        });
      }
    } else {
      // Automatically attach to matching or higher global collections
      const matchingCollections = await tx.collection.findMany({
        where: {
          isGlobal: true,
          budgetTierCents: { gte: priceCents },
        },
      });
      for (const col of matchingCollections) {
        await tx.collectionProduct.create({
          data: {
            collectionId: col.id,
            productId: product.id,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId || null,
        actorRole: "VENDOR",
        action: "PRODUCT_CREATED",
        entityType: "Product",
        entityId: product.id,
        metadataJson: JSON.stringify({
          vendorId: vendor.id,
          title: product.title,
          priceCents: product.priceCents,
          supportedRegions: product.supportedRegions,
        }),
      },
    });

    return product;
  });
}

export async function updateVendorProduct(
  vendorId: string,
  productId: string,
  updates: {
    title?: string;
    priceCents?: number;
    stockQuantity?: number;
    supportedRegions?: string[];
    active?: boolean;
  }
) {
  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing || existing.vendorId !== vendorId) {
    throw new Error("Product not found or does not belong to this vendor.");
  }

  return prisma.product.update({
    where: { id: productId },
    data: {
      title: updates.title !== undefined ? updates.title.trim() : undefined,
      priceCents: updates.priceCents !== undefined ? Math.round(updates.priceCents) : undefined,
      stockQuantity:
        updates.stockQuantity !== undefined ? Math.max(0, Math.round(updates.stockQuantity)) : undefined,
      supportedRegions:
        updates.supportedRegions !== undefined
          ? serializeRegions(updates.supportedRegions)
          : undefined,
      active: updates.active !== undefined ? updates.active : undefined,
    },
  });
}

export async function updateVendorProfile(
  vendorId: string,
  updates: {
    businessName?: string;
    hqCountry?: string;
    supportedRegions?: string[];
    slaDays?: number;
  }
) {
  return prisma.vendor.update({
    where: { id: vendorId },
    data: {
      businessName: updates.businessName?.trim() || undefined,
      hqCountry: updates.hqCountry?.trim().toUpperCase() || undefined,
      supportedRegions: updates.supportedRegions
        ? serializeRegions(updates.supportedRegions)
        : undefined,
      slaDays:
        updates.slaDays !== undefined ? Math.max(1, Math.min(14, Math.round(updates.slaDays))) : undefined,
    },
  });
}

export async function fulfillVendorOrder(input: {
  vendorId: string;
  orderId: string;
  fulfillmentStatus: "PROCESSING" | "SHIPPED" | "DELIVERED";
  trackingCarrier?: string;
  trackingNumber?: string;
  actorUserId?: string;
}) {
  const order = await prisma.giftOrder.findUnique({
    where: { id: input.orderId },
    include: { giftSend: true },
  });

  if (!order || order.vendorId !== input.vendorId) {
    throw new Error("Order not found or not assigned to this vendor.");
  }

  if (input.fulfillmentStatus === "SHIPPED") {
    if (!input.trackingCarrier?.trim() || !input.trackingNumber?.trim()) {
      throw new Error("Carrier name and tracking number are required when marking an order as SHIPPED.");
    }
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.giftOrder.update({
      where: { id: order.id },
      data: {
        fulfillmentStatus: input.fulfillmentStatus,
        trackingCarrier:
          input.trackingCarrier !== undefined ? input.trackingCarrier.trim() : order.trackingCarrier,
        trackingNumber:
          input.trackingNumber !== undefined ? input.trackingNumber.trim() : order.trackingNumber,
        shippedAt:
          input.fulfillmentStatus === "SHIPPED" ? now : order.shippedAt,
        deliveredAt:
          input.fulfillmentStatus === "DELIVERED" ? now : order.deliveredAt,
      },
      include: {
        product: true,
        giftSend: true,
      },
    });

    await tx.giftSend.update({
      where: { id: order.giftSendId },
      data: {
        status: input.fulfillmentStatus,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId || null,
        actorRole: "VENDOR",
        action: `ORDER_${input.fulfillmentStatus}`,
        entityType: "GiftOrder",
        entityId: order.id,
        metadataJson: JSON.stringify({
          trackingCarrier: updatedOrder.trackingCarrier,
          trackingNumber: updatedOrder.trackingNumber,
        }),
      },
    });

    return updatedOrder;
  });
}
