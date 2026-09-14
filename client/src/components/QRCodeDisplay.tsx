import { QRCodeSVG } from "qrcode.react";
import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

export function QRCodeDisplay({ value, size = 220 }: { value: string; size?: number }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        p: "3px",
        borderRadius: 4,
        display: "inline-flex",
        backgroundImage: `linear-gradient(135deg, ${theme.palette.royal.gold}, ${theme.palette.primary.main})`,
        boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.4 : 0.2)}`,
      }}
    >
      <Box
        sx={{
          p: 2.5,
          borderRadius: "calc(1.75rem - 3px)",
          bgcolor: "royal.elevated",
          display: "inline-flex",
        }}
      >
        <Box
          sx={{
            bgcolor: "#fff",
            p: 1.5,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <QRCodeSVG
            value={value}
            size={size}
            level="M"
            marginSize={0}
            fgColor={theme.palette.mode === "dark" ? "#2E1065" : "#151129"}
          />
        </Box>
      </Box>
    </Box>
  );
}
