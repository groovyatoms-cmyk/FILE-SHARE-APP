import { Box, Card, CardActionArea, CardContent, Grid, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";

export function HomePage() {
  const navigate = useNavigate();

  return (
    <Stack spacing={5}>
      <Stack spacing={1} textAlign="center">
        <Typography variant="h3" component="h1" fontWeight={700}>
          P2P File Share
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Transfer files directly between devices. No cloud storage, no size limits, no accounts.
        </Typography>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardActionArea onClick={() => navigate("/send")} sx={{ p: 4, height: "100%" }}>
              <CardContent>
                <Stack spacing={1.5} alignItems="center" textAlign="center">
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <UploadOutlinedIcon fontSize="large" />
                  </Box>
                  <Typography variant="h6">Send</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Send files to another device
                  </Typography>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardActionArea onClick={() => navigate("/receive")} sx={{ p: 4, height: "100%" }}>
              <CardContent>
                <Stack spacing={1.5} alignItems="center" textAlign="center">
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      bgcolor: "secondary.main",
                      color: "secondary.contrastText",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <DownloadOutlinedIcon fontSize="large" />
                  </Box>
                  <Typography variant="h6">Receive</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Receive files from another device
                  </Typography>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {[
          { icon: <LockOutlinedIcon color="action" />, text: "End-to-end via WebRTC, optional app-level encryption" },
          { icon: <BoltOutlinedIcon color="action" />, text: "Resumable, chunked transfers with live speed & ETA" },
          { icon: <CloudOffOutlinedIcon color="action" />, text: "No files ever touch our servers" },
        ].map((f) => (
          <Grid item xs={12} sm={4} key={f.text}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {f.icon}
              <Typography variant="body2" color="text.secondary">
                {f.text}
              </Typography>
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
