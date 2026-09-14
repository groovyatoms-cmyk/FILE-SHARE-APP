import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Box, Stack, Typography, Button } from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import { MAX_FILES_PER_TRANSFER } from "@p2p/shared";

export function FileDropZone({ onFilesSelected }: { onFilesSelected: (files: File[]) => void }) {
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      setRejectionMessage(rejections.length > 0 ? rejections[0]!.errors[0]?.message ?? "Some files were rejected" : null);
      if (accepted.length > 0) onFilesSelected(accepted);
    },
    [onFilesSelected],
  );

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject, open } = useDropzone({
    onDrop,
    maxFiles: MAX_FILES_PER_TRANSFER,
    noClick: true,
  });

  const borderColor = isDragReject ? "error.main" : isDragAccept ? "success.main" : isDragActive ? "primary.main" : "divider";

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: "2px dashed",
        borderColor,
        borderRadius: 3,
        bgcolor: isDragActive ? "action.hover" : "transparent",
        p: { xs: 4, sm: 6 },
        textAlign: "center",
        transition: "border-color 150ms ease, background-color 150ms ease",
        cursor: "pointer",
      }}
    >
      <input {...getInputProps()} aria-label="File upload" />
      <Stack spacing={2} alignItems="center">
        <CloudUploadOutlinedIcon sx={{ fontSize: 48, color: "primary.main" }} />
        <Typography variant="h6" component="p">
          Drag &amp; Drop Files
        </Typography>
        <Typography variant="body2" color="text.secondary">
          or
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
        >
          Select Files
        </Button>
        {rejectionMessage && (
          <Typography variant="body2" color="error">
            {rejectionMessage}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
