import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

// KV over the template's R2: free tier, no card needed
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
