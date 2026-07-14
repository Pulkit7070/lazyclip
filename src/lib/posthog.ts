import posthog from "posthog-js";

// PostHog product analytics (US Cloud). Autocaptures pageviews + clicks.
export function initPostHog() {
  if (typeof window === "undefined") return;
  const key = (import.meta.env.VITE_POSTHOG_KEY as string) || "phc_Cewzub4f8RoG53asCCSSqMpKQ2Cfvu6c7toEDQ2YrUwQ";
  const host = (import.meta.env.VITE_POSTHOG_HOST as string) || "https://us.i.posthog.com";
  if (!key) return;
  posthog.init(key, { api_host: host, capture_pageview: true, capture_pageleave: true, person_profiles: "identified_only" });
}

export { default as posthog } from "posthog-js";
