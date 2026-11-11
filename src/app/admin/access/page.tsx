import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  Send,
  Copy,
} from "lucide-react";
import { auth } from "@/auth";
import { isPlatformOwner } from "@/lib/admin";
import {
  listRecentAccessRequests,
  getAccessRequestCounts,
} from "@/lib/access-request-db";

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} д назад`;
  return d.toLocaleDateString("ru-RU");
}

export default async function AdminAccessPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!isPlatformOwner(session.user.email)) redirect("/dashboard");

  const [requests, counts] = await Promise.all([
    listRecentAccessRequests(100),
    getAccessRequestCounts(),
  ]);

  return (
    <main className="page-enter mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="hover-grow inline-flex h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--bg-panel)", color: "var(--text-secondary)" }}
          aria-label="Назад"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-faint)" }}>
            Админ-панель
          </p>
          <h1 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl" style={{ color: "var(--text)" }}>
            Запросы доступа
          </h1>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Ожидают", value: counts.pending, color: "#D97706", icon: Clock },
          { label: "Одобрено", value: counts.approved, color: "#059669", icon: CheckCircle2 },
          { label: "Отклонено", value: counts.rejected, color: "#DC2626", icon: XCircle },
          { label: "Всего", value: counts.total, color: "var(--accent)", icon: Send },
        ].map((s) => (
          <div
            key={s.label}
            className="surface-panel hover-grow flex items-center gap-3 rounded-2xl px-4 py-3.5"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `color-mix(in srgb, ${s.color} 15%, transparent)` }}
            >
              <s.icon className="h-5 w-5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
                {s.value}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      <section className="surface-panel rounded-[28px] p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-[-0.03em]" style={{ color: "var(--text)" }}>
            Последние заявки
          </h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Одобряйте через сервисный бот в Telegram
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {requests.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-[20px] border border-dashed py-16 text-center"
              style={{ borderColor: "var(--border)" }}
            >
              <Mail className="h-8 w-8" style={{ color: "var(--text-faint)" }} />
              <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
                Заявок пока нет
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                Когда клиенты заполнят форму на лендинге, заявки появятся здесь и придут в Telegram
              </p>
            </div>
          ) : (
            requests.map((r) => {
              const statusInfo: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
                PENDING: { label: "Ожидает", color: "#D97706", bg: "rgba(217,119,6,0.12)", icon: <Clock className="h-3 w-3" /> },
                APPROVED: { label: "Одобрено", color: "#059669", bg: "rgba(5,150,105,0.12)", icon: <CheckCircle2 className="h-3 w-3" /> },
                REJECTED: { label: "Отклонено", color: "#DC2626", bg: "rgba(220,38,38,0.12)", icon: <XCircle className="h-3 w-3" /> },
              };
              const s = statusInfo[r.status] ?? statusInfo.PENDING;
              return (
                <div
                  key={r.id}
                  className="hover-grow rounded-[16px] border p-4"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-soft)" }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ color: s.color, backgroundColor: s.bg }}
                        >
                          {s.icon}
                          {s.label}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                          style={{
                            backgroundColor: r.contactType === "telegram" ? "rgba(34,158,217,0.12)" : "rgba(201,107,73,0.12)",
                            color: r.contactType === "telegram" ? "#229ED9" : "var(--accent)",
                          }}
                        >
                          {r.contactType}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                          {formatRelative(r.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 font-mono text-sm font-bold" style={{ color: "var(--text)" }}>
                        {r.contact}
                      </p>
                      {r.message ? (
                        <p className="mt-1.5 line-clamp-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                          {r.message}
                        </p>
                      ) : null}
                      {r.generatedLogin ? (
                        <div className="mt-2 inline-flex items-center gap-2 rounded-lg px-2.5 py-1" style={{ backgroundColor: "var(--bg-panel)" }}>
                          <Copy className="h-3 w-3" style={{ color: "var(--text-faint)" }} />
                          <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                            {r.generatedLogin}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
