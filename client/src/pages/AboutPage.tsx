import { Stack, Typography } from "@mui/material";

export function AboutPage() {
  return (
    <Stack spacing={2} sx={{ maxWidth: 640 }}>
      <Typography variant="h4">About</Typography>
      <Typography color="text.secondary">
        P2P File Share is a privacy-first, peer-to-peer file transfer application. Files travel
        directly between devices over an encrypted WebRTC data channel — our signaling server only
        brokers the initial handshake (session codes, SDP offers/answers, ICE candidates) and never
        sees file contents.
      </Typography>
      <Typography color="text.secondary">
        Built with React, TypeScript, Material UI, and WebRTC. Direct connections are preferred
        whenever possible; a TURN relay is used only as a fallback when both devices sit behind
        restrictive NATs or firewalls.
      </Typography>
      <Typography color="text.secondary">
        See the project README for architecture details, deployment instructions, and browser
        compatibility notes.
      </Typography>
    </Stack>
  );
}
