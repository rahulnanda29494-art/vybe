import 'server-only';
import { createHmac, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Object-storage abstraction. The database stores only object *keys*;
 * adapters turn keys into upload targets and public URLs.
 *
 * - `local`  — writes under ./.storage (development)
 * - `s3`     — any S3-compatible store (AWS S3, R2, MinIO). Produces signed
 *              upload targets; plug in @aws-sdk/s3-request-presigner here.
 */
export interface UploadTarget {
  key: string;
  url: string;
  method: 'PUT' | 'POST';
  headers: Record<string, string>;
  expiresAt: string;
}

export interface StorageAdapter {
  createUploadTarget(opts: { kind: 'video' | 'thumbnail' | 'avatar'; contentType: string; ownerId: string }): Promise<UploadTarget>;
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  publicUrl(key: string): string;
}

const EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const ALLOWED_TYPES = Object.keys(EXT);

function makeKey(kind: string, ownerId: string, contentType: string) {
  const ext = EXT[contentType];
  if (!ext) throw new Error(`Unsupported content type: ${contentType}`);
  const safeOwner = ownerId.replace(/[^a-zA-Z0-9-]/g, '');
  return `${kind}/${safeOwner}/${randomUUID()}.${ext}`;
}

class LocalStorage implements StorageAdapter {
  private root = path.join(process.cwd(), '.storage');

  async createUploadTarget({ kind, contentType, ownerId }: Parameters<StorageAdapter['createUploadTarget']>[0]) {
    const key = makeKey(kind, ownerId, contentType);
    return {
      key,
      url: `/api/uploads/${encodeURIComponent(key)}`,
      method: 'PUT' as const,
      headers: { 'Content-Type': contentType },
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    };
  }

  async put(key: string, body: Uint8Array) {
    const file = path.join(this.root, key);
    if (!file.startsWith(this.root + path.sep)) throw new Error('Invalid key');
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }

  publicUrl(key: string) {
    return `/media/${key}`;
  }
}

class S3CompatibleStorage implements StorageAdapter {
  constructor(
    private bucket = process.env.STORAGE_BUCKET!,
    private endpoint = process.env.STORAGE_ENDPOINT!,
    private cdn = process.env.STORAGE_PUBLIC_URL ?? process.env.STORAGE_ENDPOINT!,
  ) {}

  async createUploadTarget({ kind, contentType, ownerId }: Parameters<StorageAdapter['createUploadTarget']>[0]) {
    const key = makeKey(kind, ownerId, contentType);
    const expires = Math.floor(Date.now() / 1000) + 15 * 60;
    // Placeholder signature: swap for @aws-sdk/s3-request-presigner's getSignedUrl
    // (SigV4) when wiring a real bucket. The contract to callers does not change.
    const sig = createHmac('sha256', process.env.STORAGE_SECRET ?? 'dev')
      .update(`${this.bucket}/${key}:${expires}`)
      .digest('hex');
    return {
      key,
      url: `${this.endpoint}/${this.bucket}/${key}?expires=${expires}&sig=${sig}`,
      method: 'PUT' as const,
      headers: { 'Content-Type': contentType },
      expiresAt: new Date(expires * 1000).toISOString(),
    };
  }

  async put() {
    throw new Error('Direct server puts are disabled for S3 — upload via signed target.');
  }

  publicUrl(key: string) {
    return `${this.cdn}/${key}`;
  }
}

let adapter: StorageAdapter | undefined;

export function storage(): StorageAdapter {
  adapter ??= process.env.STORAGE_DRIVER === 's3' ? new S3CompatibleStorage() : new LocalStorage();
  return adapter;
}
