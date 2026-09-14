import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, type CameraDevice } from "html5-qrcode";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import FlashOffIcon from "@mui/icons-material/FlashOff";
import CameraswitchIcon from "@mui/icons-material/Cameraswitch";
import KeyboardIcon from "@mui/icons-material/Keyboard";

const SCANNER_ELEMENT_ID = "p2p-qr-scanner-region";

type ScannerStatus = "idle" | "requesting" | "scanning" | "denied" | "unsupported" | "error";

export function QRScanner({
  onResult,
  onEnterCodeInstead,
}: {
  onResult: (text: string) => void;
  onEnterCodeInstead: () => void;
}) {
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    let cancelled = false;
    setStatus("requesting");

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (cancelled) return;
        setCameras(devices);
        const backCamera = devices.find((d) => /back|rear|environment/i.test(d.label));
        setCameraId((backCamera ?? devices[0])?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setStatus("denied");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cameraId) return;
    let cancelled = false;
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
    scannerRef.current = scanner;

    scanner
      .start(
        cameraId,
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (!cancelled) onResult(decodedText);
        },
        () => {
          // Per-frame decode failures are expected while the camera searches for a code — ignore.
        },
      )
      .then(() => {
        if (cancelled) return;
        setStatus("scanning");
        const capabilities = scanner.getRunningTrackCapabilities?.();
        setTorchSupported(!!(capabilities as { torch?: boolean } | undefined)?.torch);
      })
      .catch(() => {
        if (!cancelled) setStatus("denied");
      });

    return () => {
      cancelled = true;
      scanner.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId]);

  const toggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.applyVideoConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn((v) => !v);
    } catch {
      // Torch toggle can fail on devices that lied about support — safe to ignore.
    }
  };

  if (status === "unsupported") {
    return (
      <Alert severity="warning" role="alert">
        Your browser does not support camera access. Please use a recent version of Chrome, Edge,
        Firefox, or Safari, or enter the pairing code instead.
      </Alert>
    );
  }

  if (status === "denied") {
    return (
      <Stack spacing={2} alignItems="center">
        <Alert severity="error" sx={{ width: "100%" }}>
          Camera permission is required to scan QR codes.
        </Alert>
        <Button startIcon={<KeyboardIcon />} onClick={onEnterCodeInstead} variant="outlined">
          Enter Code Instead
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} alignItems="center" sx={{ width: "100%" }}>
      <Typography variant="h6" component="h2">
        Scan QR Code
      </Typography>

      <Box
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: 340,
          aspectRatio: "1 / 1",
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "black",
        }}
      >
        <Box id={SCANNER_ELEMENT_ID} sx={{ width: "100%", height: "100%" }} />
        {status === "requesting" && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0,0,0,0.5)",
            }}
          >
            <CircularProgress sx={{ color: "white" }} />
          </Box>
        )}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: "12%",
            border: "3px solid rgba(255,255,255,0.8)",
            borderRadius: 2,
            pointerEvents: "none",
          }}
        />
      </Box>

      <Typography variant="body2" color="text.secondary">
        Point your camera at the sender's QR code
      </Typography>

      <Stack direction="row" spacing={1} alignItems="center">
        {cameras.length > 1 && (
          <Select
            size="small"
            value={cameraId ?? ""}
            onChange={(e) => setCameraId(e.target.value)}
            startAdornment={<CameraswitchIcon fontSize="small" sx={{ mr: 1 }} />}
          >
            {cameras.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.label || "Camera"}
              </MenuItem>
            ))}
          </Select>
        )}
        {torchSupported && (
          <IconButton onClick={toggleTorch} aria-label={torchOn ? "Turn off torch" : "Turn on torch"}>
            {torchOn ? <FlashOffIcon /> : <FlashOnIcon />}
          </IconButton>
        )}
      </Stack>

      <Button startIcon={<KeyboardIcon />} onClick={onEnterCodeInstead}>
        Enter Code Instead
      </Button>
    </Stack>
  );
}
