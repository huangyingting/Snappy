import { prisma } from "@/lib/prisma";

export async function getAdminDashboard() {
  const [
    companies,
    vendors,
    products,
    giftCategories,
    collections,
    charities,
    giftSends,
    giftOrders,
    auditLogs,
  ] = await Promise.all([
    prisma.company.findMany({
      include: {
        _count: { select: { campaigns: true, giftSends: true, users: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vendor.findMany({
      include: {
        _count: { select: { products: true, giftOrders: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      include: {
        giftCategory: true,
        vendor: { select: { businessName: true, status: true } },
      },
      orderBy: { priceCents: "asc" },
    }),
    prisma.giftCategory.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.collection.findMany({
      where: { isGlobal: true },
      include: {
        _count: { select: { collectionProducts: true, campaigns: true } },
      },
      orderBy: { budgetTierCents: "asc" },
    }),
    prisma.charity.findMany({
      orderBy: { totalDonatedCents: "desc" },
    }),
    prisma.giftSend.findMany({
      include: {
        company: { select: { name: true } },
        campaign: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.giftOrder.findMany({
      include: {
        product: { select: { title: true, sku: true, imageUrl: true } },
        vendor: { select: { businessName: true, hqCountry: true } },
        charity: { select: { name: true } },
        giftSend: {
          select: {
            recipientName: true,
            recipientEmail: true,
            claimCode: true,
            company: { select: { name: true } },
          },
        },
        shipmentEvents: {
          orderBy: { occurredAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const now = Date.now();
  const expiredUnclaimedGifts = giftSends.filter(
    (g) => ["SENT", "OPENED"].includes(g.status) && g.expiresAt.getTime() < now
  );

  const totalGmvCents = giftOrders.reduce((s, o) => s + o.retailAmountCents, 0);
  const platformRevenueCents = giftOrders.reduce((s, o) => s + o.platformFeeCents, 0);
  const totalVendorPayoutsCents = giftOrders.reduce((s, o) => s + o.vendorPayoutCents, 0);
  const totalCorporateWalletCents = companies.reduce((s, c) => s + c.walletBalanceCents, 0);
  const totalCorporateEscrowCents = companies.reduce((s, c) => s + c.escrowBalanceCents, 0);
  const totalCharityDonationsCents = charities.reduce((s, ch) => s + ch.totalDonatedCents, 0);

  return {
    companies,
    vendors,
    products,
    giftCategories,
    collections,
    charities,
    giftOrders,
    expiredUnclaimedGifts,
    auditLogs,
    metrics: {
      totalGmvCents,
      platformRevenueCents,
      totalVendorPayoutsCents,
      totalCorporateWalletCents,
      totalCorporateEscrowCents,
      totalCharityDonationsCents,
      pendingVendorsCount: vendors.filter((v) => v.status === "PENDING").length,
      reclaimableEscrowCents: expiredUnclaimedGifts.reduce((s, g) => s + g.budgetCents, 0),
      expiredUnclaimedCount: expiredUnclaimedGifts.length,
    },
  };
}

export async function upsertGiftCategory(input: {
  id?: string;
  name: string;
  slug?: string;
  headline?: string;
  tagline?: string;
  description?: string;
  icon?: string;
  accentColor?: string;
  heroImageUrl?: string;
  displayOrder?: number;
  sortOrder?: number;
  isFeatured?: boolean;
  active?: boolean;
  actorUserId?: string;
}) {
  const cleanName = input.name.trim();
  const cleanHeadline = (input.headline || input.tagline || cleanName).trim();
  const cleanDescription = (input.description || cleanHeadline).trim();
  const cleanOrder = input.displayOrder ?? input.sortOrder;
  const cleanSlug =
    input.slug?.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-") ||
    cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return prisma.$transaction(async (tx) => {
    const category = input.id
      ? await tx.giftCategory.update({
          where: { id: input.id },
          data: {
            name: cleanName,
            slug: cleanSlug,
            headline: cleanHeadline,
            description: cleanDescription,
            icon: input.icon?.trim() || undefined,
            accentColor: input.accentColor?.trim() || undefined,
            heroImageUrl: input.heroImageUrl?.trim() || undefined,
            displayOrder:
              cleanOrder !== undefined ? Math.round(cleanOrder) : undefined,
            isFeatured: input.isFeatured,
            active: input.active,
          },
        })
      : await tx.giftCategory.upsert({
          where: { slug: cleanSlug },
          create: {
            name: cleanName,
            slug: cleanSlug,
            headline: cleanHeadline,
            description: cleanDescription,
            icon: input.icon?.trim() || "Sparkles",
            accentColor: input.accentColor?.trim() || "#EA580C",
            heroImageUrl:
              input.heroImageUrl?.trim() || "/images/gifts/apex-anc-headphones.png",
            displayOrder: cleanOrder ?? 10,
            isFeatured: input.isFeatured ?? true,
            active: input.active ?? true,
          },
          update: {
            name: cleanName,
            headline: cleanHeadline,
            description: cleanDescription,
            icon: input.icon?.trim() || undefined,
            accentColor: input.accentColor?.trim() || undefined,
            heroImageUrl: input.heroImageUrl?.trim() || undefined,
            displayOrder:
              cleanOrder !== undefined ? Math.round(cleanOrder) : undefined,
            isFeatured: input.isFeatured,
            active: input.active,
          },
        });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId || null,
        actorRole: "ADMIN",
        action: input.id ? "CATEGORY_UPDATED" : "CATEGORY_CREATED",
        entityType: "GiftCategory",
        entityId: category.id,
        metadataJson: JSON.stringify({
          name: category.name,
          slug: category.slug,
        }),
      },
    });

    return category;
  });
}

export async function updateVendorGovernance(input: {
  vendorId: string;
  status?: "PENDING" | "APPROVED" | "SUSPENDED";
  commissionRateBps?: number;
  actorUserId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.update({
      where: { id: input.vendorId },
      data: {
        status: input.status || undefined,
        commissionRateBps:
          input.commissionRateBps !== undefined
            ? Math.max(0, Math.min(5000, Math.round(input.commissionRateBps)))
            : undefined,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId || null,
        actorRole: "ADMIN",
        action: `VENDOR_STATUS_${vendor.status}`,
        entityType: "Vendor",
        entityId: vendor.id,
        metadataJson: JSON.stringify({
          businessName: vendor.businessName,
          status: vendor.status,
          commissionRateBps: vendor.commissionRateBps,
        }),
      },
    });

    return vendor;
  });
}

export async function createGlobalCollection(input: {
  title: string;
  description: string;
  occasion: string;
  budgetTierCents: number;
  productIds: string[];
  actorUserId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const collection = await tx.collection.create({
      data: {
        title: input.title.trim(),
        description: input.description.trim(),
        occasion: input.occasion.trim() || "All Occasions",
        budgetTierCents: Math.round(input.budgetTierCents),
        isGlobal: true,
      },
    });

    for (const productId of Array.from(new Set(input.productIds))) {
      await tx.collectionProduct.create({
        data: {
          collectionId: collection.id,
          productId,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId || null,
        actorRole: "ADMIN",
        action: "GLOBAL_COLLECTION_CREATED",
        entityType: "Collection",
        entityId: collection.id,
        metadataJson: JSON.stringify({
          title: collection.title,
          budgetTierCents: collection.budgetTierCents,
        }),
      },
    });

    return collection;
  });
}

export async function createCharityPartner(input: {
  name: string;
  category: string;
  description: string;
  actorUserId?: string;
}) {
  return prisma.charity.create({
    data: {
      name: input.name.trim(),
      category: input.category.trim(),
      description: input.description.trim(),
      active: true,
    },
  });
}

export async function reclaimExpiredGifts(actorUserId?: string) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const expiredSends = await tx.giftSend.findMany({
      where: {
        status: { in: ["SENT", "OPENED"] },
        expiresAt: { lt: now },
      },
      include: { company: true },
    });

    let totalReclaimedCents = 0;

    for (const gs of expiredSends) {
      await tx.giftSend.update({
        where: { id: gs.id },
        data: { status: "EXPIRED" },
      });

      const currentCompany = await tx.company.findUnique({
        where: { id: gs.companyId },
      });

      if (currentCompany) {
        const escrowDecrement = Math.min(currentCompany.escrowBalanceCents, gs.budgetCents);
        const updatedCompany = await tx.company.update({
          where: { id: gs.companyId },
          data: {
            escrowBalanceCents: { decrement: escrowDecrement },
            walletBalanceCents: { increment: gs.budgetCents },
          },
        });

        await tx.walletTransaction.create({
          data: {
            companyId: gs.companyId,
            type: "EXPIRED_GIFT_REFUND",
            amountCents: gs.budgetCents,
            balanceAfter: updatedCompany.walletBalanceCents,
            escrowAfter: updatedCompany.escrowBalanceCents,
            note: `Expired unclaimed gift credit returned (${gs.recipientEmail})`,
            referenceId: gs.id,
          },
        });

        totalReclaimedCents += gs.budgetCents;
      }
    }

    await tx.auditLog.create({
      data: {
        actorUserId: actorUserId || null,
        actorRole: "ADMIN",
        action: "EXPIRED_GIFTS_RECLAIMED",
        entityType: "System",
        entityId: "reclaim-sweep",
        metadataJson: JSON.stringify({
          reclaimedCount: expiredSends.length,
          totalReclaimedCents,
        }),
      },
    });

    return {
      reclaimedCount: expiredSends.length,
      totalReclaimedCents,
    };
  });
}
