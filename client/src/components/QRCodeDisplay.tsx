import { QRCodeSVG } from "qrcode.react";
import { Box, Paper } from "@mui/material";

export function QRCodeDisplay({ value, size = 220 }: { value: string; size?: number }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        display: "inline-flex",
        borderRadius: 3,
        bgcolor: "background.paper",
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
        <QRCodeSVG value={value} size={size} level="M" marginSize={0} />
      </Box>
    </Paper>
  );
}
