import { prisma } from "@/lib/prisma";
import { regionSupports, type RegionCode } from "@/lib/constants";

export async function getClaimExperienceByToken(claimToken: string, requestedRegion?: string) {
  const giftSend = await prisma.giftSend.findFirst({
    where: {
      OR: [{ claimToken }, { claimCode: claimToken.trim().toUpperCase() }],
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
        include: {
          product: {
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
      regionSupports(p.supportedRegions, activeRegion)
    );
  }

  const [charities, savedAddresses, giftCategories] = await Promise.all([
    giftSend.campaign.allowCharity
      ? prisma.charity.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.recipientAddress.findMany({
      where: { recipientEmail: giftSend.recipientEmail.toLowerCase() },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.giftCategory.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  return {
    giftSend,
    activeRegion,
    isExpired: isPastExpiry || giftSend.status === "EXPIRED",
    isAlreadyClaimed: !["SENT", "OPENED", "EXPIRED"].includes(giftSend.status),
    eligibleProducts,
    charities,
    savedAddresses,
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
  addressLabel?: string;
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

    // Extract weight from specifications if available
    let packageWeightGrams = 650;
    try {
      const specs = JSON.parse(product.specificationsJson || "{}");
      if (typeof specs.weightGrams === "number" && specs.weightGrams > 0) {
        packageWeightGrams = Math.round(specs.weightGrams);
      }
    } catch {
      // ignore
    }

    const warehouseByRegion: Record<string, string> = {
      NA: "Austin NA Fulfillment Hub (ATX-01)",
      EMEA: "Rotterdam EMEA Atelier Hub (RTM-02)",
      APAC: "Kyoto APAC Fulfillment Hub (KYO-01)",
      LATAM: "São Paulo LATAM Hub (GRU-01)",
    };

    const estimatedDeliveryAt = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * Math.max(2, (product.vendor.slaDays || 2) + 2)
    );

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
        fulfillmentWarehouse:
          warehouseByRegion[region] || `${product.vendor.hqCountry} Fulfillment Hub`,
        packageWeightGrams,
        estimatedDeliveryAt,
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
        title: "Gift Claimed & Routed to Local Regional Hub",
        description: `Order routed to ${product.vendor.businessName} (${order.fulfillmentWarehouse}). Delivery address and gift selection remain editable until carrier manifest.`,
        location: order.fulfillmentWarehouse,
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
  const cleaned = thankYouNote.trim();
  if (!cleaned) {
    throw new Error("Thank-you note cannot be empty.");
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
  return prisma.$transaction(async (tx) => {
    const order = await tx.giftOrder.findUnique({
      where: { id: input.orderId },
      include: { giftSend: true },
    });

    if (!order) {
      throw new Error("Gift order not found.");
    }

    // Verify ownership by claimToken or userId
    if (input.claimToken && order.giftSend.claimToken !== input.claimToken) {
      throw new Error("Unauthorized to modify this gift order.");
    }
    if (input.userId && !input.claimToken) {
      const user = await tx.user.findUnique({ where: { id: input.userId } });
      if (
        !user ||
        (order.giftSend.recipientUserId !== user.id &&
          order.giftSend.recipientEmail.toLowerCase() !== user.email.toLowerCase())
      ) {
        throw new Error("Unauthorized to modify this gift order.");
      }
    }

    if (
      order.addressLocked ||
      !["PENDING_VENDOR", "PROCESSING"].includes(order.fulfillmentStatus)
    ) {
      throw new Error(
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
      throw new Error("Complete street address, city, postal code, and country are required.");
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
  return prisma.$transaction(async (tx) => {
    const order = await tx.giftOrder.findUnique({
      where: { id: input.orderId },
      include: {
        giftSend: {
          include: { company: true },
        },
        product: true,
      },
    });

    if (!order || order.orderType !== "PHYSICAL_GIFT") {
      throw new Error("Physical gift order not found.");
    }

    if (input.claimToken && order.giftSend.claimToken !== input.claimToken) {
      throw new Error("Unauthorized to swap this gift order.");
    }
    if (input.userId && !input.claimToken) {
      const user = await tx.user.findUnique({ where: { id: input.userId } });
      if (
        !user ||
        (order.giftSend.recipientUserId !== user.id &&
          order.giftSend.recipientEmail.toLowerCase() !== user.email.toLowerCase())
      ) {
        throw new Error("Unauthorized to swap this gift order.");
      }
    }

    if (
      order.addressLocked ||
      !["PENDING_VENDOR", "PROCESSING"].includes(order.fulfillmentStatus)
    ) {
      throw new Error("Gift can no longer be swapped because carrier dispatch has already started.");
    }

    if (order.productId === input.newProductId) {
      throw new Error("Please choose a different gift item to exchange.");
    }

    const newProduct = await tx.product.findUnique({
      where: { id: input.newProductId },
      include: { vendor: true },
    });

    if (!newProduct || !newProduct.active || newProduct.vendor.status !== "APPROVED") {
      throw new Error("Selected replacement gift is not currently available.");
    }
    if (newProduct.stockQuantity <= 0) {
      throw new Error("Selected replacement gift is out of stock.");
    }
    if (newProduct.priceCents > order.giftSend.budgetCents) {
      throw new Error("Replacement gift exceeds the campaign budget allowance.");
    }
    if (!regionSupports(newProduct.supportedRegions, order.recipientRegion)) {
      throw new Error(
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
    const warehouseByRegion: Record<string, string> = {
      NA: "Austin NA Fulfillment Hub (ATX-01)",
      EMEA: "Rotterdam EMEA Atelier Hub (RTM-02)",
      APAC: "Kyoto APAC Fulfillment Hub (KYO-01)",
      LATAM: "São Paulo LATAM Hub (GRU-01)",
    };

    const updatedOrder = await tx.giftOrder.update({
      where: { id: order.id },
      data: {
        productId: newProduct.id,
        vendorId: newProduct.vendorId,
        retailAmountCents: newRetailCents,
        vendorPayoutCents: newVendorPayoutCents,
        platformFeeCents: newPlatformFeeCents,
        selectedVariant: input.selectedVariant?.trim() || "",
        fulfillmentWarehouse:
          warehouseByRegion[order.recipientRegion] ||
          `${newProduct.vendor.hqCountry} Fulfillment Hub`,
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
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) {
    throw new Error("Recipient user not found.");
  }

  return prisma.$transaction(async (tx) => {
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
        throw new Error("Address entry not found.");
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
    throw new Error("Recipient user not found.");
  }

  const existing = await prisma.recipientAddress.findUnique({
    where: { id: addressId },
  });
  if (
    !existing ||
    (existing.userId !== user.id &&
      existing.recipientEmail.toLowerCase() !== user.email.toLowerCase())
  ) {
    throw new Error("Address not found.");
  }

  await prisma.recipientAddress.delete({ where: { id: addressId } });
  return { deleted: true, id: addressId };
}

export async function getRecipientPortalData(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("Recipient account not found.");
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
    savedAddresses,
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
