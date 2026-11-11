/**
 * Centralised help content for channel + LLM setup instructions.
 *
 * Used by:
 *  • /onboarding form (inline help tips next to fields)
 *  • /tenants/[slug]/setup (sidebar with full instruction guide)
 *  • Add Channel dropdown
 */

export type ChannelInfo = {
  value: string;
  name: string;
  authMode: string;
  color: string;
  bg: string;
  /** Lucide icon NAME (resolved client-side) */
  iconName:
    | "Camera"
    | "Phone"
    | "Send"
    | "MessageCircle"
    | "Globe";
  description: string;
  steps: string[];
  link?: { href: string; label: string };
};

export const CHANNELS: ChannelInfo[] = [
  {
    value: "INSTAGRAM",
    name: "Instagram DM",
    authMode: "OAuth Login",
    color: "#E1306C",
    bg: "#FEE2EE",
    iconName: "Camera",
    description: "Принимайте Direct-сообщения от подписчиков аккаунта Instagram Business.",
    steps: [
      "Откройте Meta Business Suite → Каналы → Instagram",
      "Подтвердите бизнес-аккаунт Instagram",
      "Включите доступ DM API и скопируйте Page Access Token",
      "Вставьте токен в Vault (Шаг 5) с типом Access Token",
    ],
    link: { href: "https://business.facebook.com", label: "Открыть Meta Business" },
  },
  {
    value: "WHATSAPP",
    name: "WhatsApp Business",
    authMode: "Embedded Signup",
    color: "#128C7E",
    bg: "#D1FAE5",
    iconName: "Phone",
    description: "Принимайте сообщения через официальный WhatsApp Business API.",
    steps: [
      "Перейдите в Meta for Developers → My Apps",
      "Создайте приложение типа WhatsApp Business",
      "Embedded Signup — пройдите верификацию номера",
      "Скопируйте Permanent Access Token",
      "Добавьте в Vault как Access Token",
    ],
    link: { href: "https://developers.facebook.com/apps", label: "developers.facebook.com" },
  },
  {
    value: "TELEGRAM",
    name: "Telegram Bot",
    authMode: "Bot Token",
    color: "#229ED9",
    bg: "#DBEAFE",
    iconName: "Send",
    description: "Самый быстрый канал. Бот через @BotFather, токен — и всё работает.",
    steps: [
      "Откройте @BotFather в Telegram",
      "Отправьте /newbot и придумайте имя + username (заканчивается на bot)",
      "BotFather пришлёт API-токен вида 123456:AAH-...",
      "Добавьте его в Vault как Bot Token",
      "Webhook будет настроен автоматически после привязки токена",
    ],
    link: { href: "https://t.me/BotFather", label: "Открыть @BotFather" },
  },
  {
    value: "MESSENGER",
    name: "Facebook Messenger",
    authMode: "Page Access Token",
    color: "#0084FF",
    bg: "#EFF6FF",
    iconName: "MessageCircle",
    description: "Сообщения от страницы Facebook принимаются через Messenger Platform.",
    steps: [
      "Откройте Meta for Developers и создайте приложение",
      "Подключите страницу Facebook к приложению",
      "Получите Page Access Token с правами messaging",
      "Подпишитесь на webhook'и messages, messaging_postbacks",
      "Добавьте токен в Vault",
    ],
    link: { href: "https://developers.facebook.com", label: "developers.facebook.com" },
  },
  {
    value: "VIBER",
    name: "Viber Business",
    authMode: "Bot Token",
    color: "#7360F2",
    bg: "#EEE8FF",
    iconName: "MessageCircle",
    description: "Public Account в Viber с собственным ботом.",
    steps: [
      "Откройте Viber Admin Panel и создайте Public Account",
      "Settings → API → создайте бота",
      "Скопируйте токен авторизации (X-Viber-Auth-Token)",
      "Webhook URL для прода: https://hyve-inbox.vercel.app/api/webhooks/viber",
      "Добавьте токен в Vault как Bot Token",
    ],
    link: { href: "https://partners.viber.com", label: "partners.viber.com" },
  },
  {
    value: "SIGNAL",
    name: "Signal Messenger",
    authMode: "API Key",
    color: "#3A76F0",
    bg: "#EBF2FF",
    iconName: "MessageCircle",
    description: "Self-hosted мост через signal-cli-rest-api. Полная приватность.",
    steps: [
      "Установите signal-cli или signal-cli-rest-api на свой сервер",
      "Зарегистрируйте номер телефона у Signal",
      "Настройте webhook на /api/webhooks/signal",
      "Скопируйте сгенерированный API-ключ",
      "Добавьте ключ в Vault как API Key",
    ],
    link: { href: "https://github.com/bbernhard/signal-cli-rest-api", label: "signal-cli-rest-api" },
  },
  {
    value: "WEBCHAT",
    name: "Web Chat",
    authMode: "JS embed",
    color: "#8B4A31",
    bg: "#FEF3C7",
    iconName: "Globe",
    description: "Виджет чата на вашем сайте. Embed одной строкой.",
    steps: [
      "После создания канала вы получите embed-скрипт",
      "Вставьте скрипт перед закрывающим </body> на сайте",
      "Виджет автоматически свяжется с inbox",
      "Настройте цвета и приветствие в этом разделе",
    ],
  },
];

// ────────────────────── LLM providers ──────────────────────

export type LlmInfo = {
  name: string;
  baseUrl: string;
  description: string;
  steps: string[];
  link: { href: string; label: string };
  color: string;
  bg: string;
};

export const LLM_PROVIDERS: LlmInfo[] = [
  {
    name: "OpenAI (GPT-4, GPT-4o)",
    baseUrl: "https://api.openai.com/v1",
    description: "Стандарт индустрии. GPT-4o быстрый и дешёвый, GPT-4 Turbo лучше для сложных задач.",
    steps: [
      "Зарегистрируйтесь на platform.openai.com",
      "Settings → API keys → Create new secret key",
      "Пополните баланс минимум на $5",
      "Скопируйте ключ (sk-...) и вставьте в поле API Key",
    ],
    link: { href: "https://platform.openai.com/api-keys", label: "platform.openai.com/api-keys" },
    color: "#10A37F",
    bg: "rgba(16,163,127,0.10)",
  },
  {
    name: "Anthropic Claude",
    baseUrl: "https://api.anthropic.com/v1",
    description: "Claude 3.5 Sonnet — лучший баланс цены/качества для диалогов и саммари.",
    steps: [
      "Зарегистрируйтесь на console.anthropic.com",
      "Settings → API Keys → Create Key",
      "Купите кредиты ($5 минимум)",
      "Скопируйте ключ (sk-ant-...) и вставьте в поле API Key",
    ],
    link: { href: "https://console.anthropic.com/settings/keys", label: "console.anthropic.com" },
    color: "#C96B49",
    bg: "rgba(201,107,73,0.10)",
  },
  {
    name: "OpenRouter (любая модель)",
    baseUrl: "https://openrouter.ai/api/v1",
    description: "Один API-ключ → доступ к 100+ моделям (GPT, Claude, Llama, Mistral, DeepSeek).",
    steps: [
      "Зарегистрируйтесь на openrouter.ai",
      "Keys → Create Key",
      "Пополните баланс ($5 минимум)",
      "Скопируйте ключ (sk-or-...) и выберите модель в Hyve",
    ],
    link: { href: "https://openrouter.ai/keys", label: "openrouter.ai/keys" },
    color: "#7C3AED",
    bg: "rgba(124,58,237,0.10)",
  },
  {
    name: "DeepSeek (бюджетный вариант)",
    baseUrl: "https://api.deepseek.com/v1",
    description: "Качество близко к GPT-4, цена в 10× ниже. Подходит для массовых ответов.",
    steps: [
      "Зарегистрируйтесь на platform.deepseek.com",
      "API Keys → Create new API Key",
      "Пополните баланс — минимум $2",
      "Скопируйте ключ и используйте deepseek-chat в качестве модели",
    ],
    link: { href: "https://platform.deepseek.com/api_keys", label: "platform.deepseek.com" },
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.10)",
  },
  {
    name: "Свой OpenAI-совместимый endpoint",
    baseUrl: "https://your-server/v1",
    description: "Локальный Ollama, vLLM, LiteLLM, Together — любой OpenAI-compatible сервер.",
    steps: [
      "Поднимите сервер с OpenAI-совместимым API (Ollama, vLLM, LiteLLM)",
      "Убедитесь что endpoint доступен по HTTPS",
      "Укажите base URL и название модели вручную",
      "API Key оставьте пустым если сервер не требует аутентификации",
    ],
    link: { href: "https://ollama.com", label: "ollama.com" },
    color: "#6B7280",
    bg: "rgba(107,114,128,0.10)",
  },
];
