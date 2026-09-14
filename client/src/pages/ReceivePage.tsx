import { Card, CardActionArea, CardContent, Grid, Stack, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import KeyboardIcon from "@mui/icons-material/Keyboard";

export function ReceivePage() {
  const navigate = useNavigate();

  return (
    <Stack spacing={4}>
      <Typography variant="h4" textAlign="center">
        Receive Files
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardActionArea sx={{ p: 4, height: "100%" }} onClick={() => navigate("/receive/scan")}>
              <CardContent>
                <Stack spacing={1.5} alignItems="center" textAlign="center">
                  <Box sx={{ color: "primary.main" }}>
                    <QrCodeScannerIcon sx={{ fontSize: 48 }} />
                  </Box>
                  <Typography variant="h6">Scan QR Code</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use your camera to scan the sender's QR code
                  </Typography>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardActionArea sx={{ p: 4, height: "100%" }} onClick={() => navigate("/receive/scan?mode=code")}>
              <CardContent>
                <Stack spacing={1.5} alignItems="center" textAlign="center">
                  <Box sx={{ color: "secondary.main" }}>
                    <KeyboardIcon sx={{ fontSize: 48 }} />
                  </Box>
                  <Typography variant="h6">Enter Pairing Code</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Type the code shown on the sender's screen
                  </Typography>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
