#!/usr/bin/env node
/**
 * Regenerates attendee QR PNGs so they encode
 * https://autopacksummit.com/app/c/<registrantId>
 *
 * Usage:
 *   node scripts/regenerate-attendee-qrs.mjs --dry-run
 *   node scripts/regenerate-attendee-qrs.mjs
 */
import { createRequire } from 'module';
import awsExportsModule from '../src/aws-exports.js';

const lambdaRequire = createRequire(new URL('../amplify/backend/function/adminRegistrantOps/src/index.js', import.meta.url));
const QRCode = lambdaRequire('qrcode');
const { S3Client, PutObjectCommand } = lambdaRequire('@aws-sdk/client-s3');
const awsExports = awsExportsModule.default || awsExportsModule;

const APS_ID = 'd00b35f5-c45b-42eb-b306-fa3dfeee0251';
const WEB_BASE = 'https://autopacksummit.com/app/c';
const BUCKET = String(awsExports.aws_user_files_s3_bucket || '');
const REGION = String(awsExports.aws_user_files_s3_bucket_region || 'us-east-1');
const ENDPOINT = String(awsExports.aws_appsync_graphqlEndpoint || '');
const API_KEY = String(awsExports.aws_appsync_apiKey || '');
const CONCURRENCY = 8;
const dryRun = process.argv.includes('--dry-run');
const version = Date.now();

if (!BUCKET || !ENDPOINT || !API_KEY) {
  throw new Error('Missing aws-exports AppSync/S3 config.');
}

const s3 = new S3Client({ region: REGION });

async function graphql(query, variables) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`AppSync HTTP ${res.status}`);
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join(' | '));
  return json.data;
}

async function listRegistrantIds() {
  const ids = [];
  let nextToken = null;
  do {
    const variables = { apsID: APS_ID, limit: 200 };
    if (nextToken) variables.nextToken = nextToken;
    const data = await graphql(
      /* GraphQL */ `
        query ListRegistrantIds($apsID: ID!, $limit: Int, $nextToken: String) {
          apsRegistrantsByApsID(apsID: $apsID, limit: $limit, nextToken: $nextToken) {
            items {
              id
            }
            nextToken
          }
        }
      `,
      variables,
    );
    const page = data?.apsRegistrantsByApsID;
    for (const item of page?.items || []) {
      if (item?.id) ids.push(String(item.id));
    }
    nextToken = page?.nextToken || null;
  } while (nextToken);
  return ids;
}

function publicUrl(registrantId) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/qrcodes/${registrantId}.png?v=${version}`;
}

async function regenerateOne(registrantId) {
  const payload = `${WEB_BASE}/${encodeURIComponent(registrantId)}`;
  const png = await QRCode.toBuffer(payload, {
    type: 'png',
    width: 640,
    errorCorrectionLevel: 'M',
    margin: 1,
  });
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `qrcodes/${registrantId}.png`,
      Body: png,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=300',
    }),
  );
  await graphql(
    /* GraphQL */ `
      mutation UpdateRegistrantQr($input: UpdateApsRegistrantInput!) {
        updateApsRegistrant(input: $input) {
          id
        }
      }
    `,
    { input: { id: registrantId, qrCode: publicUrl(registrantId) } },
  );
}

async function runPool(ids, worker) {
  let index = 0;
  let updated = 0;
  let failed = 0;
  const errors = [];
  async function next() {
    while (index < ids.length) {
      const current = ids[index];
      index += 1;
      try {
        await worker(current);
        updated += 1;
      } catch (error) {
        failed += 1;
        if (errors.length < 15) errors.push(`${current}: ${error?.message || error}`);
      }
      if ((updated + failed) % 25 === 0 || updated + failed === ids.length) {
        console.log(`Progress ${updated + failed}/${ids.length} (updated ${updated}, failed ${failed})`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, () => next()));
  return { updated, failed, errors };
}

const ids = await listRegistrantIds();
console.log(`Found ${ids.length} registrants for event ${APS_ID}`);
if (dryRun) {
  console.log(`Dry run. First payload would be: ${WEB_BASE}/${ids[0] || ''}`);
  process.exit(0);
}

const result = await runPool(ids, regenerateOne);
console.log(`Done. updated=${result.updated} failed=${result.failed}`);
if (result.errors.length) {
  console.log('Sample errors:');
  for (const error of result.errors) console.log(`  ${error}`);
}
if (result.failed) process.exit(1);
