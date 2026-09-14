export interface BrowserCapabilities {
  webrtc: boolean;
  webCrypto: boolean;
  indexedDb: boolean;
  fileSystemAccess: boolean;
  mediaDevices: boolean;
  serviceWorker: boolean;
}

export function detectCapabilities(): BrowserCapabilities {
  return {
    webrtc: typeof RTCPeerConnection !== "undefined" && typeof RTCDataChannel !== "undefined",
    webCrypto: typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined",
    indexedDb: typeof indexedDB !== "undefined",
    fileSystemAccess: typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === "function",
    mediaDevices: typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
    serviceWorker: "serviceWorker" in navigator,
  };
}

export function isCoreSupported(caps: BrowserCapabilities): boolean {
  return caps.webrtc && caps.webCrypto && caps.indexedDb;
}
