import { cookies } from "next/headers";

export type Theme = "light" | "dark" | "blue";

export const THEME_COOKIE = "ui_theme";

export async function getCurrentTheme(): Promise<Theme> {
  const store = await cookies();
  const v = store.get(THEME_COOKIE)?.value;
  if (v === "dark" || v === "blue" || v === "light") return v;
  return "dark"; // default = dark (changed from "light")
}
