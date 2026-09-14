import { useEffect, useMemo, useRef, useState } from "react";
import { Stack, Typography, Button, Tabs, Tab, Paper } from "@mui/material";
import { useSessionStore } from "../stores/useSessionStore";
import { useConnectionStore } from "../stores/useConnectionStore";
import { useTransferStore } from "../stores/useTransferStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { FileDropZone } from "../components/FileDropZone";
import { FileList } from "../components/FileList";
import { QRCodeDisplay } from "../components/QRCodeDisplay";
import { SessionTimer } from "../components/SessionTimer";
import { EmptyState } from "../components/EmptyState";
import { TransferDashboard } from "../features/transfer/TransferDashboard";
import { SenderSession } from "../services/transfer/SenderSession";
import { resolveSignalingUrl } from "../services/signaling/resolveSignalingUrl";
import { buildQrPayload } from "../services/qr/qrPayload";
import { formatBytes } from "../utils/format";
import { detectDeviceLabel } from "../services/device/deviceInfo";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

type Step = "select" | "pairing" | "transferring";

export function SendPage() {
  const { queuedFiles, addFiles, removeFile, clear, totalBytes } = useSessionStore();
  const settings = useSettingsStore();
  const connection = useConnectionStore();
  const transferState = useTransferStore((s) => s.transferState);
  const [step, setStep] = useState<Step>("select");
  const [pairingTab, setPairingTab] = useState(0);
  const sessionRef = useRef<SenderSession | null>(null);

  useEffect(() => {
    if (transferState === "TRANSFERRING" || transferState === "COMPLETED") {
      setStep("transferring");
    }
  }, [transferState]);

  useEffect(() => {
    return () => {
      sessionRef.current?.destroy();
    };
  }, []);

  const qrValue = useMemo(() => {
    if (!connection.sessionId || !connection.token || !connection.expiresAt) return null;
    return buildQrPayload({
      sessionId: connection.sessionId,
      token: connection.token,
      signalingUrl: resolveSignalingUrl(),
      expiresAt: connection.expiresAt,
    });
  }, [connection.sessionId, connection.token, connection.expiresAt]);

  const handleGenerateQr = async () => {
    connection.reset();
    const displayName = settings.deviceName || detectDeviceLabel();
    const session = new SenderSession({
      signalingUrl: resolveSignalingUrl(),
      displayName,
      timeoutSeconds: settings.sessionTimeoutSeconds,
      encryptionEnabled: settings.applicationEncryption,
    });
    sessionRef.current = session;
    setStep("pairing");
    await session.start(queuedFiles);
  };

  const handleCancel = () => {
    sessionRef.current?.cancelAll();
    sessionRef.current = null;
    connection.reset();
    clear();
    setStep("select");
  };

  if (step === "transferring") {
    return (
      <TransferDashboard
        controller={{
          pauseFile: () => sessionRef.current?.pauseCurrentFile(),
          resumeFile: () => sessionRef.current?.resumeCurrentFile(),
          cancelAll: handleCancel,
        }}
      />
    );
  }

  if (step === "pairing") {
    if (connection.errorMessage) {
      return (
        <Stack spacing={3} alignItems="center" textAlign="center" sx={{ maxWidth: 420, mx: "auto" }}>
          <Typography variant="h5">Couldn't Start Session</Typography>
          <Typography color="error">{connection.errorMessage}</Typography>
          <Typography variant="body2" color="text.secondary">
            Check that the signaling server is running and reachable, then try again.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button color="inherit" onClick={handleCancel}>
              Back
            </Button>
            <Button variant="contained" onClick={handleGenerateQr}>
              Try Again
            </Button>
          </Stack>
        </Stack>
      );
    }

    return (
      <Stack spacing={3} alignItems="center" textAlign="center">
        <Typography variant="h5">Waiting for Receiver</Typography>

        {connection.sessionId ? (
          <>
            <Paper sx={{ width: "100%", maxWidth: 380 }}>
              <Tabs value={pairingTab} onChange={(_, v) => setPairingTab(v)} variant="fullWidth">
                <Tab label="QR Code" />
                <Tab label="Pairing Code" />
              </Tabs>
            </Paper>

            {pairingTab === 0 && qrValue && <QRCodeDisplay value={qrValue} />}
            {pairingTab === 1 && connection.pairingCode && (
              <Stack spacing={1} alignItems="center">
                <Typography variant="h3" letterSpacing={6} fontWeight={700}>
                  {connection.pairingCode.slice(0, 3)} {connection.pairingCode.slice(3)}
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => navigator.clipboard?.writeText(connection.pairingCode ?? "")}
                >
                  Copy Code
                </Button>
              </Stack>
            )}

            <Typography variant="body2" color="text.secondary">
              Ask the receiver to scan this code or enter the pairing code on their device.
            </Typography>

            {connection.expiresAt && <SessionTimer expiresAt={connection.expiresAt} />}
          </>
        ) : (
          <Typography color="text.secondary">Creating session…</Typography>
        )}

        <Button color="inherit" onClick={handleCancel}>
          Cancel
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" textAlign="center">
        Send Files
      </Typography>

      <FileDropZone onFilesSelected={addFiles} />

      {queuedFiles.length === 0 ? (
        <EmptyState
          icon={<InboxOutlinedIcon fontSize="inherit" />}
          title="No files selected"
          description="Drag files above or use Select Files to build your transfer queue."
        />
      ) : (
        <Paper variant="outlined">
          <FileList files={queuedFiles} onRemove={removeFile} />
        </Paper>
      )}

      {queuedFiles.length > 0 && (
        <Stack spacing={2} alignItems="center">
          <Typography variant="subtitle1">Total: {formatBytes(totalBytes())}</Typography>
          <Button variant="contained" size="large" onClick={handleGenerateQr}>
            Generate QR
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
