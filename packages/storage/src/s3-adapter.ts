import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ObjectStat, StorageAdapter, UploadTarget } from './adapter';

export interface S3StorageAdapterOptions {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  uploadTtlSeconds?: number;
  downloadTtlSeconds?: number;
}

export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly uploadTtlSeconds: number;
  private readonly downloadTtlSeconds: number;

  constructor(options: S3StorageAdapterOptions) {
    this.bucket = options.bucket;
    this.uploadTtlSeconds = options.uploadTtlSeconds ?? 600;
    this.downloadTtlSeconds = options.downloadTtlSeconds ?? 300;
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    });
  }

  async putObject(objectKey: string, data: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: data,
        ContentType: contentType,
      }),
    );
  }

  async createUploadTarget(objectKey: string, contentType: string): Promise<UploadTarget> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: contentType,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: this.uploadTtlSeconds });
    return {
      method: 'PUT',
      url,
      headers: { 'Content-Type': contentType },
      expiresAt: new Date(Date.now() + this.uploadTtlSeconds * 1000),
    };
  }

  async getObjectUrl(objectKey: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: objectKey });
    return getSignedUrl(this.client, command, { expiresIn: this.downloadTtlSeconds });
  }

  async statObject(objectKey: string): Promise<ObjectStat | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      return { sizeBytes: result.ContentLength ?? 0 };
    } catch {
      return null;
    }
  }

  async readObjectHead(objectKey: string, bytes: number): Promise<Buffer | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          Range: `bytes=0-${bytes - 1}`,
        }),
      );
      const body = result.Body;
      if (!body) return null;
      const chunks: Buffer[] = [];
      for await (const chunk of body as AsyncIterable<Buffer>) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch {
      return null;
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
  }
}
