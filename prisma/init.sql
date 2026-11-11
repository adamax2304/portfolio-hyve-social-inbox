CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'STARTER',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "businessType" TEXT,
    "brandColor" TEXT NOT NULL DEFAULT '#c96b49',
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiMode" TEXT NOT NULL DEFAULT 'SUGGEST',
    "aiInstructions" TEXT,
    "aiCollectOrders" BOOLEAN NOT NULL DEFAULT false,
    "aiManagerInstructions" TEXT,
    "aiUseManaged" BOOLEAN NOT NULL DEFAULT true,
    "aiManagedRequested" BOOLEAN NOT NULL DEFAULT false,
    "aiCustomBaseUrl" TEXT,
    "aiCustomModel" TEXT,
    "aiCustomKeyMasked" TEXT,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "telegramHandle" TEXT,
    "phone" TEXT,
    "themePreference" TEXT NOT NULL DEFAULT 'light',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "TenantMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'AGENT',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TenantOnboarding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "businessType" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "websiteUrl" TEXT,
    "selectedProviders" TEXT,
    "checklistJson" TEXT,
    "formDraftJson" TEXT,
    "notes" TEXT,
    "launchedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TenantOnboarding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ChannelConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "externalAccountId" TEXT,
    "destinationHint" TEXT,
    "authMode" TEXT,
    "webhookSecretHint" TEXT,
    "configJson" TEXT,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChannelConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "channelConnectionId" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "username" TEXT,
    "phone" TEXT,
    "locale" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_channelConnectionId_fkey" FOREIGN KEY ("channelConnectionId") REFERENCES "ChannelConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "channelLabel" TEXT NOT NULL,
    "subject" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" INTEGER NOT NULL DEFAULT 2,
    "aiMode" TEXT NOT NULL DEFAULT 'SUGGEST',
    "assignedTo" TEXT,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "externalMessageId" TEXT,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "senderLabel" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT,
    "triggerType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AutomationRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "IntegrationSecret" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "channelConnectionId" TEXT,
    "provider" TEXT NOT NULL,
    "secretKind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "maskedValue" TEXT NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "lastRotatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IntegrationSecret_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IntegrationSecret_channelConnectionId_fkey" FOREIGN KEY ("channelConnectionId") REFERENCES "ChannelConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "channelConnectionId" TEXT,
    "provider" TEXT NOT NULL,
    "eventKind" TEXT NOT NULL,
    "externalEventId" TEXT,
    "payloadJson" TEXT NOT NULL,
    "outcome" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    CONSTRAINT "WebhookEvent_channelConnectionId_fkey" FOREIGN KEY ("channelConnectionId") REFERENCES "ChannelConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "AppUser_email_key" ON "AppUser"("email");
CREATE INDEX "TenantMembership_tenantId_role_idx" ON "TenantMembership"("tenantId", "role");
CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId", "userId");
CREATE UNIQUE INDEX "TenantOnboarding_tenantId_key" ON "TenantOnboarding"("tenantId");
CREATE INDEX "ChannelConnection_tenantId_provider_idx" ON "ChannelConnection"("tenantId", "provider");
CREATE UNIQUE INDEX "ChannelConnection_tenantId_provider_label_key" ON "ChannelConnection"("tenantId", "provider", "label");
CREATE INDEX "Contact_tenantId_displayName_idx" ON "Contact"("tenantId", "displayName");
CREATE UNIQUE INDEX "Contact_channelConnectionId_externalUserId_key" ON "Contact"("channelConnectionId", "externalUserId");
CREATE INDEX "Conversation_tenantId_status_lastMessageAt_idx" ON "Conversation"("tenantId", "status", "lastMessageAt");
CREATE INDEX "Conversation_contactId_lastMessageAt_idx" ON "Conversation"("contactId", "lastMessageAt");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "AutomationRule_tenantId_isEnabled_idx" ON "AutomationRule"("tenantId", "isEnabled");
CREATE INDEX "IntegrationSecret_tenantId_provider_secretKind_idx" ON "IntegrationSecret"("tenantId", "provider", "secretKind");
CREATE INDEX "IntegrationSecret_channelConnectionId_secretKind_idx" ON "IntegrationSecret"("channelConnectionId", "secretKind");
CREATE INDEX "WebhookEvent_provider_receivedAt_idx" ON "WebhookEvent"("provider", "receivedAt");
CREATE INDEX "WebhookEvent_tenantId_receivedAt_idx" ON "WebhookEvent"("tenantId", "receivedAt");

CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "itemsJson" TEXT NOT NULL DEFAULT '[]',
    "totalAmount" TEXT,
    "deliveryInfo" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Order_tenantId_status_createdAt_idx" ON "Order"("tenantId", "status", "createdAt");
CREATE INDEX "Order_tenantId_conversationId_idx" ON "Order"("tenantId", "conversationId");

CREATE TABLE "OperatorBot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "botId" TEXT,
    "botUsername" TEXT,
    "botName" TEXT,
    "tokenMasked" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "webhookUrl" TEXT,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OperatorBot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OperatorBot_tenantId_key" ON "OperatorBot"("tenantId");

CREATE TABLE "OperatorBotSubscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "isOperator" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "OperatorBotSubscriber_tenantId_chatId_key" ON "OperatorBotSubscriber"("tenantId", "chatId");
CREATE INDEX "OperatorBotSubscriber_tenantId_idx" ON "OperatorBotSubscriber"("tenantId");
