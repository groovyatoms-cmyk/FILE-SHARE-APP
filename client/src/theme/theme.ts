import { createTheme, type ThemeOptions } from "@mui/material/styles";

export type ThemeMode = "light" | "dark";

// Centralized theme tokens — never hard-code colors in components.
// Light theme palette, as specified by design.
const lightBrand = {
  primary: "#659287",
  primaryLight: "#88BDA4",
  secondary: "#B1D3B9",
  background: "#E6F2DD",
  surface: "#ffffff",
  onLight: "#000000",
  success: "#16a34a",
  warning: "#d97706",
  error: "#dc2626",
};

// Dark theme palette, as specified by design.
const darkBrand = {
  background: "#092328",
  surface: "#12544F",
  primary: "#2A835F",
  secondary: "#8BBB92",
  onDark: "#ffffff",
  onLight: "#000000",
};

function baseOptions(mode: ThemeMode): ThemeOptions {
  const isDark = mode === "dark";
  return {
    palette: {
      mode,
      primary: {
        main: isDark ? darkBrand.primary : lightBrand.primary,
        light: isDark ? darkBrand.secondary : lightBrand.primaryLight,
        contrastText: isDark ? darkBrand.onDark : undefined,
      },
      secondary: {
        main: isDark ? darkBrand.secondary : lightBrand.secondary,
        contrastText: isDark ? darkBrand.onLight : lightBrand.onLight,
      },
      success: { main: lightBrand.success },
      warning: { main: lightBrand.warning },
      error: { main: lightBrand.error },
      background: {
        default: isDark ? darkBrand.background : lightBrand.background,
        paper: isDark ? darkBrand.surface : lightBrand.surface,
      },
      text: isDark
        ? { primary: darkBrand.onDark, secondary: "rgba(255,255,255,0.72)" }
        : { primary: lightBrand.onLight, secondary: "rgba(0,0,0,0.64)" },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: [
        "Roboto",
        "-apple-system",
        "BlinkMacSystemFont",
        "Segoe UI",
        "Helvetica Neue",
        "Arial",
        "sans-serif",
      ].join(","),
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: "none" },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 10, minHeight: 44, paddingInline: 20 },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { minWidth: 44, minHeight: 44 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"}`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 600 } },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 8, height: 8 },
        },
      },
    },
  };
}

export function createAppTheme(mode: ThemeMode) {
  return createTheme(baseOptions(mode));
}
