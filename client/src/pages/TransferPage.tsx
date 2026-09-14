import { useNavigate } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { TransferDashboard } from "../features/transfer/TransferDashboard";
import { useTransferStore } from "../stores/useTransferStore";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";

/**
 * Reached only via direct navigation/deep link. The active transfer's real
 * controls live on SendPage/ReceiveScanPage where the session object is
 * created — this route is a read-only fallback view of the shared store,
 * useful for a page reload landing here mid-transfer within the same tab.
 */
export function TransferPage() {
  const navigate = useNavigate();
  const transferState = useTransferStore((s) => s.transferState);

  if (transferState === "IDLE") {
    return (
      <EmptyState
        icon={<SwapHorizOutlinedIcon fontSize="inherit" />}
        title="No Active Transfer"
        description="Start a new transfer from Send or Receive."
        actionLabel="Go Home"
        onAction={() => navigate("/")}
      />
    );
  }

  return <TransferDashboard controller={{ pauseFile: () => {}, resumeFile: () => {}, cancelAll: () => navigate("/") }} />;
}
