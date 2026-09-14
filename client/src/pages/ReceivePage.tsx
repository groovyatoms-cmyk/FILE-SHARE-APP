import { Grid, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import { ActionCard } from "../components/ActionCard";

export function ReceivePage() {
  const navigate = useNavigate();

  return (
    <Stack spacing={4}>
      <Typography variant="h4" textAlign="center" fontWeight={700}>
        Receive Files
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <ActionCard
            onClick={() => navigate("/receive/scan")}
            variant="primary"
            icon={<QrCodeScannerIcon fontSize="large" />}
            title="Scan QR Code"
            description="Use your camera to scan the sender's QR code"
            actionLabel="Open scanner"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <ActionCard
            onClick={() => navigate("/receive/scan?mode=code")}
            variant="gold"
            icon={<KeyboardIcon fontSize="large" />}
            title="Enter Pairing Code"
            description="Type the code shown on the sender's screen"
            actionLabel="Enter code"
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
