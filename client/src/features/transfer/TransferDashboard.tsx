import { Stack, Typography, LinearProgress, Button, Alert } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useNavigate } from "react-router-dom";
import { useConnectionStore } from "../../stores/useConnectionStore";
import { useTransferStore } from "../../stores/useTransferStore";
import { ConnectionStatusChip } from "../../components/ConnectionStatusChip";
import { TransferProgressCard } from "../../components/TransferProgressCard";
import { formatBytes, formatEta, formatSpeed, formatPercent } from "../../utils/format";

export interface TransferController {
  pauseFile: (fileId: string) => void;
  resumeFile: (fileId: string) => void;
  cancelAll: () => void;
}

export function TransferDashboard({ controller }: { controller: TransferController }) {
  const navigate = useNavigate();
  const connectionState = useConnectionStore((s) => s.connectionState);
  const errorMessage = useConnectionStore((s) => s.errorMessage);
  const peerDisplayName = useTransferStore((s) => s.peerDisplayName);
  const transferState = useTransferStore((s) => s.transferState);
  const direction = useTransferStore((s) => s.direction);
  const files = useTransferStore((s) => s.files);
  const fileOrder = useTransferStore((s) => s.fileOrder);
  const overallSpeedBps = useTransferStore((s) => s.overallSpeedBps);
  const overallEtaSeconds = useTransferStore((s) => s.overallEtaSeconds);

  const entries = fileOrder.map((id) => files[id]).filter((f): f is NonNullable<typeof f> => !!f);
  const totalBytes = entries.reduce((sum, f) => sum + f.size, 0);
  const totalTransferred = entries.reduce((sum, f) => sum + f.bytesTransferred, 0);
  const overallRatio = totalBytes > 0 ? totalTransferred / totalBytes : 0;
  const verb = direction === "send" ? "Sending" : "Receiving";

  if (transferState === "INTERRUPTED") {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">Connection interrupted. Your transfer is safe. Reconnecting…</Alert>
        <LinearProgress />
      </Stack>
    );
  }

  if (transferState === "FAILED" || errorMessage) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{errorMessage ?? "The transfer failed. The devices may be behind restrictive networks."}</Alert>
        <Button variant="contained" onClick={() => navigate(direction === "send" ? "/send" : "/receive")}>
          Try Again
        </Button>
      </Stack>
    );
  }

  if (transferState === "EXPIRED") {
    return (
      <Stack spacing={2} alignItems="flex-start">
        <Alert severity="info" sx={{ width: "100%" }}>
          Session Expired — create a new transfer session.
        </Alert>
        <Button variant="contained" onClick={() => navigate(direction === "send" ? "/send" : "/receive")}>
          Start New Transfer
        </Button>
      </Stack>
    );
  }

  if (transferState === "COMPLETED") {
    return (
      <Stack spacing={2} alignItems="center" textAlign="center" sx={{ py: 4 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 56 }} />
        <Typography variant="h5">Transfer Complete</Typography>
        <Typography color="text.secondary">
          {entries.length} file{entries.length === 1 ? "" : "s"} · {formatBytes(totalBytes)}
        </Typography>
        <Typography color="text.secondary">
          {entries.every((f) => f.checksumVerified !== false) ? "Verified successfully." : "Some files failed verification."}
        </Typography>
        <Button variant="contained" onClick={() => navigate(direction === "send" ? "/send" : "/receive")}>
          Start New Transfer
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" rowGap={1}>
        <Typography variant="h5">
          {verb} Files
        </Typography>
        <ConnectionStatusChip state={connectionState} />
      </Stack>

      {peerDisplayName && (
        <Typography variant="body2" color="text.secondary">
          Connected to: <strong>{peerDisplayName}</strong>
        </Typography>
      )}

      <Stack spacing={1.5}>
        {entries.map((entry) => (
          <TransferProgressCard
            key={entry.id}
            entry={entry}
            onPause={direction === "send" ? () => controller.pauseFile(entry.id) : undefined}
            onResume={direction === "send" ? () => controller.resumeFile(entry.id) : undefined}
            onCancel={() => controller.cancelAll()}
          />
        ))}
      </Stack>

      {entries.length > 1 && (
        <Stack spacing={1} sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
          <Typography variant="subtitle2">Overall</Typography>
          <LinearProgress variant="determinate" value={Math.round(overallRatio * 100)} />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              {formatBytes(totalTransferred)} / {formatBytes(totalBytes)} ({formatPercent(overallRatio)})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatSpeed(overallSpeedBps)} · ETA {formatEta(overallEtaSeconds)}
            </Typography>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
