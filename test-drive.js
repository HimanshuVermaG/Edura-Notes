const https = require('https');

async function testDownload(id) {
  const url = `https://drive.google.com/uc?export=download&id=${id}`;
  
  const response = await fetch(url);
  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));
  
  if (text.includes('virus-scan')) {
    console.log('Found virus scan page');
  } else {
    console.log('Got content directly');
  }
}

// User's note might be this one or similar
testDownload('1h_8P9qXy... (placeholder)');
