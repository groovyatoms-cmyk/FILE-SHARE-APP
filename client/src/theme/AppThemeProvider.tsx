import { useMemo, useState, useEffect, type ReactNode } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createAppTheme, type ThemeMode } from "./theme";
import { useSettingsStore } from "../stores/useSettingsStore";

function useSystemPrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  return prefersDark;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const appearance = useSettingsStore((s) => s.appearance);
  const systemPrefersDark = useSystemPrefersDark();

  const mode: ThemeMode = useMemo(() => {
    if (appearance === "system") return systemPrefersDark ? "dark" : "light";
    return appearance;
  }, [appearance, systemPrefersDark]);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
