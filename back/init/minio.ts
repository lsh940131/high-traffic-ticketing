import { readFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * 공연 이미지(포스터·상세)를 MinIO(S3 호환)에 업로드하고 공개 URL을 돌려준다.
 *  - 로컬 파일: init/assets/<assetKey>_poster.*, <assetKey>_detail*.*
 *  - MinIO 키:  <slug>/poster.<ext>, <slug>/detail-<n>.<ext>
 *  - posters 버킷은 public read라 URL을 그대로 posterUrl/detailImages에 저장.
 * 엔드포인트/키만 바꾸면 그대로 AWS S3에도 동작(같은 SDK).
 */

const ENDPOINT = process.env.MINIO_ENDPOINT ?? 'http://localhost:9000';
const BUCKET = process.env.MINIO_BUCKET ?? 'posters';
const ACCESS = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
const SECRET = process.env.MINIO_SECRET_KEY ?? 'minioadmin';

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: 'us-east-1', // MinIO는 무시하지만 SDK가 요구
  credentials: { accessKeyId: ACCESS, secretAccessKey: SECRET },
  forcePathStyle: true, // MinIO는 path-style(host/bucket/key) 필요
});

const CONTENT_TYPE: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

async function putObject(key: string, dir: string, file: string): Promise<string> {
  const ext = extname(file).toLowerCase();
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: readFileSync(join(dir, file)),
      ContentType: CONTENT_TYPE[ext] ?? 'application/octet-stream',
    }),
  );
  return `${ENDPOINT}/${BUCKET}/${key}`;
}

/** 한 공연의 poster + detail(들)을 업로드. 파일명은 NFC 정규화로 매칭(한글 대응). */
export async function uploadConcertImages(
  assetsDir: string,
  slug: string,
  assetKey: string,
): Promise<{ posterUrl: string; detailImages: string[] }> {
  const key = assetKey.normalize('NFC');
  const files = readdirSync(assetsDir).map((f) => f.normalize('NFC'));

  const poster = files.find((f) => f.startsWith(`${key}_poster.`));
  if (!poster) throw new Error(`poster 파일 없음: ${assetKey}_poster.* (assets/)`);
  const details = files.filter((f) => f.startsWith(`${key}_detail`)).sort();

  const posterUrl = await putObject(
    `${slug}/poster${extname(poster).toLowerCase()}`,
    assetsDir,
    poster,
  );

  const detailImages: string[] = [];
  for (let i = 0; i < details.length; i++) {
    const ext = extname(details[i]).toLowerCase();
    detailImages.push(await putObject(`${slug}/detail-${i + 1}${ext}`, assetsDir, details[i]));
  }
  return { posterUrl, detailImages };
}
