import type { ReactNode } from "react";
import { Box, Card, CardActionArea, Stack, Typography, alpha } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export function IconBadge({ icon, variant }: { icon: ReactNode; variant: "primary" | "gold" }) {
  return (
    <Box
      sx={{
        width: 64,
        height: 64,
        borderRadius: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: variant === "primary" ? "#fff" : (t) => t.palette.royal.gold,
        backgroundImage: (t) =>
          variant === "primary"
            ? `linear-gradient(135deg, ${t.palette.primary.light}, ${t.palette.primary.main} 60%, ${t.palette.primary.dark})`
            : `linear-gradient(135deg, ${t.palette.royal.goldSoft}, transparent)`,
        border: variant === "gold" ? "1.5px solid" : "none",
        borderColor: "royal.gold",
        boxShadow: (t) => (variant === "primary" ? `0 10px 24px ${alpha(t.palette.primary.main, 0.38)}` : "none"),
      }}
    >
      {icon}
    </Box>
  );
}

export function ActionCard({
  onClick,
  variant,
  icon,
  title,
  description,
  actionLabel = "Get started",
}: {
  onClick: () => void;
  variant: "primary" | "gold";
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
}) {
  return (
    <Card
      sx={{
        height: "100%",
        transition: "transform 220ms ease, box-shadow 220ms ease",
        "&:hover": { transform: "translateY(-4px)" },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ p: { xs: 3, sm: 4 }, height: "100%" }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <IconBadge icon={icon} variant={variant} />
          <Typography variant="h6">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "primary.main", fontWeight: 600, fontSize: 14 }}>
            <span>{actionLabel}</span>
            <ArrowForwardIcon sx={{ fontSize: 16 }} />
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  );
}
