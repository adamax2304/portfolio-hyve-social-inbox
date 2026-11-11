import { prisma } from "@/lib/prisma";
import { encryptSecret, maskSecret } from "@/lib/security";
import {
  AutomationMode,
  ChannelProvider,
  ConnectionStatus,
  ConversationStatus,
  EventKind,
  MembershipRole,
  MessageDirection,
  MessageStatus,
  OnboardingStatus,
  OrderStatus,
  SecretKind,
} from "@prisma/client";

type InboundPayload = {
  tenantSlug: string;
  provider: ChannelProvider;
  channelLabel?: string;
  externalAccountId?: string;
  contactExternalId: string;
  contactDisplayName: string;
  contactUsername?: string;
  content: string;
  externalMessageId?: string;
  metadata?: Record<string, unknown>;
};

type OutboundPayload = {
  tenantSlug: string;
  conversationId: string;
  senderLabel: string;
  content: string;
  metadata?: Record<string, unknown>;
};

type CreateWorkspacePayload = {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPasswordHash?: string;
  /**
   * If provided, the workspace membership is attached to THIS existing user
   * directly (no upsert). Used when the action is called from a logged-in
   * session — prevents creating a duplicate AppUser when the form's
   * ownerEmail differs from the session's login.
   */
  ownerUserId?: string;
  timezone: string;
  businessType?: string;
  websiteUrl?: string;
  providers: ChannelProvider[];
  aiMode: AutomationMode;
  aiInstructions?: string;
  preferredSlug?: string;
};

type SaveSecretPayload = {
  tenantSlug: string;
  channelConnectionId: string;
  secretKind: SecretKind;
  label: string;
  rawSecret: string;
};

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export async function getDashboardSnapshot(userId?: string) {
  let tenantIds: string[] | undefined;

  if (userId) {
    const memberships = await prisma.tenantMembership.findMany({
      where: { userId },
      select: { tenantId: true },
    });
    tenantIds = memberships.map((m) => m.tenantId);
  }

  const [tenants, conversations] = await Promise.all([
    prisma.tenant.findMany({
      where: tenantIds ? { id: { in: tenantIds } } : undefined,
      include: {
        channels: true,
        automationRules: true,
        memberships: {
          include: {
            user: true,
          },
        },
        onboarding: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.conversation.findMany({
      where: tenantIds ? { tenantId: { in: tenantIds } } : undefined,
      select: {
        tenantId: true,
        status: true,
        lastMessageAt: true,
      },
      orderBy: {
        lastMessageAt: "desc",
      },
    }),
  ]);

  const conversationsByTenant = new Map<string, typeof conversations>();

  for (const conversation of conversations) {
    const list = conversationsByTenant.get(conversation.tenantId) ?? [];
    list.push(conversation);
    conversationsByTenant.set(conversation.tenantId, list);
  }

  const tenantCards = tenants.map((tenant) => {
    const parsedChecklist = parseChecklist(tenant.onboarding?.checklistJson);

    return {
      ...tenant,
      conversations: conversationsByTenant.get(tenant.id) ?? [],
      parsedChecklist,
      onboardingProgress: getChecklistProgress(parsedChecklist),
      selectedProviders: parseProviderList(tenant.onboarding?.selectedProviders),
    };
  });

  const pendingOrderCount = tenantIds
    ? await prisma.order.count({
        where: { tenantId: { in: tenantIds }, status: OrderStatus.NEW },
      })
    : await prisma.order.count({ where: { status: OrderStatus.NEW } });

  const recentOrders = await prisma.order.findMany({
    where: tenantIds ? { tenantId: { in: tenantIds } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const metrics = {
    tenants: tenantCards.length,
    connectedChannels: tenantCards
      .flatMap((tenant) => tenant.channels)
      .filter((channel) => channel.status === ConnectionStatus.CONNECTED).length,
    openConversations: tenantCards
      .flatMap((tenant) => tenant.conversations)
      .filter(
        (conversation) =>
          conversation.status === ConversationStatus.OPEN ||
          conversation.status === ConversationStatus.ESCALATED,
      ).length,
    automationRules: tenantCards
      .flatMap((tenant) => tenant.automationRules)
      .filter((rule) => rule.isEnabled).length,
    teammates: tenantCards.flatMap((tenant) => tenant.memberships).length,
    readyToLaunch: tenantCards.filter(
      (tenant) =>
        tenant.onboarding?.status === OnboardingStatus.READY ||
        tenant.onboarding?.status === OnboardingStatus.LIVE,
    ).length,
    pendingOrders: pendingOrderCount,
  };

  return { tenants: tenantCards, metrics, recentOrders };
}

export async function getTenantWorkspace(
  tenantSlug: string,
  selectedConversationId?: string,
) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: {
      channels: {
        include: {
          secrets: {
            orderBy: {
              updatedAt: "desc",
            },
          },
        },
        orderBy: [{ status: "asc" }, { provider: "asc" }],
      },
      automationRules: {
        orderBy: {
          createdAt: "asc",
        },
      },
      memberships: {
        include: {
          user: true,
        },
        orderBy: {
          joinedAt: "asc",
        },
      },
      onboarding: true,
      secrets: {
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
  });

  if (!tenant) {
    return null;
  }

  const [conversations, orders] = await Promise.all([
    prisma.conversation.findMany({
      where: { tenantId: tenant.id },
      include: {
        contact: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { lastMessageAt: "desc" },
    }),
    prisma.order.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const parsedChecklist = parseChecklist(tenant.onboarding?.checklistJson);
  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ??
    conversations[0] ??
    null;

  return {
    tenant: {
      ...tenant,
      conversations,
      parsedChecklist,
      onboardingProgress: getChecklistProgress(parsedChecklist),
      selectedProviders: parseProviderList(tenant.onboarding?.selectedProviders),
    },
    selectedConversation,
    orders,
  };
}

export async function createTenantWorkspace(input: CreateWorkspacePayload) {
  const slug = await makeUniqueSlug(input.preferredSlug ?? input.businessName);
  const providers = [...new Set(input.providers)];
  const checklist = buildChecklist(providers);

  return prisma.$transaction(async (tx) => {
    // If a session userId was passed, attach the workspace to THAT user
    // directly. Otherwise upsert by email (legacy / unauthenticated path).
    let owner;
    if (input.ownerUserId) {
      const existing = await tx.appUser.findUnique({
        where: { id: input.ownerUserId },
      });
      if (!existing) throw new Error("Authenticated user not found in DB");
      owner = await tx.appUser.update({
        where: { id: input.ownerUserId },
        data: {
          // refresh display name if the form provided one
          ...(input.ownerName ? { name: input.ownerName } : {}),
        },
      });
    } else {
      owner = await tx.appUser.upsert({
        where: { email: input.ownerEmail.toLowerCase() },
        update: {
          name: input.ownerName,
          ...(input.ownerPasswordHash
            ? { passwordHash: input.ownerPasswordHash }
            : {}),
        },
        create: {
          name: input.ownerName,
          email: input.ownerEmail.toLowerCase(),
          passwordHash: input.ownerPasswordHash,
        },
      });
    }

    const tenant = await tx.tenant.create({
      data: {
        name: input.businessName,
        slug,
        timezone: input.timezone,
        aiMode: input.aiMode,
        aiEnabled: input.aiMode !== AutomationMode.OFF,
        aiInstructions:
          input.aiInstructions ||
          "Start in AI draft mode. Escalate pricing, inventory promises, and custom delivery requests to a human.",
      },
    });

    await tx.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: owner.id,
        role: MembershipRole.OWNER,
      },
    });

    await tx.tenantOnboarding.create({
      data: {
        tenantId: tenant.id,
        status: OnboardingStatus.DRAFT,
        businessType: input.businessType,
        contactEmail: owner.email,
        websiteUrl: input.websiteUrl,
        selectedProviders: providers.join(","),
        checklistJson: JSON.stringify(checklist),
      },
    });

    for (const provider of providers) {
      await tx.channelConnection.create({
        data: {
          tenantId: tenant.id,
          provider,
          label: defaultChannelLabel(provider),
          status: ConnectionStatus.PENDING,
          authMode: defaultAuthMode(provider),
        },
      });
    }

    await tx.automationRule.create({
      data: {
        tenantId: tenant.id,
        name: "Launch triage for fresh leads",
        provider: providers[0] ?? null,
        triggerType: "routing",
        summary:
          "Route first-touch sales questions into AI draft mode until the business has approved full guardrails.",
      },
    });

    return tenant.slug;
  });
}

export async function addTenantMember(input: {
  tenantSlug: string;
  name: string;
  email: string;
  role: MembershipRole;
  telegramHandle?: string;
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: input.tenantSlug },
  });

  if (!tenant) {
    throw new Error(`Tenant ${input.tenantSlug} was not found.`);
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.appUser.upsert({
      where: { email: input.email.toLowerCase() },
      update: {
        name: input.name,
        telegramHandle: input.telegramHandle || undefined,
      },
      create: {
        name: input.name,
        email: input.email.toLowerCase(),
        telegramHandle: input.telegramHandle || undefined,
      },
    });

    await tx.tenantMembership.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id,
        },
      },
      update: {
        role: input.role,
      },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        role: input.role,
      },
    });
  });
}

export async function storeIntegrationSecret(input: SaveSecretPayload) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: input.tenantSlug },
  });

  if (!tenant) {
    throw new Error(`Tenant ${input.tenantSlug} was not found.`);
  }

  return prisma.$transaction(async (tx) => {
    const channel = await tx.channelConnection.findUnique({
      where: {
        id: input.channelConnectionId,
      },
    });

    if (!channel || channel.tenantId !== tenant.id) {
      throw new Error("Channel connection does not belong to this tenant.");
    }

    const existing = await tx.integrationSecret.findFirst({
      where: {
        tenantId: tenant.id,
        channelConnectionId: channel.id,
        secretKind: input.secretKind,
        label: input.label,
      },
    });

    const encryptedPayload = encryptSecret(input.rawSecret);
    const maskedValue = maskSecret(input.rawSecret);

    if (existing) {
      await tx.integrationSecret.update({
        where: {
          id: existing.id,
        },
        data: {
          maskedValue,
          encryptedPayload,
          lastRotatedAt: new Date(),
        },
      });
    } else {
      await tx.integrationSecret.create({
        data: {
          tenantId: tenant.id,
          channelConnectionId: channel.id,
          provider: channel.provider,
          secretKind: input.secretKind,
          label: input.label,
          maskedValue,
          encryptedPayload,
        },
      });
    }

    await tx.channelConnection.update({
      where: { id: channel.id },
      data: {
        status:
          input.secretKind === SecretKind.BOT_TOKEN ||
          input.secretKind === SecretKind.ACCESS_TOKEN
            ? ConnectionStatus.CONNECTED
            : channel.status,
        lastSyncedAt:
          input.secretKind === SecretKind.BOT_TOKEN ||
          input.secretKind === SecretKind.ACCESS_TOKEN
            ? new Date()
            : channel.lastSyncedAt,
      },
    });

    const onboarding = await tx.tenantOnboarding.findUnique({
      where: {
        tenantId: tenant.id,
      },
    });

    if (onboarding) {
      const checklist = markChecklistDone(
        parseChecklist(onboarding.checklistJson),
        channel.provider,
      );

      await tx.tenantOnboarding.update({
        where: {
          tenantId: tenant.id,
        },
        data: {
          status: deriveOnboardingStatus(checklist),
          checklistJson: JSON.stringify(checklist),
        },
      });
    }
  });
}

export async function ingestInboundMessage(input: InboundPayload) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: input.tenantSlug },
  });

  if (!tenant) {
    throw new Error(`Tenant ${input.tenantSlug} was not found.`);
  }

  return prisma.$transaction(async (tx) => {
    const label = input.channelLabel ?? defaultChannelLabel(input.provider);

    const channel = await tx.channelConnection.upsert({
      where: {
        tenantId_provider_label: {
          tenantId: tenant.id,
          provider: input.provider,
          label,
        },
      },
      update: {
        status: ConnectionStatus.CONNECTED,
        externalAccountId: input.externalAccountId,
        lastSyncedAt: new Date(),
      },
      create: {
        tenantId: tenant.id,
        provider: input.provider,
        label,
        status: ConnectionStatus.CONNECTED,
        externalAccountId: input.externalAccountId,
        authMode: defaultAuthMode(input.provider),
        lastSyncedAt: new Date(),
      },
    });

    const contact = await tx.contact.upsert({
      where: {
        channelConnectionId_externalUserId: {
          channelConnectionId: channel.id,
          externalUserId: input.contactExternalId,
        },
      },
      update: {
        displayName: input.contactDisplayName,
        username: input.contactUsername,
      },
      create: {
        tenantId: tenant.id,
        channelConnectionId: channel.id,
        externalUserId: input.contactExternalId,
        displayName: input.contactDisplayName,
        username: input.contactUsername,
      },
    });

    let conversation = await tx.conversation.findFirst({
      where: {
        tenantId: tenant.id,
        contactId: contact.id,
        status: {
          in: [
            ConversationStatus.OPEN,
            ConversationStatus.PENDING,
            ConversationStatus.ESCALATED,
          ],
        },
      },
      orderBy: {
        lastMessageAt: "desc",
      },
    });

    if (!conversation) {
      conversation = await tx.conversation.create({
        data: {
          tenantId: tenant.id,
          contactId: contact.id,
          provider: channel.provider,
          channelLabel: channel.label,
          status: ConversationStatus.OPEN,
          aiMode: tenant.aiMode,
          subject: `New ${defaultChannelLabel(input.provider)} lead`,
        },
      });
    }

    await tx.message.create({
      data: {
        tenantId: tenant.id,
        conversationId: conversation.id,
        externalMessageId: input.externalMessageId,
        direction: MessageDirection.INBOUND,
        status: MessageStatus.RECEIVED,
        senderLabel: input.contactDisplayName,
        content: input.content,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : undefined,
      },
    });

    await tx.conversation.update({
      where: { id: conversation.id },
      data: {
        status: ConversationStatus.OPEN,
        lastMessageAt: new Date(),
      },
    });

    await tx.webhookEvent.create({
      data: {
        tenantId: tenant.id,
        channelConnectionId: channel.id,
        provider: input.provider,
        eventKind: EventKind.MESSAGE_INBOUND,
        externalEventId: input.externalMessageId,
        payloadJson: JSON.stringify(input.metadata ?? { content: input.content }),
        outcome: "processed",
        processedAt: new Date(),
      },
    });

    return {
      tenantSlug: tenant.slug,
      conversationId: conversation.id,
    };
  });
}

export async function createOutboundMessage(input: OutboundPayload) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: input.tenantSlug },
  });

  if (!tenant) {
    throw new Error(`Tenant ${input.tenantSlug} was not found.`);
  }

  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: input.conversationId },
    });

    if (!conversation || conversation.tenantId !== tenant.id) {
      throw new Error("Conversation does not belong to this tenant.");
    }

    await tx.message.create({
      data: {
        tenantId: tenant.id,
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.SENT,
        senderLabel: input.senderLabel,
        content: input.content,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : undefined,
      },
    });

    await tx.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
      },
    });

    await tx.webhookEvent.create({
      data: {
        tenantId: tenant.id,
        provider: conversation.provider,
        eventKind: EventKind.MESSAGE_OUTBOUND,
        payloadJson: JSON.stringify({
          senderLabel: input.senderLabel,
          content: input.content,
        }),
        outcome: "queued-for-provider",
        processedAt: new Date(),
      },
    });
  });
}

export function parseChecklist(raw?: string | null) {
  if (!raw) {
    return [] as ChecklistItem[];
  }

  try {
    return JSON.parse(raw) as ChecklistItem[];
  } catch {
    return [] as ChecklistItem[];
  }
}

export function parseProviderList(raw?: string | null) {
  if (!raw) {
    return [] as ChannelProvider[];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as ChannelProvider[];
}

export function getChecklistProgress(items: ChecklistItem[]) {
  const total = items.length;
  const completed = items.filter((item) => item.done).length;

  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

function buildChecklist(providers: ChannelProvider[]) {
  const checklist: ChecklistItem[] = [
    {
      id: "profile",
      label: "Business profile and owner contact",
      done: true,
    },
    {
      id: "ai",
      label: "AI guardrails and escalation policy",
      done: false,
    },
  ];

  for (const provider of providers) {
    checklist.push({
      id: provider.toLowerCase(),
      label: `${defaultChannelLabel(provider)} connection`,
      done: false,
    });
  }

  return checklist;
}

function markChecklistDone(items: ChecklistItem[], provider: ChannelProvider) {
  return items.map((item) =>
    item.id === provider.toLowerCase() ? { ...item, done: true } : item,
  );
}

function deriveOnboardingStatus(items: ChecklistItem[]) {
  const progress = getChecklistProgress(items);

  if (progress.total > 0 && progress.completed === progress.total) {
    return OnboardingStatus.READY;
  }

  if (progress.completed > 1) {
    return OnboardingStatus.IN_PROGRESS;
  }

  return OnboardingStatus.DRAFT;
}

async function makeUniqueSlug(input: string) {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "workspace";

  let candidate = base;
  let counter = 1;

  while (await prisma.tenant.findUnique({ where: { slug: candidate } })) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }

  return candidate;
}

export async function getOrdersForTenant(tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return [];
  return prisma.order.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function createOrderRecord(input: {
  tenantId: string;
  conversationId: string;
  contactName: string;
  contactPhone?: string;
  itemsJson: string;
  totalAmount?: string;
  deliveryInfo?: string;
  notes?: string;
}) {
  return prisma.order.create({
    data: {
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      status: OrderStatus.NEW,
      itemsJson: input.itemsJson,
      totalAmount: input.totalAmount,
      deliveryInfo: input.deliveryInfo,
      notes: input.notes,
    },
  });
}

export async function updateTenantAiSettings(input: {
  tenantSlug: string;
  aiCollectOrders: boolean;
  aiManagerInstructions?: string;
}) {
  return prisma.tenant.update({
    where: { slug: input.tenantSlug },
    data: {
      aiCollectOrders: input.aiCollectOrders,
      aiManagerInstructions: input.aiManagerInstructions ?? null,
    },
  });
}

function defaultChannelLabel(provider: ChannelProvider) {
  switch (provider) {
    case ChannelProvider.INSTAGRAM:
      return "Instagram DM";
    case ChannelProvider.WHATSAPP:
      return "WhatsApp Sales";
    case ChannelProvider.TELEGRAM:
      return "Telegram Operator Hub";
    case ChannelProvider.MESSENGER:
      return "Facebook Page Inbox";
    case ChannelProvider.WEBCHAT:
      return "Website Chat";
    case ChannelProvider.VIBER:
      return "Viber Business";
    case ChannelProvider.SIGNAL:
      return "Signal Messenger";
    default:
      return "Connected Channel";
  }
}

function defaultAuthMode(provider: ChannelProvider) {
  switch (provider) {
    case ChannelProvider.INSTAGRAM:
      return "OAuth with Instagram Login";
    case ChannelProvider.WHATSAPP:
      return "Embedded Signup";
    case ChannelProvider.TELEGRAM:
      return "Bot Token";
    case ChannelProvider.MESSENGER:
      return "Facebook Login for Business";
    case ChannelProvider.WEBCHAT:
      return "Install snippet";
    case ChannelProvider.VIBER:
      return "Viber Bot Token";
    case ChannelProvider.SIGNAL:
      return "Signal API Key";
    default:
      return "Official API";
  }
}
