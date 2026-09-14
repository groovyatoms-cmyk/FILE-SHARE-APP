import { useState } from "react";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { PAIRING_CODE_LENGTH } from "@p2p/shared";

export function PairingCodeInput({ onSubmit, loading }: { onSubmit: (code: string) => void; loading?: boolean }) {
  const [code, setCode] = useState("");

  const isValid = code.length === PAIRING_CODE_LENGTH && /^\d+$/.test(code);

  return (
    <Stack
      spacing={2}
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) onSubmit(code);
      }}
      sx={{ width: "100%", maxWidth: 320 }}
    >
      <Typography variant="h6" component="h2" textAlign="center">
        Enter Pairing Code
      </Typography>
      <TextField
        autoFocus
        fullWidth
        inputMode="numeric"
        placeholder="847 291"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, PAIRING_CODE_LENGTH))}
        slotProps={{ htmlInput: { style: { textAlign: "center", fontSize: 28, letterSpacing: 8 }, "aria-label": "Pairing code" } }}
      />
      <Button type="submit" variant="contained" size="large" disabled={!isValid || loading}>
        Connect
      </Button>
    </Stack>
  );
}
