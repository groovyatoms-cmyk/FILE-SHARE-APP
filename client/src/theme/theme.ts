import { alpha, createTheme, type ThemeOptions } from "@mui/material/styles";

export type ThemeMode = "light" | "dark";

interface RoyalTokens {
  gold: string;
  goldSoft: string;
  elevated: string;
  violetGlow: string;
}

declare module "@mui/material/styles" {
  interface Palette {
    royal: RoyalTokens;
  }
  interface PaletteOptions {
    royal?: RoyalTokens;
  }
}

// ---------------------------------------------------------------------------
// Royal palette — deep violet + gold, the classic regal pairing. Centralized
// here as the single source of truth; components should reference theme
// tokens (`primary.main`, `background.paper`, ...) and never hard-code hex.
// ---------------------------------------------------------------------------

const royal = {
  // Violet ramp
  violet50: "#F5F1FF",
  violet100: "#EDE4FF",
  violet300: "#B99BFA",
  violet400: "#9D6FF5",
  violet500: "#7C3AED", // core royal violet
  violet600: "#6D28D9",
  violet700: "#5B21B6",
  violet800: "#4C1D95",
  violet900: "#2E1065",
  // Gold ramp — the accent, used sparingly (verified/highlight moments)
  gold300: "#F2D98D",
  gold400: "#E8C158",
  gold500: "#D4AF37", // core royal gold
  gold600: "#B8860B",
  gold700: "#8A6508",
  // Neutrals
  ink: "#151129", // near-black with a violet cast
  midnight: "#0C0A18", // deepest background
  plum: "#191233", // dark surface
  plumLight: "#221A44",
  ivory: "#FAF8FF", // lightest background, warm-cool balance
  parchment: "#F3EEFB",
  // Status (kept legible against both themes, not tied to the brand ramp)
  success: "#1E9E6B",
  warning: "#C7821A",
  error: "#D6395B",
};

function baseOptions(mode: ThemeMode): ThemeOptions {
  const isDark = mode === "dark";

  const primaryMain = isDark ? royal.violet400 : royal.violet700;
  const primaryDark = isDark ? royal.violet600 : royal.violet800;
  const primaryLight = isDark ? royal.violet300 : royal.violet500;
  const secondaryMain = isDark ? royal.gold400 : royal.gold600;

  const backgroundDefault = isDark ? royal.midnight : royal.ivory;
  const backgroundPaper = isDark ? royal.plum : "#FFFFFF";
  const backgroundElevated = isDark ? royal.plumLight : royal.parchment;

  const textPrimary = isDark ? "#F3EEFF" : royal.ink;
  const textSecondary = isDark ? alpha("#F3EEFF", 0.68) : alpha(royal.ink, 0.64);
  const dividerColor = isDark ? alpha(royal.violet400, 0.16) : alpha(royal.violet700, 0.12);

  return {
    palette: {
      mode,
      primary: { main: primaryMain, light: primaryLight, dark: primaryDark, contrastText: "#FFFFFF" },
      secondary: { main: secondaryMain, contrastText: isDark ? royal.ink : "#FFFFFF" },
      success: { main: royal.success },
      warning: { main: royal.warning },
      error: { main: royal.error },
      background: { default: backgroundDefault, paper: backgroundPaper },
      text: { primary: textPrimary, secondary: textSecondary, disabled: alpha(textPrimary, 0.38) },
      divider: dividerColor,
      // Custom token, read via theme.palette.royal.* where a component needs
      // the gold accent or a subtly elevated surface beyond paper/default.
      royal: {
        gold: secondaryMain,
        goldSoft: isDark ? alpha(royal.gold400, 0.16) : alpha(royal.gold600, 0.12),
        elevated: backgroundElevated,
        violetGlow: alpha(primaryMain, isDark ? 0.35 : 0.22),
      },
    },
    shape: { borderRadius: 14 },
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
      h1: { fontWeight: 700, letterSpacing: -0.5 },
      h2: { fontWeight: 700, letterSpacing: -0.5 },
      h3: { fontWeight: 700, letterSpacing: -0.3 },
      h4: { fontWeight: 700, letterSpacing: -0.2 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: "none", letterSpacing: 0.2 },
      overline: { fontWeight: 700, letterSpacing: 1.2 },
    },
    shadows: buildShadows(isDark, primaryMain),
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: isDark
              ? `radial-gradient(ellipse 900px 500px at 50% -10%, ${alpha(royal.violet600, 0.28)}, transparent 60%)`
              : `radial-gradient(ellipse 900px 500px at 50% -10%, ${alpha(royal.violet300, 0.28)}, transparent 60%)`,
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 12,
            minHeight: 44,
            paddingInline: 22,
            transition: "transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease",
          },
          containedPrimary: {
            backgroundImage: `linear-gradient(135deg, ${primaryLight} 0%, ${primaryMain} 55%, ${primaryDark} 100%)`,
            boxShadow: `0 4px 14px ${alpha(primaryMain, isDark ? 0.45 : 0.3)}`,
            "&:hover": {
              backgroundImage: `linear-gradient(135deg, ${primaryLight} 0%, ${primaryDark} 100%)`,
              boxShadow: `0 6px 20px ${alpha(primaryMain, isDark ? 0.55 : 0.38)}`,
              transform: "translateY(-1px)",
            },
            "&:active": { transform: "translateY(0)" },
          },
          outlined: {
            borderWidth: 1.5,
            "&:hover": { borderWidth: 1.5 },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { minWidth: 44, minHeight: 44, transition: "background-color 150ms ease, transform 150ms ease" },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            border: `1px solid ${dividerColor}`,
            backgroundImage: isDark
              ? `linear-gradient(160deg, ${alpha(royal.violet500, 0.06)}, transparent 60%)`
              : `linear-gradient(160deg, ${alpha(royal.violet300, 0.05)}, transparent 60%)`,
            boxShadow: isDark
              ? `0 1px 0 ${alpha("#fff", 0.03)} inset, 0 8px 24px ${alpha("#000", 0.35)}`
              : `0 1px 0 ${alpha("#fff", 0.6)} inset, 0 8px 24px ${alpha(royal.violet700, 0.08)}`,
            transition: "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
          },
        },
      },
      MuiCardActionArea: {
        styleOverrides: {
          root: {
            "&:hover": {
              backgroundColor: isDark ? alpha(royal.violet400, 0.08) : alpha(royal.violet700, 0.04),
            },
            "& .MuiCardActionArea-focusHighlight": { backgroundColor: primaryMain },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
          elevation1: {
            boxShadow: isDark ? `0 8px 24px ${alpha("#000", 0.35)}` : `0 8px 24px ${alpha(royal.violet700, 0.08)}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backdropFilter: "blur(14px)",
            backgroundColor: isDark ? alpha(royal.midnight, 0.72) : alpha(royal.ivory, 0.78),
            backgroundImage: "none",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 999 },
          filledPrimary: {
            backgroundImage: `linear-gradient(135deg, ${primaryLight}, ${primaryMain})`,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            height: 8,
            backgroundColor: isDark ? alpha(royal.violet400, 0.15) : alpha(royal.violet700, 0.1),
          },
          bar: {
            borderRadius: 999,
            backgroundImage: `linear-gradient(90deg, ${primaryLight}, ${secondaryMain})`,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            border: `1px solid ${dividerColor}`,
            boxShadow: isDark
              ? `0 24px 60px ${alpha("#000", 0.55)}`
              : `0 24px 60px ${alpha(royal.violet700, 0.18)}`,
          },
        },
      },
      MuiTextField: {
        defaultProps: { variant: "outlined" },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: primaryMain,
              borderWidth: 2,
            },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            textTransform: "none",
            fontWeight: 600,
            "&.Mui-selected": {
              backgroundImage: `linear-gradient(135deg, ${primaryLight}, ${primaryMain})`,
              color: "#FFFFFF",
              "&:hover": { backgroundImage: `linear-gradient(135deg, ${primaryLight}, ${primaryDark})` },
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: 999,
            backgroundImage: `linear-gradient(90deg, ${primaryLight}, ${secondaryMain})`,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? royal.plumLight : royal.ink,
            fontSize: 12,
            borderRadius: 8,
          },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: dividerColor } },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            backgroundColor: backgroundPaper,
            borderTop: `1px solid ${dividerColor}`,
          },
        },
      },
    },
  };
}

/** A tinted (violet, not neutral gray) elevation ramp — flat MUI default shadows read as generic. */
function buildShadows(isDark: boolean, tint: string): ThemeOptions["shadows"] {
  const base = isDark ? "#000000" : tint;
  const levels = [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16, 0.18, 0.2, 0.22, 0.24, 0.26, 0.28, 0.3, 0.32, 0.34, 0.36, 0.38, 0.4, 0.42, 0.44, 0.46, 0.48];
  return levels.map((l, i) =>
    i === 0 ? "none" : `0 ${Math.min(i * 1.5, 24)}px ${Math.min(i * 3, 48)}px ${alpha(base, isDark ? l : l * 0.6)}`,
  ) as ThemeOptions["shadows"];
}

export function createAppTheme(mode: ThemeMode) {
  return createTheme(baseOptions(mode));
}
