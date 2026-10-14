import { prisma } from "@/lib/prisma";
import { serializeRegions } from "@/lib/constants";

export async function getVendorDashboard(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      products: {
        include: {
          giftCategory: true,
        },
        orderBy: { createdAt: "desc" },
      },
      giftOrders: {
        include: {
          product: true,
          shipmentEvents: {
            orderBy: { occurredAt: "asc" },
          },
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

  const [globalCollections, giftCategories] = await Promise.all([
    prisma.collection.findMany({
      where: { isGlobal: true },
      orderBy: { budgetTierCents: "asc" },
    }),
    prisma.giftCategory.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  const totalOrders = vendor.giftOrders.length;
  const pendingFulfillmentCount = vendor.giftOrders.filter(
    (o) => o.fulfillmentStatus === "PENDING_VENDOR" || o.fulfillmentStatus === "PROCESSING"
  ).length;
  const shippedOrDeliveredCount = vendor.giftOrders.filter((o) =>
    ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(o.fulfillmentStatus)
  ).length;
  const exceptionOrdersCount = vendor.giftOrders.filter(
    (o) => o.fulfillmentStatus === "EXCEPTION"
  ).length;
  const lowStockProductsCount = vendor.products.filter(
    (p) => p.active && p.stockQuantity <= 15
  ).length;
  const grossSalesCents = vendor.giftOrders.reduce((sum, o) => sum + o.retailAmountCents, 0);
  const netEarnedCents = vendor.giftOrders.reduce((sum, o) => sum + o.vendorPayoutCents, 0);

  return {
    vendor,
    globalCollections,
    giftCategories,
    metrics: {
      totalProducts: vendor.products.length,
      activeProducts: vendor.products.filter((p) => p.active && p.stockQuantity > 0).length,
      lowStockProductsCount,
      totalOrders,
      pendingFulfillmentCount,
      shippedOrDeliveredCount,
      exceptionOrdersCount,
      grossSalesCents,
      netEarnedCents,
      payoutBalanceCents: vendor.payoutBalanceCents,
    },
  };
}

export interface ProductVariantGroup {
  name: string;
  options: string[];
}

export interface CreateVendorProductInput {
  vendorId: string;
  actorUserId?: string;
  title: string;
  description: string;
  category: string;
  categoryId?: string | null;
  sku?: string;
  merchandisingBadge?: string;
  tags?: string[];
  variants?: ProductVariantGroup[];
  specifications?: Record<string, unknown>;
  priceCents: number;
  wholesaleCostCents?: number;
  imageUrl?: string;
  stockQuantity: number;
  supportedRegions: string[];
  isFeatured?: boolean;
  status?: "ACTIVE" | "DRAFT" | "ARCHIVED";
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

  // Resolve category and categoryId
  let resolvedCategoryName = input.category?.trim() || "Tech";
  let resolvedCategoryId = input.categoryId || null;

  if (resolvedCategoryId) {
    const foundCat = await prisma.giftCategory.findUnique({
      where: { id: resolvedCategoryId },
    });
    if (foundCat) {
      resolvedCategoryName = foundCat.name;
    }
  } else {
    const matchedCat = await prisma.giftCategory.findFirst({
      where: { name: resolvedCategoryName },
    });
    if (matchedCat) {
      resolvedCategoryId = matchedCat.id;
    }
  }

  const generatedSku =
    input.sku?.trim().toUpperCase() ||
    `${vendor.businessName.slice(0, 3).toUpperCase()}-${resolvedCategoryName
      .slice(0, 3)
      .toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  const defaultSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440" viewBox="0 0 640 440">
      <rect width="640" height="440" rx="28" fill="#1E293B"/>
      <text x="48" y="210" font-family="system-ui, sans-serif" font-size="28" font-weight="800" fill="#ffffff">${input.title
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</text>
      <text x="48" y="255" font-family="system-ui, sans-serif" font-size="16" fill="#94A3B8">${resolvedCategoryName} • ${regionsCsv}</text>
    </svg>`
  )}`;

  const status = input.status || "ACTIVE";

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        vendorId: vendor.id,
        categoryId: resolvedCategoryId,
        sku: generatedSku,
        title: input.title.trim(),
        description: input.description.trim(),
        category: resolvedCategoryName,
        merchandisingBadge: input.merchandisingBadge?.trim() || "",
        tagsJson: JSON.stringify(input.tags || []),
        variantsJson: JSON.stringify(input.variants || []),
        specificationsJson: JSON.stringify(
          input.specifications || {
            originCountry: vendor.hqCountry,
            leadTimeDays: vendor.slaDays,
          }
        ),
        priceCents,
        wholesaleCostCents,
        imageUrl: input.imageUrl?.trim() || defaultSvg,
        stockQuantity: Math.max(0, Math.round(input.stockQuantity)),
        supportedRegions: regionsCsv,
        isFeatured: input.isFeatured ?? false,
        status,
        active: status === "ACTIVE",
      },
      include: {
        giftCategory: true,
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
          sku: product.sku,
          title: product.title,
          category: product.category,
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
    description?: string;
    category?: string;
    categoryId?: string | null;
    sku?: string;
    merchandisingBadge?: string;
    tags?: string[];
    variants?: ProductVariantGroup[];
    specifications?: Record<string, unknown>;
    priceCents?: number;
    wholesaleCostCents?: number;
    imageUrl?: string;
    stockQuantity?: number;
    supportedRegions?: string[];
    isFeatured?: boolean;
    status?: "ACTIVE" | "DRAFT" | "ARCHIVED";
    active?: boolean;
  }
) {
  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing || existing.vendorId !== vendorId) {
    throw new Error("Product not found or does not belong to this vendor.");
  }

  let resolvedCategoryName = updates.category?.trim();
  let resolvedCategoryId = updates.categoryId;

  if (resolvedCategoryId) {
    const cat = await prisma.giftCategory.findUnique({ where: { id: resolvedCategoryId } });
    if (cat) {
      resolvedCategoryName = cat.name;
    }
  } else if (resolvedCategoryName) {
    const cat = await prisma.giftCategory.findFirst({ where: { name: resolvedCategoryName } });
    if (cat) {
      resolvedCategoryId = cat.id;
    }
  }

  const nextStatus =
    updates.status !== undefined
      ? updates.status
      : updates.active !== undefined
      ? updates.active
        ? "ACTIVE"
        : "ARCHIVED"
      : undefined;

  const nextActive =
    updates.active !== undefined
      ? updates.active
      : updates.status !== undefined
      ? updates.status === "ACTIVE"
      : undefined;

  return prisma.product.update({
    where: { id: productId },
    data: {
      title: updates.title !== undefined ? updates.title.trim() : undefined,
      description: updates.description !== undefined ? updates.description.trim() : undefined,
      category: resolvedCategoryName,
      categoryId: resolvedCategoryId,
      sku: updates.sku !== undefined ? updates.sku.trim().toUpperCase() : undefined,
      merchandisingBadge:
        updates.merchandisingBadge !== undefined ? updates.merchandisingBadge.trim() : undefined,
      tagsJson: updates.tags !== undefined ? JSON.stringify(updates.tags) : undefined,
      variantsJson:
        updates.variants !== undefined ? JSON.stringify(updates.variants) : undefined,
      specificationsJson:
        updates.specifications !== undefined
          ? JSON.stringify(updates.specifications)
          : undefined,
      priceCents: updates.priceCents !== undefined ? Math.round(updates.priceCents) : undefined,
      wholesaleCostCents:
        updates.wholesaleCostCents !== undefined
          ? Math.round(updates.wholesaleCostCents)
          : undefined,
      imageUrl: updates.imageUrl !== undefined ? updates.imageUrl.trim() : undefined,
      stockQuantity:
        updates.stockQuantity !== undefined ? Math.max(0, Math.round(updates.stockQuantity)) : undefined,
      supportedRegions:
        updates.supportedRegions !== undefined
          ? serializeRegions(updates.supportedRegions)
          : undefined,
      isFeatured: updates.isFeatured !== undefined ? updates.isFeatured : undefined,
      status: nextStatus,
      active: nextActive,
    },
    include: {
      giftCategory: true,
    },
  });
}

export async function cloneVendorProduct(
  vendorId: string,
  productId: string,
  actorUserId?: string
) {
  const source = await prisma.product.findUnique({ where: { id: productId } });
  if (!source || source.vendorId !== vendorId) {
    throw new Error("Source product not found or does not belong to this vendor.");
  }

  const cloneSku = `${source.sku || "SKU"}-ED${Math.floor(10 + Math.random() * 89)}`;

  return prisma.$transaction(async (tx) => {
    const cloned = await tx.product.create({
      data: {
        vendorId: source.vendorId,
        categoryId: source.categoryId,
        sku: cloneSku,
        title: `${source.title} (Atelier Edition)`,
        description: source.description,
        category: source.category,
        merchandisingBadge: source.merchandisingBadge || "Limited Edition",
        tagsJson: source.tagsJson,
        variantsJson: source.variantsJson,
        specificationsJson: source.specificationsJson,
        priceCents: source.priceCents,
        wholesaleCostCents: source.wholesaleCostCents,
        imageUrl: source.imageUrl,
        stockQuantity: Math.max(25, source.stockQuantity),
        supportedRegions: source.supportedRegions,
        isFeatured: false,
        status: "ACTIVE",
        active: true,
      },
      include: {
        giftCategory: true,
      },
    });

    const existingLinks = await tx.collectionProduct.findMany({
      where: { productId: source.id },
    });
    for (const link of existingLinks) {
      await tx.collectionProduct.create({
        data: {
          collectionId: link.collectionId,
          productId: cloned.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: actorUserId || null,
        actorRole: "VENDOR",
        action: "PRODUCT_CLONED",
        entityType: "Product",
        entityId: cloned.id,
        metadataJson: JSON.stringify({
          sourceProductId: source.id,
          title: cloned.title,
          sku: cloned.sku,
        }),
      },
    });

    return cloned;
  });
}

export async function archiveOrDeleteVendorProduct(
  vendorId: string,
  productId: string,
  actorUserId?: string
) {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    include: { _count: { select: { giftOrders: true } } },
  });
  if (!existing || existing.vendorId !== vendorId) {
    throw new Error("Product not found or does not belong to this vendor.");
  }

  if (existing._count.giftOrders > 0) {
    return prisma.product.update({
      where: { id: productId },
      data: {
        active: false,
        status: "ARCHIVED",
      },
    });
  }

  await prisma.collectionProduct.deleteMany({ where: { productId } });
  await prisma.product.delete({ where: { id: productId } });
  await prisma.auditLog.create({
    data: {
      actorUserId: actorUserId || null,
      actorRole: "VENDOR",
      action: "PRODUCT_DELETED",
      entityType: "Product",
      entityId: productId,
      metadataJson: JSON.stringify({ title: existing.title }),
    },
  });
  return { deleted: true, mode: "DELETED", id: productId };
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
  fulfillmentStatus:
    | "PROCESSING"
    | "SHIPPED"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "EXCEPTION";
  trackingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  serviceLevel?: string;
  fulfillmentWarehouse?: string;
  packageWeightGrams?: number;
  estimatedDeliveryAt?: string | Date;
  exceptionNote?: string;
  checkpointTitle?: string;
  checkpointDescription?: string;
  checkpointLocation?: string;
  actorUserId?: string;
}) {
  const order = await prisma.giftOrder.findUnique({
    where: { id: input.orderId },
    include: { giftSend: true, vendor: true, product: true },
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
  const shouldLockAddress = ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
    input.fulfillmentStatus
  );

  const stageByStatus: Record<string, string> = {
    PROCESSING: "PACKED_QA",
    SHIPPED: "CARRIER_PICKED_UP",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    DELIVERED: "DELIVERED",
    EXCEPTION: "EXCEPTION",
  };

  const defaultTitleByStatus: Record<string, string> = {
    PROCESSING: "Quality Inspected & Gift-Wrapped at Atelier",
    SHIPPED: `Dispatched via ${input.trackingCarrier?.trim() || order.trackingCarrier || "Carrier"} (#${input.trackingNumber?.trim() || order.trackingNumber})`,
    OUT_FOR_DELIVERY: "Out for Final Delivery with Local Courier",
    DELIVERED: "Delivered to Recipient Address",
    EXCEPTION: "Carrier / Customs Exception Flagged",
  };

  const defaultDescByStatus: Record<string, string> = {
    PROCESSING: `${order.product?.title || "Gift item"} inspected, gift-wrapped, and queued for carrier manifest.`,
    SHIPPED: `Waybill generated and handed off to ${input.trackingCarrier?.trim() || order.trackingCarrier}. Recipient address locked.`,
    OUT_FOR_DELIVERY: `Parcel loaded onto local delivery vehicle in ${order.shippingCity || order.recipientRegion}.`,
    DELIVERED: `Confirmed delivered in ${order.shippingCity || order.recipientRegion}, ${order.shippingCountry || ""}.`,
    EXCEPTION: input.exceptionNote?.trim() || "Carrier reported a temporary transit hold; vendor ops notified.",
  };

  const giftSendStatusMap: Record<string, string> = {
    PROCESSING: "PROCESSING",
    SHIPPED: "SHIPPED",
    OUT_FOR_DELIVERY: "SHIPPED",
    DELIVERED: "DELIVERED",
    EXCEPTION: "SHIPPED",
  };

  return prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.giftOrder.update({
      where: { id: order.id },
      data: {
        fulfillmentStatus: input.fulfillmentStatus,
        trackingCarrier:
          input.trackingCarrier !== undefined ? input.trackingCarrier.trim() : order.trackingCarrier,
        trackingNumber:
          input.trackingNumber !== undefined ? input.trackingNumber.trim() : order.trackingNumber,
        trackingUrl:
          input.trackingUrl !== undefined ? input.trackingUrl.trim() : order.trackingUrl,
        serviceLevel:
          input.serviceLevel !== undefined ? input.serviceLevel.trim() : order.serviceLevel,
        fulfillmentWarehouse:
          input.fulfillmentWarehouse !== undefined
            ? input.fulfillmentWarehouse.trim()
            : order.fulfillmentWarehouse,
        packageWeightGrams:
          input.packageWeightGrams !== undefined
            ? Math.max(50, Math.round(input.packageWeightGrams))
            : order.packageWeightGrams,
        estimatedDeliveryAt: input.estimatedDeliveryAt
          ? new Date(input.estimatedDeliveryAt)
          : order.estimatedDeliveryAt,
        exceptionNote:
          input.exceptionNote !== undefined ? input.exceptionNote.trim() : order.exceptionNote,
        addressLocked: shouldLockAddress ? true : order.addressLocked,
        shippedAt:
          input.fulfillmentStatus === "SHIPPED" ? now : order.shippedAt,
        deliveredAt:
          input.fulfillmentStatus === "DELIVERED" ? now : order.deliveredAt,
      },
      include: {
        product: true,
        giftSend: true,
        shipmentEvents: {
          orderBy: { occurredAt: "asc" },
        },
      },
    });

    await tx.shipmentEvent.create({
      data: {
        giftOrderId: order.id,
        stage: stageByStatus[input.fulfillmentStatus] || "IN_TRANSIT_HUB",
        title:
          input.checkpointTitle?.trim() ||
          defaultTitleByStatus[input.fulfillmentStatus] ||
          "Shipment Status Updated",
        description:
          input.checkpointDescription?.trim() ||
          defaultDescByStatus[input.fulfillmentStatus] ||
          "",
        location:
          input.checkpointLocation?.trim() ||
          (input.fulfillmentStatus === "DELIVERED" || input.fulfillmentStatus === "OUT_FOR_DELIVERY"
            ? `${order.shippingCity}, ${order.shippingCountry}`
            : updatedOrder.fulfillmentWarehouse),
        actorRole: "VENDOR",
        occurredAt: now,
      },
    });

    await tx.giftSend.update({
      where: { id: order.giftSendId },
      data: {
        status: giftSendStatusMap[input.fulfillmentStatus] || input.fulfillmentStatus,
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
          fulfillmentWarehouse: updatedOrder.fulfillmentWarehouse,
        }),
      },
    });

    return tx.giftOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: {
        product: true,
        giftSend: true,
        shipmentEvents: {
          orderBy: { occurredAt: "asc" },
        },
      },
    });
  });
}

export async function appendOrderShipmentCheckpoint(input: {
  vendorId: string;
  orderId: string;
  stage: string;
  title: string;
  description?: string;
  location?: string;
  actorUserId?: string;
}) {
  const order = await prisma.giftOrder.findUnique({
    where: { id: input.orderId },
  });
  if (!order || order.vendorId !== input.vendorId) {
    throw new Error("Order not found or not assigned to this vendor.");
  }

  return prisma.shipmentEvent.create({
    data: {
      giftOrderId: order.id,
      stage: input.stage.trim() || "IN_TRANSIT_HUB",
      title: input.title.trim(),
      description: input.description?.trim() || "",
      location: input.location?.trim() || order.fulfillmentWarehouse,
      actorRole: "CARRIER",
    },
  });
}
