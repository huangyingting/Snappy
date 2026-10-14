import { prisma } from "@/lib/prisma";
import { generateClaimCode, generateClaimToken } from "@/lib/auth";

export async function getCorporateDashboard(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      walletTransactions: {
        orderBy: { createdAt: "desc" },
        take: 25,
      },
      campaigns: {
        include: {
          collection: true,
          giftSends: {
            include: {
              giftOrder: {
                include: {
                  product: true,
                  charity: true,
                  vendor: {
                    select: { id: true, businessName: true, hqCountry: true },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!company) {
    throw new Error("Corporate workspace not found.");
  }

  const collections = await prisma.collection.findMany({
    where: {
      OR: [{ isGlobal: true }, { companyId: company.id }],
    },
    include: {
      collectionProducts: {
        include: {
          product: {
            include: {
              vendor: {
                select: { businessName: true, status: true },
              },
            },
          },
        },
      },
    },
    orderBy: [{ isGlobal: "desc" }, { budgetTierCents: "asc" }],
  });

  const allActiveProducts = await prisma.product.findMany({
    where: {
      active: true,
      vendor: { status: "APPROVED" },
    },
    include: {
      vendor: {
        select: { businessName: true, supportedRegions: true },
      },
    },
    orderBy: { priceCents: "asc" },
  });

  // Flatten all giftSends and enforce privacy rules on shipping addresses
  const allGiftSends = company.campaigns.flatMap((c) =>
    c.giftSends.map((gs) => ({
      ...gs,
      campaignTitle: c.title,
      occasion: c.occasion,
      giftOrder: gs.giftOrder
        ? {
            ...gs.giftOrder,
            shippingAddressLine1: company.hideRecipientAddress
              ? "🔒 Hidden by Recipient Privacy Shield"
              : gs.giftOrder.shippingAddressLine1,
            shippingPostalCode: company.hideRecipientAddress
              ? "•••••"
              : gs.giftOrder.shippingPostalCode,
          }
        : null,
    }))
  );

  const thankYouWall = allGiftSends
    .filter((gs) => gs.thankYouNote && gs.thankYouNote.trim().length > 0)
    .map((gs) => ({
      id: gs.id,
      recipientName: gs.recipientName,
      recipientEmail: gs.recipientEmail,
      preferredRegion: gs.preferredRegion,
      campaignTitle: gs.campaignTitle,
      occasion: gs.occasion,
      thankYouNote: gs.thankYouNote,
      claimedAt: gs.claimedAt,
      giftTitle:
        gs.giftOrder?.product?.title ||
        (gs.giftOrder?.charity ? `Donated to ${gs.giftOrder.charity.name}` : "Selected Gift"),
    }));

  const totalSent = allGiftSends.length;
  const totalClaimed = allGiftSends.filter((gs) =>
    ["CLAIMED", "PROCESSING", "SHIPPED", "DELIVERED", "DONATED"].includes(gs.status)
  ).length;
  const totalDelivered = allGiftSends.filter((gs) =>
    ["DELIVERED", "DONATED"].includes(gs.status)
  ).length;

  return {
    company,
    collections,
    allActiveProducts,
    allGiftSends,
    thankYouWall,
    metrics: {
      walletBalanceCents: company.walletBalanceCents,
      escrowBalanceCents: company.escrowBalanceCents,
      totalCampaigns: company.campaigns.length,
      totalSent,
      totalClaimed,
      totalDelivered,
      claimRatePercent: totalSent > 0 ? Math.round((totalClaimed / totalSent) * 100) : 0,
    },
  };
}

export async function depositCorporateWallet(input: {
  companyId: string;
  amountCents: number;
  note?: string;
  actorUserId?: string;
}) {
  const amountCents = Math.round(input.amountCents);
  if (amountCents < 1000) {
    throw new Error("Minimum wallet deposit is $10.00 (1000 cents).");
  }

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.update({
      where: { id: input.companyId },
      data: {
        walletBalanceCents: { increment: amountCents },
      },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        companyId: company.id,
        type: "DEPOSIT",
        amountCents,
        balanceAfter: company.walletBalanceCents,
        escrowAfter: company.escrowBalanceCents,
        note: input.note?.trim() || "Corporate Wallet Budget Deposit",
        referenceId: `DEP-${Date.now().toString(36).toUpperCase()}`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId || null,
        actorRole: "CORPORATE",
        action: "WALLET_DEPOSIT",
        entityType: "Company",
        entityId: company.id,
        metadataJson: JSON.stringify({ amountCents, balanceAfter: company.walletBalanceCents }),
      },
    });

    return { company, transaction };
  });
}

export async function createCustomCollection(input: {
  companyId: string;
  title: string;
  description: string;
  occasion: string;
  budgetTierCents: number;
  productIds: string[];
  actorUserId?: string;
}) {
  if (!input.productIds || input.productIds.length === 0) {
    throw new Error("Please select at least one gift product for your custom collection.");
  }

  return prisma.$transaction(async (tx) => {
    const collection = await tx.collection.create({
      data: {
        title: input.title.trim(),
        description: input.description.trim(),
        occasion: input.occasion.trim() || "All Occasions",
        budgetTierCents: Math.round(input.budgetTierCents),
        isGlobal: false,
        companyId: input.companyId,
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
        actorRole: "CORPORATE",
        action: "CUSTOM_COLLECTION_CREATED",
        entityType: "Collection",
        entityId: collection.id,
        metadataJson: JSON.stringify({
          title: collection.title,
          productCount: input.productIds.length,
        }),
      },
    });

    return collection;
  });
}

export interface RecipientDispatchItem {
  recipientName: string;
  recipientEmail: string;
  preferredRegion?: string;
  personalMessage?: string;
}

export interface CreateCampaignInput {
  companyId: string;
  actorUserId?: string;
  title: string;
  occasion: string;
  messageTemplate: string;
  budgetCents: number;
  collectionId?: string | null;
  triggerType?: "MANUAL" | "BULK_CSV" | "AUTOMATED_MILESTONE";
  allowCharity?: boolean;
  expiresInDays?: number;
  recipients?: RecipientDispatchItem[];
}

export async function createCampaignAndOptionallySend(input: CreateCampaignInput) {
  const budgetCents = Math.max(1500, Math.round(input.budgetCents));
  const recipients = input.recipients || [];
  const totalEscrowNeeded = recipients.length * budgetCents;

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.findUnique({ where: { id: input.companyId } });
    if (!company) {
      throw new Error("Company not found.");
    }

    if (totalEscrowNeeded > 0 && company.walletBalanceCents < totalEscrowNeeded) {
      throw new Error(
        `Insufficient wallet balance. Need $${(totalEscrowNeeded / 100).toFixed(2)}, but available balance is $${(
          company.walletBalanceCents / 100
        ).toFixed(2)}.`
      );
    }

    const campaign = await tx.campaign.create({
      data: {
        companyId: company.id,
        createdByUserId: input.actorUserId || null,
        title: input.title.trim(),
        occasion: input.occasion.trim() || "Spot Recognition",
        messageTemplate: input.messageTemplate.trim(),
        budgetCents,
        collectionId: input.collectionId || null,
        status: "ACTIVE",
        triggerType: input.triggerType || "MANUAL",
        allowCharity: input.allowCharity ?? true,
        expiresInDays: input.expiresInDays || 30,
      },
    });

    const createdGiftSends = [];

    if (recipients.length > 0) {
      const updatedCompany = await tx.company.update({
        where: { id: company.id },
        data: {
          walletBalanceCents: { decrement: totalEscrowNeeded },
          escrowBalanceCents: { increment: totalEscrowNeeded },
        },
      });

      await tx.walletTransaction.create({
        data: {
          companyId: company.id,
          type: "ESCROW_HOLD",
          amountCents: -totalEscrowNeeded,
          balanceAfter: updatedCompany.walletBalanceCents,
          escrowAfter: updatedCompany.escrowBalanceCents,
          note: `Escrow reserved for ${recipients.length} gift(s) in "${campaign.title}"`,
          referenceId: campaign.id,
        },
      });

      const expiresAt = new Date(
        Date.now() + 1000 * 60 * 60 * 24 * (campaign.expiresInDays || 30)
      );

      for (const r of recipients) {
        const cleanEmail = r.recipientEmail.trim().toLowerCase();
        const existingRecipientUser = await tx.user.findUnique({
          where: { email: cleanEmail },
        });

        const send = await tx.giftSend.create({
          data: {
            campaignId: campaign.id,
            companyId: company.id,
            recipientEmail: cleanEmail,
            recipientName: r.recipientName.trim(),
            recipientUserId: existingRecipientUser?.id || null,
            preferredRegion: (r.preferredRegion || company.primaryRegion || "NA")
              .trim()
              .toUpperCase(),
            claimToken: generateClaimToken(),
            claimCode: generateClaimCode(),
            budgetCents: campaign.budgetCents,
            status: "SENT",
            personalMessage: r.personalMessage?.trim() || campaign.messageTemplate,
            expiresAt,
          },
        });
        createdGiftSends.push(send);
      }
    }

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId || null,
        actorRole: "CORPORATE",
        action: "CAMPAIGN_LAUNCHED",
        entityType: "Campaign",
        entityId: campaign.id,
        metadataJson: JSON.stringify({
          title: campaign.title,
          budgetCents: campaign.budgetCents,
          recipientsSent: createdGiftSends.length,
        }),
      },
    });

    return { campaign, giftSends: createdGiftSends };
  });
}

export async function dispatchGiftsToCampaign(input: {
  companyId: string;
  campaignId: string;
  recipients: RecipientDispatchItem[];
  actorUserId?: string;
}) {
  if (!input.recipients || input.recipients.length === 0) {
    throw new Error("At least one recipient is required.");
  }

  return prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUnique({
      where: { id: input.campaignId },
    });
    if (!campaign || campaign.companyId !== input.companyId) {
      throw new Error("Campaign not found.");
    }

    const company = await tx.company.findUnique({
      where: { id: input.companyId },
    });
    if (!company) {
      throw new Error("Company not found.");
    }

    const totalEscrowNeeded = input.recipients.length * campaign.budgetCents;
    if (company.walletBalanceCents < totalEscrowNeeded) {
      throw new Error(
        `Insufficient wallet balance. Need $${(totalEscrowNeeded / 100).toFixed(2)}, available $${(
          company.walletBalanceCents / 100
        ).toFixed(2)}.`
      );
    }

    const updatedCompany = await tx.company.update({
      where: { id: company.id },
      data: {
        walletBalanceCents: { decrement: totalEscrowNeeded },
        escrowBalanceCents: { increment: totalEscrowNeeded },
      },
    });

    await tx.walletTransaction.create({
      data: {
        companyId: company.id,
        type: "ESCROW_HOLD",
        amountCents: -totalEscrowNeeded,
        balanceAfter: updatedCompany.walletBalanceCents,
        escrowAfter: updatedCompany.escrowBalanceCents,
        note: `Dispatched ${input.recipients.length} gift(s) in "${campaign.title}"`,
        referenceId: campaign.id,
      },
    });

    const expiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * (campaign.expiresInDays || 30)
    );

    const createdGiftSends = [];
    for (const r of input.recipients) {
      const cleanEmail = r.recipientEmail.trim().toLowerCase();
      const existingRecipientUser = await tx.user.findUnique({
        where: { email: cleanEmail },
      });

      const send = await tx.giftSend.create({
        data: {
          campaignId: campaign.id,
          companyId: company.id,
          recipientEmail: cleanEmail,
          recipientName: r.recipientName.trim(),
          recipientUserId: existingRecipientUser?.id || null,
          preferredRegion: (r.preferredRegion || company.primaryRegion || "NA")
            .trim()
            .toUpperCase(),
          claimToken: generateClaimToken(),
          claimCode: generateClaimCode(),
          budgetCents: campaign.budgetCents,
          status: "SENT",
          personalMessage: r.personalMessage?.trim() || campaign.messageTemplate,
          expiresAt,
        },
      });
      createdGiftSends.push(send);
    }

    return { campaign, giftSends: createdGiftSends, company: updatedCompany };
  });
}

export async function updateCorporateSettings(
  companyId: string,
  updates: {
    name?: string;
    brandColor?: string;
    primaryRegion?: string;
    hideRecipientAddress?: boolean;
  }
) {
  return prisma.company.update({
    where: { id: companyId },
    data: {
      name: updates.name?.trim() || undefined,
      brandColor: updates.brandColor?.trim() || undefined,
      primaryRegion: updates.primaryRegion?.trim().toUpperCase() || undefined,
      hideRecipientAddress:
        updates.hideRecipientAddress !== undefined ? updates.hideRecipientAddress : undefined,
    },
  });
}
