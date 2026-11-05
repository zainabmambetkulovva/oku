import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  NotFound,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { Env } from '../../config/env';
import { UploadKind, uploadRules } from './upload-kinds';

export interface PresignedUpload {
  /** Адрес, на который браузер отправляет форму (multipart/form-data, POST) */
  url: string;
  /** Поля формы — отправляются как есть, файл добавляется последним полем "file" */
  fields: Record<string, string>;
  /** Ключ файла — передаётся в админку при сохранении товара */
  key: string;
  /** Максимальный размер файла в байтах — заявленный при запросе */
  maxBytes: number;
  expiresAt: string;
}

const UPLOAD_URL_TTL_SECONDS = 10 * 60;

/**
 * Файловое хранилище (S3-совместимое).
 * Файлы загружаются браузером напрямую в хранилище по подписанной форме:
 * размер и тип ограничены условиями подписи, backend файлы через себя не пропускает.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client?: S3Client;
  private readonly buckets: { public: string; private: string };
  private readonly publicBaseUrl?: string;
  private readonly createBuckets: boolean;

  constructor(config: ConfigService<Env, true>) {
    const publicBucket = config.get('S3_PUBLIC_BUCKET', { infer: true });
    const privateBucket = config.get('S3_PRIVATE_BUCKET', { infer: true });
    this.buckets = { public: publicBucket ?? '', private: privateBucket ?? '' };
    this.publicBaseUrl = config.get('MEDIA_PUBLIC_BASE_URL', { infer: true })?.replace(/\/+$/, '');
    this.createBuckets = config.get('S3_CREATE_BUCKETS', { infer: true });

    if (publicBucket && privateBucket) {
      this.client = new S3Client({
        endpoint: config.get('S3_ENDPOINT', { infer: true }),
        region: config.get('S3_REGION', { infer: true }),
        forcePathStyle: config.get('S3_FORCE_PATH_STYLE', { infer: true }),
        credentials: {
          accessKeyId: config.get('S3_ACCESS_KEY_ID', { infer: true }) ?? '',
          secretAccessKey: config.get('S3_SECRET_ACCESS_KEY', { infer: true }) ?? '',
        },
      });
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.client) {
      this.logger.warn('File storage is not configured (S3_*): uploads are disabled');
      return;
    }
    if (this.createBuckets) {
      for (const bucket of Object.values(this.buckets)) {
        await this.ensureBucket(bucket);
      }
    }
  }

  get isConfigured(): boolean {
    return this.client !== undefined;
  }

  /** Публичный адрес файла (через CDN). null — файла нет. */
  publicUrl(key: string | null | undefined): string | null {
    if (!key || !this.publicBaseUrl) {
      return null;
    }
    return `${this.publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  async createUpload(
    kind: UploadKind,
    contentType: string,
    size: number,
  ): Promise<PresignedUpload> {
    const client = this.requireClient();
    const rules = uploadRules(kind);

    const extension = rules.contentTypes[contentType];
    if (!extension) {
      throw new BadRequestException({
        message: `Content type ${contentType} is not allowed for ${kind}`,
        details: { allowed: Object.keys(rules.contentTypes) },
      });
    }
    if (size > rules.maxBytes) {
      throw new BadRequestException({
        message: `File is too large for ${kind}`,
        details: { maxBytes: rules.maxBytes },
      });
    }

    const now = new Date();
    const month = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const key = `${rules.prefix}/${month}/${randomUUID()}.${extension}`;

    const { url, fields } = await createPresignedPost(client, {
      Bucket: this.buckets[rules.visibility],
      Key: key,
      Conditions: [
        // Хранилище не примет файл больше заявленного размера
        ['content-length-range', 1, size],
        ['eq', '$Content-Type', contentType],
      ],
      Fields: { 'Content-Type': contentType },
      Expires: UPLOAD_URL_TTL_SECONDS,
    });

    return {
      url,
      fields,
      key,
      maxBytes: size,
      expiresAt: new Date(now.getTime() + UPLOAD_URL_TTL_SECONDS * 1000).toISOString(),
    };
  }

  /**
   * Проверяет, что файл с этим ключом загружен через createUpload для нужного вида
   * и подходит по типу и размеру. Вызывается перед сохранением ключа в товаре.
   */
  async assertUploaded(key: string, kind: UploadKind): Promise<void> {
    const client = this.requireClient();
    const rules = uploadRules(kind);

    if (!key.startsWith(`${rules.prefix}/`) || key.includes('..')) {
      throw new BadRequestException(`File ${key} was not uploaded as ${kind}`);
    }

    try {
      const head = await client.send(
        new HeadObjectCommand({ Bucket: this.buckets[rules.visibility], Key: key }),
      );
      const typeAllowed = head.ContentType !== undefined && head.ContentType in rules.contentTypes;
      if (!typeAllowed || (head.ContentLength ?? 0) > rules.maxBytes) {
        throw new BadRequestException(`File ${key} does not match the rules for ${kind}`);
      }
    } catch (error) {
      if (error instanceof NotFound || this.isNotFound(error)) {
        throw new BadRequestException(`File ${key} not found in storage: upload it first`);
      }
      throw error;
    }
  }

  /**
   * Временная подписанная ссылка на файл закрытого бакета (аудио).
   * Ссылка перестаёт работать через expiresInSeconds.
   */
  async createDownloadUrl(
    key: string,
    kind: UploadKind,
    expiresInSeconds: number,
  ): Promise<{ url: string; expiresAt: string }> {
    const client = this.requireClient();
    const rules = uploadRules(kind);
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: this.buckets[rules.visibility], Key: key }),
      { expiresIn: expiresInSeconds },
    );
    return { url, expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString() };
  }

  private requireClient(): S3Client {
    if (!this.client) {
      throw new ServiceUnavailableException('File storage is not configured');
    }
    return this.client;
  }

  private isNotFound(error: unknown): boolean {
    return error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404;
  }

  private async ensureBucket(bucket: string): Promise<void> {
    const client = this.requireClient();
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch (error) {
      if (!(error instanceof NotFound) && !this.isNotFound(error)) {
        throw error;
      }
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      this.logger.log(`Created bucket ${bucket}`);
    }
  }
}
