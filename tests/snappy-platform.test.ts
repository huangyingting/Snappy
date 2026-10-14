import { describe, it, expect, beforeAll } from "vitest";
import { seedDatabase } from "../prisma/seed";
import {
  enrollCorporate,
  enrollVendor,
  enrollRecipient,
  authenticateUser,
  lookupClaimByCode,
} from "@/lib/services/auth-service";
import {
  getVendorDashboard,
  createVendorProduct,
  updateVendorProduct,
  cloneVendorProduct,
  archiveOrDeleteVendorProduct,
  fulfillVendorOrder,
  appendOrderShipmentCheckpoint,
} from "@/lib/services/vendor-service";
import {
  getCorporateDashboard,
  depositCorporateWallet,
  createCustomCollection,
  createCampaignAndOptionallySend,
} from "@/lib/services/corporate-service";
import {
  getClaimExperienceByToken,
  redeemGiftByToken,
  saveRecipientThankYouNote,
  getRecipientPortalData,
  updateRecipientOrderDelivery,
  swapRecipientOrderGift,
  saveRecipientAddress,
  deleteRecipientAddress,
} from "@/lib/services/recipient-service";
import {
  getAdminDashboard,
  updateVendorGovernance,
  reclaimExpiredGifts,
  upsertGiftCategory,
} from "@/lib/services/admin-service";
import { verifySessionToken } from "@/lib/auth";

describe("Snappy Multi-Role Gifting Platform — End-to-End Domain & Integration Suite", () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it("1. Enrolls a new Corporate Customer with workspace, initial wallet deposit, and signed session", async () => {
    const res = await enrollCorporate({
      name: "claire.hr",
      email: "claire@stellar-ai.io",
      password: "Password123!",
      companyName: "Stellar AI Labs",
      industry: "Artificial Intelligence",
      sizeBand: "201-1000",
      primaryRegion: "NA",
      brandColor: "#6366F1",
      hideRecipientAddress: true,
      initialDepositCents: 300000, // $3,000.00
    });

    expect(res.user.role).toBe("CORPORATE");
    expect(res.company.name).toBe("Stellar AI Labs");
    expect(res.company.walletBalanceCents).toBe(300000);
    expect(res.company.escrowBalanceCents).toBe(0);
    expect(res.redirectTo).toBe("/corporate");

    const verified = verifySessionToken(res.token);
    expect(verified?.role).toBe("CORPORATE");
    expect(verified?.companyId).toBe(res.company.id);
  });

  it("2. Enrolls a new Regional Gift Vendor covering EMEA and APAC and publishes a regional SKU", async () => {
    const enrolled = await enrollVendor({
      name: "Henrik Larsen",
      email: "henrik@copenhagen-design.dk",
      password: "Password123!",
      businessName: "Copenhagen Design House",
      taxId: "DK-VAT-39104912",
      hqCountry: "DK",
      supportedRegions: ["EMEA", "APAC"],
      slaDays: 2,
    });

    expect(enrolled.user.role).toBe("VENDOR");
    expect(enrolled.vendor.supportedRegions).toBe("EMEA,APAC");

    const sku = await createVendorProduct({
      vendorId: enrolled.vendor.id,
      actorUserId: enrolled.user.id,
      title: "Danish Sculptural Desk Lamp",
      description: "Cordless rechargeable brass desk lamp with warm dimmer.",
      category: "Home & Living",
      priceCents: 8000, // $80.00
      stockQuantity: 30,
      supportedRegions: ["EMEA", "APAC"],
    });

    expect(sku.priceCents).toBe(8000);
    expect(sku.supportedRegions).toBe("EMEA,APAC");

    const dashboard = await getVendorDashboard(enrolled.vendor.id);
    expect(dashboard.metrics.totalProducts).toBe(1);
    expect(dashboard.metrics.activeProducts).toBe(1);
  });

  it("3. Enrolls a Recipient account and links existing gifts by email", async () => {
    const enrolled = await enrollRecipient({
      name: "Mateo Silva",
      email: "mateo.silva@acmecloud.io",
      password: "Password123!",
      preferredRegion: "LATAM",
      defaultAddressLine1: "Av. Paulista 1000",
      defaultCity: "São Paulo",
      defaultCountry: "BR",
    });

    expect(enrolled.user.role).toBe("RECIPIENT");
    const portal = await getRecipientPortalData(enrolled.user.id);
    expect(portal.gifts.length).toBeGreaterThanOrEqual(1);
    expect(portal.gifts[0].claimCode).toBe("SNPY-LA50D2");
  });

  it("4. Authenticates users with role enforcement and resolves Magic Claim Codes", async () => {
    const adminLogin = await authenticateUser(
      "admin@snappy.com",
      "SnappyPass123!",
      "ADMIN"
    );
    expect(adminLogin.user.role).toBe("ADMIN");
    expect(adminLogin.redirectTo).toBe("/admin");

    await expect(
      authenticateUser("admin@snappy.com", "SnappyPass123!", "CORPORATE")
    ).rejects.toThrow(/registered as ADMIN/);

    const claimLookup = await lookupClaimByCode("SNPY-NA100A", "alex.rivera@acmecloud.io");
    expect(claimLookup.claimToken).toBe("snappy_demo_na_100");
    expect(claimLookup.redirectTo).toBe("/claim/snappy_demo_na_100");
  });

  it("5. Corporate Wallet Deposit, Custom Collection Creation, and Campaign Escrow Hold", async () => {
    const corpLogin = await authenticateUser(
      "sarah.chen@acmecloud.io",
      "SnappyPass123!",
      "CORPORATE"
    );
    const companyId = corpLogin.user.companyId!;

    const beforeDash = await getCorporateDashboard(companyId);
    const initialWallet = beforeDash.company.walletBalanceCents;
    const initialEscrow = beforeDash.company.escrowBalanceCents;

    // Deposit $1,000.00 (100000 cents)
    const dep = await depositCorporateWallet({
      companyId,
      amountCents: 100000,
      note: "Automated Test Deposit",
      actorUserId: corpLogin.user.id,
    });
    expect(dep.company.walletBalanceCents).toBe(initialWallet + 100000);

    // Create custom collection
    const productIds = beforeDash.allActiveProducts.slice(0, 4).map((p) => p.id);
    const customCol = await createCustomCollection({
      companyId,
      title: "Acme Engineering Spotlight",
      description: "Curated tech and coffee favorites",
      occasion: "Spot Recognition",
      budgetTierCents: 10000,
      productIds,
      actorUserId: corpLogin.user.id,
    });
    expect(customCol.isGlobal).toBe(false);

    // Launch a $100 campaign for 2 recipients ($200 total escrow hold)
    const launched = await createCampaignAndOptionallySend({
      companyId,
      actorUserId: corpLogin.user.id,
      title: "Ship-It Award Winners",
      occasion: "Spot Recognition",
      messageTemplate: "Congrats on shipping the v4 release!",
      budgetCents: 10000,
      collectionId: customCol.id,
      allowCharity: true,
      recipients: [
        {
          recipientName: "Devon Price",
          recipientEmail: "devon.price@acmecloud.io",
          preferredRegion: "NA",
        },
        {
          recipientName: "Sora Takahashi",
          recipientEmail: "sora.takahashi@acmecloud.io",
          preferredRegion: "APAC",
        },
      ],
    });

    expect(launched.giftSends).toHaveLength(2);

    const afterDash = await getCorporateDashboard(companyId);
    expect(afterDash.company.walletBalanceCents).toBe(initialWallet + 100000 - 20000);
    expect(afterDash.company.escrowBalanceCents).toBe(initialEscrow + 20000);
  });

  it("6. Dynamically filters Recipient Claim Catalog by Region, redeems Physical Gift, refunds Escrow surplus, and fulfills Vendor Order", async () => {
    // Inspect NA claim link ($100 budget)
    const naClaim = await getClaimExperienceByToken("snappy_demo_na_100", "NA");
    expect(naClaim.giftSend.status).toBe("OPENED");
    expect(naClaim.eligibleProducts.length).toBeGreaterThan(0);
    expect(
      naClaim.eligibleProducts.every(
        (p) => p.priceCents <= 10000 && p.supportedRegions.includes("NA")
      )
    ).toBe(true);

    // Switch region to LATAM on the same claim token and verify all returned products support LATAM
    const latamClaim = await getClaimExperienceByToken("snappy_demo_na_100", "LATAM");
    expect(
      latamClaim.eligibleProducts.every((p) => p.supportedRegions.includes("LATAM"))
    ).toBe(true);

    // Pick a $45 product (MagSafe Dock) on a $100 budget gift -> should refund $55 (5500 cents) surplus back to Acme Cloud wallet!
    const underBudgetProduct =
      naClaim.eligibleProducts.find((p) => p.priceCents < 10000) ||
      naClaim.eligibleProducts[0];
    const expectedSurplus = 10000 - underBudgetProduct.priceCents;

    const corpBefore = await getCorporateDashboard(naClaim.giftSend.company.id);

    const redeemed = await redeemGiftByToken({
      claimToken: "snappy_demo_na_100",
      orderType: "PHYSICAL_GIFT",
      productId: underBudgetProduct.id,
      recipientRegion: "NA",
      shippingName: "Alex Rivera",
      shippingAddressLine1: "742 Evergreen Terrace",
      shippingCity: "Austin",
      shippingState: "TX",
      shippingPostalCode: "78701",
      shippingCountry: "US",
      thankYouNote: "Huge thanks to the Acme leadership team!",
    });

    expect(redeemed.giftSend.status).toBe("CLAIMED");
    expect(redeemed.surplusRefundCents).toBe(expectedSurplus);

    // Verify Corporate Wallet received the surplus refund and Recipient Address is shielded!
    const corpAfter = await getCorporateDashboard(naClaim.giftSend.company.id);
    expect(corpAfter.company.walletBalanceCents).toBe(
      corpBefore.company.walletBalanceCents + expectedSurplus
    );
    const matchingSend = corpAfter.allGiftSends.find(
      (gs) => gs.claimToken === "snappy_demo_na_100"
    );
    expect(matchingSend?.giftOrder?.shippingAddressLine1).toContain("Hidden by Recipient Privacy Shield");

    // Verify Vendor can transition order PENDING_VENDOR -> SHIPPED -> DELIVERED
    const vendorId = redeemed.giftOrder.vendorId!;
    const shippedOrder = await fulfillVendorOrder({
      vendorId,
      orderId: redeemed.giftOrder.id,
      fulfillmentStatus: "SHIPPED",
      trackingCarrier: "FedEx Priority",
      trackingNumber: "FDX-9988776655",
    });
    expect(shippedOrder.fulfillmentStatus).toBe("SHIPPED");
    expect(shippedOrder.trackingNumber).toBe("FDX-9988776655");

    const deliveredOrder = await fulfillVendorOrder({
      vendorId,
      orderId: redeemed.giftOrder.id,
      fulfillmentStatus: "DELIVERED",
    });
    expect(deliveredOrder.fulfillmentStatus).toBe("DELIVERED");
  });

  it("7. Redeems a Gift for 100% Charitable Donation and updates thank-you note", async () => {
    const apacClaim = await getClaimExperienceByToken("snappy_demo_apac_50", "APAC");
    expect(apacClaim.charities.length).toBeGreaterThan(0);
    const targetCharity = apacClaim.charities[0];

    const donationRes = await redeemGiftByToken({
      claimToken: "snappy_demo_apac_50",
      orderType: "CHARITY_DONATION",
      charityId: targetCharity.id,
      recipientRegion: "APAC",
      thankYouNote: "Donated my onboarding gift to protect our oceans!",
    });

    expect(donationRes.giftSend.status).toBe("DONATED");
    expect(donationRes.giftOrder.orderType).toBe("CHARITY_DONATION");

    const updatedNote = await saveRecipientThankYouNote(
      "snappy_demo_apac_50",
      "Updated thank-you note: Grateful to donate to Ocean Cleanse!"
    );
    expect(updatedNote.thankYouNote).toContain("Grateful to donate");
  });

  it("8. Platform Admin approves pending vendor and sweeps expired unclaimed gift escrow back to Corporate Wallet", async () => {
    const adminBefore = await getAdminDashboard();
    expect(adminBefore.metrics.pendingVendorsCount).toBeGreaterThanOrEqual(1);
    expect(adminBefore.metrics.expiredUnclaimedCount).toBeGreaterThanOrEqual(1);

    const pendingVendor = adminBefore.vendors.find((v) => v.status === "PENDING")!;
    const approved = await updateVendorGovernance({
      vendorId: pendingVendor.id,
      status: "APPROVED",
    });
    expect(approved.status).toBe("APPROVED");

    const sweepResult = await reclaimExpiredGifts();
    expect(sweepResult.reclaimedCount).toBeGreaterThanOrEqual(1);
    expect(sweepResult.totalReclaimedCents).toBeGreaterThanOrEqual(5000);

    const adminAfter = await getAdminDashboard();
    expect(adminAfter.metrics.expiredUnclaimedCount).toBe(0);
  });

  it("9. V2 Gift Category Taxonomy & Vendor Product Lifecycle (Variants, Specs, Clone, Archive)", async () => {
    const newCat = await upsertGiftCategory({
      slug: "executive-atelier",
      name: "Executive Atelier",
      tagline: "Heirloom desk objects and bespoke leather goods.",
      description: "Curated luxury desk essentials for leadership milestones.",
      accentColor: "#8B5E3C",
      sortOrder: 7,
    });
    expect(newCat.slug).toBe("executive-atelier");

    const vendorLogin = await authenticateUser(
      "partner@apextech.io",
      "SnappyPass123!",
      "VENDOR"
    );
    const vendorId = vendorLogin.user.vendorId!;

    const created = await createVendorProduct({
      vendorId,
      actorUserId: vendorLogin.user.id,
      title: "Solid Walnut Fountain Pen Case",
      description: "Hand-turned walnut desk pen case with brass magnetic clasp.",
      category: "Executive Atelier",
      badgeText: "Limited Studio",
      priceCents: 6500,
      stockQuantity: 25,
      supportedRegions: ["NA", "EMEA"],
      variants: ["Natural Walnut", "Smoked Ebony"],
      tags: ["walnut", "desk", "heirloom"],
      specs: { Material: "American Black Walnut", Clasp: "Solid Brass" },
    });
    expect(created.categoryId).toBe(newCat.id);
    expect(created.variantsJson).toContain("Natural Walnut");

    const updated = await updateVendorProduct(vendorId, created.id, {
      priceCents: 7000,
      stockQuantity: 40,
    });
    expect(updated.priceCents).toBe(7000);
    expect(updated.stockQuantity).toBe(40);

    const cloned = await cloneVendorProduct(vendorId, created.id, vendorLogin.user.id);
    expect(cloned.title).toContain("(Atelier Edition)");
    expect(cloned.id).not.toBe(created.id);

    const removed = await archiveOrDeleteVendorProduct(
      vendorId,
      cloned.id,
      vendorLogin.user.id
    );
    expect("deleted" in removed && removed.deleted).toBe(true);
  });

  it("10. V2 Recipient Delivery Suite: Saved Address Book, Pre-Shipment Delivery Edit, and Transactional Gift Swap", async () => {
    const elenaLogin = await authenticateUser(
      "elena.rostova@acmecloud.io",
      "SnappyPass123!",
      "RECIPIENT"
    );

    // Add a saved address to Elena's Address Book
    const newAddr = await saveRecipientAddress({
      userId: elenaLogin.user.id,
      label: "Berlin Studio",
      recipientName: "Elena Rostova",
      recipientPhone: "+49-30-555-0199",
      addressLine1: "Torstrasse 112",
      city: "Berlin",
      postalCode: "10119",
      country: "DE",
      region: "EMEA",
      deliveryInstructions: "Leave at courtyard studio reception",
      isDefault: true,
    });
    expect(newAddr.label).toBe("Berlin Studio");
    expect(newAddr.isDefault).toBe(true);

    // Inspect Elena's claimed order (token: snappy_claimed_pending_1, currently PENDING_VENDOR & unlocked)
    const emeaExp = await getClaimExperienceByToken("snappy_claimed_pending_1", "EMEA");
    const order = emeaExp.giftSend.giftOrder!;
    expect(order.addressLocked).toBe(false);

    // 1. Pre-shipment address & courier instructions update
    const updatedDelivery = await updateRecipientOrderDelivery({
      orderId: order.id,
      claimToken: "snappy_claimed_pending_1",
      actorUserId: elenaLogin.user.id,
      shippingName: "Elena Rostova",
      shippingPhone: "+49-30-555-0199",
      shippingAddressLine1: "Torstrasse 112",
      shippingCity: "Berlin",
      shippingPostalCode: "10119",
      shippingCountry: "DE",
      deliveryInstructions: "Ring studio bell #3",
      selectedVariant: "230V EU Plug",
    });
    expect(updatedDelivery?.shippingCity).toBe("Berlin");
    expect(updatedDelivery?.deliveryInstructions).toBe("Ring studio bell #3");
    expect(updatedDelivery?.shipmentEvents.some((e) => e.stage === "ADDRESS_UPDATED")).toBe(
      true
    );

    // 2. Pre-shipment transactional gift swap to another EMEA-eligible product
    const alternativeProduct = emeaExp.eligibleProducts.find(
      (p) => p.id !== order.productId
    )!;
    expect(alternativeProduct).toBeDefined();

    const swappedOrder = await swapRecipientOrderGift({
      orderId: order.id,
      newProductId: alternativeProduct.id,
      selectedVariant: "Signature Edition",
      claimToken: "snappy_claimed_pending_1",
      actorUserId: elenaLogin.user.id,
    });
    expect(swappedOrder?.productId).toBe(alternativeProduct.id);
    expect(swappedOrder?.swapCount).toBeGreaterThanOrEqual(1);
    expect(swappedOrder?.shipmentEvents.some((e) => e.stage === "GIFT_SWAPPED")).toBe(true);

    // Clean up saved address
    const deleted = await deleteRecipientAddress(elenaLogin.user.id, newAddr.id);
    expect(deleted.deleted).toBe(true);
  });

  it("11. V2 Multi-Checkpoint Carrier Logistics & Automatic Address Lock on Dispatch", async () => {
    const emeaExp = await getClaimExperienceByToken("snappy_claimed_pending_1", "EMEA");
    const order = emeaExp.giftSend.giftOrder!;
    const vendorId = order.vendorId!;

    // Append custom warehouse checkpoint
    const checkpoint = await appendOrderShipmentCheckpoint({
      vendorId,
      orderId: order.id,
      stage: "PROCESSING",
      title: "Gift Custom-Wrapped at Amsterdam Atelier",
      description: "Embossed linen card enclosed and passed quality inspection.",
      location: "Amsterdam, NL",
    });
    expect(checkpoint.title).toContain("Amsterdam Atelier");

    // Dispatch via DHL Express -> should auto-lock recipient address edits
    const dispatched = await fulfillVendorOrder({
      vendorId,
      orderId: order.id,
      fulfillmentStatus: "SHIPPED",
      trackingCarrier: "DHL Express EuroPlus",
      trackingNumber: "DHL-NL-77441122",
      serviceLevel: "DHL Express Next-Day",
      fulfillmentWarehouse: "Amsterdam Schiphol Hub, NL",
      packageWeightGrams: 1150,
      checkpointLocation: "Amsterdam, NL",
    });
    expect(dispatched.addressLocked).toBe(true);

    // Verify pre-shipment delivery edit is now blocked because carrier label is active
    await expect(
      updateRecipientOrderDelivery({
        orderId: order.id,
        claimToken: "snappy_claimed_pending_1",
        shippingName: "Elena Rostova",
        shippingAddressLine1: "Blocked Street 1",
        shippingCity: "Munich",
        shippingPostalCode: "80331",
        shippingCountry: "DE",
      })
    ).rejects.toThrow(/locked/i);
  });
});
