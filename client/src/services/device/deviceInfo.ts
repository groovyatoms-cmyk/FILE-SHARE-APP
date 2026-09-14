/**
 * Derives a friendly, low-fingerprinting device label from the user agent.
 * Deliberately coarse: browser family + OS family only, nothing more specific
 * (no full UA string, no screen size, no plugin list).
 */
export function detectDeviceLabel(): string {
  const ua = navigator.userAgent;

  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMac = /Macintosh/i.test(ua);
  const isWindows = /Windows/i.test(ua);
  const isLinux = /Linux/i.test(ua) && !isAndroid;

  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/CriOS/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua) || /FxiOS/i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";

  if (isAndroid) return `${browser} on Android`;
  if (isIOS) return /iPad/i.test(ua) ? `${browser} on iPad` : `${browser} on iPhone`;
  if (isMac) return `${browser} on Mac`;
  if (isWindows) return `${browser} on Windows`;
  if (isLinux) return `${browser} on Linux`;
  return browser;
}

export function getOrCreateDeviceId(): string {
  const key = "p2p-device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
