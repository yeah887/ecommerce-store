export interface Config {
  port: number;
  mongoUrl: string;
}

/** Reads configuration from environment variables, failing fast on anything required but missing. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const mongoUrl = env.MONGO_URL;
  if (!mongoUrl) {
    throw new Error('MONGO_URL is required');
  }
  return {
    port: Number(env.API_PORT ?? 3000),
    mongoUrl,
  };
}
