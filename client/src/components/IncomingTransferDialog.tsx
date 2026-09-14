import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  Avatar,
} from "@mui/material";
import DevicesIcon from "@mui/icons-material/Devices";
import type { FileMetadata } from "@p2p/shared";
import { formatBytes } from "../utils/format";

export function IncomingTransferDialog({
  open,
  senderName,
  files,
  totalSize,
  onAccept,
  onReject,
}: {
  open: boolean;
  senderName: string;
  files: FileMetadata[];
  totalSize: number;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <Dialog open={open} onClose={onReject} maxWidth="xs" fullWidth aria-labelledby="incoming-transfer-title">
      <DialogTitle id="incoming-transfer-title">Incoming Transfer</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: "primary.main" }}>
              <DevicesIcon />
            </Avatar>
            <Typography variant="body1">
              <strong>{senderName}</strong> wants to send you files
            </Typography>
          </Stack>

          <Paper variant="outlined" sx={{ maxHeight: 220, overflow: "auto" }}>
            <List dense disablePadding>
              {files.map((f) => (
                <ListItem key={f.id} divider>
                  <ListItemText primary={f.name} secondary={`${formatBytes(f.size)} · ${f.type || "Unknown type"}`} />
                </ListItem>
              ))}
            </List>
          </Paper>

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Files: {files.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total size: {formatBytes(totalSize)}
            </Typography>
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Files will be transferred directly between your devices when possible, and relayed through a
            TURN server only when a direct connection can't be established.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onReject} color="inherit">
          Reject
        </Button>
        <Button onClick={onAccept} variant="contained" autoFocus>
          Accept Transfer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
