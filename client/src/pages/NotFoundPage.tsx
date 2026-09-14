import { Stack, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Stack spacing={2} alignItems="center" sx={{ py: 10 }}>
      <Typography variant="h2">404</Typography>
      <Typography color="text.secondary">This page doesn't exist.</Typography>
      <Button variant="contained" onClick={() => navigate("/")}>
        Back to Home
      </Button>
    </Stack>
  );
}
