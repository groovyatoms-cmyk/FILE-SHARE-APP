import type { ControlMessage, DataChannelMessageType } from "@p2p/shared";

export function buildMessage<T extends ControlMessage>(msg: Omit<T, "ts">): T {
  return { ...msg, ts: Date.now() } as T;
}

export function parseControlMessage(raw: string): ControlMessage | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.type !== "string") return null;
    return parsed as ControlMessage;
  } catch {
    return null;
  }
}

export function isType<T extends ControlMessage>(
  msg: ControlMessage,
  type: DataChannelMessageType,
): msg is T {
  return msg.type === type;
}
