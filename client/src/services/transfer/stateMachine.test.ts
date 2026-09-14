import { describe, expect, it } from "vitest";
import { TransferStateMachine } from "./stateMachine";

describe("TransferStateMachine", () => {
  it("starts in IDLE", () => {
    expect(new TransferStateMachine().state).toBe("IDLE");
  });

  it("follows the happy path through to COMPLETED", () => {
    const m = new TransferStateMachine();
    expect(m.transition("PREPARING")).toBe(true);
    expect(m.transition("WAITING_FOR_PEER")).toBe(true);
    expect(m.transition("CONNECTING")).toBe(true);
    expect(m.transition("AWAITING_ACCEPTANCE")).toBe(true);
    expect(m.transition("TRANSFERRING")).toBe(true);
    expect(m.transition("VERIFYING")).toBe(true);
    expect(m.transition("COMPLETED")).toBe(true);
    expect(m.state).toBe("COMPLETED");
  });

  it("rejects invalid transitions", () => {
    const m = new TransferStateMachine();
    expect(m.transition("TRANSFERRING")).toBe(false);
    expect(m.state).toBe("IDLE");
  });

  it("allows pausing and resuming during a transfer", () => {
    const m = new TransferStateMachine();
    ["PREPARING", "WAITING_FOR_PEER", "CONNECTING", "AWAITING_ACCEPTANCE", "TRANSFERRING"].forEach(
      (s) => m.transition(s as never),
    );
    expect(m.transition("PAUSED")).toBe(true);
    expect(m.transition("TRANSFERRING")).toBe(true);
  });

  it("does not allow leaving a terminal state", () => {
    const m = new TransferStateMachine();
    ["PREPARING", "WAITING_FOR_PEER", "CONNECTING", "AWAITING_ACCEPTANCE", "CANCELLED"].forEach(
      (s) => m.transition(s as never),
    );
    expect(m.state).toBe("CANCELLED");
    expect(m.transition("TRANSFERRING")).toBe(false);
  });

  it("notifies listeners on transition", () => {
    const m = new TransferStateMachine();
    const seen: string[] = [];
    m.onChange((state) => seen.push(state));
    m.transition("PREPARING");
    m.transition("WAITING_FOR_PEER");
    expect(seen).toEqual(["PREPARING", "WAITING_FOR_PEER"]);
  });
});
