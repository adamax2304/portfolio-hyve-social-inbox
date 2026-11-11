"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { resetPasswordWithTokenAction } from "@/app/actions";

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--bg-input)",
  color: "var(--text)",
  border: "1px solid var(--border-strong)",
};

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (pwd.length < 6 || pwd.length > 30) {
      setError("Пароль: от 6 до 30 символов.");
      return;
    }
    if (pwd !== confirm) {
      setError("Пароли не совпадают.");
      return;
    }

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("token", token);
        fd.set("newPassword", pwd);
        const r = await resetPasswordWithTokenAction(fd);
        if (!r.ok) {
          setError(r.error ?? "Ошибка");
          return;
        }
        setDone(true);
        setTimeout(() => router.push("/"), 1800);
      } catch (err) {
        console.error(err);
        setError("Сетевая ошибка");
      }
    });
  }

  if (done) {
    return (
      <div
        className="surface-panel flex flex-col items-center rounded-2xl p-6 text-center"
      >
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            backgroundColor: "color-mix(in srgb, #16a34a 18%, transparent)",
          }}
        >
          <CheckCircle2 className="h-8 w-8" style={{ color: "#16a34a" }} />
        </div>
        <p
          className="mt-3 text-base font-bold"
          style={{ color: "var(--text)" }}
        >
          Пароль обновлён
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          Перенаправляем на страницу входа…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="surface-panel space-y-4 rounded-2xl p-5">
      <p className="text-xs leading-5" style={{ color: "var(--text-muted)" }}>
        Введите новый пароль. Длина 6–30 символов. Старый пароль больше не подойдёт.
      </p>

      <label
        className="block text-xs font-semibold"
        style={{ color: "var(--text-secondary)" }}
      >
        Новый пароль
        <div className="relative mt-1.5">
          <input
            type={show ? "text" : "password"}
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            minLength={6}
            maxLength={30}
            placeholder="6–30 символов"
            autoFocus
            className="w-full rounded-2xl px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-[var(--accent)]"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Скрыть" : "Показать"}
            className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition hover:bg-black/5"
            style={{ color: "var(--text-faint)" }}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>

      <label
        className="block text-xs font-semibold"
        style={{ color: "var(--text-secondary)" }}
      >
        Повторите пароль
        <input
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={6}
          maxLength={30}
          placeholder="Тот же пароль ещё раз"
          className="mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent)]"
          style={inputStyle}
        />
      </label>

      {error ? (
        <div
          className="flex items-start gap-2 rounded-2xl px-3 py-2 text-xs font-semibold"
          style={{
            backgroundColor: "color-mix(in srgb, #dc2626 14%, transparent)",
            color: "#dc2626",
          }}
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="hover-grow inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition active:scale-[0.97] disabled:opacity-60"
        style={{
          backgroundColor: "var(--accent)",
          color: "var(--btn-fill-fg)",
          boxShadow: "0 2px 10px color-mix(in srgb, var(--accent) 35%, transparent)",
        }}
      >
        <KeyRound className="h-4 w-4" />
        {pending ? "Сохранение…" : "Установить новый пароль"}
      </button>
    </form>
  );
}
