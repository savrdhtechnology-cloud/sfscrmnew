import { getCloudflareContext } from "@opennextjs/cloudflare";

export type SavrdhCloudflareEnv = CloudflareEnv & {
  DB: D1Database;
  DOCUMENTS?: R2Bucket;
  SESSION_SECRET?: string;
};

export function getDb(): D1Database {
  const { env } = getCloudflareContext();
  return (env as SavrdhCloudflareEnv).DB;
}

export async function getDbAsync(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as SavrdhCloudflareEnv).DB;
}

export function getDocumentsBucket(): R2Bucket {
  const { env } = getCloudflareContext();
  const bucket = (env as SavrdhCloudflareEnv).DOCUMENTS;
  if (!bucket) throw new Error("Cloudflare R2 binding DOCUMENTS is not configured");
  return bucket;
}
