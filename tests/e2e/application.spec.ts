import { test, expect, request as apiRequest, type APIRequestContext, type APIResponse, type Page, type Response } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/lib/prisma";
import { hashPassword } from "../../src/lib/passwords";

const email = "browser@example.test";
const password = "Browser-test-long-password-2026";

test.describe.configure({ mode: "serial" });

async function success(response: APIResponse | Response) {
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

async function visitAs(page: Page, context: APIRequestContext, path: string) {
  await page.context().clearCookies();
  await page.context().addCookies((await context.storageState()).cookies);
  await page.goto(path);
}

async function expectMobileLayout(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
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
  await expect(page.getByRole("heading", { name: "Platform operations" })).toBeVisible();
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

test("compact workspaces preserve primary tasks, folded controls, keyboard access and mobile layouts", async ({ page, browser, request, baseURL }, testInfo) => {
  test.setTimeout(180000);
  const corporate = await apiRequest.newContext({ baseURL });
  const vendor = await apiRequest.newContext({ baseURL });
  const admin = await apiRequest.newContext({ baseURL });
  const recipient = await apiRequest.newContext({ baseURL });
  try {
    await Promise.all([
      signIn(corporate, email, "CORPORATE"),
      signIn(vendor, "browser-vendor@example.test", "VENDOR"),
      signIn(admin, "browser-admin@example.test", "ADMIN"),
    ]);
    await page.route("https://example.test/**", (route) => route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450"><rect width="600" height="450" fill="#f3efe6"/><rect x="190" y="110" width="220" height="240" rx="24" fill="#c85a32"/><path d="M300 110v240M190 190h220" stroke="#e6d6b6" stroke-width="28"/></svg>',
    }));
    await visitAs(page, corporate, "/corporate");
    const composer = page.getByRole("heading", { name: "Send gifts", exact: true });
    await expect(composer).toBeVisible();
    expect((await composer.boundingBox())!.y).toBeLessThan(420);
    await expect(page.getByText("Available Wallet Balance", { exact: true })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Wallet & ledger", exact: true })).not.toBeVisible();
    await expect(page.getByText("Workflow Mode", { exact: true })).not.toBeVisible();
    await page.getByLabel("Campaign name", { exact: true }).fill("Compact UI campaign");
    await page.getByText("Campaign options", { exact: true }).click();
    await expect(page.getByText("Workflow Mode", { exact: true })).toBeVisible();
    await page.getByRole("checkbox", { name: "Let recipients choose a charity instead" }).uncheck();
    await page.getByText("Campaign options", { exact: true }).click();
    await page.getByText("More tools", { exact: true }).click();
    await page.getByRole("button", { name: "Wallet & ledger", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Send gifts", exact: true })).not.toBeVisible();
    await expectMobileLayout(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole("button", { name: "Send gifts", exact: true }).click();
    await expect(page.getByLabel("Campaign name", { exact: true })).toHaveValue("Compact UI campaign");
    await page.getByLabel("Budget per person").selectOption("5000");
    await page.getByLabel("Gift message").fill("A gift for your work.");
    await page.getByPlaceholder("Recipient Name", { exact: true }).fill("Layout Recipient");
    await page.getByPlaceholder("recipient@company.com", { exact: true }).fill("layout-recipient@example.test");
    await page.screenshot({ path: testInfo.outputPath("corporate-compact-desktop.png"), fullPage: true });
    await expectMobileLayout(page);
    await page.screenshot({ path: testInfo.outputPath("corporate-compact-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 720 });
    const campaignResponse = page.waitForResponse((response) => response.url().endsWith("/api/corporate/campaigns") && response.request().method() === "POST");
    await page.getByRole("button", { name: /^Send gifts ·/ }).click();
    const campaign = await success(await campaignResponse);
    expect(campaign.campaign.allowCharity).toBe(false);
    const token = campaign.giftSends[0].claimToken;

    await success(await request.post("/api/auth/enroll/recipient", { data: { name: "Layout Recipient", email: "layout-recipient@example.test", password } }));
    await verifyEmail(request, "layout-recipient@example.test");
    await signIn(recipient, "layout-recipient@example.test", "RECIPIENT");
    const touchContext = await browser.newContext({
      baseURL, storageState: await recipient.storageState(),
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    });
    try {
      const touchPage = await touchContext.newPage();
      await touchPage.goto(`/claim/${token}`);
      await expect(touchPage.getByRole("heading", { name: "Choose your gift, Layout Recipient." })).toBeVisible();
      expect(await touchPage.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
      const street = touchPage.getByLabel("Street Address *", { exact: true });
      expect((await street.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await touchPage.getByRole("link", { name: "Continue to delivery", exact: true }).tap();
      await expect(touchPage.locator("#gift-delivery")).toBeInViewport({ ratio: 0.25 });
      await expectMobileLayout(touchPage);
      await touchPage.screenshot({ path: testInfo.outputPath("claim-compact-touch.png"), fullPage: true });
    } finally {
      await touchContext.close();
    }
    await visitAs(page, recipient, `/claim/${token}`);
    await expect(page.getByRole("heading", { name: "Choose your gift, Layout Recipient." })).toBeVisible();
    await expect(page.getByLabel("Phone", { exact: true })).not.toBeVisible();
    const product = page.getByRole("button", { name: "Choose Browser Workflow Product", exact: true });
    await product.focus();
    await product.press("Space");
    await expect(product).toHaveAttribute("aria-pressed", "true");
    await page.getByText("Phone, state & delivery instructions", { exact: true }).click();
    await page.getByLabel("Phone", { exact: true }).fill("+12025550123");
    await page.getByLabel("State / province", { exact: true }).fill("CA");
    await page.getByLabel("Delivery instructions", { exact: true }).fill("Reception");
    await page.getByText("Phone, state & delivery instructions", { exact: true }).click();
    await page.getByLabel("Street Address *", { exact: true }).fill("Layout Test Street 2");
    await page.getByLabel("City *", { exact: true }).fill("Test City");
    await page.getByLabel("Postal / ZIP Code *", { exact: true }).fill("00000");
    await page.screenshot({ path: testInfo.outputPath("claim-compact-desktop.png"), fullPage: true });
    await expectMobileLayout(page);
    await page.screenshot({ path: testInfo.outputPath("claim-compact-mobile.png"), fullPage: true });
    const redemptionResponse = page.waitForResponse((response) => response.url().endsWith(`/api/claim/${token}/redeem`) && response.request().method() === "POST");
    await page.getByRole("button", { name: "Confirm gift selection", exact: true }).click();
    const redemption = await success(await redemptionResponse);
    const order = await prisma.giftOrder.findUniqueOrThrow({ where: { id: redemption.giftOrder.id } });
    expect(order.shippingPhone).toBe("+12025550123");
    expect(order.shippingState).toBe("CA");
    expect(order.deliveryInstructions).toBe("Reception");
    await expect(page.getByRole("button", { name: "Edit Delivery Address", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue to delivery", exact: true })).toHaveCount(0);
    await expectMobileLayout(page);

    await page.setViewportSize({ width: 1280, height: 720 });
    await visitAs(page, vendor, "/vendor");
    await expect(page.getByRole("button", { name: /Orders \(1 pending\)/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Accrued Vendor Earnings", { exact: true })).not.toBeVisible();
    await expect(page.getByPlaceholder("Add custom carrier scan", { exact: false })).not.toBeVisible();
    await page.getByRole("button", { name: /^Products \(/ }).click();
    await expect(page.getByPlaceholder("Hand-Hammered Copper Pour-Over Set")).not.toBeVisible();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const productTitle = page.getByPlaceholder("Hand-Hammered Copper Pour-Over Set");
    await expect(productTitle).toBeVisible();
    await expect(productTitle).toHaveValue("Browser Workflow Product");
    await productTitle.fill("Unsaved product draft");
    await page.getByText("Edit product", { exact: true }).click();
    await expect(productTitle).not.toBeVisible();
    await page.getByText("Edit product", { exact: true }).click();
    await expect(productTitle).toBeVisible();
    await expect(productTitle).toHaveValue("Unsaved product draft");
    await page.getByRole("button", { name: "Cancel Edit", exact: true }).click();
    await expect(productTitle).not.toBeVisible();
    await expect(page.getByText("Add a product", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^Orders \(/ }).click();
    await page.getByPlaceholder("Carrier (DHL / FedEx / Yamato)", { exact: true }).fill("Layout Carrier");
    await page.getByPlaceholder("Waybill / Tracking #", { exact: true }).fill("layout-tracking-002");
    const shipmentResponse = page.waitForResponse((response) => response.url().endsWith(`/api/vendor/orders/${order.id}/fulfill`) && response.request().method() === "PATCH");
    await page.getByRole("button", { name: "Dispatch & Lock Address", exact: true }).click();
    await success(await shipmentResponse);
    await expect(page.getByText("layout-tracking-002", { exact: true })).toBeVisible();
    await expectMobileLayout(page);
    await page.screenshot({ path: testInfo.outputPath("vendor-compact-mobile.png"), fullPage: true });
    for (const history of await page.getByText("Live Carrier & Atelier Checkpoint Log", { exact: false }).all()) {
      await expect(history).not.toBeVisible();
    }
    await page.getByText("Add checkpoint or report an exception", { exact: true }).click();
    await page.getByPlaceholder("Add custom carrier scan", { exact: false }).fill("Weather delay at destination");
    await expectMobileLayout(page);
    const exceptionResponse = page.waitForResponse((response) => response.url().endsWith(`/api/vendor/orders/${order.id}/fulfill`) && response.request().method() === "PATCH");
    await page.getByRole("button", { name: "Flag exception", exact: true }).click();
    await success(await exceptionResponse);
    await expect(page.getByRole("alert").filter({ hasText: "Weather delay at destination" })).toBeVisible();

    await visitAs(page, recipient, "/recipient");
    await expect(page.getByRole("heading", { name: "Your gifts", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Browser Workflow Product", exact: true })).toBeVisible();
    await expect(page.getByLabel("Invitation code", { exact: true })).not.toBeVisible();
    await expect(page.getByText("layout-tracking-002", { exact: true })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Weather delay at destination" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Addresses \(/ })).not.toBeVisible();
    await expectMobileLayout(page);
    await page.screenshot({ path: testInfo.outputPath("recipient-compact-mobile.png"), fullPage: true });
    await page.getByText("More tools", { exact: true }).click();
    await page.getByRole("button", { name: /^Addresses \(/ }).click();
    await expect(page.getByText("Layout Test Street 2", { exact: false })).toBeVisible();
    await expectMobileLayout(page);

    await visitAs(page, admin, "/admin");
    await expect(page.getByRole("heading", { name: "Platform operations", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Record payment", exact: true })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /^Categories \(/ })).not.toBeVisible();
    const paymentSummary = page.locator("summary").filter({ hasText: "Reconcile a settled payment" });
    await paymentSummary.focus();
    await paymentSummary.press("Enter");
    await expect(page.getByRole("button", { name: "Record payment", exact: true })).toBeVisible();
    await page.getByLabel("Settlement reference", { exact: true }).fill("Unsaved reference");
    await paymentSummary.press("Enter");
    await paymentSummary.press("Enter");
    await expect(page.getByLabel("Settlement reference", { exact: true })).toHaveValue("Unsaved reference");
    await expectMobileLayout(page);
    await page.screenshot({ path: testInfo.outputPath("admin-compact-mobile.png"), fullPage: true });
  } finally {
    await Promise.all([corporate.dispose(), vendor.dispose(), admin.dispose(), recipient.dispose()]);
  }
});
