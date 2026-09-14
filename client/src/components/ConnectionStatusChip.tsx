import { Chip } from "@mui/material";
import type { ConnectionState } from "@p2p/shared";
import CircularProgress from "@mui/material/CircularProgress";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WifiIcon from "@mui/icons-material/Wifi";
import SyncIcon from "@mui/icons-material/Sync";

const LABELS: Record<ConnectionState, string> = {
  CREATING_SESSION: "Creating session",
  WAITING_FOR_RECEIVER: "Waiting for receiver",
  RECEIVER_CONNECTED: "Receiver connected",
  NEGOTIATING: "Negotiating connection",
  CONNECTING: "Connecting",
  CONNECTED: "Connected",
  TRANSFERRING: "Transferring",
  PAUSED: "Paused",
  RECONNECTING: "Reconnecting",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
  EXPIRED: "Expired",
};

const COLORS: Record<ConnectionState, "default" | "success" | "warning" | "error" | "info" | "primary"> = {
  CREATING_SESSION: "default",
  WAITING_FOR_RECEIVER: "info",
  RECEIVER_CONNECTED: "info",
  NEGOTIATING: "info",
  CONNECTING: "info",
  CONNECTED: "primary",
  TRANSFERRING: "primary",
  PAUSED: "warning",
  RECONNECTING: "warning",
  COMPLETED: "success",
  CANCELLED: "default",
  FAILED: "error",
  EXPIRED: "error",
};

function iconFor(state: ConnectionState) {
  switch (state) {
    case "COMPLETED":
      return <CheckCircleIcon fontSize="small" />;
    case "FAILED":
    case "EXPIRED":
      return <ErrorIcon fontSize="small" />;
    case "CONNECTED":
    case "TRANSFERRING":
      return <WifiIcon fontSize="small" />;
    case "RECONNECTING":
    case "NEGOTIATING":
    case "CONNECTING":
      return <SyncIcon fontSize="small" />;
    default:
      return <CircularProgress size={14} thickness={6} />;
  }
}

export function ConnectionStatusChip({ state }: { state: ConnectionState }) {
  return <Chip icon={iconFor(state)} label={LABELS[state]} color={COLORS[state]} variant="filled" />;
}
