const http = require('http');

const BASE_URL = 'http://127.0.0.1:3000';

function requestJson(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      Accept: 'application/json',
    };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-admin-token'] = token;
    }

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch {}
          resolve({ status: res.statusCode, headers: res.headers, body: json, raw });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function requestBuffer(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.get(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
      },
      res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            buffer: Buffer.concat(chunks),
          });
        });
      }
    );
    req.on('error', reject);
  });
}

async function main() {
  console.log('=== 1. Preparing Admin Auth Token ===');
  const token = 'admin-dev-token';
  console.log('Admin token ready.');

  console.log('\n=== 2. Testing SSRF Protection ===');
  const ssrfRes = await requestJson(
    'POST',
    '/api/admin/drive-image/preview',
    { url: 'http://127.0.0.1:3000/api/catalog' },
    token
  );
  console.log(
    'SSRF Localhost Test Status:',
    ssrfRes.status,
    '| Code:',
    ssrfRes.body?.errorCode,
    '| Error:',
    ssrfRes.body?.error
  );
  if (ssrfRes.status === 200 || ssrfRes.body?.errorCode !== 'SSRF_BLOCKED') {
    throw new Error('SSRF check failed: localhost URL was not blocked with SSRF_BLOCKED!');
  }

  console.log('\n=== 3. Testing Restricted / Inaccessible Google Drive Link ===');
  const restrictedDriveUrl =
    'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J_nonexistent_test_id/view?usp=sharing';
  const restrictedRes = await requestJson(
    'POST',
    '/api/admin/drive-image/preview',
    { url: restrictedDriveUrl },
    token
  );
  console.log(
    'Restricted Drive Link Status:',
    restrictedRes.status,
    '| Code:',
    restrictedRes.body?.errorCode,
    '| FileId:',
    restrictedRes.body?.fileId,
    '| Message:',
    restrictedRes.body?.error
  );
  if (restrictedRes.status === 200 || !restrictedRes.body?.errorCode) {
    throw new Error('Restricted/non-existent Drive link should return structured errorCode!');
  }

  console.log('\n=== 4. Testing Preview Image (POST & GET Fallback) with Valid Remote Image ===');
  const sampleImageUrl =
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80';
  const previewRes = await requestJson(
    'POST',
    '/api/admin/drive-image/preview',
    { url: sampleImageUrl },
    token
  );
  if (previewRes.status !== 200 || !previewRes.body?.success) {
    throw new Error(`Preview POST failed: ${previewRes.status} ${previewRes.raw}`);
  }
  console.log(
    `Preview POST OK: ${previewRes.body.width}x${previewRes.body.height}px | MIME: ${previewRes.body.mimeType} | Size: ${previewRes.body.size} bytes`
  );

  const previewGetRes = await requestJson(
    'GET',
    `/api/admin/drive-image/preview?url=${encodeURIComponent(sampleImageUrl)}&token=${encodeURIComponent(token)}`,
    null,
    null
  );
  if (previewGetRes.status !== 200 || !previewGetRes.body?.success) {
    throw new Error(`Preview GET fallback failed: ${previewGetRes.status} ${previewGetRes.raw}`);
  }
  console.log(
    `Preview GET Fallback OK: ${previewGetRes.body.width}x${previewGetRes.body.height}px | MIME: ${previewGetRes.body.mimeType}`
  );

  console.log('\n=== 5. Testing Import to Storage / Cloudflare R2 ===');
  const importRes = await requestJson(
    'POST',
    '/api/admin/drive-image/import',
    { url: sampleImageUrl },
    token
  );
  if (importRes.status !== 200 || !importRes.body?.success) {
    throw new Error(`Import failed: ${importRes.status} ${importRes.raw}`);
  }
  const importedUrl = importRes.body.url;
  console.log(
    `Import OK: URL=${importedUrl} | Storage=${importRes.body.storageType} | R2Key=${importRes.body.r2Key} | Dimensions=${importRes.body.width}x${importRes.body.height}`
  );
  if (!importedUrl || !importedUrl.startsWith('/uploads/')) {
    throw new Error(`Expected importedUrl starting with '/uploads/', got '${importedUrl}'`);
  }

  console.log('\n=== 6. Verifying Imported Object Served from /uploads/... ===');
  const mediaRes = await requestBuffer(importedUrl);
  if (mediaRes.status !== 200 || mediaRes.buffer.length !== importRes.body.size) {
    throw new Error(
      `Fetched media mismatch: status=${mediaRes.status}, bytes=${mediaRes.buffer.length}, expected=${importRes.body.size}`
    );
  }
  console.log(`Verified media delivery: ${mediaRes.buffer.length} bytes served with status 200.`);

  console.log('\n=== 7. Creating Temporary Test Door Product with Imported R2 Image ===');
  const catalogBefore = await requestJson('GET', '/api/catalog');
  const initialDoorCount = (catalogBefore.body?.doors || []).length;

  const createRes = await requestJson(
    'POST',
    '/api/admin/doors',
    {
      name: 'TEMP_DRIVE_R2_TEST_DOOR',
      category: 'Main Entrance Doors',
      basePrice: 19500,
      priceType: 'Flat Price',
      material: 'Sagwan (Teak Wood)',
      image: importedUrl,
      images: [importedUrl],
      description: 'Temporary test door for verifying Google Drive to R2 image import',
      active: true,
    },
    token
  );
  if ((createRes.status !== 200 && createRes.status !== 201) || !createRes.body?.id) {
    throw new Error(`Failed to create test door: ${createRes.status} ${createRes.raw}`);
  }
  const tempDoorId = createRes.body.id;
  console.log(`Created temp door ID=${tempDoorId} with primary image=${createRes.body.image}`);

  console.log('\n=== 8. Verifying Product Image Mapping in GET /api/catalog ===');
  const catalogAfter = await requestJson('GET', '/api/catalog');
  const createdDoorInCatalog = (catalogAfter.body?.doors || []).find(d => d.id === tempDoorId);
  if (!createdDoorInCatalog) {
    throw new Error(`Created door ${tempDoorId} not found in /api/catalog`);
  }
  if (
    createdDoorInCatalog.image !== importedUrl ||
    !Array.isArray(createdDoorInCatalog.images) ||
    createdDoorInCatalog.images[0] !== importedUrl
  ) {
    throw new Error(
      `Catalog image mismatch: door.image=${createdDoorInCatalog.image}, door.images=${JSON.stringify(createdDoorInCatalog.images)}`
    );
  }
  console.log(
    `Catalog verification PASSED: door.image=${createdDoorInCatalog.image}, door.images[0]=${createdDoorInCatalog.images[0]}`
  );

  console.log('\n=== 9. Cleaning up Temporary Test Door Product ===');
  const delRes = await requestJson('DELETE', `/api/admin/doors/${tempDoorId}`, null, token);
  if (delRes.status !== 200) {
    throw new Error(`Failed to delete temp door ${tempDoorId}: ${delRes.status} ${delRes.raw}`);
  }
  const catalogFinal = await requestJson('GET', '/api/catalog');
  const finalDoorCount = (catalogFinal.body?.doors || []).length;
  console.log(
    `Cleanup complete. Door count before=${initialDoorCount}, after cleanup=${finalDoorCount}`
  );
  if (finalDoorCount !== initialDoorCount) {
    throw new Error(`Door count mismatch after cleanup: ${initialDoorCount} vs ${finalDoorCount}`);
  }

  console.log('\nALL GOOGLE DRIVE & R2 IMAGE IMPORT TESTS PASSED!');
  process.exit(0);
}

main().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
