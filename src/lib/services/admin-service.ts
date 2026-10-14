import { prisma } from "@/lib/prisma";

export async function getAdminDashboard() {
  const [
    companies,
    vendors,
    products,
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
        vendor: { select: { businessName: true, status: true } },
      },
      orderBy: { priceCents: "asc" },
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
    prisma.giftOrder.findMany(),
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
    collections,
    charities,
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
