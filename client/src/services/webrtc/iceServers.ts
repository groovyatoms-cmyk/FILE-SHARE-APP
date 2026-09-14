export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];

  const stun = import.meta.env.VITE_STUN_SERVER;
  if (stun) servers.push({ urls: stun });

  const turn = import.meta.env.VITE_TURN_SERVER;
  if (turn) {
    servers.push({
      urls: turn,
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    });
  }

  if (servers.length === 0) {
    // Reasonable public fallback for local development only.
    servers.push({ urls: "stun:stun.l.google.com:19302" });
  }

  return servers;
}
