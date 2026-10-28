const http = require('http');

async function runImageDeleteVerification() {
  console.log('⏱️ Starting Image Removal & Persistence Verification...');

  const token = 'admin-dev-token';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const testImage1 = '/uploads/test-img-1-1793115000000.jpg';
  const testImage2 = '/uploads/test-img-2-1793115000000.jpg';
  const testImage3 = '/uploads/test-img-3-1793115000000.jpg';

  // 1. Create a test door with 3 images
  const createPayload = JSON.stringify({
    name: 'Test Image Removal Door',
    category: 'Sagwan Door',
    startingPrice: 15500,
    images: [testImage1, testImage2, testImage3],
    image: testImage1,
  });

  const createRes = await makeRequest('/api/admin/doors', 'POST', headers, createPayload);
  if (createRes.status !== 201 && createRes.status !== 200) {
    throw new Error(`Failed to create test door: HTTP ${createRes.status} ${createRes.body}`);
  }

  const createdDoor = JSON.parse(createRes.body);
  const doorId = createdDoor.id;
  console.log(`✅ Stage 1: Created test door ${doorId} with 3 images:`, createdDoor.images);

  // 2. Simulate removing the 2nd image (testImage2) in the edit form
  const remainingImages = createdDoor.images.filter(img => img !== testImage2);
  const updatePayload = JSON.stringify({
    ...createdDoor,
    images: remainingImages,
    image: remainingImages[0],
  });

  console.log(`🔄 Stage 2: Updating door ${doorId} after removing ${testImage2}...`);
  const updateRes = await makeRequest(`/api/admin/doors/${doorId}`, 'PUT', headers, updatePayload);
  if (updateRes.status !== 200) {
    throw new Error(`Failed to update door: HTTP ${updateRes.status} ${updateRes.body}`);
  }

  const updatedDoor = JSON.parse(updateRes.body);
  console.log(`✅ Stage 2: Updated door saved successfully. Remaining images count: ${updatedDoor.images?.length}`);

  // 3. Verify persistence via public GET /api/catalog
  const catalogRes = await makeRequest('/api/catalog', 'GET', {});
  const catalogData = JSON.parse(catalogRes.body);
  const savedInCatalog = (catalogData.doors || []).find(d => d.id === doorId);

  if (!savedInCatalog) {
    throw new Error(`Door ${doorId} not found in public catalog after update!`);
  }

  const catalogImages = savedInCatalog.images || [];
  if (catalogImages.includes(testImage2)) {
    throw new Error(`FAILED: Removed image ${testImage2} still exists in persisted catalog record!`);
  }

  if (!catalogImages.includes(testImage1) || !catalogImages.includes(testImage3)) {
    throw new Error(`FAILED: Intact images were mistakenly lost during update!`);
  }

  console.log('✅ Stage 3: Catalog persistence verified! Removed image is gone, remaining images preserved intact.');

  // 4. Cleanup test door
  await makeRequest(`/api/admin/doors/${doorId}`, 'DELETE', headers);
  console.log(`✅ Cleanup: Deleted temporary test door ${doorId}.`);

  console.log('================ SUMMARY ================');
  console.log('1. Image removal from list: PASSED');
  console.log('2. Intact images preservation: PASSED');
  console.log('3. Database & catalog persistence: PASSED');
  console.log('========================================');
}

function makeRequest(path, method, headers, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3000,
        path,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { resolve({ status: res.statusCode, body: data }); });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

runImageDeleteVerification().catch((err) => {
  console.error('❌ Verification Error:', err.message);
  process.exit(1);
});
