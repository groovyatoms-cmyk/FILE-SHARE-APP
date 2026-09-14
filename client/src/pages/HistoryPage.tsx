import { useEffect } from "react";
import {
  Stack,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  Divider,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import { useNavigate } from "react-router-dom";
import { useHistoryStore } from "../stores/useHistoryStore";
import { EmptyState } from "../components/EmptyState";
import { formatBytes } from "../utils/format";

function groupByDay(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export function HistoryPage() {
  const { entries, loaded, refresh, clear } = useHistoryStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) void refresh();
  }, [loaded, refresh]);

  if (loaded && entries.length === 0) {
    return (
      <EmptyState
        icon={<HistoryOutlinedIcon fontSize="inherit" />}
        title="No Transfers Yet"
        description="Files you send or receive will appear here."
        actionLabel="Send Files"
        onAction={() => navigate("/send")}
      />
    );
  }

  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = groupByDay(entry.timestamp);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">History</Typography>
        {entries.length > 0 && (
          <Button color="inherit" onClick={() => clear()}>
            Clear History
          </Button>
        )}
      </Stack>

      {Array.from(groups.entries()).map(([day, dayEntries]) => (
        <Stack key={day} spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">
            {day}
          </Typography>
          <List disablePadding>
            {dayEntries.map((entry, i) => (
              <div key={entry.id}>
                <ListItem>
                  <ListItemIcon>{entry.direction === "sent" ? <UploadIcon /> : <DownloadIcon />}</ListItemIcon>
                  <ListItemText
                    primary={entry.fileName}
                    secondary={`${formatBytes(entry.size)} · ${new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${entry.peerName}`}
                  />
                  <Chip
                    size="small"
                    icon={entry.status === "completed" ? <CheckCircleIcon /> : <ErrorIcon />}
                    label={entry.status === "completed" ? "Completed" : entry.status === "failed" ? "Failed" : "Cancelled"}
                    color={entry.status === "completed" ? "success" : entry.status === "failed" ? "error" : "default"}
                  />
                </ListItem>
                {i < dayEntries.length - 1 && <Divider component="li" />}
              </div>
            ))}
          </List>
        </Stack>
      ))}
    </Stack>
  );
}
