import { DataSource } from "@prisma/client";
import { WhoopConnector } from "./whoop";
import { StravaConnector } from "./strava";
import { GarminConnector } from "./garmin";
import type { OAuthConnector } from "./types";

// Apple Health is intentionally excluded here — it's webhook-based, not
// OAuth, so it's handled separately by the /api/connectors/apple-health
// webhook route rather than through this registry.

const registry: Record<Exclude<DataSource, "APPLE_HEALTH">, OAuthConnector> = {
  WHOOP: new WhoopConnector(),
  STRAVA: new StravaConnector(),
  GARMIN: new GarminConnector(),
};

export function getOAuthConnector(source: Exclude<DataSource, "APPLE_HEALTH">): OAuthConnector {
  return registry[source];
}

export { WhoopConnector, StravaConnector, GarminConnector };
