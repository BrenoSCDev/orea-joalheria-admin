import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getEcho } from "@/services/echo";
import { CatalogUpdatedEvent } from "@/types/api";

export type RealtimeStatus = "disabled" | "connecting" | "connected" | "unavailable";

/**
 * Subscribes to the public "catalog" channel and to the private "admin" channel
 * (which exercises /api/broadcasting/auth), invalidating react-query caches when
 * the catalog changes in another tab/device. Returns the connection status.
 */
export function useCatalogRealtime(): RealtimeStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>(() => (getEcho() ? "connecting" : "disabled"));

  useEffect(() => {
    const echo = getEcho();
    if (!echo) return;

    const connection = echo.connector.pusher.connection;
    const onState = ({ current }: { current: string }) => {
      setStatus(current === "connected" ? "connected" : current === "connecting" || current === "initialized" ? "connecting" : "unavailable");
    };
    connection.bind("state_change", onState);
    onState({ current: connection.state });

    echo.channel("catalog").listen(".catalog.updated", (event: CatalogUpdatedEvent) => {
      const keys: Record<CatalogUpdatedEvent["entity"], string[]> = {
        product: ["products", "dashboard"],
        category: ["categories", "dashboard"],
        collection: ["collections", "dashboard"],
        campaign: ["campaigns", "campaign", "products"],
        settings: ["settings"],
      };
      keys[event.entity]?.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    });

    // Private channel reserved for admin notifications (low stock, contacts...).
    echo.private("admin");

    return () => {
      connection.unbind("state_change", onState);
      echo.leave("catalog");
      echo.leave("admin");
    };
  }, [queryClient]);

  return status;
}
