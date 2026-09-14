import { useEffect, useState } from "react";
import { Chip } from "@mui/material";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";

export function SessionTimer({ expiresAt, onExpire }: { expiresAt: number; onExpire?: () => void }) {
  const [remainingMs, setRemainingMs] = useState(() => expiresAt - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = expiresAt - Date.now();
      setRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const label = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  const isLow = totalSeconds < 60;

  return (
    <Chip
      icon={<TimerOutlinedIcon />}
      label={`Session expires in ${label}`}
      color={isLow ? "warning" : "default"}
      variant="outlined"
    />
  );
}
