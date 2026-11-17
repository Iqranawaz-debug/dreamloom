// Load .env / .env.local the same way Next.js does. Import this first in every script.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
process.env.MOCK_AI_DELAY_MS ??= "0";
