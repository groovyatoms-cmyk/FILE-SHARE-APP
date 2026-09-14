import { Card, CardContent, Stack, Typography, LinearProgress, Chip, IconButton, Tooltip } from "@mui/material";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import type { TransferFileEntry } from "../stores/useTransferStore";
import { formatBytes, formatEta, formatSpeed, formatPercent } from "../utils/format";

const STATUS_COLOR: Record<TransferFileEntry["status"], "default" | "primary" | "success" | "error" | "warning"> = {
  QUEUED: "default",
  TRANSFERRING: "primary",
  PAUSED: "warning",
  VERIFYING: "primary",
  COMPLETED: "success",
  FAILED: "error",
  CANCELLED: "default",
};

export function TransferProgressCard({
  entry,
  onPause,
  onResume,
  onCancel,
}: {
  entry: TransferFileEntry;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}) {
  const ratio = entry.size > 0 ? entry.bytesTransferred / entry.size : 0;
  const isActive = entry.status === "TRANSFERRING" || entry.status === "PAUSED";

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography variant="subtitle1" noWrap sx={{ maxWidth: 260 }} title={entry.name}>
              {entry.name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {entry.status === "COMPLETED" && <CheckCircleIcon color="success" fontSize="small" />}
              {entry.status === "FAILED" && <ErrorIcon color="error" fontSize="small" />}
              <Chip size="small" label={entry.status} color={STATUS_COLOR[entry.status]} />
            </Stack>
          </Stack>

          <LinearProgress
            variant="determinate"
            value={Math.round(ratio * 100)}
            color={entry.status === "FAILED" ? "error" : "primary"}
          />

          <Stack direction="row" justifyContent="space-between" flexWrap="wrap" rowGap={0.5}>
            <Typography variant="body2" color="text.secondary">
              {formatBytes(entry.bytesTransferred)} / {formatBytes(entry.size)} ({formatPercent(ratio)})
            </Typography>
            {isActive && (
              <Typography variant="body2" color="text.secondary">
                {formatSpeed(entry.currentSpeedBps)} · ETA {formatEta(entry.etaSeconds)}
              </Typography>
            )}
          </Stack>

          {entry.error && (
            <Typography variant="body2" color="error">
              {entry.error}
            </Typography>
          )}

          {isActive && (onPause || onResume || onCancel) && (
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              {entry.status === "TRANSFERRING" && onPause && (
                <Tooltip title="Pause">
                  <IconButton size="small" onClick={onPause} aria-label="Pause transfer">
                    <PauseIcon />
                  </IconButton>
                </Tooltip>
              )}
              {entry.status === "PAUSED" && onResume && (
                <Tooltip title="Resume">
                  <IconButton size="small" onClick={onResume} aria-label="Resume transfer">
                    <PlayArrowIcon />
                  </IconButton>
                </Tooltip>
              )}
              {onCancel && (
                <Tooltip title="Cancel">
                  <IconButton size="small" onClick={onCancel} aria-label="Cancel transfer" color="error">
                    <CancelIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
