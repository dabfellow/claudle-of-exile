import { defineConfig, triggers } from "cf/config";

export default defineConfig({
  worker: {
    name: "path-of-idle",
    compatibilityDate: "2026-09-21",
    observability: {
      enabled: true,
    },
    assets: {
      notFoundHandling: "single-page-application",
    },
    // the hub Worker owns the rest of dabfellow.party
    triggers: [
      triggers.fetch({ pattern: "dabfellow.party/path-of-idle*", zone: "dabfellow.party" }),
      triggers.fetch({ pattern: "www.dabfellow.party/path-of-idle*", zone: "dabfellow.party" }),
    ],
  },
});
