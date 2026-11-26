import Echo from "laravel-echo";
import Pusher from "pusher-js";
import axios from "axios";
import { apiConfig } from "@/config/api";

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

window.Pusher = Pusher;

type EchoInstance = Echo<any>;

const REVERB_KEY = import.meta.env.VITE_REVERB_APP_KEY;
const REVERB_HOST = import.meta.env.VITE_REVERB_HOST || window.location.hostname;
const REVERB_PORT = Number(import.meta.env.VITE_REVERB_PORT || 8093);
const REVERB_SCHEME = import.meta.env.VITE_REVERB_SCHEME || "http";
const TOKEN_KEY = "joalheria_admin_token";

let echoInstance: EchoInstance | null = null;

/** Real-time is optional: without a Reverb key the panel works with manual refresh only. */
export const isRealtimeEnabled = (): boolean => !!REVERB_KEY;

/**
 * Shared Echo instance, created on first use.
 * Private channels are authorized at /api/broadcasting/auth with the current Sanctum token.
 */
export const getEcho = (): EchoInstance | null => {
  if (!REVERB_KEY) return null;
  if (echoInstance) return echoInstance;

  const useTLS = REVERB_SCHEME === "https";

  echoInstance = new Echo({
    broadcaster: "reverb",
    key: REVERB_KEY,
    wsHost: REVERB_HOST,
    wsPort: REVERB_PORT,
    wssPort: REVERB_PORT,
    forceTLS: useTLS,
    // pusher-js uses its "ws" transport for TLS too when forceTLS is set, so both are
    // needed (enabling only "wss" over HTTPS leaves no transport). Same as optomyze-hub.
    enabledTransports: ["ws", "wss"],
    disableStats: true,
    // Read the token at authorization time so a re-login is picked up without reconnecting.
    authorizer: (channel: { name: string }) => ({
      authorize: (socketId: string, callback: (error: Error | null, data: { auth: string } | null) => void) => {
        const token = localStorage.getItem(TOKEN_KEY);
        axios
          .post(
            `${apiConfig.baseURL}/broadcasting/auth`,
            { socket_id: socketId, channel_name: channel.name },
            { headers: { ...apiConfig.headers, Authorization: `Bearer ${token}` } },
          )
          .then((response) => callback(null, response.data))
          .catch((error) => callback(error, null));
      },
    }),
  });

  return echoInstance;
};

/** Socket id of the current connection, sent as X-Socket-ID so the API skips echoing our own events. */
export const getEchoSocketId = (): string | undefined => {
  try {
    return echoInstance?.socketId();
  } catch {
    return undefined;
  }
};

/** Disconnects and discards the Echo instance (call on logout). */
export const disconnectEcho = (): void => {
  if (!echoInstance) return;
  try {
    echoInstance.disconnect();
  } catch {
    // ignore
  }
  echoInstance = null;
};
