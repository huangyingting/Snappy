import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { enrollCorporate, enrollVendor, enrollRecipient, authenticateUser, consumeAccountToken, requestAccountEmail, lookupClaimByCode } from "@/lib/services/auth-service";
import { recordSettledPayment, createCampaignAndOptionallySend, getCorporateDashboard, createCustomCollection, dispatchGiftsToCampaign } from "@/lib/services/corporate-service";
import { createVendorProduct, fulfillVendorOrder, updateVendorProduct, getVendorDashboard } from "@/lib/services/vendor-service";
import { updateVendorGovernance, reclaimExpiredGifts, createGlobalCollection, createCharityPartner, settleCharityDonation } from "@/lib/services/admin-service";
import { getClaimExperienceByToken, redeemGiftByToken, getRecipientPortalData, saveRecipientAddress, updateRecipientOrderDelivery, swapRecipientOrderGift } from "@/lib/services/recipient-service";
import { deliverEmails } from "@/lib/email";
import { randomUUID } from "node:crypto";

const password = "Test-only-long-password-2026";
let adminId: string;
let companyId: string;
let corporateId: string;
let vendorId: string;
let recipientId: string;
let productId: string;
let secondProductId: string;
let claimToken: string;
let orderId: string;

async function emailToken(email: string, path: string) {
  const message = await prisma.emailMessage.findFirstOrThrow({ where: { to: email, text: { contains: `/auth/${path}?token=` } }, orderBy: { createdAt: "desc" } });
  return message.text.match(/token=([A-Za-z0-9_-]+)/)![1];
}

describe("Production workflows on an isolated empty database", () => {
  beforeAll(async () => {
    if (process.env.SNAPPY_TEST_RUN !== "1") throw new Error("Use npm test; never run domain tests against a working database.");
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.product.count()).toBe(0);
    adminId = (await prisma.user.create({
      data: { email: "operator@example.test", name: "Test Operator", role: "ADMIN", passwordHash: await hashPassword(password), emailVerified: new Date() },
    })).id;
  });
  afterAll(() => prisma.$disconnect());

  it("uses independent salted password hashes and rejects invalid/legacy hashes", async () => {
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword("wrong", first)).toBe(false);
    expect(await verifyPassword(password, "pbkdf2_v1$legacy")).toBe(false);
  });

  it("enrolls an unfunded company and requires single-use email verification", async () => {
    const result = await enrollCorporate({
      name: "Test Sender", email: "sender@example.test", password, companyName: "Integration Company",
      initialDepositCents: 900000,
    });
    companyId = result.company.id;
    corporateId = result.user.id;
    expect(result.company.walletBalanceCents).toBe(0);
    expect(await prisma.walletTransaction.count()).toBe(0);
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(await authenticateUser(result.user.email, password, "CORPORATE")).toBeNull();
    const token = await emailToken(result.user.email, "verify");
    expect(await prisma.authToken.findUnique({ where: { tokenHash: token } })).toBeNull();
    await consumeAccountToken(token, "verify");
    await expect(consumeAccountToken(token, "verify")).rejects.toThrow(/invalid|expired|used/);
    const login = await authenticateUser(result.user.email, password, "CORPORATE");
    expect(login?.id).toBe(corporateId);
    expect(login).not.toHaveProperty("passwordHash");
    expect(await authenticateUser(result.user.email, password, "ADMIN")).toBeNull();
  });

  it("validates registration and never allows vendor self-approval", async () => {
    await expect(enrollCorporate({ name: "x", email: "not-email", password: "short" })).rejects.toThrow();
    const result = await enrollVendor({
      name: "Test Supplier", email: "supplier@example.test", password,
      businessName: "Integration Supplier", taxId: "TEST-001", hqCountry: "US",
      supportedRegions: ["NA", "EMEA"], requireReview: false, status: "APPROVED",
    });
    vendorId = result.vendor.id;
    expect(result.vendor.status).toBe("PENDING");
    await consumeAccountToken(await emailToken(result.user.email, "verify"), "verify");
    const product = await createVendorProduct({
      vendorId, title: "Integration Product", description: "A product created solely by the integration test.",
      category: "Tech", priceCents: 4000, wholesaleCostCents: 2500,
      imageUrl: "https://example.test/product.jpg", stockQuantity: 5, supportedRegions: ["NA"],
    });
    productId = product.id;
    expect((await getCorporateDashboard(companyId)).allActiveProducts).toHaveLength(0);
    await updateVendorGovernance({ vendorId, status: "APPROVED", actorUserId: adminId });
    expect((await getCorporateDashboard(companyId)).allActiveProducts).toHaveLength(1);
    expect((await getVendorDashboard(vendorId)).metrics.totalProducts).toBe(1);
    await expect(updateVendorProduct(vendorId, productId, { priceCents: -1 })).rejects.toThrow();
    await expect(createVendorProduct({ vendorId, title: "Bad", description: "invalid", category: "Tech", priceCents: 1, stockQuantity: -2, supportedRegions: ["NOWHERE"] })).rejects.toThrow();
  });

  it("only credits actual administrator-reconciled payments, idempotently", async () => {
    await expect(recordSettledPayment({ companyId, actorUserId: corporateId, amountCents: 50000, settlementReference: "test-bank-001" })).rejects.toThrow(/administrators/);
    const input = { companyId, actorUserId: adminId, amountCents: 50000, settlementReference: "test-bank-001" };
    await recordSettledPayment(input);
    await recordSettledPayment(input);
    expect((await prisma.company.findUniqueOrThrow({ where: { id: companyId } })).walletBalanceCents).toBe(50000);
    expect(await prisma.walletTransaction.count({ where: { settlementReference: input.settlementReference } })).toBe(1);
    await expect(recordSettledPayment({ ...input, amountCents: 1000 })).rejects.toThrow(/already assigned/);
    await expect(recordSettledPayment({ ...input, amountCents: NaN })).rejects.toThrow();
  });

  it("creates curated collections, atomically reserves funds and queues real invitations", async () => {
    const collection = await createCustomCollection({
      companyId, title: "Integration Curation", description: "Test collection", occasion: "Recognition",
      budgetTierCents: 5000, productIds: [productId], actorUserId: corporateId,
    });
    const result = await createCampaignAndOptionallySend({
      companyId, actorUserId: corporateId, title: "Integration Campaign", occasion: "Recognition",
      messageTemplate: "Thank you!", budgetCents: 5000, collectionId: collection.id,
      recipients: [{ recipientName: "Test Recipient", recipientEmail: "recipient@example.test", preferredRegion: "NA" }],
    });
    claimToken = result.giftSends[0].claimToken;
    expect(claimToken.length).toBeGreaterThan(40);
    expect((await prisma.company.findUniqueOrThrow({ where: { id: companyId } })).escrowBalanceCents).toBe(5000);
    const mail = await prisma.emailMessage.findFirstOrThrow({ where: { to: "recipient@example.test" } });
    expect(mail.text).toContain(claimToken);
    await expect(lookupClaimByCode(result.giftSends[0].claimCode, "other@example.test")).rejects.toThrow(/No gift/);
    expect(await lookupClaimByCode(result.giftSends[0].claimCode, "recipient@example.test")).toEqual({ redirectTo: `/claim/${claimToken}` });
    await expect(lookupClaimByCode(result.giftSends[0].claimCode, undefined)).rejects.toThrow();
    await expect(dispatchGiftsToCampaign({ companyId: "another-company", campaignId: result.campaign.id, recipients: [{ recipientName: "Other", recipientEmail: "other@example.test" }] })).rejects.toThrow(/not found/);
  });

  it("enforces company collection ownership and rejects unfunded or duplicate dispatches", async () => {
    const other = await enrollCorporate({ name: "Other Sender", email: "other-sender@example.test", password, companyName: "Other Company" });
    const collection = await createCustomCollection({ companyId: other.company.id, title: "Private", description: "", occasion: "Recognition", budgetTierCents: 5000, productIds: [productId] });
    await expect(createCampaignAndOptionallySend({
      companyId, title: "Cross-tenant", occasion: "", messageTemplate: "Test", budgetCents: 5000, collectionId: collection.id,
    })).rejects.toThrow(/Collection not found/);
    await expect(createCampaignAndOptionallySend({
      companyId: other.company.id, title: "Unfunded", occasion: "", messageTemplate: "Test", budgetCents: 5000,
      recipients: [{ recipientName: "Recipient", recipientEmail: "unfunded@example.test" }],
    })).rejects.toThrow(/Insufficient wallet/);
    await expect(createCampaignAndOptionallySend({
      companyId, title: "Duplicate", occasion: "", messageTemplate: "Test", budgetCents: 5000,
      recipients: [{ recipientName: "A", recipientEmail: "same@example.test" }, { recipientName: "B", recipientEmail: "SAME@example.test" }],
    })).rejects.toThrow(/only once/);
    await expect(createGlobalCollection({ title: "Over budget", description: "", occasion: "", budgetTierCents: 1000, productIds: [productId] })).rejects.toThrow(/within the collection budget/);
  });

  it("makes campaign launch retries idempotent without reserving funds twice", async () => {
    const input = {
      requestKey: randomUUID(), companyId, actorUserId: corporateId,
      title: "Retry-safe campaign", occasion: "Recognition", messageTemplate: "Test", budgetCents: 5000,
      recipients: [{ recipientName: "Retry", recipientEmail: "retry@example.test" }],
    };
    const before = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    const first = await createCampaignAndOptionallySend(input);
    const second = await createCampaignAndOptionallySend(input);
    expect(second.campaign.id).toBe(first.campaign.id);
    expect(second.giftSends[0].id).toBe(first.giftSends[0].id);
    expect((await prisma.company.findUniqueOrThrow({ where: { id: companyId } })).walletBalanceCents).toBe(before.walletBalanceCents - 5000);
    await expect(createCampaignAndOptionallySend({ ...input, title: "Different campaign" })).rejects.toThrow(/different campaign/);
  });

  it("links gifts only after verified email ownership and never leaks password hashes or the address book via bearer links", async () => {
    const result = await enrollRecipient({ name: "Test Recipient", email: "recipient@example.test", password, preferredRegion: "NA" });
    recipientId = result.user.id;
    expect((await prisma.giftSend.findUniqueOrThrow({ where: { claimToken } })).recipientUserId).toBeNull();
    await consumeAccountToken(await emailToken(result.user.email, "verify"), "verify");
    expect((await prisma.giftSend.findUniqueOrThrow({ where: { claimToken } })).recipientUserId).toBe(recipientId);
    await saveRecipientAddress({
      userId: recipientId, label: "Home", recipientName: "Test Recipient",
      addressLine1: "Test-only Street 1", city: "Test City", postalCode: "00000", country: "US", region: "NA", isDefault: true,
    });
    expect((await getClaimExperienceByToken(claimToken)).savedAddresses).toHaveLength(0);
    expect((await getClaimExperienceByToken(claimToken, "NA", recipientId)).savedAddresses).toHaveLength(1);
    expect(JSON.stringify(await getClaimExperienceByToken(claimToken))).not.toContain("wholesaleCostCents");
    await expect(redeemGiftByToken({
      claimToken, orderType: "PHYSICAL_GIFT", productId, recipientRegion: "NA",
      saveToAddressBook: true, viewerUserId: corporateId,
    })).rejects.toThrow(/invited recipient/);
    expect((await getRecipientPortalData(recipientId)).user).not.toHaveProperty("passwordHash");
  });

  it("redeems once, reconciles stock and escrow without inventing carrier data", async () => {
    const result = await redeemGiftByToken({
      claimToken, orderType: "PHYSICAL_GIFT", productId, recipientRegion: "NA",
      shippingName: "Test Recipient", shippingAddressLine1: "Private Test Street",
      shippingAddressLine2: "Private Test Suite", shippingPhone: "Test-only-phone",
      shippingCity: "Test City", shippingPostalCode: "00000", shippingCountry: "US",
      deliveryInstructions: "Private delivery instructions",
    });
    orderId = result.giftOrder.id;
    expect(result.surplusRefundCents).toBe(1000);
    expect(result.giftOrder.fulfillmentWarehouse).toBe("");
    expect(result.giftOrder.estimatedDeliveryAt).toBeNull();
    expect(result.giftOrder.trackingNumber).toBe("");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity).toBe(4);
    const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    expect(company.walletBalanceCents).toBe(41000);
    expect(company.escrowBalanceCents).toBe(5000);
    await expect(redeemGiftByToken({ claimToken, orderType: "PHYSICAL_GIFT", productId, recipientRegion: "NA" })).rejects.toThrow(/already/);
    const dashboard = await getCorporateDashboard(companyId);
    const nested = JSON.stringify(dashboard.company.campaigns);
    expect(nested).not.toContain("Private Test Street");
    expect(nested).not.toContain("Private Test Suite");
    expect(nested).not.toContain("Private delivery instructions");
  });

  it("requires ownership for edits and swaps and real tracking details for fulfillment", async () => {
    await expect(updateRecipientOrderDelivery({
      orderId, shippingName: "Test", shippingAddressLine1: "Test", shippingCity: "Test", shippingPostalCode: "00000", shippingCountry: "US",
    })).rejects.toThrow(/authorization/);
    await expect(swapRecipientOrderGift({ orderId, newProductId: productId })).rejects.toThrow(/authorization/);
    secondProductId = (await createVendorProduct({
      vendorId, title: "Alternative Product", description: "Another test-only item", category: "Tech",
      priceCents: 4500, wholesaleCostCents: 3000, imageUrl: "https://example.test/alternative.jpg",
      stockQuantity: 3, supportedRegions: ["NA"],
    })).id;
    const send = await prisma.giftSend.findUniqueOrThrow({ where: { claimToken }, include: { campaign: true } });
    await prisma.collectionProduct.create({ data: { collectionId: send.campaign.collectionId!, productId: secondProductId } });
    await swapRecipientOrderGift({ orderId, newProductId: secondProductId, userId: recipientId });
    await expect(fulfillVendorOrder({ vendorId, orderId, fulfillmentStatus: "DELIVERED" })).rejects.toThrow(/transition/);
    await expect(fulfillVendorOrder({ vendorId, orderId, fulfillmentStatus: "SHIPPED" })).rejects.toThrow(/tracking/);
    await fulfillVendorOrder({ vendorId, orderId, fulfillmentStatus: "PROCESSING" });
    await fulfillVendorOrder({ vendorId, orderId, fulfillmentStatus: "SHIPPED", trackingCarrier: "Test Carrier", trackingNumber: "TEST-TRACKING-001" });
    await expect(swapRecipientOrderGift({ orderId, newProductId: productId, userId: recipientId })).rejects.toThrow(/dispatch/);
    await fulfillVendorOrder({ vendorId, orderId, fulfillmentStatus: "DELIVERED" });
    await expect(fulfillVendorOrder({ vendorId, orderId, fulfillmentStatus: "PROCESSING" })).rejects.toThrow(/transition/);
  });

  it("reclaims expired invitations once and rejects expired redemption", async () => {
    const result = await createCampaignAndOptionallySend({
      companyId, title: "Expiring", occasion: "Recognition", messageTemplate: "Test", budgetCents: 5000,
      recipients: [{ recipientName: "Expired", recipientEmail: "expired@example.test" }],
    });
    await prisma.giftSend.update({ where: { id: result.giftSends[0].id }, data: { expiresAt: new Date(0) } });
    await expect(redeemGiftByToken({ claimToken: result.giftSends[0].claimToken, orderType: "PHYSICAL_GIFT", productId, recipientRegion: "NA" })).rejects.toThrow(/expired/);
    expect((await reclaimExpiredGifts(adminId)).reclaimedCount).toBe(1);
    expect((await reclaimExpiredGifts(adminId)).reclaimedCount).toBe(0);
  });

  it("resets passwords using expiring one-time tokens and invalidates existing sessions", async () => {
    const previousVersion = (await prisma.user.findUniqueOrThrow({ where: { id: recipientId } })).sessionVersion;
    await requestAccountEmail("recipient@example.test", "reset");
    const token = await emailToken("recipient@example.test", "reset");
    await consumeAccountToken(token, "reset", `${password}-updated`);
    expect(await authenticateUser("recipient@example.test", password, "RECIPIENT")).toBeNull();
    expect((await authenticateUser("recipient@example.test", `${password}-updated`, "RECIPIENT"))?.sessionVersion).toBe(previousVersion + 1);
    await expect(consumeAccountToken(token, "reset", password)).rejects.toThrow(/invalid|used/);
  });

  it("fails explicitly rather than pretending to deliver email without SMTP", async () => {
    delete process.env.SMTP_URL;
    await expect(deliverEmails()).rejects.toThrow(/SMTP_URL/);
    expect(await prisma.emailMessage.count({ where: { sentAt: { not: null } } })).toBe(0);
  });

  it("only counts charity transfers after an operator records actual settlement", async () => {
    const charity = await createCharityPartner({ name: "Integration Charity", category: "Education", description: "Test-only charity", actorUserId: adminId });
    const campaign = await createCampaignAndOptionallySend({
      companyId, title: "Charity", occasion: "Recognition", messageTemplate: "Test", budgetCents: 5000,
      recipients: [{ recipientName: "Charity Recipient", recipientEmail: "charity@example.test" }],
    });
    const claim = await redeemGiftByToken({ claimToken: campaign.giftSends[0].claimToken, orderType: "CHARITY_DONATION", charityId: charity.id, recipientRegion: "NA" });
    expect(claim.giftSend.status).toBe("DONATION_PENDING");
    expect((await prisma.charity.findUniqueOrThrow({ where: { id: charity.id } })).totalDonatedCents).toBe(0);
    const settlement = { orderId: claim.giftOrder.id, actorUserId: adminId, settlementReference: "charity-transfer-test-001" };
    await settleCharityDonation(settlement);
    await settleCharityDonation(settlement);
    expect((await prisma.charity.findUniqueOrThrow({ where: { id: charity.id } })).totalDonatedCents).toBe(5000);
  });

  it("prevents double redemption and overselling under concurrent requests", async () => {
    const product = await createVendorProduct({
      vendorId, title: "Last Unit", description: "Test-only scarce product", category: "Tech",
      imageUrl: "https://example.test/scarce.jpg", priceCents: 2000, stockQuantity: 1, supportedRegions: ["NA"],
    });
    const campaign = await createCampaignAndOptionallySend({
      companyId, title: "Concurrent claims", occasion: "Recognition", messageTemplate: "Test", budgetCents: 5000,
      recipients: [{ recipientName: "One", recipientEmail: "race-one@example.test" }, { recipientName: "Two", recipientEmail: "race-two@example.test" }],
    });
    const results = await Promise.allSettled(campaign.giftSends.map((send) => redeemGiftByToken({
      claimToken: send.claimToken, orderType: "PHYSICAL_GIFT", productId: product.id, recipientRegion: "NA",
      shippingName: "Test", shippingAddressLine1: "Test Street", shippingCity: "Test City", shippingPostalCode: "00000", shippingCountry: "US",
    })));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity).toBe(0);
    expect(await prisma.giftOrder.count({ where: { productId: product.id } })).toBe(1);
    expect((await prisma.company.findUniqueOrThrow({ where: { id: companyId } })).walletBalanceCents).toBeGreaterThanOrEqual(0);
  });

  it.skipIf(!process.env.TEST_SMTP_URL)("delivers queued email through a real local SMTP server", async () => {
    process.env.SMTP_URL = process.env.TEST_SMTP_URL;
    process.env.EMAIL_FROM = "Snappy Tests <test@example.test>";
    const result = await deliverEmails();
    expect(result.failed).toBe(0);
    expect(result.sent).toBeGreaterThan(0);
    expect(await prisma.emailMessage.count({ where: { sentAt: null } })).toBe(0);
    expect((await prisma.emailMessage.findFirstOrThrow({ where: { sentAt: { not: null } } })).text).toBe("");
  });
});
