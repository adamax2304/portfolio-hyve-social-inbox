import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Bot,
  KeyRound,
  Activity,
  Users,
  Database,
  ShieldCheck,
  Send,
} from "lucide-react";
import { auth } from "@/auth";
import { isPlatformOwner } from "@/lib/admin";
import { getAccessRequestCounts } from "@/lib/access-request-db";
import { getDashboardSnapshot } from "@/lib/inbox";

export default async function AdminIndexPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!isPlatformOwner(session.user.email)) redirect("/dashboard");

  const [accessCounts, snapshot] = await Promise.all([
    getAccessRequestCounts().catch(() => ({
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0,
    })),
    // platform-wide stats: pass undefined to get ALL tenants regardless of memberships
    getDashboardSnapshot(undefined),
  ]);

  const hasServiceBot = Boolean(
    process.env.SERVICE_BOT_TOKEN && process.env.SERVICE_BOT_ADMIN_CHAT_ID,
  );

  return (
    <main className="page-enter mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="hover-grow inline-flex h-9 w-9 items-center justify-center rounded-full transition active:scale-[0.95]"
          style={{ backgroundColor: "var(--bg-panel)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          aria-label="Назад"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-faint)" }}>
            Платформа · {session.user.email}
          </p>
          <h1 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl" style={{ color: "var(--text)" }}>
            Админ-панель
          </h1>
        </div>
        <ShieldCheck className="hidden h-7 w-7 sm:block" style={{ color: "var(--accent)" }} />
      </div>

      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Управление SaaS-платформой Hyve. Те же команды доступны в Telegram через сервисный бот:
        <code className="ml-1 rounded px-1.5 py-0.5 font-mono text-xs" style={{ backgroundColor: "var(--bg-soft)" }}>
          /access /tenants /stats /help
        </code>
      </p>

      {/* ─── Action cards grid ─── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/access"
          className="hover-grow surface-panel group flex items-center gap-4 rounded-[24px] p-5 transition active:scale-[0.99]"
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "color-mix(in srgb, var(--accent) 14%, transparent)" }}
          >
            <KeyRound className="h-6 w-6" style={{ color: "var(--accent)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
                Запросы доступа
              </h3>
              {accessCounts.pending > 0 ? (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: "#fff", backgroundColor: "#D97706" }}>
                  {accessCounts.pending} новых
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--text-faint)" }}>
              Всего: {accessCounts.total} · Одобрено: {accessCounts.approved} · Отклонено: {accessCounts.rejected}
            </p>
          </div>
          <ArrowRight className="h-4 w-4" style={{ color: "var(--text-faint)" }} />
        </Link>

        <div className="surface-panel flex items-center gap-4 rounded-[24px] p-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: hasServiceBot ? "rgba(5,150,105,0.15)" : "rgba(220,38,38,0.15)",
            }}
          >
            <Bot className="h-6 w-6" style={{ color: hasServiceBot ? "#059669" : "#DC2626" }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
              Сервисный бот
            </h3>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--text-faint)" }}>
              {hasServiceBot ? "Подключён · уведомления и одобрение через TG" : "Не настроен · добавьте env-переменные"}
            </p>
          </div>
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{
              backgroundColor: hasServiceBot ? "#10b981" : "#ef4444",
              boxShadow: hasServiceBot ? "0 0 0 5px rgba(16,185,129,0.20)" : "0 0 0 5px rgba(239,68,68,0.20)",
            }}
          />
        </div>

        <div className="surface-panel flex items-center gap-4 rounded-[24px] p-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "rgba(124,58,237,0.14)" }}
          >
            <Activity className="h-6 w-6" style={{ color: "#7C3AED" }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
              Аналитика платформы
            </h3>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--text-faint)" }}>
              {snapshot.metrics.tenants} workspaces · {snapshot.metrics.connectedChannels} каналов · {snapshot.metrics.openConversations} открыто
            </p>
          </div>
        </div>

        <div className="surface-panel flex items-center gap-4 rounded-[24px] p-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "rgba(34,158,217,0.14)" }}
          >
            <Users className="h-6 w-6" style={{ color: "#229ED9" }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
              Все клиенты
            </h3>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--text-faint)" }}>
              {snapshot.metrics.teammates} операторов в {snapshot.metrics.tenants} workspaces
            </p>
          </div>
        </div>

        <div className="surface-panel flex items-center gap-4 rounded-[24px] p-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "rgba(5,150,105,0.14)" }}
          >
            <Database className="h-6 w-6" style={{ color: "#059669" }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
              База данных
            </h3>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--text-faint)" }}>
              Turso libSQL · регион eu-west-1
            </p>
          </div>
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: "#10b981", boxShadow: "0 0 0 5px rgba(16,185,129,0.20)" }}
          />
        </div>

        <div className="surface-panel flex items-center gap-4 rounded-[24px] p-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "color-mix(in srgb, var(--accent) 14%, transparent)" }}
          >
            <Send className="h-6 w-6" style={{ color: "var(--accent)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
              Webhook сервиса
            </h3>
            <p className="mt-0.5 break-all font-mono text-[11px]" style={{ color: "var(--text-faint)" }}>
              /api/webhooks/service-bot
            </p>
          </div>
        </div>
      </div>

      {/* ─── Tenants overview ─── */}
      <section className="surface-panel rounded-[28px] p-5 sm:p-7">
        <h2 className="text-lg font-bold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
          Все workspaces
        </h2>
        <div className="mt-4 space-y-2">
          {snapshot.tenants.length === 0 ? (
            <p className="rounded-2xl border border-dashed py-10 text-center text-sm" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
              Workspaces ещё нет
            </p>
          ) : (
            snapshot.tenants.map((t) => {
              const owner = t.memberships.find((m) => m.role === "OWNER")?.user;
              return (
                <Link
                  key={t.id}
                  href={`/tenants/${t.slug}`}
                  className="hover-grow flex items-center justify-between gap-3 rounded-xl border p-3.5 transition active:scale-[0.99]"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-soft)" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-sm" style={{ color: "var(--text)" }}>
                      {t.name}
                    </p>
                    <p className="truncate text-[11px]" style={{ color: "var(--text-faint)" }}>
                      <code>{t.slug}</code>
                      {owner ? ` · ${owner.email}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>{t.channels.filter((c) => c.status === "CONNECTED").length} каналов</span>
                    <span>{t.memberships.length} операторов</span>
                    <ArrowRight className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
