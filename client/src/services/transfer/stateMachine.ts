import type { TransferState } from "@p2p/shared";

const TRANSITIONS: Record<TransferState, TransferState[]> = {
  IDLE: ["PREPARING"],
  PREPARING: ["WAITING_FOR_PEER", "FAILED", "CANCELLED"],
  WAITING_FOR_PEER: ["CONNECTING", "EXPIRED", "CANCELLED", "FAILED"],
  CONNECTING: ["AWAITING_ACCEPTANCE", "FAILED", "INTERRUPTED", "CANCELLED"],
  AWAITING_ACCEPTANCE: ["TRANSFERRING", "CANCELLED", "FAILED", "INTERRUPTED"],
  // Receiver goes TRANSFERRING -> VERIFYING -> COMPLETED (checksum comparison).
  // Sender has nothing to verify locally, so it may complete directly.
  TRANSFERRING: ["PAUSED", "VERIFYING", "COMPLETED", "INTERRUPTED", "CANCELLED", "FAILED"],
  PAUSED: ["TRANSFERRING", "CANCELLED", "FAILED", "INTERRUPTED"],
  VERIFYING: ["COMPLETED", "FAILED"],
  INTERRUPTED: ["CONNECTING", "FAILED", "CANCELLED", "EXPIRED"],
  COMPLETED: [],
  CANCELLED: [],
  FAILED: [],
  EXPIRED: [],
};

export class TransferStateMachine {
  private current: TransferState = "IDLE";
  private listeners = new Set<(state: TransferState, previous: TransferState) => void>();

  get state(): TransferState {
    return this.current;
  }

  canTransition(to: TransferState): boolean {
    return TRANSITIONS[this.current].includes(to);
  }

  transition(to: TransferState): boolean {
    if (!this.canTransition(to)) return false;
    const previous = this.current;
    this.current = to;
    this.listeners.forEach((l) => l(to, previous));
    return true;
  }

  onChange(handler: (state: TransferState, previous: TransferState) => void): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }
}
