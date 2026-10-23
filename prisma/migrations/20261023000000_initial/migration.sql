-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "industry" TEXT NOT NULL DEFAULT 'Technology',
    "sizeBand" TEXT NOT NULL DEFAULT '201-1000',
    "primaryRegion" TEXT NOT NULL DEFAULT 'NA',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "brandColor" TEXT NOT NULL DEFAULT '#4F46E5',
    "walletBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "escrowBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "hideRecipientAddress" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "hqCountry" TEXT NOT NULL DEFAULT 'US',
    "supportedRegions" TEXT NOT NULL DEFAULT 'NA',
    "commissionRateBps" INTEGER NOT NULL DEFAULT 1500,
    "slaDays" INTEGER NOT NULL DEFAULT 3,
    "payoutBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "rating" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL DEFAULT '',
    "preferredRegion" TEXT NOT NULL DEFAULT 'NA',
    "defaultAddressLine1" TEXT NOT NULL DEFAULT '',
    "defaultCity" TEXT NOT NULL DEFAULT '',
    "defaultState" TEXT NOT NULL DEFAULT '',
    "defaultPostalCode" TEXT NOT NULL DEFAULT '',
    "defaultCountry" TEXT NOT NULL DEFAULT 'US',
    "companyId" TEXT,
    "vendorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecipientAddress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "recipientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "region" TEXT NOT NULL DEFAULT 'NA',
    "deliveryInstructions" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecipientAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GiftCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT 'Sparkles',
    "accentColor" TEXT NOT NULL DEFAULT '#6366F1',
    "heroImageUrl" TEXT NOT NULL DEFAULT '',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "escrowAfter" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL DEFAULT '',
    "settlementReference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "categoryId" TEXT,
    "sku" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "merchandisingBadge" TEXT NOT NULL DEFAULT '',
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "variantsJson" TEXT NOT NULL DEFAULT '[]',
    "specificationsJson" TEXT NOT NULL DEFAULT '{}',
    "priceCents" INTEGER NOT NULL,
    "wholesaleCostCents" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "supportedRegions" TEXT NOT NULL DEFAULT 'NA',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GiftCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "occasion" TEXT NOT NULL,
    "budgetTierCents" INTEGER NOT NULL,
    "coverImageUrl" TEXT NOT NULL DEFAULT '',
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Collection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectionProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    CONSTRAINT "CollectionProduct_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Charity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "totalDonatedCents" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestKey" TEXT,
    "requestHash" TEXT NOT NULL DEFAULT '',
    "companyId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "title" TEXT NOT NULL,
    "occasion" TEXT NOT NULL,
    "messageTemplate" TEXT NOT NULL,
    "budgetCents" INTEGER NOT NULL,
    "collectionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "triggerType" TEXT NOT NULL DEFAULT 'MANUAL',
    "allowCharity" BOOLEAN NOT NULL DEFAULT true,
    "expiresInDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Campaign_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Campaign_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GiftSend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "preferredRegion" TEXT NOT NULL DEFAULT 'NA',
    "claimToken" TEXT NOT NULL,
    "claimCode" TEXT NOT NULL,
    "budgetCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "personalMessage" TEXT NOT NULL,
    "thankYouNote" TEXT NOT NULL DEFAULT '',
    "expiresAt" DATETIME NOT NULL,
    "claimedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GiftSend_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GiftSend_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GiftSend_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GiftOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "giftSendId" TEXT NOT NULL,
    "settlementReference" TEXT,
    "productId" TEXT,
    "vendorId" TEXT,
    "charityId" TEXT,
    "orderType" TEXT NOT NULL,
    "retailAmountCents" INTEGER NOT NULL,
    "vendorPayoutCents" INTEGER NOT NULL DEFAULT 0,
    "platformFeeCents" INTEGER NOT NULL DEFAULT 0,
    "recipientRegion" TEXT NOT NULL DEFAULT 'NA',
    "shippingName" TEXT NOT NULL DEFAULT '',
    "shippingPhone" TEXT NOT NULL DEFAULT '',
    "shippingAddressLine1" TEXT NOT NULL DEFAULT '',
    "shippingAddressLine2" TEXT NOT NULL DEFAULT '',
    "shippingCity" TEXT NOT NULL DEFAULT '',
    "shippingState" TEXT NOT NULL DEFAULT '',
    "shippingPostalCode" TEXT NOT NULL DEFAULT '',
    "shippingCountry" TEXT NOT NULL DEFAULT '',
    "deliveryInstructions" TEXT NOT NULL DEFAULT '',
    "selectedVariant" TEXT NOT NULL DEFAULT '',
    "trackingCarrier" TEXT NOT NULL DEFAULT '',
    "trackingNumber" TEXT NOT NULL DEFAULT '',
    "trackingUrl" TEXT NOT NULL DEFAULT '',
    "serviceLevel" TEXT NOT NULL DEFAULT '',
    "fulfillmentWarehouse" TEXT NOT NULL DEFAULT '',
    "packageWeightGrams" INTEGER NOT NULL DEFAULT 0,
    "estimatedDeliveryAt" DATETIME,
    "addressLocked" BOOLEAN NOT NULL DEFAULT false,
    "exceptionNote" TEXT NOT NULL DEFAULT '',
    "swapCount" INTEGER NOT NULL DEFAULT 0,
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'PENDING_VENDOR',
    "shippedAt" DATETIME,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GiftOrder_giftSendId_fkey" FOREIGN KEY ("giftSendId") REFERENCES "GiftSend" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GiftOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GiftOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GiftOrder_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShipmentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "giftOrderId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "actorRole" TEXT NOT NULL DEFAULT 'SYSTEM',
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShipmentEvent_giftOrderId_fkey" FOREIGN KEY ("giftOrderId") REFERENCES "GiftOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "tokenHash" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" DATETIME,
    "sentAt" DATETIME,
    "lastError" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_slug_key" ON "Vendor"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_vendorId_idx" ON "User"("vendorId");

-- CreateIndex
CREATE INDEX "RecipientAddress_recipientEmail_idx" ON "RecipientAddress"("recipientEmail");

-- CreateIndex
CREATE INDEX "RecipientAddress_userId_idx" ON "RecipientAddress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCategory_slug_key" ON "GiftCategory"("slug");

-- CreateIndex
CREATE INDEX "GiftCategory_displayOrder_active_idx" ON "GiftCategory"("displayOrder", "active");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_settlementReference_key" ON "WalletTransaction"("settlementReference");

-- CreateIndex
CREATE INDEX "WalletTransaction_companyId_createdAt_idx" ON "WalletTransaction"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Product_vendorId_idx" ON "Product"("vendorId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_priceCents_active_idx" ON "Product"("priceCents", "active");

-- CreateIndex
CREATE INDEX "Collection_budgetTierCents_isGlobal_idx" ON "Collection"("budgetTierCents", "isGlobal");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionProduct_collectionId_productId_key" ON "CollectionProduct"("collectionId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_requestKey_key" ON "Campaign"("requestKey");

-- CreateIndex
CREATE INDEX "Campaign_companyId_idx" ON "Campaign"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftSend_claimToken_key" ON "GiftSend"("claimToken");

-- CreateIndex
CREATE UNIQUE INDEX "GiftSend_claimCode_key" ON "GiftSend"("claimCode");

-- CreateIndex
CREATE INDEX "GiftSend_companyId_status_idx" ON "GiftSend"("companyId", "status");

-- CreateIndex
CREATE INDEX "GiftSend_recipientEmail_idx" ON "GiftSend"("recipientEmail");

-- CreateIndex
CREATE UNIQUE INDEX "GiftOrder_giftSendId_key" ON "GiftOrder"("giftSendId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftOrder_settlementReference_key" ON "GiftOrder"("settlementReference");

-- CreateIndex
CREATE INDEX "GiftOrder_vendorId_fulfillmentStatus_idx" ON "GiftOrder"("vendorId", "fulfillmentStatus");

-- CreateIndex
CREATE INDEX "ShipmentEvent_giftOrderId_occurredAt_idx" ON "ShipmentEvent"("giftOrderId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuthToken_userId_purpose_idx" ON "AuthToken"("userId", "purpose");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- CreateIndex
CREATE INDEX "EmailMessage_sentAt_lockedAt_createdAt_idx" ON "EmailMessage"("sentAt", "lockedAt", "createdAt");
