"use client";

import { useEffect } from "react";

/**
 * Persists form field values to localStorage on input/change.
 * Restores values on mount. Clears on submit.
 *
 * Use as a sibling element next to the <form> with matching id.
 */
export function FormDraftPersistor({
  formId,
  storageKey,
}: {
  formId: string;
  storageKey: string;
}) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const STORAGE_KEY = storageKey;

    // ───── Restore ─────
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as Record<string, string | string[]>;
        for (const [name, value] of Object.entries(data)) {
          const fields = form.querySelectorAll<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
          >(`[name="${name}"]`);
          fields.forEach((el) => {
            if (el instanceof HTMLInputElement && el.type === "checkbox") {
              const arr = Array.isArray(value) ? value : [value];
              el.checked = arr.includes(el.value);
            } else if (el instanceof HTMLInputElement && el.type === "radio") {
              el.checked = el.value === value;
            } else {
              el.value = typeof value === "string" ? value : (value[0] ?? "");
            }
          });
        }
      }
    } catch {
      // ignore
    }

    // ───── Save on change ─────
    const persist = () => {
      const fd = new FormData(form);
      const data: Record<string, string | string[]> = {};
      const keys = new Set<string>();
      for (const k of fd.keys()) keys.add(k);
      for (const k of keys) {
        // Skip password fields for security
        if (k.toLowerCase().includes("password") || k === "rawSecret") continue;
        const all = fd.getAll(k).map(String);
        data[k] = all.length > 1 ? all : (all[0] ?? "");
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // localStorage might be unavailable
      }
    };

    const handler = () => persist();
    form.addEventListener("input", handler);
    form.addEventListener("change", handler);

    // Clear on submit
    const clear = () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    };
    form.addEventListener("submit", clear);

    return () => {
      form.removeEventListener("input", handler);
      form.removeEventListener("change", handler);
      form.removeEventListener("submit", clear);
    };
  }, [formId, storageKey]);

  return null;
}
