if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://dummy:dummy@localhost:5432/dummy";
}

if (!process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
  process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL = "https://api.anthropic.com";
}

if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
  process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "sk-ant-dummy";
}

export {};
