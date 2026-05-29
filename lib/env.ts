// Reads required environment variables, failing fast with a clear message.
// Secrets (ANTHROPIC_API_KEY, APP_PASSWORD, SESSION_SECRET, DATABASE_URL) are
// only ever read on the server.

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(
      `缺少环境变量 ${name}。请在 Vercel 项目设置 (Settings → Environment Variables) 中配置后重新部署。`,
    );
  }
  return value;
}
