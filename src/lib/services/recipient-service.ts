import { prisma } from "@/lib/prisma";
import { regionSupports, type RegionCode } from "@/lib/constants";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { transaction } from "@/lib/transaction";
import { regionSchema, shippingSchema } from "@/lib/validation";

export async function getClaimExperienceByToken(claimToken: string, requestedRegion?: string, viewerUserId?: string) {
  const giftSend = await prisma.giftSend.findFirst({
    where: {
      claimToken,
    },
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
                    omit: { wholesaleCostCents: true },
                    include: {
                      giftCategory: true,
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
        omit: { vendorPayoutCents: true, platformFeeCents: true, settlementReference: true },
        include: {
          product: {
            omit: { wholesaleCostCents: true },
            include: {
              giftCategory: true,
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
          shipmentEvents: {
            orderBy: { occurredAt: "asc" },
          },
        },
      },
    },
  });

  if (!giftSend) {
    throw new AppError("Gift invitation not found.");
  }

  // Transition SENT -> OPENED on first visit if not expired
  const isPastExpiry =
    giftSend.expiresAt.getTime() < Date.now() &&
    ["SENT", "OPENED"].includes(giftSend.status);

  if (giftSend.status === "SENT" && !isPastExpiry) {
    await prisma.giftSend.updateMany({
      where: { id: giftSend.id, status: "SENT" },
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
  regionSchema.parse(activeRegion);

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
      regionSupports(p.vendor.supportedRegions, activeRegion) &&
      regionSupports(p.supportedRegions, activeRegion)
  );

  // Unrestricted campaigns use the approved regional catalog.
  if (!giftSend.campaign.collectionId) {
    const allApprovedProducts = await prisma.product.findMany({
      omit: { wholesaleCostCents: true },
      where: {
        active: true,
        stockQuantity: { gt: 0 },
        priceCents: { lte: giftSend.budgetCents },
        vendor: { status: "APPROVED" },
      },
      include: {
        giftCategory: true,
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
      regionSupports(p.supportedRegions, activeRegion) && regionSupports(p.vendor.supportedRegions, activeRegion)
    );
  }

  const [charities, savedAddresses, giftCategories] = await Promise.all([
    giftSend.campaign.allowCharity
      ? prisma.charity.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    viewerUserId ? prisma.recipientAddress.findMany({
      where: { userId: viewerUserId, recipientEmail: giftSend.recipientEmail.toLowerCase() },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    }) : Promise.resolve([]),
    prisma.giftCategory.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  return {
    giftSend: {
      ...giftSend,
      campaign: {
        id: giftSend.campaign.id,
        title: giftSend.campaign.title,
        occasion: giftSend.campaign.occasion,
        allowCharity: giftSend.campaign.allowCharity,
      },
    },
    activeRegion,
    isExpired: isPastExpiry || giftSend.status === "EXPIRED",
    isAlreadyClaimed: !["SENT", "OPENED", "EXPIRED"].includes(giftSend.status),
    canSaveAddress: Boolean(viewerUserId && giftSend.recipientUserId === viewerUserId),
    eligibleProducts,
    charities,
    savedAddresses: savedAddresses.map((address) => ({ ...address, recipientPhone: address.phone })),
    giftCategories,
  };
}

export interface RedeemGiftInput {
  claimToken: string;
  orderType: "PHYSICAL_GIFT" | "CHARITY_DONATION";
  productId?: string;
  charityId?: string;
  recipientRegion: string;
  selectedVariant?: string;
  shippingName?: string;
  shippingPhone?: string;
  shippingAddressLine1?: string;
  shippingAddressLine2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
  deliveryInstructions?: string;
  saveToAddressBook?: boolean;
  viewerUserId?: string;
  addressLabel?: string;
  thankYouNote?: string;
}

export async function redeemGiftByToken(input: RedeemGiftInput) {
  z.enum(["PHYSICAL_GIFT", "CHARITY_DONATION"]).parse(input.orderType);
  const region = input.recipientRegion.trim().toUpperCase();
  regionSchema.parse(region);

  return transaction(async (tx) => {
    const giftSend = await tx.giftSend.findUnique({
      where: { claimToken: input.claimToken },
      include: {
        company: true,
        campaign: true,
        giftOrder: true,
      },
    });

    if (!giftSend) {
      throw new AppError("Gift invitation not found.");
    }

    if (giftSend.giftOrder || !["SENT", "OPENED"].includes(giftSend.status)) {
      throw new AppError("This gift has already been claimed or is no longer active.");
    }

    if (giftSend.expiresAt.getTime() < Date.now()) {
      throw new AppError("This gift invitation has expired.");
    }
    if (input.saveToAddressBook && (!input.viewerUserId || input.viewerUserId !== giftSend.recipientUserId)) {
      throw new AppError("Sign in as the invited recipient to save an address.", 403);
    }
    if (giftSend.company.escrowBalanceCents < giftSend.budgetCents) {
      throw new AppError("Escrow is not funded. Contact the sender.", 409);
    }
    const reserved = await tx.giftSend.updateMany({
      where: { id: giftSend.id, status: { in: ["SENT", "OPENED"] } },
      data: { status: "CLAIMED" },
    });
    if (!reserved.count) throw new AppError("This gift has already been claimed.", 409);

    if (input.orderType === "CHARITY_DONATION") {
      if (!giftSend.campaign.allowCharity) {
        throw new AppError("Charitable donations are not enabled for this campaign.");
      }
      if (!input.charityId) {
        throw new AppError("Please select a charity partner.");
      }

      const charity = await tx.charity.findUnique({
        where: { id: input.charityId },
      });
      if (!charity || !charity.active) {
        throw new AppError("Selected charity partner is not available.");
      }

      // Release escrow for the gift budget
      await tx.company.update({
        where: { id: giftSend.companyId },
        data: {
          escrowBalanceCents: {
            decrement: giftSend.budgetCents,
          },
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
          fulfillmentStatus: "PENDING_SETTLEMENT",
        },
        include: { charity: true },
      });

      const updatedSend = await tx.giftSend.update({
        where: { id: giftSend.id },
        data: {
          status: "DONATION_PENDING",
          preferredRegion: region,
          thankYouNote: input.thankYouNote?.trim() || "",
          claimedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: giftSend.recipientUserId,
          actorRole: "RECIPIENT",
          action: "CHARITY_DONATION_REQUESTED",
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
    input = { ...input, ...shippingSchema.parse(input) };
    if (!input.productId) {
      throw new AppError("Please select a gift item to claim.");
    }
    if (
      !input.shippingName?.trim() ||
      !input.shippingAddressLine1?.trim() ||
      !input.shippingCity?.trim() ||
      !input.shippingPostalCode?.trim() ||
      !input.shippingCountry?.trim()
    ) {
      throw new AppError("Complete shipping address is required to deliver your gift.");
    }

    const product = await tx.product.findUnique({
      where: { id: input.productId },
      include: { vendor: true },
    });

    if (!product || !product.active) {
      throw new AppError("Selected product is no longer available.");
    }
    if (product.vendor.status !== "APPROVED") {
      throw new AppError("Vendor for this product is not currently active.");
    }
    if (product.stockQuantity <= 0) {
      throw new AppError("Sorry, this product is currently out of stock.");
    }
    if (product.priceCents > giftSend.budgetCents) {
      throw new AppError("Selected product exceeds the gift budget allowance.");
    }
    if (giftSend.campaign.collectionId && !await tx.collectionProduct.findUnique({
      where: { collectionId_productId: { collectionId: giftSend.campaign.collectionId, productId: product.id } },
    })) throw new AppError("This product is not in the invitation's collection.");
    if (!regionSupports(product.vendor.supportedRegions, region)) throw new AppError("This vendor does not fulfill that region.");
    if (!regionSupports(product.supportedRegions, region)) {
      throw new AppError(
        `This product does not ship to region ${region} (supported: ${product.supportedRegions}).`
      );
    }

    // 1. Decrement product inventory
    const inventory = await tx.product.updateMany({
      where: { id: product.id, stockQuantity: { gt: 0 } },
      data: { stockQuantity: { decrement: 1 } },
    });
    if (!inventory.count) throw new AppError("This product is out of stock.", 409);

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
          decrement: giftSend.budgetCents,
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

    // Extract weight from specifications if available
    const specs = JSON.parse(product.specificationsJson);
    const packageWeightGrams = typeof specs.weightGrams === "number" ? specs.weightGrams : 0;

    // 5. Create GiftOrder & initial ShipmentEvent & update GiftSend
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
        selectedVariant: input.selectedVariant?.trim() || "",
        shippingName: input.shippingName.trim(),
        shippingPhone: input.shippingPhone?.trim() || "",
        shippingAddressLine1: input.shippingAddressLine1.trim(),
        shippingAddressLine2: input.shippingAddressLine2?.trim() || "",
        shippingCity: input.shippingCity.trim(),
        shippingState: input.shippingState?.trim() || "",
        shippingPostalCode: input.shippingPostalCode.trim(),
        shippingCountry: input.shippingCountry.trim().toUpperCase(),
        deliveryInstructions: input.deliveryInstructions?.trim() || "",
        packageWeightGrams,
        addressLocked: false,
        fulfillmentStatus: "PENDING_VENDOR",
      },
      include: {
        product: true,
        vendor: true,
      },
    });

    await tx.shipmentEvent.create({
      data: {
        giftOrderId: order.id,
        stage: "ORDER_CONFIRMED",
        title: "Gift selected and sent to vendor",
        description: `Order assigned to ${product.vendor.businessName}. Delivery details remain editable until dispatch.`,
        actorRole: "SYSTEM",
      },
    });

    if (input.saveToAddressBook) {
      const existingAddresses = await tx.recipientAddress.count({
        where: { recipientEmail: giftSend.recipientEmail.toLowerCase() },
      });
      await tx.recipientAddress.create({
        data: {
          recipientEmail: giftSend.recipientEmail.toLowerCase(),
          userId: giftSend.recipientUserId,
          label: input.addressLabel?.trim() || `Saved Address (${input.shippingCity.trim()})`,
          recipientName: input.shippingName.trim(),
          phone: input.shippingPhone?.trim() || "",
          addressLine1: input.shippingAddressLine1.trim(),
          addressLine2: input.shippingAddressLine2?.trim() || "",
          city: input.shippingCity.trim(),
          state: input.shippingState?.trim() || "",
          postalCode: input.shippingPostalCode.trim(),
          country: input.shippingCountry.trim().toUpperCase(),
          region,
          deliveryInstructions: input.deliveryInstructions?.trim() || "",
          isDefault: existingAddresses === 0,
        },
      });
    }

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
          selectedVariant: order.selectedVariant,
          region,
          retailAmountCents,
          surplusRefundCents,
        }),
      },
    });

    const fullOrder = await tx.giftOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: {
        product: true,
        vendor: true,
        shipmentEvents: {
          orderBy: { occurredAt: "asc" },
        },
      },
    });

    return { giftSend: updatedSend, giftOrder: fullOrder, surplusRefundCents };
  });
}

export async function saveRecipientThankYouNote(claimToken: string, thankYouNote: string) {
  const cleaned = z.string().trim().min(1).max(2000).parse(thankYouNote);
  if (!cleaned) {
    throw new AppError("Thank-you note cannot be empty.");
  }

  return prisma.giftSend.update({
    where: { claimToken },
    data: { thankYouNote: cleaned },
  });
}

export interface UpdateRecipientOrderDeliveryInput {
  orderId: string;
  claimToken?: string;
  userId?: string;
  shippingName: string;
  shippingPhone?: string;
  shippingAddressLine1: string;
  shippingAddressLine2?: string;
  shippingCity: string;
  shippingState?: string;
  shippingPostalCode: string;
  shippingCountry: string;
  deliveryInstructions?: string;
  selectedVariant?: string;
}

export async function updateRecipientOrderDelivery(input: UpdateRecipientOrderDeliveryInput) {
  input = { ...input, ...shippingSchema.parse(input) };
  if (!input.claimToken && !input.userId) throw new AppError("Recipient authorization required.", 403);
  return transaction(async (tx) => {
    const order = await tx.giftOrder.findUnique({
      where: { id: input.orderId },
      include: { giftSend: true },
    });

    if (!order) {
      throw new AppError("Gift order not found.");
    }

    // Verify ownership by claimToken or userId
    if (input.claimToken && order.giftSend.claimToken !== input.claimToken) {
      throw new AppError("Unauthorized to modify this gift order.");
    }
    if (input.userId && !input.claimToken) {
      const user = await tx.user.findUnique({ where: { id: input.userId } });
      if (
        !user ||
        (order.giftSend.recipientUserId !== user.id &&
          order.giftSend.recipientEmail.toLowerCase() !== user.email.toLowerCase())
      ) {
        throw new AppError("Unauthorized to modify this gift order.");
      }
    }

    if (
      order.addressLocked ||
      !["PENDING_VENDOR", "PROCESSING"].includes(order.fulfillmentStatus)
    ) {
      throw new AppError(
        "Shipping address is locked because carrier manifest / dispatch has already occurred."
      );
    }

    if (
      !input.shippingName?.trim() ||
      !input.shippingAddressLine1?.trim() ||
      !input.shippingCity?.trim() ||
      !input.shippingPostalCode?.trim() ||
      !input.shippingCountry?.trim()
    ) {
      throw new AppError("Complete street address, city, postal code, and country are required.");
    }

    const updated = await tx.giftOrder.update({
      where: { id: order.id },
      data: {
        shippingName: input.shippingName.trim(),
        shippingPhone:
          input.shippingPhone !== undefined ? input.shippingPhone.trim() : order.shippingPhone,
        shippingAddressLine1: input.shippingAddressLine1.trim(),
        shippingAddressLine2:
          input.shippingAddressLine2 !== undefined
            ? input.shippingAddressLine2.trim()
            : order.shippingAddressLine2,
        shippingCity: input.shippingCity.trim(),
        shippingState:
          input.shippingState !== undefined ? input.shippingState.trim() : order.shippingState,
        shippingPostalCode: input.shippingPostalCode.trim(),
        shippingCountry: input.shippingCountry.trim().toUpperCase(),
        deliveryInstructions:
          input.deliveryInstructions !== undefined
            ? input.deliveryInstructions.trim()
            : order.deliveryInstructions,
        selectedVariant:
          input.selectedVariant !== undefined
            ? input.selectedVariant.trim()
            : order.selectedVariant,
      },
      include: {
        product: true,
        shipmentEvents: {
          orderBy: { occurredAt: "asc" },
        },
      },
    });

    await tx.shipmentEvent.create({
      data: {
        giftOrderId: order.id,
        stage: "ADDRESS_UPDATED",
        title: "Delivery Destination & Instructions Updated by Recipient",
        description: `Updated destination: ${updated.shippingCity}, ${updated.shippingCountry}${
          updated.deliveryInstructions ? ` • Note: "${updated.deliveryInstructions}"` : ""
        }`,
        location: `${updated.shippingCity}, ${updated.shippingCountry}`,
        actorRole: "RECIPIENT",
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.userId || order.giftSend.recipientUserId,
        actorRole: "RECIPIENT",
        action: "ORDER_DELIVERY_UPDATED",
        entityType: "GiftOrder",
        entityId: order.id,
        metadataJson: JSON.stringify({
          shippingCity: updated.shippingCity,
          shippingCountry: updated.shippingCountry,
          selectedVariant: updated.selectedVariant,
        }),
      },
    });

    return tx.giftOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: {
        product: true,
        shipmentEvents: {
          orderBy: { occurredAt: "asc" },
        },
      },
    });
  });
}

export interface SwapRecipientOrderGiftInput {
  orderId: string;
  newProductId: string;
  selectedVariant?: string;
  claimToken?: string;
  userId?: string;
}

export async function swapRecipientOrderGift(input: SwapRecipientOrderGiftInput) {
  if (!input.claimToken && !input.userId) throw new AppError("Recipient authorization required.", 403);
  return transaction(async (tx) => {
    const order = await tx.giftOrder.findUnique({
      where: { id: input.orderId },
      include: {
        giftSend: {
          include: { company: true, campaign: true },
        },
        product: true,
      },
    });

    if (!order || order.orderType !== "PHYSICAL_GIFT") {
      throw new AppError("Physical gift order not found.");
    }

    if (input.claimToken && order.giftSend.claimToken !== input.claimToken) {
      throw new AppError("Unauthorized to swap this gift order.");
    }
    if (input.userId && !input.claimToken) {
      const user = await tx.user.findUnique({ where: { id: input.userId } });
      if (
        !user ||
        (order.giftSend.recipientUserId !== user.id &&
          order.giftSend.recipientEmail.toLowerCase() !== user.email.toLowerCase())
      ) {
        throw new AppError("Unauthorized to swap this gift order.");
      }
    }

    if (
      order.addressLocked ||
      !["PENDING_VENDOR", "PROCESSING"].includes(order.fulfillmentStatus)
    ) {
      throw new AppError("Gift can no longer be swapped because carrier dispatch has already started.");
    }

    if (order.productId === input.newProductId) {
      throw new AppError("Please choose a different gift item to exchange.");
    }

    const newProduct = await tx.product.findUnique({
      where: { id: input.newProductId },
      include: { vendor: true },
    });

    if (!newProduct || !newProduct.active || newProduct.vendor.status !== "APPROVED") {
      throw new AppError("Selected replacement gift is not currently available.");
    }
    if (newProduct.stockQuantity <= 0) {
      throw new AppError("Selected replacement gift is out of stock.");
    }
    if (newProduct.priceCents > order.giftSend.budgetCents) {
      throw new AppError("Replacement gift exceeds the campaign budget allowance.");
    }
    const collectionId = order.giftSend.campaign.collectionId;
    if (collectionId && !await tx.collectionProduct.findUnique({
      where: { collectionId_productId: { collectionId, productId: newProduct.id } },
    })) throw new AppError("Replacement gift is not in the invitation's collection.");
    if (!regionSupports(newProduct.vendor.supportedRegions, order.recipientRegion)) throw new AppError("This vendor does not fulfill that region.");
    if (!regionSupports(newProduct.supportedRegions, order.recipientRegion)) {
      throw new AppError(
        `Replacement gift does not ship to region ${order.recipientRegion}.`
      );
    }

    // 1. Restore old product stock & decrement new product stock
    if (order.productId) {
      await tx.product.update({
        where: { id: order.productId },
        data: { stockQuantity: { increment: 1 } },
      });
    }

    await tx.product.update({
      where: { id: newProduct.id },
      data: { stockQuantity: { decrement: 1 } },
    });

    // 2. Reverse old vendor payout & credit new vendor payout
    if (order.vendorId && order.vendorPayoutCents > 0) {
      await tx.vendor.update({
        where: { id: order.vendorId },
        data: { payoutBalanceCents: { decrement: order.vendorPayoutCents } },
      });
    }

    const newRetailCents = newProduct.priceCents;
    const newPlatformFeeCents = Math.round(
      (newRetailCents * newProduct.vendor.commissionRateBps) / 10000
    );
    const newVendorPayoutCents = newRetailCents - newPlatformFeeCents;

    await tx.vendor.update({
      where: { id: newProduct.vendorId },
      data: { payoutBalanceCents: { increment: newVendorPayoutCents } },
    });

    // 3. Reconcile corporate wallet if price changed between old item and new item
    const walletDeltaCents = order.retailAmountCents - newRetailCents;
    if (walletDeltaCents !== 0) {
      const company = await tx.company.findUniqueOrThrow({ where: { id: order.giftSend.companyId } });
      if (company.walletBalanceCents + walletDeltaCents < 0) {
        throw new AppError("The sender has insufficient available funds for this higher-priced replacement.");
      }
      const updatedCompany = await tx.company.update({
        where: { id: order.giftSend.companyId },
        data: {
          walletBalanceCents: { increment: walletDeltaCents },
        },
      });

      await tx.walletTransaction.create({
        data: {
          companyId: order.giftSend.companyId,
          type: walletDeltaCents > 0 ? "ESCROW_SURPLUS_REFUND" : "GIFT_SWAP_ADJUSTMENT",
          amountCents: walletDeltaCents,
          balanceAfter: updatedCompany.walletBalanceCents,
          escrowAfter: updatedCompany.escrowBalanceCents,
          note: `Pre-shipment gift swap by ${order.giftSend.recipientName}: exchanged "${
            order.product?.title || "previous item"
          }" ($${(order.retailAmountCents / 100).toFixed(2)}) for "${newProduct.title}" ($${(
            newRetailCents / 100
          ).toFixed(2)})`,
          referenceId: order.giftSend.id,
        },
      });
    }

    // 4. Update GiftOrder
    const updatedOrder = await tx.giftOrder.update({
      where: { id: order.id },
      data: {
        productId: newProduct.id,
        vendorId: newProduct.vendorId,
        retailAmountCents: newRetailCents,
        vendorPayoutCents: newVendorPayoutCents,
        platformFeeCents: newPlatformFeeCents,
        selectedVariant: input.selectedVariant?.trim() || "",
        fulfillmentWarehouse: "",
        trackingCarrier: "", trackingNumber: "", trackingUrl: "", estimatedDeliveryAt: null,
        fulfillmentStatus: "PENDING_VENDOR",
        swapCount: { increment: 1 },
      },
    });

    await tx.shipmentEvent.create({
      data: {
        giftOrderId: order.id,
        stage: "GIFT_SWAPPED",
        title: `Pre-Shipment Gift Exchanged for "${newProduct.title}"`,
        description: `Exchanged "${order.product?.title || "prior selection"}" for "${
          newProduct.title
        }" (${newProduct.vendor.businessName}). Inventory & vendor payout ledger automatically reconciled.`,
        location: updatedOrder.fulfillmentWarehouse,
        actorRole: "RECIPIENT",
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.userId || order.giftSend.recipientUserId,
        actorRole: "RECIPIENT",
        action: "GIFT_ORDER_SWAPPED",
        entityType: "GiftOrder",
        entityId: order.id,
        metadataJson: JSON.stringify({
          oldProductId: order.productId,
          newProductId: newProduct.id,
          newProductTitle: newProduct.title,
          walletDeltaCents,
        }),
      },
    });

    return tx.giftOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: {
        product: {
          include: {
            vendor: true,
            giftCategory: true,
          },
        },
        shipmentEvents: {
          orderBy: { occurredAt: "asc" },
        },
      },
    });
  });
}

export interface SaveRecipientAddressInput {
  userId: string;
  addressId?: string;
  label: string;
  recipientName: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  region: string;
  deliveryInstructions?: string;
  isDefault?: boolean;
}

export async function saveRecipientAddress(input: SaveRecipientAddressInput) {
  input = z.object({
    userId: z.string().min(1), addressId: z.string().min(1).optional(),
    label: z.string().trim().min(1).max(100), recipientName: z.string().trim().min(1).max(100),
    phone: z.string().trim().max(50).optional(), addressLine1: z.string().trim().min(1).max(200),
    addressLine2: z.string().trim().max(200).optional(), city: z.string().trim().min(1).max(100),
    state: z.string().trim().max(100).optional(), postalCode: z.string().trim().min(1).max(30),
    country: z.string().regex(/^[A-Z]{2}$/), region: regionSchema,
    deliveryInstructions: z.string().trim().max(1000).optional(), isDefault: z.boolean().optional(),
  }).parse(input);
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) {
    throw new AppError("Recipient user not found.");
  }

  return transaction(async (tx) => {
    if (input.isDefault) {
      await tx.recipientAddress.updateMany({
        where: {
          OR: [{ userId: user.id }, { recipientEmail: user.email.toLowerCase() }],
        },
        data: { isDefault: false },
      });
    }

    if (input.addressId) {
      const existing = await tx.recipientAddress.findUnique({
        where: { id: input.addressId },
      });
      if (
        !existing ||
        (existing.userId !== user.id &&
          existing.recipientEmail.toLowerCase() !== user.email.toLowerCase())
      ) {
        throw new AppError("Address entry not found.");
      }

      return tx.recipientAddress.update({
        where: { id: existing.id },
        data: {
          label: input.label.trim(),
          recipientName: input.recipientName.trim(),
          phone: input.phone?.trim() || "",
          addressLine1: input.addressLine1.trim(),
          addressLine2: input.addressLine2?.trim() || "",
          city: input.city.trim(),
          state: input.state?.trim() || "",
          postalCode: input.postalCode.trim(),
          country: input.country.trim().toUpperCase(),
          region: input.region.trim().toUpperCase(),
          deliveryInstructions: input.deliveryInstructions?.trim() || "",
          isDefault: input.isDefault ?? existing.isDefault,
        },
      });
    }

    const created = await tx.recipientAddress.create({
      data: {
        userId: user.id,
        recipientEmail: user.email.toLowerCase(),
        label: input.label.trim() || "Primary Address",
        recipientName: input.recipientName.trim() || user.name,
        phone: input.phone?.trim() || "",
        addressLine1: input.addressLine1.trim(),
        addressLine2: input.addressLine2?.trim() || "",
        city: input.city.trim(),
        state: input.state?.trim() || "",
        postalCode: input.postalCode.trim(),
        country: input.country.trim().toUpperCase(),
        region: input.region.trim().toUpperCase(),
        deliveryInstructions: input.deliveryInstructions?.trim() || "",
        isDefault: input.isDefault ?? true,
      },
    });

    if (created.isDefault) {
      await tx.user.update({
        where: { id: user.id },
        data: {
          preferredRegion: created.region,
          defaultAddressLine1: created.addressLine1,
          defaultCity: created.city,
          defaultState: created.state,
          defaultPostalCode: created.postalCode,
          defaultCountry: created.country,
        },
      });
    }

    return created;
  });
}

export async function deleteRecipientAddress(userId: string, addressId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError("Recipient user not found.");
  }

  const existing = await prisma.recipientAddress.findUnique({
    where: { id: addressId },
  });
  if (
    !existing ||
    (existing.userId !== user.id &&
      existing.recipientEmail.toLowerCase() !== user.email.toLowerCase())
  ) {
    throw new AppError("Address not found.");
  }

  await prisma.recipientAddress.delete({ where: { id: addressId } });
  return { deleted: true, id: addressId };
}

export async function getRecipientPortalData(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, omit: { passwordHash: true } });
  if (!user) {
    throw new AppError("Recipient account not found.");
  }

  const [gifts, savedAddresses, allActiveProducts, giftCategories] = await Promise.all([
    prisma.giftSend.findMany({
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
                giftCategory: true,
                vendor: {
                  select: { businessName: true, hqCountry: true },
                },
              },
            },
            charity: true,
            shipmentEvents: {
              orderBy: { occurredAt: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.recipientAddress.findMany({
      where: {
        OR: [{ userId: user.id }, { recipientEmail: user.email.toLowerCase() }],
      },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.product.findMany({
      where: {
        active: true,
        stockQuantity: { gt: 0 },
        vendor: { status: "APPROVED" },
      },
      include: {
        giftCategory: true,
        vendor: {
          select: { id: true, businessName: true, hqCountry: true, slaDays: true },
        },
      },
      orderBy: { priceCents: "desc" },
    }),
    prisma.giftCategory.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  return {
    user,
    gifts,
    savedAddresses: savedAddresses.map((address) => ({ ...address, recipientPhone: address.phone })),
    allActiveProducts,
    giftCategories,
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
