"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import {
  AutomationMode,
  ChannelProvider,
  ConnectionStatus,
  MembershipRole,
  OrderStatus,
  SecretKind,
} from "@prisma/client";
import {
  addTenantMember,
  createOrderRecord,
  createOutboundMessage,
  createTenantWorkspace,
  ingestInboundMessage,
  storeIntegrationSecret,
  updateTenantAiSettings,
} from "@/lib/inbox";
import { auth } from "@/auth";
import { requireAuth, requireTenantMember } from "@/lib/rbac";
import { dispatchTelegramMessage } from "@/lib/telegram";
import { prisma } from "@/lib/prisma";
import { encryptSecret, maskSecret } from "@/lib/security";
import { THEME_COOKIE, type Theme } from "@/lib/theme";
import {
  LOCALE_COOKIE,
  isLocale,
  type Locale,
} from "@/lib/i18n/locale";
import { getTranslations } from "@/lib/i18n/server";
import {
  getMe as tgGetMe,
  getUpdates as tgGetUpdates,
  setWebhook as tgSetWebhook,
  deleteWebhook as tgDeleteWebhook,
  setMyCommands as tgSetMyCommands,
  setChatMenuButton as tgSetChatMenuButton,
  sendMessage as tgSendMessage,
  makeReplyKeyboard,
  maskToken,
} from "@/lib/telegram-operator-bot";
import { decryptSecret } from "@/lib/security";
import { notifyService } from "@/lib/service-bot";

export async function simulateInboundLead(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const provider = String(formData.get("provider") ?? "") as ChannelProvider;
  const contactDisplayName = String(formData.get("contactDisplayName") ?? "");
  const contactExternalId = String(formData.get("contactExternalId") ?? "");
  const content = String(formData.get("content") ?? "");

  if (
    !tenantSlug ||
    !provider ||
    !contactDisplayName ||
    !contactExternalId ||
    !content
  ) {
    throw new Error("Missing required simulator fields.");
  }

  // Membership check — only members of this workspace can fire the simulator.
  await requireTenantMember(tenantSlug, MembershipRole.AGENT);

  const result = await ingestInboundMessage({
    tenantSlug,
    provider,
    contactDisplayName,
    contactExternalId,
    content,
    metadata: { source: "dashboard-simulator" },
  });

  revalidatePath("/");
  revalidatePath(`/tenants/${tenantSlug}`);
  redirect(`/tenants/${tenantSlug}?conversation=${result.conversationId}`);
}

export async function createWorkspace(formData: FormData) {
  const user = await requireAuth();

  const businessName = String(formData.get("businessName") ?? "").trim();
  const preferredSlug = String(formData.get("preferredSlug") ?? "").trim();
  const ownerName =
    String(formData.get("ownerName") ?? "").trim() || user.name;
  const ownerEmail =
    String(formData.get("ownerEmail") ?? "").trim() || user.email;
  const timezone = String(formData.get("timezone") ?? "UTC");
  const businessType = String(formData.get("businessType") ?? "").trim();
  const websiteUrl = String(formData.get("websiteUrl") ?? "").trim();
  const brandColor = String(formData.get("brandColor") ?? "").trim();
  const aiMode = String(formData.get("aiMode") ?? "SUGGEST") as AutomationMode;
  const aiInstructions = String(formData.get("aiInstructions") ?? "").trim();
  const aiManagerInstructions = String(formData.get("aiManagerInstructions") ?? "").trim();
  const providers = formData.getAll("providers") as ChannelProvider[];
  const rawPassword = String(formData.get("ownerPassword") ?? "").trim();

  // Optional inline LLM config
  const llmBaseUrl = String(formData.get("llmBaseUrl") ?? "").trim();
  const llmModel = String(formData.get("llmModel") ?? "").trim();
  const llmKey = String(formData.get("llmKey") ?? "").trim();

  // Optional operator bot token (sets up TG bot during workspace creation)
  const operatorBotToken = String(formData.get("operatorBotToken") ?? "").trim();

  // "Get managed AI" tab on onboarding form
  const requestManagedAiFlag =
    String(formData.get("requestManagedAi") ?? "") === "true" &&
    String(formData.get("llmTab") ?? "") === "managed";
  const managedAiNote = String(formData.get("managedAiNote") ?? "").trim();

  if (!businessName || !ownerName || !ownerEmail || providers.length === 0) {
    throw new Error("Missing required onboarding fields.");
  }

  const ownerPasswordHash = rawPassword
    ? await bcrypt.hash(rawPassword, 10)
    : undefined;

  const slug = await createTenantWorkspace({
    businessName,
    ownerName,
    ownerEmail,
    ownerPasswordHash,
    // CRITICAL: pass the session user id so the workspace membership goes
    // to the LOGGED-IN user, not a new AppUser created from the form's
    // ownerEmail. Without this the user couldn't see their own workspace.
    ownerUserId: user.id,
    timezone,
    businessType,
    websiteUrl,
    providers,
    aiMode,
    aiInstructions,
    preferredSlug,
  });

  // Optional post-creation extras
  if (aiManagerInstructions || llmBaseUrl || brandColor || operatorBotToken) {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (tenant) {
      const updates: {
        aiManagerInstructions?: string;
        aiCustomBaseUrl?: string;
        aiCustomModel?: string;
        aiCustomKeyMasked?: string;
        aiUseManaged?: boolean;
        brandColor?: string;
      } = {};
      if (aiManagerInstructions) updates.aiManagerInstructions = aiManagerInstructions;
      if (brandColor && /^#[0-9a-fA-F]{6}$/.test(brandColor)) {
        updates.brandColor = brandColor;
      }
      if (llmBaseUrl && llmModel) {
        updates.aiCustomBaseUrl = llmBaseUrl;
        updates.aiCustomModel = llmModel;
        updates.aiUseManaged = false;
        if (llmKey) {
          updates.aiCustomKeyMasked = maskSecret(llmKey);
          await prisma.integrationSecret.create({
            data: {
              tenantId: tenant.id,
              provider: ChannelProvider.WEBCHAT,
              secretKind: SecretKind.API_KEY,
              label: "Custom LLM API Key",
              maskedValue: maskSecret(llmKey),
              encryptedPayload: encryptSecret(llmKey),
            },
          });
        }
      }
      if (Object.keys(updates).length > 0) {
        await prisma.tenant.update({ where: { slug }, data: updates });
      }

      // Optional: connect operator bot inline (best-effort, errors don't abort)
      if (operatorBotToken && /^\d+:[A-Za-z0-9_-]+$/.test(operatorBotToken)) {
        try {
          const me = await tgGetMe(operatorBotToken);
          const masked = maskToken(operatorBotToken);
          const encrypted = encryptSecret(operatorBotToken);

          // No HTTPS in dev → ensure no leftover webhook
          try {
            await tgDeleteWebhook(operatorBotToken);
          } catch { /* ignore */ }
          try {
            await tgSetMyCommands(operatorBotToken);
            await tgSetChatMenuButton(operatorBotToken);
          } catch { /* ignore */ }

          await prisma.integrationSecret.create({
            data: {
              tenantId: tenant.id,
              provider: ChannelProvider.TELEGRAM,
              secretKind: SecretKind.BOT_TOKEN,
              label: "Operator Bot Token",
              maskedValue: masked,
              encryptedPayload: encrypted,
            },
          });
          await prisma.operatorBot.create({
            data: {
              tenantId: tenant.id,
              botId: String(me.id),
              botUsername: me.username,
              botName: me.first_name,
              tokenMasked: masked,
              status: "PARTIAL",
              lastError: "Webhook не установлен — используйте «Синхронизировать» на странице бота.",
            },
          });
        } catch (e) {
          console.error("Operator bot inline connect failed:", e);
        }
      }
    }
  }

  // Notify platform owner about new tenant (best-effort)
  await notifyService({
    kind: "tenant_created",
    tenantSlug: slug,
    tenantName: businessName,
    ownerName,
    ownerEmail,
  });

  // If user picked "managed AI" — flag tenant + send a separate notification
  if (requestManagedAiFlag) {
    try {
      await prisma.tenant.update({
        where: { slug },
        data: { aiManagedRequested: true, aiUseManaged: true },
      });
      await notifyService({
        kind: "managed_ai_request",
        tenantSlug: slug,
        tenantName: businessName,
        ownerName,
        ownerEmail,
        businessType: businessType || undefined,
        websiteUrl: websiteUrl || undefined,
        note: managedAiNote || undefined,
      });
    } catch (e) {
      console.error("managed AI request notify failed:", e);
    }
  }

  revalidatePath("/");
  revalidatePath("/onboarding");
  redirect(`/tenants/${slug}`);
}

export async function addWorkspaceMember(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  await requireTenantMember(tenantSlug, MembershipRole.ADMIN);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "AGENT") as MembershipRole;
  const telegramHandle = String(formData.get("telegramHandle") ?? "").trim();

  if (!tenantSlug || !name || !email) {
    throw new Error("Missing required team member fields.");
  }

  await addTenantMember({
    tenantSlug,
    name,
    email,
    role,
    telegramHandle: telegramHandle || undefined,
  });

  revalidatePath(`/tenants/${tenantSlug}`);
}

export async function saveWorkspaceSecret(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  await requireTenantMember(tenantSlug, MembershipRole.ADMIN);

  const channelConnectionId = String(formData.get("channelConnectionId") ?? "");
  const secretKind = String(formData.get("secretKind") ?? "") as SecretKind;
  const label = String(formData.get("label") ?? "").trim();
  const rawSecret = String(formData.get("rawSecret") ?? "").trim();

  if (!tenantSlug || !channelConnectionId || !secretKind || !label || !rawSecret) {
    throw new Error("Missing required secret fields.");
  }

  await storeIntegrationSecret({
    tenantSlug,
    channelConnectionId,
    secretKind,
    label,
    rawSecret,
  });

  revalidatePath(`/tenants/${tenantSlug}`);
}

export async function createOrder(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const { tenant } = await requireTenantMember(tenantSlug, MembershipRole.AGENT);

  const conversationId = String(formData.get("conversationId") ?? "");
  const contactName = String(formData.get("contactName") ?? "").trim();
  const contactPhone = String(formData.get("contactPhone") ?? "").trim();
  const itemsRaw = String(formData.get("items") ?? "").trim();
  const totalAmount = String(formData.get("totalAmount") ?? "").trim();
  const deliveryInfo = String(formData.get("deliveryInfo") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!conversationId || !contactName || !itemsRaw) {
    throw new Error("Необходимо указать диалог, имя клиента и товары.");
  }

  const items = itemsRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ name: line, qty: 1, price: "" }));

  await createOrderRecord({
    tenantId: tenant.id,
    conversationId,
    contactName,
    contactPhone: contactPhone || undefined,
    itemsJson: JSON.stringify(items),
    totalAmount: totalAmount || undefined,
    deliveryInfo: deliveryInfo || undefined,
    notes: notes || undefined,
  });

  revalidatePath(`/tenants/${tenantSlug}`);
  redirect(`/tenants/${tenantSlug}?tab=orders&conversation=${conversationId}`);
}

export async function updateOrderStatus(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  await requireTenantMember(tenantSlug, MembershipRole.AGENT);

  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;

  if (!orderId || !status) throw new Error("Missing orderId or status.");

  await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });

  revalidatePath(`/tenants/${tenantSlug}`);
  redirect(`/tenants/${tenantSlug}?tab=orders`);
}

export async function updateAiSettings(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  await requireTenantMember(tenantSlug, MembershipRole.ADMIN);

  const aiCollectOrders = formData.get("aiCollectOrders") === "on";
  const aiManagerInstructions = String(formData.get("aiManagerInstructions") ?? "").trim();

  await updateTenantAiSettings({
    tenantSlug,
    aiCollectOrders,
    aiManagerInstructions: aiManagerInstructions || undefined,
  });

  revalidatePath(`/tenants/${tenantSlug}`);
}

// ───────── AI preset (single 3-mode pill) ─────────
export async function setAiPreset(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  await requireTenantMember(tenantSlug, MembershipRole.AGENT);
  const preset = String(formData.get("preset") ?? "SUGGEST");

  let aiMode: AutomationMode;
  let aiCollectOrders: boolean;
  let aiEnabled: boolean;

  switch (preset) {
    case "AUTO_ORDERS":
      aiMode = AutomationMode.AUTO;
      aiCollectOrders = true;
      aiEnabled = true;
      break;
    case "OFF":
      aiMode = AutomationMode.OFF;
      aiCollectOrders = false;
      aiEnabled = false;
      break;
    case "SUGGEST":
    default:
      aiMode = AutomationMode.SUGGEST;
      aiCollectOrders = false;
      aiEnabled = true;
      break;
  }

  await prisma.tenant.update({
    where: { slug: tenantSlug },
    data: { aiMode, aiCollectOrders, aiEnabled },
  });

  revalidatePath(`/tenants/${tenantSlug}`);
}

// ───────── AI quick toggles (legacy granular controls) ─────────
export async function setWorkspaceAiMode(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  await requireTenantMember(tenantSlug, MembershipRole.AGENT);
  const mode = String(formData.get("mode") ?? "SUGGEST") as AutomationMode;

  await prisma.tenant.update({
    where: { slug: tenantSlug },
    data: { aiMode: mode, aiEnabled: mode !== AutomationMode.OFF },
  });

  revalidatePath(`/tenants/${tenantSlug}`);
}

export async function toggleAutoOrder(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  await requireTenantMember(tenantSlug, MembershipRole.AGENT);
  const on = formData.get("on") === "true";

  await prisma.tenant.update({
    where: { slug: tenantSlug },
    data: { aiCollectOrders: on },
  });

  revalidatePath(`/tenants/${tenantSlug}`);
}

export async function disableAllAi(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  await requireTenantMember(tenantSlug, MembershipRole.AGENT);

  await prisma.tenant.update({
    where: { slug: tenantSlug },
    data: {
      aiMode: AutomationMode.OFF,
      aiEnabled: false,
      aiCollectOrders: false,
    },
  });

  revalidatePath(`/tenants/${tenantSlug}`);
}

// ───────── Operator bot ─────────
export async function connectOperatorBot(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  await requireTenantMember(tenantSlug, MembershipRole.ADMIN);

  const token = String(formData.get("token") ?? "").trim();
  if (!token || !/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error("Неверный формат токена. Должен быть вида 123456:ABC...");
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error("Tenant not found");

  // Validate
  let me;
  try {
    me = await tgGetMe(token);
  } catch (e) {
    throw new Error(
      `Не удалось проверить токен: ${(e as Error).message}. Создайте бота через @BotFather и скопируйте токен.`,
    );
  }

  // Determine webhook URL from NEXTAUTH_URL
  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  const webhookUrl = baseUrl ? `${baseUrl}/api/webhooks/operator-bot/${tenant.id}` : null;

  let webhookOk = false;
  let lastError: string | null = null;

  if (webhookUrl && webhookUrl.startsWith("https://")) {
    try {
      await tgSetWebhook(token, webhookUrl);
      webhookOk = true;
    } catch (e) {
      lastError = `setWebhook: ${(e as Error).message}`;
    }
  } else {
    // Localhost: explicitly clear any previous webhook so polling (getUpdates) works
    try {
      await tgDeleteWebhook(token);
    } catch {
      /* ignore */
    }
    lastError =
      "Webhook не установлен (нет HTTPS адреса). Для приёма сообщений нажмите кнопку «Синхронизировать» — бот ответит на накопившиеся команды.";
  }

  // Try to register commands and menu button (these don't need webhook)
  try {
    await tgSetMyCommands(token);
    await tgSetChatMenuButton(token);
  } catch (e) {
    lastError = (lastError ? lastError + " | " : "") + `commands: ${(e as Error).message}`;
  }

  // Encrypt and store token
  const encrypted = encryptSecret(token);
  const masked = maskToken(token);

  const existingSecret = await prisma.integrationSecret.findFirst({
    where: { tenantId: tenant.id, label: "Operator Bot Token" },
  });
  if (existingSecret) {
    await prisma.integrationSecret.update({
      where: { id: existingSecret.id },
      data: {
        encryptedPayload: encrypted,
        maskedValue: masked,
        lastRotatedAt: new Date(),
      },
    });
  } else {
    await prisma.integrationSecret.create({
      data: {
        tenantId: tenant.id,
        provider: ChannelProvider.TELEGRAM,
        secretKind: SecretKind.BOT_TOKEN,
        label: "Operator Bot Token",
        maskedValue: masked,
        encryptedPayload: encrypted,
      },
    });
  }

  await prisma.operatorBot.upsert({
    where: { tenantId: tenant.id },
    update: {
      botId: String(me.id),
      botUsername: me.username,
      botName: me.first_name,
      tokenMasked: masked,
      status: webhookOk ? "CONNECTED" : "PARTIAL",
      webhookUrl: webhookUrl ?? undefined,
      lastError,
    },
    create: {
      tenantId: tenant.id,
      botId: String(me.id),
      botUsername: me.username,
      botName: me.first_name,
      tokenMasked: masked,
      status: webhookOk ? "CONNECTED" : "PARTIAL",
      webhookUrl: webhookUrl ?? undefined,
      lastError,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/telegram-bot");
  revalidatePath(`/tenants/${tenantSlug}`);
  revalidatePath(`/tenants/${tenantSlug}/setup`);
}

type TgUpdate = {
  update_id: number;
  message?: {
    chat: { id: number };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
  };
};

/**
 * Manually pull pending updates from Telegram and process them.
 *
 * Used on localhost where setWebhook can't reach the dev server. The
 * owner clicks "Синхронизировать" and we drain the bot's update queue.
 * In production this is unnecessary — webhook delivers updates instantly.
 */
export async function syncOperatorBot(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  await requireTenantMember(tenantSlug, MembershipRole.ADMIN);

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: { operatorBot: true },
  });
  if (!tenant?.operatorBot) throw new Error("Бот не подключён");

  const secret = await prisma.integrationSecret.findFirst({
    where: { tenantId: tenant.id, label: "Operator Bot Token" },
    orderBy: { updatedAt: "desc" },
  });
  if (!secret) throw new Error("Токен не найден");

  const token = decryptSecret(secret.encryptedPayload);

  // Lazy import to keep server bundle lean
  const { handleOperatorBotMessage } = await import("@/lib/operator-bot-handler");

  // Ensure long-polling works (deletes any leftover webhook from prior sessions)
  try {
    await tgDeleteWebhook(token);
  } catch {
    /* ignore */
  }

  const updates = (await tgGetUpdates(token)) as TgUpdate[];
  let processed = 0;

  for (const update of updates) {
    if (!update.message?.text || !update.message.chat?.id) continue;

    const chatId = update.message.chat.id;
    const from = update.message.from;
    if (from) {
      await prisma.operatorBotSubscriber.upsert({
        where: {
          tenantId_chatId: { tenantId: tenant.id, chatId: String(chatId) },
        },
        update: { username: from.username, firstName: from.first_name },
        create: {
          tenantId: tenant.id,
          chatId: String(chatId),
          username: from.username,
          firstName: from.first_name,
        },
      });
    }
    try {
      await handleOperatorBotMessage(tenant.id, token, chatId, update.message.text);
      processed += 1;
    } catch (e) {
      console.error("syncOperatorBot:", e);
    }
  }

  // Acknowledge all updates so they don't replay
  if (updates.length > 0) {
    const lastId = Math.max(...updates.map((u) => u.update_id));
    await tgGetUpdates(token, lastId + 1);
  }

  await prisma.operatorBot.update({
    where: { tenantId: tenant.id },
    data: { lastError: `Синхронизировано: ${processed} сообщений` },
  });

  revalidatePath("/dashboard/telegram-bot");
}

export async function sendOperatorBotTest(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const chatId = String(formData.get("chatId") ?? "").trim();
  await requireTenantMember(tenantSlug, MembershipRole.ADMIN);

  if (!chatId) throw new Error("Укажите Chat ID");

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: { operatorBot: true },
  });
  if (!tenant?.operatorBot) throw new Error("Бот не подключён");

  const secret = await prisma.integrationSecret.findFirst({
    where: { tenantId: tenant.id, label: "Operator Bot Token" },
    orderBy: { updatedAt: "desc" },
  });
  if (!secret) throw new Error("Токен не найден");

  const token = decryptSecret(secret.encryptedPayload);

  await tgSendMessage(
    token,
    chatId,
    `✅ <b>Тестовое сообщение от Hyve</b>\n\n` +
      `Связь с workspace <i>${tenant.name}</i> установлена. Откройте меню (👇) для команд.`,
    { reply_markup: makeReplyKeyboard() },
  );
}

// ───────── Theme ─────────
export async function setTheme(theme: Theme) {
  const store = await cookies();
  store.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Save to user record if logged in
  try {
    const user = await requireAuth();
    await prisma.appUser.update({
      where: { id: user.id },
      data: { themePreference: theme },
    });
  } catch {
    // Anonymous — cookie only
  }
}

// ───────── Locale ─────────
/**
 * Persist the UI locale. Mirrors setTheme:
 *   1) cookie `ui_locale` — survives logout, used pre-auth
 *   2) AppUser.localePreference — long-term store, restored on login
 */
export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) throw new Error("Invalid locale");

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  try {
    const user = await requireAuth();
    await prisma.appUser.update({
      where: { id: user.id },
      data: { localePreference: locale },
    });
  } catch {
    // Anonymous — cookie only
  }

  revalidatePath("/", "layout");
}

// ───────── Add a channel to an existing tenant ─────────
// Used by the "Добавить канал" dropdown on /tenants/[slug]/setup.
// Just creates a PENDING ChannelConnection — operator then adds the
// secret in the Vault section to activate it.
export async function addChannelToTenant(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const provider = String(formData.get("provider") ?? "") as ChannelProvider;
  const { tenant } = await requireTenantMember(tenantSlug, MembershipRole.ADMIN);

  if (!provider) throw new Error("Не выбран канал");

  // Avoid duplicates — if a channel of this provider already exists, just
  // re-enable it instead of creating a second row.
  const existing = await prisma.channelConnection.findFirst({
    where: { tenantId: tenant.id, provider },
  });

  if (existing) {
    await prisma.channelConnection.update({
      where: { id: existing.id },
      data: { enabled: true, status: existing.status === "DISCONNECTED" ? ConnectionStatus.PENDING : existing.status },
    });
  } else {
    const labelByProvider: Record<string, string> = {
      INSTAGRAM: "Instagram DM",
      WHATSAPP: "WhatsApp",
      TELEGRAM: "Telegram",
      MESSENGER: "Messenger",
      VIBER: "Viber",
      SIGNAL: "Signal",
      WEBCHAT: "Web Chat",
    };
    const authByProvider: Record<string, string> = {
      INSTAGRAM: "OAuth Login",
      WHATSAPP: "Embedded Signup",
      TELEGRAM: "Bot Token",
      MESSENGER: "Page Access Token",
      VIBER: "Bot Token",
      SIGNAL: "API Key",
      WEBCHAT: "JS embed",
    };
    await prisma.channelConnection.create({
      data: {
        tenantId: tenant.id,
        provider,
        label: labelByProvider[provider] ?? String(provider),
        status: ConnectionStatus.PENDING,
        authMode: authByProvider[provider] ?? null,
        enabled: true,
      },
    });
  }

  revalidatePath(`/tenants/${tenantSlug}`);
  revalidatePath(`/tenants/${tenantSlug}/setup`);
}

// ───────── Channel toggle ─────────
export async function toggleChannel(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  await requireTenantMember(tenantSlug, MembershipRole.AGENT);

  const channelId = String(formData.get("channelId") ?? "");
  const enable = formData.get("enable") === "true";
  if (!channelId) throw new Error("Missing channelId");

  await prisma.channelConnection.update({
    where: { id: channelId },
    data: { enabled: enable },
  });

  revalidatePath(`/tenants/${tenantSlug}`);
  revalidatePath(`/tenants/${tenantSlug}/setup`);
}

// ───────── Custom LLM config ─────────
export async function saveCustomLlmConfig(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  await requireTenantMember(tenantSlug, MembershipRole.ADMIN);

  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();

  if (!baseUrl || !model) {
    throw new Error("Укажите base URL и название модели.");
  }

  const data: {
    aiUseManaged: boolean;
    aiCustomBaseUrl: string;
    aiCustomModel: string;
    aiCustomKeyMasked?: string;
  } = {
    aiUseManaged: false,
    aiCustomBaseUrl: baseUrl,
    aiCustomModel: model,
  };

  if (apiKey) {
    data.aiCustomKeyMasked = maskSecret(apiKey);

    // Also store encrypted secret
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (tenant) {
      const encryptedPayload = encryptSecret(apiKey);
      const existing = await prisma.integrationSecret.findFirst({
        where: {
          tenantId: tenant.id,
          provider: ChannelProvider.WEBCHAT,
          secretKind: SecretKind.API_KEY,
          label: "Custom LLM API Key",
        },
      });
      if (existing) {
        await prisma.integrationSecret.update({
          where: { id: existing.id },
          data: {
            encryptedPayload,
            maskedValue: maskSecret(apiKey),
            lastRotatedAt: new Date(),
          },
        });
      } else {
        await prisma.integrationSecret.create({
          data: {
            tenantId: tenant.id,
            provider: ChannelProvider.WEBCHAT,
            secretKind: SecretKind.API_KEY,
            label: "Custom LLM API Key",
            maskedValue: maskSecret(apiKey),
            encryptedPayload,
          },
        });
      }
    }
  }

  await prisma.tenant.update({
    where: { slug: tenantSlug },
    data,
  });

  revalidatePath(`/tenants/${tenantSlug}`);
  revalidatePath(`/tenants/${tenantSlug}/setup`);
}

export async function requestManagedAi(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const { tenant, user } = await requireTenantMember(
    tenantSlug,
    MembershipRole.ADMIN,
  );

  // Re-fetch with onboarding info
  const fullTenant = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    include: { onboarding: true },
  });

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { aiManagedRequested: true, aiUseManaged: true },
  });

  // Notify platform owner via service bot
  await notifyService({
    kind: "managed_ai_request",
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    ownerName: user.name,
    ownerEmail: user.email,
    businessType: fullTenant?.businessType ?? undefined,
    websiteUrl: fullTenant?.onboarding?.websiteUrl ?? undefined,
    note: note || undefined,
  });

  revalidatePath(`/tenants/${tenantSlug}`);
  revalidatePath(`/tenants/${tenantSlug}/setup`);
}

// ───────── Onboarding completion ─────────
export async function completeOnboarding(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  await requireTenantMember(tenantSlug, MembershipRole.ADMIN);

  await prisma.tenant.update({
    where: { slug: tenantSlug },
    data: { onboardingComplete: true },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/tenants/${tenantSlug}`);
  revalidatePath(`/tenants/${tenantSlug}/setup`);
  redirect(`/tenants/${tenantSlug}`);
}

// ───────── Invite team member with flexible identifier ─────────
export async function inviteTeamMember(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  await requireTenantMember(tenantSlug, MembershipRole.ADMIN);

  const identifierType = String(formData.get("identifierType") ?? "email");
  const identifier = String(formData.get("identifier") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || identifier;
  const role = String(formData.get("role") ?? "AGENT") as MembershipRole;

  if (!identifier) throw new Error("Укажите идентификатор пользователя.");

  let email = "";
  let telegramHandle: string | undefined;

  if (identifierType === "email") {
    email = identifier.toLowerCase();
  } else if (identifierType === "telegram") {
    telegramHandle = identifier.startsWith("@") ? identifier : `@${identifier}`;
    email = `${identifier.replace(/[^a-z0-9]/gi, "_").toLowerCase()}@tg.local`;
  } else {
    // nickname
    email = `${identifier.replace(/[^a-z0-9]/gi, "_").toLowerCase()}@user.local`;
  }

  await addTenantMember({
    tenantSlug,
    name,
    email,
    role,
    telegramHandle,
  });

  revalidatePath(`/tenants/${tenantSlug}`);
  revalidatePath("/dashboard");
}

export async function sendReply(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const { user, tenant } = await requireTenantMember(
    tenantSlug,
    MembershipRole.AGENT,
  );

  const conversationId = String(formData.get("conversationId") ?? "");
  const content = String(formData.get("content") ?? "");
  const attachmentsJson = String(formData.get("attachmentsJson") ?? "").trim();

  if (!tenantSlug || !conversationId || !content) {
    throw new Error("Missing required reply fields.");
  }

  await createOutboundMessage({
    tenantSlug,
    conversationId,
    senderLabel: user.name,
    content,
    metadata: attachmentsJson ? JSON.parse(attachmentsJson) : undefined,
  });

  // Dispatch to live provider if Telegram
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (conversation?.provider === "TELEGRAM") {
    await dispatchTelegramMessage(tenant.id, conversationId, content);
  }

  // No redirect — Server Component re-renders via revalidatePath, chat stays in place
  revalidatePath(`/tenants/${tenantSlug}`);
}

// ───────── Public access request (from landing page) ─────────
// No auth — anyone on the landing page can submit. Light validation,
// persists to DB, then notifies the platform owner via service bot
// with inline approval buttons.
export async function requestServiceAccess(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  const t = await getTranslations();
  const contactRaw = String(formData.get("contact") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!contactRaw) {
    return { ok: false, error: t("serverErrors.contactRequired") };
  }
  if (contactRaw.length > 200 || message.length > 1000) {
    return { ok: false, error: t("serverErrors.tooLong") };
  }

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactRaw);
  const isTelegram =
    /^@?[A-Za-z][A-Za-z0-9_]{2,31}$/.test(contactRaw) ||
    /^\+?\d[\d\s().-]{6,20}$/.test(contactRaw);

  if (!isEmail && !isTelegram) {
    return {
      ok: false,
      error: t("serverErrors.invalidContact"),
    };
  }

  const contact = isEmail
    ? contactRaw.toLowerCase()
    : contactRaw.startsWith("@") || contactRaw.startsWith("+")
      ? contactRaw
      : `@${contactRaw}`;
  const contactType = isEmail ? "email" : "telegram";

  // Use direct libsql (Prisma adapter has packaging issues on Vercel — see
  // src/lib/access-request-db.ts for context).
  const { createAccessRequest, setAccessRequestNotifyMessageId } = await import(
    "@/lib/access-request-db"
  );

  // 1. Persist the request
  const created = await createAccessRequest({
    contact,
    contactType,
    message: message || null,
  });

  // 2. Notify admin in TG with inline buttons (approve/reject)
  const result = await notifyService({
    kind: "access_request",
    requestId: created.id,
    contact,
    contactType,
    message: message || undefined,
  });

  // 3. Save the message_id so the webhook can later edit/replace this message
  if (result.ok && result.messageId) {
    await setAccessRequestNotifyMessageId(created.id, result.messageId);
  }

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// MANAGED SETUP — "concierge" setup by a Hyve specialist
// User explicitly consents to grant temporary account access so we can
// fully configure their workspace (channels, AI, operators, etc.) for them.
// ─────────────────────────────────────────────────────────────────────

export async function requestManagedSetupAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuth();
  const t = await getTranslations();

  const contactRaw = String(formData.get("contact") ?? "").trim();
  const businessNameRaw = String(formData.get("businessName") ?? "").trim();
  const messageRaw = String(formData.get("message") ?? "").trim();
  const consent = String(formData.get("consent") ?? "") === "on" || String(formData.get("consent") ?? "") === "true";

  if (!consent) {
    return { ok: false, error: t("serverErrors.consentRequired") };
  }
  if (!contactRaw) {
    return { ok: false, error: t("serverErrors.contactForUs") };
  }
  if (contactRaw.length > 200 || messageRaw.length > 2000 || businessNameRaw.length > 200) {
    return { ok: false, error: t("serverErrors.tooLong") };
  }

  const EMAIL_RE_LOCAL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const TG_RE_LOCAL = /^@?[A-Za-z][A-Za-z0-9_]{2,31}$/;

  const isEmail = EMAIL_RE_LOCAL.test(contactRaw);
  const isTg = TG_RE_LOCAL.test(contactRaw);
  if (!isEmail && !isTg) {
    return { ok: false, error: t("serverErrors.contactKind") };
  }

  const contact = isEmail
    ? contactRaw.toLowerCase()
    : contactRaw.startsWith("@")
    ? contactRaw
    : `@${contactRaw}`;
  const contactType: "telegram" | "email" = isEmail ? "email" : "telegram";

  const { createManagedSetupRequest, attachNotifyMessageId } = await import(
    "@/lib/managed-setup-db"
  );

  const created = await createManagedSetupRequest({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    contact,
    contactType,
    businessName: businessNameRaw || null,
    message: messageRaw || null,
  });

  const result = await notifyService({
    kind: "managed_setup_request",
    requestId: created.id,
    userName: user.name,
    userEmail: user.email,
    contact,
    contactType,
    businessName: businessNameRaw || undefined,
    message: messageRaw || undefined,
    consentAt: created.consentAt,
  });

  if (result.ok && result.messageId) {
    await attachNotifyMessageId(created.id, result.messageId);
  }

  return { ok: true };
}

export async function revokeManagedSetupAction(): Promise<{ ok: boolean }> {
  const user = await requireAuth();
  const { revokeManagedSetupConsent } = await import("@/lib/managed-setup-db");
  await revokeManagedSetupConsent(user.id);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// PROFILE / ACCOUNT actions
// ─────────────────────────────────────────────────────────────────────

const PASSWORD_RE = /^.{6,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TG_RE = /^@?[A-Za-z][A-Za-z0-9_]{2,31}$/;
const LOGIN_RE = /^[a-z][a-z0-9_.-]{2,30}$/i; // letters/digits/_-., 3-31 chars

export async function changePasswordAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuth();
  const oldPassword = String(formData.get("oldPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const skipOldCheck = String(formData.get("firstLogin") ?? "") === "1";

  if (!PASSWORD_RE.test(newPassword)) {
    return { ok: false, error: "Пароль: от 6 до 30 символов." };
  }

  const { findUserByLoginDirect, updateUserPasswordDirect } = await import(
    "@/lib/access-request-db"
  );
  const userRow = await findUserByLoginDirect(user.email);
  if (!userRow?.passwordHash) {
    return { ok: false, error: "Пользователь не найден." };
  }

  // First-login flow doesn't need old-password verification
  if (!skipOldCheck) {
    const match = await bcrypt.compare(oldPassword, userRow.passwordHash);
    if (!match) {
      return { ok: false, error: "Текущий пароль неверный." };
    }
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await updateUserPasswordDirect(user.id, newHash);

  return { ok: true };
}

export async function updateLoginAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuth();
  const newLogin = String(formData.get("newLogin") ?? "").trim().toLowerCase();

  if (!LOGIN_RE.test(newLogin) && !EMAIL_RE.test(newLogin)) {
    return {
      ok: false,
      error: "Логин: 3–31 символ (буквы, цифры, _.-) или валидный email.",
    };
  }

  const { updateUserLoginDirect } = await import("@/lib/access-request-db");
  return await updateUserLoginDirect(user.id, newLogin);
}

export async function updateProfileAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuth();

  // Build a partial patch — ONLY fields that were actually submitted.
  // This prevents wiping recovery contacts when the user is just editing
  // their name (or vice versa), since the profile cabinet uses separate
  // forms per card.
  const patch: { name?: string; recoveryEmail?: string | null; recoveryTelegram?: string | null } = {};

  if (formData.has("name")) {
    const name = String(formData.get("name") ?? "").trim();
    if (name.length > 100) return { ok: false, error: "Имя слишком длинное" };
    if (name) patch.name = name;
  }

  if (formData.has("recoveryEmail")) {
    const raw = String(formData.get("recoveryEmail") ?? "").trim();
    if (raw) {
      if (!EMAIL_RE.test(raw)) {
        return { ok: false, error: "Email для восстановления некорректный." };
      }
      patch.recoveryEmail = raw.toLowerCase();
    } else {
      patch.recoveryEmail = null; // explicit clear
    }
  }

  if (formData.has("recoveryTelegram")) {
    const raw = String(formData.get("recoveryTelegram") ?? "").trim();
    if (raw) {
      if (!TG_RE.test(raw)) {
        return {
          ok: false,
          error: "Telegram-username: латиница/цифры/_, 3–32 символа.",
        };
      }
      patch.recoveryTelegram = raw.startsWith("@") ? raw : `@${raw}`;
    } else {
      patch.recoveryTelegram = null; // explicit clear
    }
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true }; // nothing to update — no-op
  }

  const { updateUserRecoveryDirect } = await import("@/lib/access-request-db");
  await updateUserRecoveryDirect(user.id, patch);

  return { ok: true };
}

export async function submitSupportAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuth();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!message) return { ok: false, error: "Опишите проблему." };
  if (message.length > 5000) {
    return { ok: false, error: "Сообщение слишком длинное (макс 5000)." };
  }

  await notifyService({
    kind: "feedback",
    from: `${user.name} (${user.email})`,
    message: subject ? `[${subject}]\n\n${message}` : message,
  });
  return { ok: true };
}

export async function requestPasswordResetAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const loginRaw = String(formData.get("login") ?? "").trim();
  if (!loginRaw) return { ok: false, error: "Введите логин или email." };

  const { findUserByLoginDirect, getUserProfile, createPasswordResetDirect } =
    await import("@/lib/access-request-db");

  const user = await findUserByLoginDirect(loginRaw);
  // Don't leak whether the user exists
  if (!user) return { ok: true };

  const profile = await getUserProfile(user.id);
  if (!profile) return { ok: true };

  // Generate token (URL-safe, 32 chars hex)
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  const token = Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

  await createPasswordResetDirect({
    userId: user.id,
    token,
    expiresAt,
  });

  const resetUrl =
    (process.env.NEXTAUTH_URL ?? "https://hyve-inbox.vercel.app").replace(/\/$/, "") +
    `/reset/${token}`;

  // Notify admin via service bot — admin forwards link to user via the
  // recovery contact. (No SMTP infrastructure on Vercel free tier.)
  await notifyService({
    kind: "feedback",
    from: `🔐 Сброс пароля: ${user.name} (${user.email})`,
    message:
      `Пользователь запросил сброс пароля.\n\n` +
      `📧 Recovery email: ${profile.recoveryEmail ?? "—"}\n` +
      `📱 Recovery Telegram: ${profile.recoveryTelegram ?? "—"}\n\n` +
      `Ссылка для сброса (действует 30 минут):\n${resetUrl}\n\n` +
      `Перешлите её клиенту по указанному контакту.`,
  });

  return { ok: true };
}

export async function resetPasswordWithTokenAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const token = String(formData.get("token") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!PASSWORD_RE.test(newPassword)) {
    return { ok: false, error: "Пароль: от 6 до 30 символов." };
  }

  const {
    findPasswordResetDirect,
    markPasswordResetUsedDirect,
    updateUserPasswordDirect,
  } = await import("@/lib/access-request-db");

  const reset = await findPasswordResetDirect(token);
  if (!reset) return { ok: false, error: "Неверный или истёкший токен." };
  if (reset.used === 1)
    return { ok: false, error: "Токен уже использован." };

  const expires = new Date(reset.expiresAt);
  if (Number.isNaN(expires.getTime()) || expires.getTime() < Date.now()) {
    return { ok: false, error: "Срок действия токена истёк." };
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await updateUserPasswordDirect(reset.userId, newHash);
  await markPasswordResetUsedDirect(reset.id);

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// TELEGRAM SETUP REQUESTS — landing page CTA flows
//
// Two flows funnel from the landing page Telegram chip into our service
// bot inbox so the platform owner can hand-onboard each new lead:
//
//   1) requestTelegramSelfSetup  — user gives us their OWN bot token +
//      Telegram user id + which channels they want. After we grant access
//      to that bot, user fills the per-channel creds privately inside the
//      bot itself (Hyve service never sees Instagram/WhatsApp/etc tokens).
//
//   2) requestTelegramManagedSetup — user gives us only their contact
//      (TG/email/phone). A Hyve specialist contacts them and sets up
//      everything end-to-end (creating the bot, finding the TG id, etc).
//
// Both work for guests (no session required). They write a row into
// telegram_setup_requests via libsql and ping the admin chat with
// inline buttons for status management.
// ─────────────────────────────────────────────────────────────────────

type ContactNormalized = {
  contact: string;
  contactType: "telegram" | "email" | "phone";
};

function normalizeContact(raw: string): ContactNormalized | null {
  const v = raw.trim();
  if (!v) return null;
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  if (isEmail) {
    return { contact: v.toLowerCase(), contactType: "email" };
  }
  // Telegram username: @username or username (3-32 chars, alphanumeric + underscore, starts with letter)
  if (/^@?[A-Za-z][A-Za-z0-9_]{2,31}$/.test(v)) {
    return {
      contact: v.startsWith("@") ? v : `@${v}`,
      contactType: "telegram",
    };
  }
  // Phone: 7-20 digits with optional + and separators
  if (/^\+?\d[\d\s().-]{6,20}$/.test(v)) {
    return { contact: v.replace(/\s+/g, ""), contactType: "phone" };
  }
  return null;
}

// Whitelist of channel codes that can be submitted on the form
const TELEGRAM_SETUP_CHANNELS = new Set([
  "INSTAGRAM",
  "WHATSAPP",
  "TELEGRAM",
  "MESSENGER",
  "VIBER",
  "SIGNAL",
  "WEBCHAT",
]);

// Bot token from @BotFather: <numeric_id>:<base64ish_secret>
function isValidBotToken(s: string): boolean {
  return /^\d{6,15}:[A-Za-z0-9_-]{20,}$/.test(s);
}

// Telegram numeric user id (positive integer, up to ~12 digits in practice)
function isValidTgUserId(s: string): boolean {
  return /^\d{5,15}$/.test(s);
}

export async function requestTelegramSelfSetup(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const t = await getTranslations();

  const contactRaw = String(formData.get("contact") ?? "");
  const botToken = String(formData.get("botToken") ?? "").trim();
  const tgUserId = String(formData.get("telegramUserId") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const channels = formData.getAll("channels").map((c) => String(c).toUpperCase());

  if (contactRaw.length > 200 || businessName.length > 120 || message.length > 1000) {
    return { ok: false, error: t("serverErrors.tooLong") };
  }
  const normalized = normalizeContact(contactRaw);
  if (!normalized) {
    return { ok: false, error: t("serverErrors.invalidContact") };
  }
  if (!isValidBotToken(botToken)) {
    return {
      ok: false,
      error: t("serverErrors.invalidBotToken"),
    };
  }
  if (!isValidTgUserId(tgUserId)) {
    return {
      ok: false,
      error: t("serverErrors.invalidTgUserId"),
    };
  }
  const filteredChannels = channels.filter((c) => TELEGRAM_SETUP_CHANNELS.has(c));
  if (filteredChannels.length === 0) {
    return {
      ok: false,
      error: t("serverErrors.channelsRequired"),
    };
  }

  const session = await auth().catch(() => null);

  const { createTelegramSetupRequest, attachNotifyMessageId } = await import(
    "@/lib/telegram-setup-db"
  );

  let created;
  try {
    created = await createTelegramSetupRequest({
      userId: session?.user?.id ?? null,
      flow: "self",
      contact: normalized.contact,
      contactType: normalized.contactType,
      botToken,
      telegramUserId: tgUserId,
      selectedChannels: filteredChannels,
      businessName: businessName || null,
      message: message || null,
    });
  } catch (e) {
    console.error("[requestTelegramSelfSetup] db:", e);
    return { ok: false, error: t("serverErrors.generic") };
  }

  const result = await notifyService({
    kind: "telegram_setup_self",
    requestId: created.id,
    contact: normalized.contact,
    contactType: normalized.contactType,
    botToken,
    telegramUserId: tgUserId,
    selectedChannels: filteredChannels,
    businessName: businessName || undefined,
    message: message || undefined,
  });

  if (result.ok && result.messageId) {
    await attachNotifyMessageId(created.id, result.messageId).catch(() => {});
  }

  return { ok: true };
}

export async function requestTelegramManagedSetup(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const t = await getTranslations();

  const contactRaw = String(formData.get("contact") ?? "");
  const businessName = String(formData.get("businessName") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (contactRaw.length > 200 || businessName.length > 120 || message.length > 1000) {
    return { ok: false, error: t("serverErrors.tooLong") };
  }
  const normalized = normalizeContact(contactRaw);
  if (!normalized) {
    return { ok: false, error: t("serverErrors.invalidContact") };
  }

  const session = await auth().catch(() => null);

  const { createTelegramSetupRequest, attachNotifyMessageId } = await import(
    "@/lib/telegram-setup-db"
  );

  let created;
  try {
    created = await createTelegramSetupRequest({
      userId: session?.user?.id ?? null,
      flow: "managed",
      contact: normalized.contact,
      contactType: normalized.contactType,
      businessName: businessName || null,
      message: message || null,
    });
  } catch (e) {
    console.error("[requestTelegramManagedSetup] db:", e);
    return { ok: false, error: t("serverErrors.generic") };
  }

  const result = await notifyService({
    kind: "telegram_setup_managed",
    requestId: created.id,
    contact: normalized.contact,
    contactType: normalized.contactType,
    businessName: businessName || undefined,
    message: message || undefined,
  });

  if (result.ok && result.messageId) {
    await attachNotifyMessageId(created.id, result.messageId).catch(() => {});
  }

  return { ok: true };
}
