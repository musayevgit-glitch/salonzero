export interface UploadTarget {
  method: 'PUT';
  url: string;
  headers?: Record<string, string>;
  expiresAt: Date;
}

export interface ObjectStat {
  sizeBytes: number;
}

/**
 * Every caller depends on this interface only, never on a concrete driver — see ADR-0008.
 * `readObjectHead` exists so callers can verify actual file bytes (magic-number sniffing)
 * against the claimed Content-Type instead of trusting the upload request's header.
 */
export interface StorageAdapter {
  createUploadTarget(
    objectKey: string,
    contentType: string,
    maxSizeBytes: number,
  ): Promise<UploadTarget>;
  getObjectUrl(objectKey: string): Promise<string>;
  statObject(objectKey: string): Promise<ObjectStat | null>;
  readObjectHead(objectKey: string, bytes: number): Promise<Buffer | null>;
  deleteObject(objectKey: string): Promise<void>;
}
