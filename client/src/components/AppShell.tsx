import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useMediaQuery,
  IconButton,
  Tooltip,
  Alert,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

const NAV_ITEMS = [
  { label: "Home", path: "/", icon: <HomeOutlinedIcon /> },
  { label: "Send", path: "/send", icon: <UploadOutlinedIcon /> },
  { label: "Receive", path: "/receive", icon: <DownloadOutlinedIcon /> },
  { label: "History", path: "/history", icon: <HistoryOutlinedIcon /> },
  { label: "Settings", path: "/settings", icon: <SettingsOutlinedIcon /> },
];

export function AppShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const location = useLocation();
  const online = useOnlineStatus();

  const currentIndex = NAV_ITEMS.findIndex((item) => item.path === location.pathname);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            variant="h6"
            component="button"
            onClick={() => navigate("/")}
            sx={{ fontWeight: 700, cursor: "pointer", border: 0, bgcolor: "transparent", color: "text.primary" }}
          >
            P2P File Share
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          {!isMobile &&
            NAV_ITEMS.slice(1).map((item) => (
              <Typography
                key={item.path}
                component="button"
                onClick={() => navigate(item.path)}
                sx={{
                  border: 0,
                  bgcolor: "transparent",
                  cursor: "pointer",
                  fontWeight: location.pathname === item.path ? 700 : 500,
                  color: location.pathname === item.path ? "primary.main" : "text.secondary",
                  fontSize: 14,
                }}
              >
                {item.label}
              </Typography>
            ))}
          <Tooltip title={online ? "Online" : "Offline"}>
            <IconButton size="small" sx={{ color: online ? "success.main" : "warning.main" }}>
              {online ? <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "success.main" }} /> : <WifiOffIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {!online && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          You're offline. Signaling requires an internet connection; an already-connected P2P transfer can continue.
        </Alert>
      )}

      <Container component="main" maxWidth="md" sx={{ flexGrow: 1, py: { xs: 3, sm: 4 }, pb: isMobile ? 10 : 4 }}>
        {children}
      </Container>

      {isMobile && (
        <Paper elevation={3} sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}>
          <BottomNavigation
            showLabels
            value={currentIndex === -1 ? 0 : currentIndex}
            onChange={(_, newValue) => navigate(NAV_ITEMS[newValue]!.path)}
          >
            {NAV_ITEMS.map((item) => (
              <BottomNavigationAction key={item.path} label={item.label} icon={item.icon} sx={{ minWidth: 44 }} />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
