import { List, ListItem, ListItemIcon, ListItemText, IconButton, Typography, Stack } from "@mui/material";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { formatBytes } from "../utils/format";
import type { QueuedFile } from "../stores/useSessionStore";

export function FileList({ files, onRemove }: { files: QueuedFile[]; onRemove: (id: string) => void }) {
  return (
    <List disablePadding>
      {files.map((f, index) => (
        <ListItem
          key={f.id}
          divider={index < files.length - 1}
          secondaryAction={
            <IconButton edge="end" aria-label={`Remove ${f.file.name}`} onClick={() => onRemove(f.id)}>
              <DeleteOutlineIcon />
            </IconButton>
          }
        >
          <ListItemIcon>
            <InsertDriveFileOutlinedIcon />
          </ListItemIcon>
          <ListItemText
            primary={
              <Stack direction="row" spacing={1} alignItems="baseline">
                <Typography component="span" variant="body2" sx={{ minWidth: 24, color: "text.secondary" }}>
                  {(index + 1).toString().padStart(2, "0")}
                </Typography>
                <Typography component="span" variant="body1" noWrap sx={{ maxWidth: 320 }}>
                  {f.file.name}
                </Typography>
              </Stack>
            }
            secondary={formatBytes(f.file.size)}
          />
        </ListItem>
      ))}
    </List>
  );
}
