import { Stack, Typography, List, ListItem, ListItemText } from "@mui/material";

export function PrivacyPage() {
  return (
    <Stack spacing={3} sx={{ maxWidth: 640 }}>
      <Typography variant="h4">Privacy</Typography>

      <Typography color="text.secondary">
        P2P File Share is designed so that your files never pass through, or get stored on, our
        infrastructure.
      </Typography>

      <List>
        {[
          "Files are sent directly between devices over a WebRTC data channel — the signaling server never receives file contents.",
          "Signaling sessions hold only short-lived connection metadata (a session id, a random token, a pairing code, display names) and expire automatically after your chosen timeout.",
          "Transfer history stores file names, sizes, and timestamps locally in your browser — never file contents — and can be cleared at any time from Settings.",
          "QR codes and pairing codes encode only connection information, never file names or contents.",
          "Application-level encryption, when enabled, uses a fresh key generated per session and never leaves your two devices unencrypted.",
        ].map((text) => (
          <ListItem key={text} sx={{ display: "list-item", pl: 0 }}>
            <ListItemText primary={text} />
          </ListItem>
        ))}
      </List>

      <Typography color="text.secondary">
        Direct peer-to-peer connectivity is preferred whenever possible. When both devices sit
        behind restrictive networks (symmetric NAT, corporate firewalls, carrier-grade NAT), a TURN
        relay server is used as a fallback to carry the encrypted data channel — this is standard
        WebRTC behavior and does not give the relay access to unencrypted file contents beyond what
        WebRTC's own DTLS-SRTP transport encryption already protects.
      </Typography>
    </Stack>
  );
}
