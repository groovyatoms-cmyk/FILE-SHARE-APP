import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import { AppShell } from "../components/AppShell";

const HomePage = lazy(() => import("../pages/HomePage").then((m) => ({ default: m.HomePage })));
const SendPage = lazy(() => import("../pages/SendPage").then((m) => ({ default: m.SendPage })));
const ReceivePage = lazy(() => import("../pages/ReceivePage").then((m) => ({ default: m.ReceivePage })));
const ReceiveScanPage = lazy(() => import("../pages/ReceiveScanPage").then((m) => ({ default: m.ReceiveScanPage })));
const TransferPage = lazy(() => import("../pages/TransferPage").then((m) => ({ default: m.TransferPage })));
const HistoryPage = lazy(() => import("../pages/HistoryPage").then((m) => ({ default: m.HistoryPage })));
const SettingsPage = lazy(() => import("../pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const AboutPage = lazy(() => import("../pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const PrivacyPage = lazy(() => import("../pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

function PageFallback() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
      <CircularProgress />
    </Box>
  );
}

function RootLayout() {
  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/send", element: <SendPage /> },
      { path: "/receive", element: <ReceivePage /> },
      { path: "/receive/scan", element: <ReceiveScanPage /> },
      { path: "/transfer/:sessionId", element: <TransferPage /> },
      { path: "/history", element: <HistoryPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/privacy", element: <PrivacyPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
