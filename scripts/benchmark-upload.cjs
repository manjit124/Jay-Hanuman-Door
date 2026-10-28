const http = require('http');
const fs = require('fs');

function measureUpload() {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const sampleBuffer = Buffer.alloc(500 * 1024, 0xff); // 500KB dummy image buffer
    const boundary = '--------------------------' + Date.now().toString(16);

    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="bench_test_image.jpg"\r\n`;
    body += `Content-Type: image/jpeg\r\n\r\n`;
    const headerBuf = Buffer.from(body, 'utf8');
    const footerBuf = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const fullBody = Buffer.concat([headerBuf, sampleBuffer, footerBuf]);

    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length,
      },
    }, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        const durationMs = Date.now() - start;
        resolve({ status: res.statusCode, durationMs, body: responseData });
      });
    });

    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

async function runBenchmark() {
  console.log('⏱️ Running Upload & Save Benchmark...');
  try {
    const result = await measureUpload();
    console.log(`HTTP Status: ${result.status}`);
    console.log(`Upload & Save Duration: ${result.durationMs}ms`);
    console.log(`Response: ${result.body}`);
  } catch (err) {
    console.error('Benchmark error:', err.message);
  }
}

runBenchmark();
