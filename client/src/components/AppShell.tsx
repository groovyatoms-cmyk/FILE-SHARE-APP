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
  Stack,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

const NAV_ITEMS = [
  { label: "Home", path: "/", icon: <HomeOutlinedIcon /> },
  { label: "Send", path: "/send", icon: <UploadOutlinedIcon /> },
  { label: "Receive", path: "/receive", icon: <DownloadOutlinedIcon /> },
  { label: "History", path: "/history", icon: <HistoryOutlinedIcon /> },
  { label: "Settings", path: "/settings", icon: <SettingsOutlinedIcon /> },
];

function BrandMark() {
  return (
    <Box
      sx={{
        width: 34,
        height: 34,
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: (t) =>
          `linear-gradient(135deg, ${t.palette.primary.light}, ${t.palette.primary.main} 60%, ${t.palette.primary.dark})`,
        boxShadow: (t) => `0 4px 12px ${alpha(t.palette.primary.main, 0.4)}`,
        flexShrink: 0,
      }}
    >
      <HubOutlinedIcon sx={{ color: "#fff", fontSize: 20 }} />
    </Box>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const location = useLocation();
  const online = useOnlineStatus();

  const currentIndex = NAV_ITEMS.findIndex((item) => item.path === location.pathname);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar sx={{ gap: 2.5, minHeight: { xs: 60, sm: 68 } }}>
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            component="button"
            onClick={() => navigate("/")}
            sx={{ border: 0, bgcolor: "transparent", cursor: "pointer", p: 0 }}
          >
            <BrandMark />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                letterSpacing: -0.2,
                fontSize: { xs: 16, sm: 20 },
              }}
            >
              P2P File Share
            </Typography>
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          {!isMobile && (
            <Stack direction="row" spacing={0.5}>
              {NAV_ITEMS.slice(1).map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Box
                    key={item.path}
                    component="button"
                    onClick={() => navigate(item.path)}
                    sx={{
                      position: "relative",
                      border: 0,
                      bgcolor: "transparent",
                      cursor: "pointer",
                      px: 1.75,
                      py: 1,
                      borderRadius: 2,
                      fontWeight: active ? 700 : 500,
                      fontSize: 14,
                      fontFamily: "inherit",
                      color: active ? "primary.main" : "text.secondary",
                      transition: "color 150ms ease, background-color 150ms ease",
                      "&:hover": {
                        color: "primary.main",
                        bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                      },
                    }}
                  >
                    {item.label}
                    {active && (
                      <Box
                        sx={{
                          position: "absolute",
                          left: "20%",
                          right: "20%",
                          bottom: 2,
                          height: 2,
                          borderRadius: 999,
                          backgroundImage: (t) =>
                            `linear-gradient(90deg, ${t.palette.primary.main}, ${t.palette.royal.gold})`,
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}

          <Tooltip title={online ? "Online" : "Offline"}>
            <IconButton size="small" sx={{ color: online ? "success.main" : "warning.main" }}>
              {online ? (
                <Box
                  sx={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    bgcolor: "success.main",
                    boxShadow: (t) => `0 0 0 3px ${alpha(t.palette.success.main, 0.2)}`,
                  }}
                />
              ) : (
                <WifiOffIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {!online && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          You're offline. Signaling requires an internet connection; an already-connected P2P transfer can continue.
        </Alert>
      )}

      <Container component="main" maxWidth="md" sx={{ flexGrow: 1, py: { xs: 3, sm: 5 }, pb: isMobile ? 10 : 5 }}>
        {children}
      </Container>

      {isMobile && (
        <Paper elevation={3} sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}>
          <BottomNavigation
            showLabels
            value={currentIndex === -1 ? 0 : currentIndex}
            onChange={(_, newValue) => navigate(NAV_ITEMS[newValue]!.path)}
            sx={{
              "& .Mui-selected": { color: "primary.main" },
            }}
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
