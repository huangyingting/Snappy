import { prisma } from "@/lib/prisma";
import { generateClaimCode, generateClaimToken } from "@/lib/auth";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { transaction } from "@/lib/transaction";
import { moneySchema, recipientsSchema, regionSchema } from "@/lib/validation";
import { appUrl, queueEmail } from "@/lib/email";
import { createHash, randomUUID } from "node:crypto";

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
                omit: { vendorPayoutCents: true, platformFeeCents: true, settlementReference: true },
                include: {
                  product: { omit: { wholesaleCostCents: true } },
                  charity: true,
                  vendor: {
                    select: { id: true, businessName: true, hqCountry: true },
                  },
                  shipmentEvents: {
                    orderBy: { occurredAt: "asc" },
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
    throw new AppError("Corporate workspace not found.");
  }
  if (company.hideRecipientAddress) {
    for (const campaign of company.campaigns) {
      for (const send of campaign.giftSends) {
        if (!send.giftOrder) continue;
        Object.assign(send.giftOrder, {
          shippingAddressLine1: "Hidden by Recipient Privacy Shield",
          shippingAddressLine2: "", shippingPhone: "", shippingPostalCode: "", deliveryInstructions: "",
        });
        send.giftOrder.shipmentEvents = send.giftOrder.shipmentEvents.map((event) =>
          event.stage === "ADDRESS_UPDATED" ? { ...event, description: "", location: "" } : event,
        );
      }
    }
  }

  const [collections, allActiveProducts, giftCategories] = await Promise.all([
    prisma.collection.findMany({
      where: {
        OR: [{ isGlobal: true }, { companyId: company.id }],
      },
      include: {
        collectionProducts: {
          include: {
            product: {
              omit: { wholesaleCostCents: true },
              include: {
                giftCategory: true,
                vendor: {
                  select: { businessName: true, status: true },
                },
              },
            },
          },
        },
      },
      orderBy: [{ isGlobal: "desc" }, { budgetTierCents: "asc" }],
    }),
    prisma.product.findMany({
      omit: { wholesaleCostCents: true },
      where: {
        active: true,
        vendor: { status: "APPROVED" },
      },
      include: {
        giftCategory: true,
        vendor: {
          select: { businessName: true, supportedRegions: true },
        },
      },
      orderBy: { priceCents: "asc" },
    }),
    prisma.giftCategory.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

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
    ["CLAIMED", "PROCESSING", "SHIPPED", "DELIVERED", "DONATION_PENDING", "DONATED"].includes(gs.status)
  ).length;
  const totalDelivered = allGiftSends.filter((gs) =>
    ["DELIVERED", "DONATED"].includes(gs.status)
  ).length;

  return {
    company,
    collections,
    allActiveProducts,
    giftCategories,
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

export async function recordSettledPayment(input: {
  companyId: string;
  amountCents: number;
  note?: string;
  actorUserId: string;
  settlementReference: string;
}) {
  const amountCents = moneySchema.parse(input.amountCents);
  const settlementReference = z.string().trim().min(1).max(150).parse(input.settlementReference);
  const actor = await prisma.user.findUnique({ where: { id: input.actorUserId } });
  if (actor?.role !== "ADMIN") throw new AppError("Only administrators can record settled payments.", 403);
  if (amountCents < 1000) {
    throw new AppError("Minimum wallet deposit is $10.00 (1000 cents).");
  }

  return transaction(async (tx) => {
    const existing = await tx.walletTransaction.findUnique({ where: { settlementReference } });
    if (existing) {
      if (existing.companyId !== input.companyId || existing.amountCents !== amountCents) {
        throw new AppError("That settlement reference is already assigned to another payment.", 409);
      }
      return { company: await tx.company.findUniqueOrThrow({ where: { id: input.companyId } }), transaction: existing };
    }
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
        referenceId: settlementReference,
        settlementReference,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId || null,
        actorRole: "ADMIN",
        action: "SETTLED_PAYMENT_RECORDED",
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
  moneySchema.parse(input.budgetTierCents);
  z.string().trim().min(1).max(200).parse(input.title);
  if (!input.productIds || input.productIds.length === 0) {
    throw new AppError("Please select at least one gift product for your custom collection.");
  }

  return transaction(async (tx) => {
    const eligible = await tx.product.count({
      where: { id: { in: input.productIds }, active: true, priceCents: { lte: input.budgetTierCents }, vendor: { status: "APPROVED" } },
    });
    if (eligible !== new Set(input.productIds).size) throw new AppError("Select approved products within the collection budget.");
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
  requestKey?: string;
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
  const budgetCents = moneySchema.min(1500).parse(input.budgetCents);
  z.string().trim().min(1).max(200).parse(input.title);
  z.string().trim().min(1).max(2000).parse(input.messageTemplate);
  if (input.triggerType === "AUTOMATED_MILESTONE") throw new AppError("Automated milestones are not configured.");
  const recipients = recipientsSchema.parse(input.recipients || []);
  const expiresInDays = z.number().int().min(1).max(365).parse(input.expiresInDays ?? 30);
  const totalEscrowNeeded = recipients.length * budgetCents;
  if (totalEscrowNeeded) moneySchema.parse(totalEscrowNeeded);
  const requestKey = input.requestKey ? z.string().uuid().parse(input.requestKey) : randomUUID();
  const requestHash = createHash("sha256").update(JSON.stringify({
    companyId: input.companyId, title: input.title.trim(), occasion: input.occasion,
    messageTemplate: input.messageTemplate.trim(), budgetCents, recipients,
    collectionId: input.collectionId || null, allowCharity: input.allowCharity ?? true,
    triggerType: input.triggerType || "MANUAL", expiresInDays,
  })).digest("hex");

  return transaction(async (tx) => {
    const existing = await tx.campaign.findUnique({ where: { requestKey }, include: { giftSends: true } });
    if (existing) {
      if (existing.companyId !== input.companyId || existing.requestHash !== requestHash) {
        throw new AppError("The request key has already been used for a different campaign.", 409);
      }
      const { giftSends, ...campaign } = existing;
      return { campaign, giftSends };
    }
    const company = await tx.company.findUnique({ where: { id: input.companyId } });
    if (!company) {
      throw new AppError("Company not found.");
    }
    if (input.collectionId) {
      const collection = await tx.collection.findFirst({
        where: { id: input.collectionId, OR: [{ isGlobal: true }, { companyId: company.id }] },
      });
      if (!collection) throw new AppError("Collection not found in your workspace.");
    }

    if (totalEscrowNeeded > 0 && company.walletBalanceCents < totalEscrowNeeded) {
      throw new AppError(
        `Insufficient wallet balance. Need $${(totalEscrowNeeded / 100).toFixed(2)}, but available balance is $${(
          company.walletBalanceCents / 100
        ).toFixed(2)}.`
      );
    }

    const campaign = await tx.campaign.create({
      data: {
        companyId: company.id,
        requestKey,
        requestHash,
        createdByUserId: input.actorUserId || null,
        title: input.title.trim(),
        occasion: input.occasion.trim() || "Spot Recognition",
        messageTemplate: input.messageTemplate.trim(),
        budgetCents,
        collectionId: input.collectionId || null,
        status: "ACTIVE",
        triggerType: input.triggerType || "MANUAL",
        allowCharity: input.allowCharity ?? true,
        expiresInDays,
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
            recipientUserId: existingRecipientUser?.emailVerified && existingRecipientUser.role === "RECIPIENT" ? existingRecipientUser.id : null,
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
        await queueEmail(tx, cleanEmail, `${company.name} sent you a gift`, `Hello ${send.recipientName},\n\n${send.personalMessage}\n\nChoose your gift: ${appUrl()}/claim/${send.claimToken}\nInvitation code: ${send.claimCode}\nExpires: ${send.expiresAt.toISOString()}`);
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
  const recipients = recipientsSchema.parse(input.recipients);
  if (!recipients.length) {
    throw new AppError("At least one recipient is required.");
  }

  return transaction(async (tx) => {
    const campaign = await tx.campaign.findUnique({
      where: { id: input.campaignId },
    });
    if (!campaign || campaign.companyId !== input.companyId) {
      throw new AppError("Campaign not found.");
    }
    if (campaign.status !== "ACTIVE") throw new AppError("Campaign is not active.");

    const company = await tx.company.findUnique({
      where: { id: input.companyId },
    });
    if (!company) {
      throw new AppError("Company not found.");
    }

    const totalEscrowNeeded = recipients.length * campaign.budgetCents;
    moneySchema.parse(totalEscrowNeeded);
    if (company.walletBalanceCents < totalEscrowNeeded) {
      throw new AppError(
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
          recipientUserId: existingRecipientUser?.emailVerified && existingRecipientUser.role === "RECIPIENT" ? existingRecipientUser.id : null,
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
      await queueEmail(tx, cleanEmail, `${company.name} sent you a gift`, `Hello ${send.recipientName},\n\n${send.personalMessage}\n\nChoose your gift: ${appUrl()}/claim/${send.claimToken}\nInvitation code: ${send.claimCode}\nExpires: ${send.expiresAt.toISOString()}`);
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
  updates = z.object({
    name: z.string().trim().min(1).max(150).optional(),
    brandColor: z.string().regex(/^#[a-fA-F0-9]{6}$/).optional(),
    primaryRegion: regionSchema.optional(),
    hideRecipientAddress: z.boolean().optional(),
  }).parse(updates);
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
