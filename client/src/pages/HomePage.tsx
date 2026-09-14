import { Box, Chip, Grid, Stack, Typography, alpha } from "@mui/material";
import { useNavigate } from "react-router-dom";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { ActionCard } from "../components/ActionCard";

export function HomePage() {
  const navigate = useNavigate();

  return (
    <Stack spacing={6}>
      <Stack spacing={2} textAlign="center" alignItems="center">
        <Chip
          icon={<AutoAwesomeOutlinedIcon sx={{ fontSize: 16 }} />}
          label="Private by design"
          size="small"
          sx={{
            bgcolor: (t) => t.palette.royal.goldSoft,
            color: (t) => t.palette.royal.gold,
            fontWeight: 700,
            "& .MuiChip-icon": { color: "inherit" },
          }}
        />
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 800,
            backgroundImage: (t) => `linear-gradient(135deg, ${t.palette.text.primary}, ${t.palette.primary.main})`,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          P2P File Share
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480 }}>
          Transfer files directly between devices. No cloud storage, no size limits, no accounts.
        </Typography>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <ActionCard
            onClick={() => navigate("/send")}
            variant="primary"
            icon={<UploadOutlinedIcon fontSize="large" />}
            title="Send"
            description="Send files to another device"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <ActionCard
            onClick={() => navigate("/receive")}
            variant="gold"
            icon={<DownloadOutlinedIcon fontSize="large" />}
            title="Receive"
            description="Receive files from another device"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {[
          { icon: <LockOutlinedIcon fontSize="small" />, text: "End-to-end via WebRTC, optional app-level encryption" },
          { icon: <BoltOutlinedIcon fontSize="small" />, text: "Resumable, chunked transfers with live speed & ETA" },
          { icon: <CloudOffOutlinedIcon fontSize="small" />, text: "No files ever touch our servers" },
        ].map((f) => (
          <Grid item xs={12} sm={4} key={f.text}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.18 : 0.1),
                  color: "primary.main",
                  flexShrink: 0,
                }}
              >
                {f.icon}
              </Box>
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
