import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Stack, Typography, Alert, Button } from "@mui/material";
import { QRScanner } from "../components/QRScanner";
import { PairingCodeInput } from "../components/PairingCodeInput";
import { IncomingTransferDialog } from "../components/IncomingTransferDialog";
import { TransferDashboard } from "../features/transfer/TransferDashboard";
import { ReceiverSession, type IncomingOffer } from "../services/transfer/ReceiverSession";
import { parseQrPayload } from "../services/qr/qrPayload";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useConnectionStore } from "../stores/useConnectionStore";
import { useTransferStore } from "../stores/useTransferStore";
import { detectDeviceLabel } from "../services/device/deviceInfo";

export function ReceiveScanPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const settings = useSettingsStore();
  const connection = useConnectionStore();
  const transferState = useTransferStore((s) => s.transferState);
  const [mode, setMode] = useState<"scan" | "code">(searchParams.get("mode") === "code" ? "code" : "scan");
  const [joining, setJoining] = useState(false);
  const [incomingOffer, setIncomingOffer] = useState<IncomingOffer | null>(null);
  const [joined, setJoined] = useState(false);
  const sessionRef = useRef<ReceiverSession | null>(null);

  useEffect(() => {
    return () => sessionRef.current?.destroy();
  }, []);

  // A join can fail (wrong code, expired/invalid QR) without ever reaching
  // SESSION_JOINED. Once it does, discard the session and re-arm the form so
  // the user isn't stuck on a permanently disabled "Connect" button — a
  // ReceiverSession's join() is one-shot by design (see joinRequested guard
  // in ReceiverSession.ts, which exists to prevent a duplicate join from
  // wiring a second signaling/WebRTC pipeline for the same transfer).
  useEffect(() => {
    if (connection.errorMessage && joining) {
      setJoining(false);
      setJoined(false);
      sessionRef.current?.destroy();
      sessionRef.current = null;
    }
  }, [connection.errorMessage, joining]);

  const startSession = () => {
    if (sessionRef.current) return sessionRef.current;
    const displayName = settings.deviceName || detectDeviceLabel();
    const session = new ReceiverSession(import.meta.env.VITE_SIGNALING_URL, displayName);
    session.onIncomingOffer((offer) => setIncomingOffer(offer));
    sessionRef.current = session;
    return session;
  };

  const handleQrResult = async (text: string) => {
    const result = parseQrPayload(text);
    if (!result.ok) {
      connection.setError(
        result.reason === "expired" ? "This QR code has expired." : "This QR code is not a valid P2P File Share code.",
      );
      return;
    }
    connection.setError(null);
    setJoining(true);
    const session = startSession();
    setJoined(true);
    await session.join({ sessionId: result.payload.sessionId, token: result.payload.token });
  };

  const handlePairingCode = async (code: string) => {
    connection.setError(null);
    setJoining(true);
    const session = startSession();
    setJoined(true);
    await session.join({ pairingCode: code });
  };

  const handleAccept = () => {
    incomingOffer?.respond(true);
    setIncomingOffer(null);
  };

  const handleReject = () => {
    incomingOffer?.respond(false);
    setIncomingOffer(null);
  };

  if (joined && transferState !== "IDLE") {
    return (
      <>
        <TransferDashboard
          controller={{
            pauseFile: () => {},
            resumeFile: () => {},
            cancelAll: () => {
              sessionRef.current?.cancel();
              navigate("/receive");
            },
          }}
        />
        {incomingOffer && (
          <IncomingTransferDialog
            open
            senderName={incomingOffer.senderName}
            files={incomingOffer.files}
            totalSize={incomingOffer.totalSize}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        )}
      </>
    );
  }

  return (
    <Stack spacing={3} alignItems="center">
      {connection.errorMessage && (
        <Alert severity="error" sx={{ width: "100%", maxWidth: 400 }} onClose={() => connection.setError(null)}>
          {connection.errorMessage}
        </Alert>
      )}

      {mode === "scan" ? (
        <QRScanner onResult={handleQrResult} onEnterCodeInstead={() => setMode("code")} />
      ) : (
        <>
          <PairingCodeInput onSubmit={handlePairingCode} loading={joining} />
          <Button onClick={() => setMode("scan")}>Scan QR Instead</Button>
        </>
      )}

      {joining && <Typography color="text.secondary">Connecting…</Typography>}
    </Stack>
  );
}
