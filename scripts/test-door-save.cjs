const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const durationMs = Date.now() - start;
        resolve({ status: res.statusCode, headers: res.headers, body: data, durationMs });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function testDoorSave() {
  console.log('⏱️ Starting Door Save Latency Benchmark & Verification...\n');
  const totalStart = Date.now();

  const testDoorPayload = JSON.stringify({
    name: 'Benchmark Royal Carved Sagwan Door ' + Date.now(),
    category: 'Main Door',
    description: 'Timing benchmark for door save performance verification',
    material: 'Sagwan',
    startingPrice: 18500,
    images: ['/uploads/door_door-1793093404528_1793110376932_2556.jpg'],
    availableSizes: ['30 × 78 inch', '32 × 78 inch', '36 × 78 inch'],
    featured: true,
    popular: true,
    active: true,
  });

  // 1. Test POST /api/admin/doors
  console.log('Stage 1: Testing POST /api/admin/doors (Door Creation)...');
  const createRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/admin/doors',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer admin-dev-token',
      'Content-Length': Buffer.byteLength(testDoorPayload),
    },
  }, testDoorPayload);

  console.log(`  POST HTTP Status: ${createRes.status}`);
  console.log(`  POST Response Duration: ${createRes.durationMs}ms`);

  let createdDoorId = null;
  try {
    const parsed = JSON.parse(createRes.body);
    if (parsed.success && parsed.id) {
      createdDoorId = parsed.id;
      console.log(`  ✅ Door Created Successfully! ID: ${createdDoorId}`);
    } else {
      console.error('  ❌ Door creation failed in response:', parsed);
      process.exit(1);
    }
  } catch (err) {
    console.error('  ❌ Failed to parse create response:', err.message);
    process.exit(1);
  }

  // 2. Test PUT /api/admin/doors/:id
  console.log(`\nStage 2: Testing PUT /api/admin/doors/${createdDoorId} (Door Update)...`);
  const updatePayload = JSON.stringify({
    name: 'Updated Benchmark Door ' + Date.now(),
    startingPrice: 19999,
    description: 'Updated timing test description verified after persistence refresh',
  });

  const updateRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 3000,
    path: `/api/admin/doors/${createdDoorId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer admin-dev-token',
      'Content-Length': Buffer.byteLength(updatePayload),
    },
  }, updatePayload);

  console.log(`  PUT HTTP Status: ${updateRes.status}`);
  console.log(`  PUT Response Duration: ${updateRes.durationMs}ms`);

  // 3. Test GET /api/catalog to verify persistence
  console.log('\nStage 3: Verifying persistence in GET /api/catalog...');
  const catalogRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/catalog',
    method: 'GET',
  });

  let verified = false;
  try {
    const catalogData = JSON.parse(catalogRes.body);
    const foundDoor = (catalogData.doors || []).find(d => d.id === createdDoorId);
    if (foundDoor && foundDoor.startingPrice === 19999) {
      verified = true;
      console.log(`  ✅ Persistence Verified! Door ${createdDoorId} found in public catalog with updated startingPrice ₹19,999 (Catalog fetch: ${catalogRes.durationMs}ms)`);
    } else {
      console.error('  ❌ Door not found in catalog or price not updated!');
    }
  } catch (err) {
    console.error('  ❌ Failed to parse catalog:', err.message);
  }

  const totalDurationMs = Date.now() - totalStart;
  console.log('\n================ SAVE BENCHMARK SUMMARY ================');
  console.log(`1. POST /api/admin/doors (Create): ${createRes.durationMs}ms`);
  console.log(`2. PUT /api/admin/doors/${createdDoorId} (Update): ${updateRes.durationMs}ms`);
  console.log(`3. GET /api/catalog (Persistence Read): ${catalogRes.durationMs}ms`);
  console.log(`4. Total Full Save & Verification Cycle: ${totalDurationMs}ms`);
  console.log(`5. Verification Status: ${verified ? 'PASSED' : 'FAILED'}`);
  console.log('========================================================\n');

  if (verified) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testDoorSave().catch(err => {
  console.error('Benchmark runner error:', err);
  process.exit(1);
});
