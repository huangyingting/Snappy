import { test, expect, request as apiRequest, type APIRequestContext, type APIResponse } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/lib/prisma";
import { hashPassword } from "../../src/lib/passwords";

const email = "browser@example.test";
const password = "Browser-test-long-password-2026";

test.describe.configure({ mode: "serial" });

async function success(response: APIResponse) {
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}

async function signIn(context: APIRequestContext, accountEmail: string, expectedRole: string) {
  const { csrfToken } = await success(await context.get("/api/auth/csrf"));
  await success(await context.post("/api/auth/callback/credentials", {
    form: { csrfToken, email: accountEmail, password, expectedRole, json: "true", callbackUrl: "/" },
  }));
  const session = await success(await context.get("/api/auth/me"));
  expect(session.user.email).toBe(accountEmail);
}

async function verifyEmail(context: APIRequestContext, accountEmail: string) {
  const message = await prisma.emailMessage.findFirstOrThrow({ where: { to: accountEmail, text: { contains: "/auth/verify?token=" } } });
  const token = message.text.match(/token=([A-Za-z0-9_-]+)/)![1];
  await success(await context.post("/api/auth/account", { data: { purpose: "verify", token } }));
}

test.beforeAll(() => {
  if (process.env.SNAPPY_TEST_RUN !== "1") throw new Error("Use npm run test:e2e.");
});
test.afterAll(() => prisma.$disconnect());

test("empty application, real enrollment, email verification, NextAuth sign-in and sign-out", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Make every gift/ })).toBeVisible();
  await expect(page.getByText("The catalog is being curated.", { exact: false })).toBeVisible();
  await expect(page.getByText(/sandbox|demo credentials/i)).toHaveCount(0);
  await page.goto("/corporate");
  await expect(page).toHaveURL(/\/auth\/corporate/);
  await page.getByRole("button", { name: "Create account", exact: true }).first().click();
  await page.getByLabel("Full name").fill("Browser Sender");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Company name").fill("Browser Company");
  await page.getByRole("button", { name: "Create account", exact: true }).last().click();
  await expect(page.getByRole("status")).toContainText("Check your email");

  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page.getByRole("alert").filter({ hasText: "Sign in failed" })).toBeVisible();
  const message = await prisma.emailMessage.findFirstOrThrow({ where: { to: email } });
  const token = message.text.match(/token=([A-Za-z0-9_-]+)/)![1];
  await page.goto(`/auth/verify?token=${token}`);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Email verified");
  await page.getByRole("link", { name: /Continue to sign in/ }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page).toHaveURL(/\/corporate$/);
  await expect(page.getByRole("heading", { name: "Browser Company", exact: true })).toBeVisible();

  const context = await page.request.get("/api/auth/me");
  const current = await context.json();
  expect(current.user.email).toBe(email);
  expect(JSON.stringify(current)).not.toContain("passwordHash");
  expect(current.user.company.walletBalanceCents).toBe(0);
  expect((await page.request.get("/api/admin/dashboard")).status()).toBe(403);
  expect((await request.get("/api/corporate/dashboard")).status()).toBe(403);
  const crossOrigin = await page.request.post("/api/corporate/settings", { headers: { origin: "https://attacker.example.test" }, data: { hideRecipientAddress: false } });
  expect(crossOrigin.status()).toBe(403);
  const bypass = await request.post("/api/auth/demo-switch", { data: { email } });
  expect(bypass.ok()).toBe(false);
  expect((await request.post("/api/corporate/wallet/deposit", { data: { amountCents: 100000 } })).ok()).toBe(false);
  expect((await request.post("/api/auth/bootstrap", { data: { email } })).ok()).toBe(false);

  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL("/");
  expect((await page.request.get("/api/corporate/dashboard")).status()).toBe(403);
});

test("operator login uses NextAuth and a changed session version revokes authorization", async ({ page }) => {
  await prisma.user.create({
    data: { email: "browser-admin@example.test", name: "Browser Operator", role: "ADMIN", emailVerified: new Date(), passwordHash: await hashPassword(password) },
  });
  await page.goto("/auth/admin");
  await page.getByLabel("Email", { exact: true }).fill("browser-admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Snappy Atelier Global Control Tower" })).toBeVisible();
  await prisma.user.update({ where: { email: "browser-admin@example.test" }, data: { sessionVersion: { increment: 1 } } });
  expect((await page.request.get("/api/admin/dashboard")).status()).toBe(403);
  await page.reload();
  await expect(page).toHaveURL(/\/auth\/admin$/);
});

test("real authenticated vendor, payment, campaign, claim and fulfillment APIs persist the complete gift lifecycle", async ({ page, request, baseURL }) => {
  test.setTimeout(120000);
  const corporate = await apiRequest.newContext({ baseURL });
  const admin = await apiRequest.newContext({ baseURL });
  const vendor = await apiRequest.newContext({ baseURL });
  try {
    await signIn(corporate, email, "CORPORATE");
    await signIn(admin, "browser-admin@example.test", "ADMIN");
    const supplier = await success(await request.post("/api/auth/enroll/vendor", {
      data: {
        name: "Browser Supplier", email: "browser-vendor@example.test", password,
        businessName: "Browser Supplier Company", taxId: "BROWSER-TEST", hqCountry: "US", supportedRegions: ["NA"],
      },
    }));
    expect(supplier.vendor.status).toBe("PENDING");
    await verifyEmail(request, "browser-vendor@example.test");
    await signIn(vendor, "browser-vendor@example.test", "VENDOR");
    await success(await admin.patch(`/api/admin/vendors/${supplier.vendor.id}`, { data: { status: "APPROVED" } }));
    const { product } = await success(await vendor.post("/api/vendor/products", {
      data: {
        title: "Browser Workflow Product", description: "Created by the authenticated test vendor.",
        category: "Office", priceCents: 5000, wholesaleCostCents: 3000,
        imageUrl: "https://example.test/browser-product.jpg", stockQuantity: 2, supportedRegions: ["NA"],
      },
    }));
    const { user } = await success(await corporate.get("/api/auth/me"));
    const payment = { companyId: user.company.id, amountCents: 20000, settlementReference: "browser-bank-settlement" };
    expect((await corporate.post("/api/admin/payments", { data: payment })).status()).toBe(403);
    await success(await admin.post("/api/admin/payments", { data: payment }));
    await success(await admin.post("/api/admin/payments", { data: payment }));
    const campaignInput = {
      requestKey: randomUUID(), title: "Browser Lifecycle", occasion: "Recognition",
      messageTemplate: "Thank you!", budgetCents: 10000,
      recipients: [{ recipientName: "Browser Recipient", recipientEmail: "browser-recipient@example.test", preferredRegion: "NA" }],
    };
    const campaign = await success(await corporate.post("/api/corporate/campaigns", { data: campaignInput }));
    const retry = await success(await corporate.post("/api/corporate/campaigns", { data: campaignInput }));
    expect(retry.giftSends[0].id).toBe(campaign.giftSends[0].id);
    const token = campaign.giftSends[0].claimToken;
    const claim = await success(await request.get(`/api/claim/${token}`));
    expect(claim.eligibleProducts[0].id).toBe(product.id);
    expect(JSON.stringify(claim)).not.toContain("wholesaleCostCents");
    expect(claim.savedAddresses).toEqual([]);
    await page.goto(`/claim/${token}`);
    await expect(page.getByText(product.title, { exact: true }).first()).toBeVisible();
    const streetAddress = page.getByPlaceholder("Street address and unit");
    await streetAddress.pressSequentially("Test-only Street 1");
    await expect(streetAddress).toHaveValue("Test-only Street 1");
    const redemption = await success(await page.request.post(`/api/claim/${token}/redeem`, {
      data: {
        orderType: "PHYSICAL_GIFT", productId: product.id, recipientRegion: "NA",
        shippingName: "Browser Recipient", shippingAddressLine1: "Test-only Street 1",
        shippingCity: "Test City", shippingPostalCode: "00000", shippingCountry: "US",
      },
    }));
    expect((await page.request.post(`/api/claim/${token}/redeem`, { data: { orderType: "PHYSICAL_GIFT", productId: product.id, recipientRegion: "NA" } })).ok()).toBe(false);
    await success(await vendor.patch(`/api/vendor/orders/${redemption.giftOrder.id}/fulfill`, {
      data: { fulfillmentStatus: "SHIPPED", trackingCarrier: "Test Carrier", trackingNumber: "browser-tracking-001" },
    }));
    await success(await vendor.patch(`/api/vendor/orders/${redemption.giftOrder.id}/fulfill`, { data: { fulfillmentStatus: "DELIVERED" } }));
    await page.reload();
    await expect(page.getByText("browser-tracking-001", { exact: false }).first()).toBeVisible();
    const dashboard = await success(await corporate.get("/api/corporate/dashboard"));
    expect(dashboard.company.walletBalanceCents).toBe(15000);
    expect(dashboard.company.escrowBalanceCents).toBe(0);
    expect(JSON.stringify(dashboard)).not.toContain("Test-only Street 1");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity).toBe(1);
  } finally {
    await Promise.all([corporate.dispose(), admin.dispose(), vendor.dispose()]);
  }
});
