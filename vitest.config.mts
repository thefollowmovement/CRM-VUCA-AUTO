import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
      // next-auth importe « next/server » sans extension (résolu par Next, pas par Node) : tests avec base.
      { find: /^next\/(server|headers|navigation)$/, replacement: "next/$1.js" },
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    server: { deps: { inline: ["next-auth", "@auth/core"] } },
    // Toutes les dates des tests sont interprétées en heure de Paris.
    env: { TZ: "Europe/Paris" },
  },
});
