import { prisma } from "@/lib/prisma";
import { regionSupports, type RegionCode } from "@/lib/constants";

export async function getClaimExperienceByToken(claimToken: string, requestedRegion?: string) {
  const giftSend = await prisma.giftSend.findUnique({
    where: { claimToken },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          brandColor: true,
          logoUrl: true,
          hideRecipientAddress: true,
        },
      },
      campaign: {
        include: {
          collection: {
            include: {
              collectionProducts: {
                include: {
                  product: {
                    include: {
                      vendor: {
                        select: {
                          id: true,
                          businessName: true,
                          status: true,
                          hqCountry: true,
                          slaDays: true,
                          supportedRegions: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      giftOrder: {
        include: {
          product: {
            include: {
              vendor: {
                select: {
                  businessName: true,
                  hqCountry: true,
                  slaDays: true,
                },
              },
            },
          },
          charity: true,
        },
      },
    },
  });

  if (!giftSend) {
    throw new Error("Gift invitation not found.");
  }

  // Transition SENT -> OPENED on first visit if not expired
  const isPastExpiry =
    giftSend.expiresAt.getTime() < Date.now() &&
    ["SENT", "OPENED"].includes(giftSend.status);

  if (giftSend.status === "SENT" && !isPastExpiry) {
    await prisma.giftSend.update({
      where: { id: giftSend.id },
      data: { status: "OPENED" },
    });
    giftSend.status = "OPENED";
  }

  const activeRegion = (
    requestedRegion ||
    giftSend.giftOrder?.recipientRegion ||
    giftSend.preferredRegion ||
    "NA"
  )
    .trim()
    .toUpperCase() as RegionCode;

  // Gather candidate products from collection or global catalog
  const candidateProducts =
    giftSend.campaign.collection?.collectionProducts.map((cp) => cp.product) || [];

  // Filter by active, stock, approved vendor, budget ceiling, and regional support
  let eligibleProducts = candidateProducts.filter(
    (p) =>
      p.active &&
      p.stockQuantity > 0 &&
      p.vendor.status === "APPROVED" &&
      p.priceCents <= giftSend.budgetCents &&
      regionSupports(p.supportedRegions, activeRegion)
  );

  // Fallback to all approved regional products within budget if collection has none for that specific region
  if (eligibleProducts.length === 0) {
    const allApprovedProducts = await prisma.product.findMany({
      where: {
        active: true,
        stockQuantity: { gt: 0 },
        priceCents: { lte: giftSend.budgetCents },
        vendor: { status: "APPROVED" },
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
            hqCountry: true,
            slaDays: true,
            supportedRegions: true,
          },
        },
      },
      orderBy: { priceCents: "desc" },
    });

    eligibleProducts = allApprovedProducts.filter((p) =>
      regionSupports(p.supportedRegions, activeRegion)
    );
  }

  const charities = giftSend.campaign.allowCharity
    ? await prisma.charity.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      })
    : [];

  return {
    giftSend,
    activeRegion,
    isExpired: isPastExpiry || giftSend.status === "EXPIRED",
    isAlreadyClaimed: !["SENT", "OPENED", "EXPIRED"].includes(giftSend.status),
    eligibleProducts,
    charities,
  };
}

export interface RedeemGiftInput {
  claimToken: string;
  orderType: "PHYSICAL_GIFT" | "CHARITY_DONATION";
  productId?: string;
  charityId?: string;
  recipientRegion: string;
  shippingName?: string;
  shippingAddressLine1?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
  thankYouNote?: string;
}

export async function redeemGiftByToken(input: RedeemGiftInput) {
  const region = input.recipientRegion.trim().toUpperCase();

  return prisma.$transaction(async (tx) => {
    const giftSend = await tx.giftSend.findUnique({
      where: { claimToken: input.claimToken },
      include: {
        company: true,
        campaign: true,
        giftOrder: true,
      },
    });

    if (!giftSend) {
      throw new Error("Gift invitation not found.");
    }

    if (giftSend.giftOrder || !["SENT", "OPENED"].includes(giftSend.status)) {
      throw new Error("This gift has already been claimed or is no longer active.");
    }

    if (giftSend.expiresAt.getTime() < Date.now()) {
      throw new Error("This gift invitation has expired.");
    }

    if (input.orderType === "CHARITY_DONATION") {
      if (!giftSend.campaign.allowCharity) {
        throw new Error("Charitable donations are not enabled for this campaign.");
      }
      if (!input.charityId) {
        throw new Error("Please select a charity partner.");
      }

      const charity = await tx.charity.findUnique({
        where: { id: input.charityId },
      });
      if (!charity || !charity.active) {
        throw new Error("Selected charity partner is not available.");
      }

      // Release escrow for the gift budget
      await tx.company.update({
        where: { id: giftSend.companyId },
        data: {
          escrowBalanceCents: {
            decrement: Math.min(giftSend.company.escrowBalanceCents, giftSend.budgetCents),
          },
        },
      });

      await tx.charity.update({
        where: { id: charity.id },
        data: {
          totalDonatedCents: { increment: giftSend.budgetCents },
        },
      });

      const order = await tx.giftOrder.create({
        data: {
          giftSendId: giftSend.id,
          charityId: charity.id,
          orderType: "CHARITY_DONATION",
          retailAmountCents: giftSend.budgetCents,
          vendorPayoutCents: 0,
          platformFeeCents: 0,
          recipientRegion: region,
          fulfillmentStatus: "COMPLETED",
          deliveredAt: new Date(),
        },
        include: { charity: true },
      });

      const updatedSend = await tx.giftSend.update({
        where: { id: giftSend.id },
        data: {
          status: "DONATED",
          preferredRegion: region,
          thankYouNote: input.thankYouNote?.trim() || "",
          claimedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: giftSend.recipientUserId,
          actorRole: "RECIPIENT",
          action: "GIFT_DONATED_TO_CHARITY",
          entityType: "GiftSend",
          entityId: giftSend.id,
          metadataJson: JSON.stringify({
            charityName: charity.name,
            amountCents: giftSend.budgetCents,
          }),
        },
      });

      return { giftSend: updatedSend, giftOrder: order };
    }

    // Mode A: PHYSICAL_GIFT
    if (!input.productId) {
      throw new Error("Please select a gift item to claim.");
    }
    if (
      !input.shippingName?.trim() ||
      !input.shippingAddressLine1?.trim() ||
      !input.shippingCity?.trim() ||
      !input.shippingPostalCode?.trim() ||
      !input.shippingCountry?.trim()
    ) {
      throw new Error("Complete shipping address is required to deliver your gift.");
    }

    const product = await tx.product.findUnique({
      where: { id: input.productId },
      include: { vendor: true },
    });

    if (!product || !product.active) {
      throw new Error("Selected product is no longer available.");
    }
    if (product.vendor.status !== "APPROVED") {
      throw new Error("Vendor for this product is not currently active.");
    }
    if (product.stockQuantity <= 0) {
      throw new Error("Sorry, this product is currently out of stock.");
    }
    if (product.priceCents > giftSend.budgetCents) {
      throw new Error("Selected product exceeds the gift budget allowance.");
    }
    if (!regionSupports(product.supportedRegions, region)) {
      throw new Error(
        `This product does not ship to region ${region} (supported: ${product.supportedRegions}).`
      );
    }

    // 1. Decrement product inventory
    await tx.product.update({
      where: { id: product.id },
      data: { stockQuantity: { decrement: 1 } },
    });

    // 2. Calculate financial settlement & surplus refund
    const retailAmountCents = product.priceCents;
    const platformFeeCents = Math.round(
      (retailAmountCents * product.vendor.commissionRateBps) / 10000
    );
    const vendorPayoutCents = retailAmountCents - platformFeeCents;
    const surplusRefundCents = Math.max(0, giftSend.budgetCents - retailAmountCents);

    // 3. Update Company Escrow & refund unused budget difference back to Corporate Wallet
    const updatedCompany = await tx.company.update({
      where: { id: giftSend.companyId },
      data: {
        escrowBalanceCents: {
          decrement: Math.min(giftSend.company.escrowBalanceCents, giftSend.budgetCents),
        },
        walletBalanceCents: {
          increment: surplusRefundCents,
        },
      },
    });

    if (surplusRefundCents > 0) {
      await tx.walletTransaction.create({
        data: {
          companyId: giftSend.companyId,
          type: "ESCROW_SURPLUS_REFUND",
          amountCents: surplusRefundCents,
          balanceAfter: updatedCompany.walletBalanceCents,
          escrowAfter: updatedCompany.escrowBalanceCents,
          note: `Unused budget savings refunded on gift claim (${giftSend.recipientName} chose $${(
            retailAmountCents / 100
          ).toFixed(2)} item on $${(giftSend.budgetCents / 100).toFixed(2)} allowance)`,
          referenceId: giftSend.id,
        },
      });
    }

    // 4. Credit vendor payout balance
    await tx.vendor.update({
      where: { id: product.vendorId },
      data: {
        payoutBalanceCents: { increment: vendorPayoutCents },
      },
    });

    // 5. Create GiftOrder & update GiftSend
    const order = await tx.giftOrder.create({
      data: {
        giftSendId: giftSend.id,
        productId: product.id,
        vendorId: product.vendorId,
        orderType: "PHYSICAL_GIFT",
        retailAmountCents,
        vendorPayoutCents,
        platformFeeCents,
        recipientRegion: region,
        shippingName: input.shippingName.trim(),
        shippingAddressLine1: input.shippingAddressLine1.trim(),
        shippingCity: input.shippingCity.trim(),
        shippingState: input.shippingState?.trim() || "",
        shippingPostalCode: input.shippingPostalCode.trim(),
        shippingCountry: input.shippingCountry.trim().toUpperCase(),
        fulfillmentStatus: "PENDING_VENDOR",
      },
      include: {
        product: true,
        vendor: true,
      },
    });

    const updatedSend = await tx.giftSend.update({
      where: { id: giftSend.id },
      data: {
        status: "CLAIMED",
        preferredRegion: region,
        thankYouNote: input.thankYouNote?.trim() || "",
        claimedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: giftSend.recipientUserId,
        actorRole: "RECIPIENT",
        action: "GIFT_CLAIMED",
        entityType: "GiftSend",
        entityId: giftSend.id,
        metadataJson: JSON.stringify({
          productId: product.id,
          productTitle: product.title,
          region,
          retailAmountCents,
          surplusRefundCents,
        }),
      },
    });

    return { giftSend: updatedSend, giftOrder: order, surplusRefundCents };
  });
}

export async function saveRecipientThankYouNote(claimToken: string, thankYouNote: string) {
  const cleaned = thankYouNote.trim();
  if (!cleaned) {
    throw new Error("Thank-you note cannot be empty.");
  }

  return prisma.giftSend.update({
    where: { claimToken },
    data: { thankYouNote: cleaned },
  });
}

export async function getRecipientPortalData(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("Recipient account not found.");
  }

  const gifts = await prisma.giftSend.findMany({
    where: {
      OR: [{ recipientUserId: user.id }, { recipientEmail: user.email.toLowerCase() }],
    },
    include: {
      company: {
        select: { id: true, name: true, brandColor: true },
      },
      campaign: {
        select: { id: true, title: true, occasion: true },
      },
      giftOrder: {
        include: {
          product: {
            include: {
              vendor: {
                select: { businessName: true, hqCountry: true },
              },
            },
          },
          charity: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    user,
    gifts,
    metrics: {
      totalReceived: gifts.length,
      actionRequired: gifts.filter(
        (g) => ["SENT", "OPENED"].includes(g.status) && g.expiresAt.getTime() > Date.now()
      ).length,
      inTransit: gifts.filter((g) => ["CLAIMED", "PROCESSING", "SHIPPED"].includes(g.status))
        .length,
      completed: gifts.filter((g) => ["DELIVERED", "DONATED"].includes(g.status)).length,
    },
  };
}
