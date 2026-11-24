const net = require('net');
const fs = require('fs');

const GZ_PATH = 'd:/Elektro/scratch/rtsp_pack.tar.gz';
const CAM_IP = 'process.env.CAMERA_IP || "192.168.1.100"';
const EXPECTED_MD5 = '88436d5df6247586f4fda05f706127e4';

const data = fs.readFileSync(GZ_PATH);
const b64 = data.toString('base64');
console.log(`File: ${data.length} bytes, base64: ${b64.length} chars`);

const CHUNK_SIZE = 2000;
const chunks = [];
for (let i = 0; i < b64.length; i += CHUNK_SIZE) {
  chunks.push(b64.substring(i, i + CHUNK_SIZE));
}
console.log(`Total chunks: ${chunks.length}`);

const client = new net.Socket();
let chunkIdx = 0;
let loggedIn = false;

client.connect(23, CAM_IP, () => {
  console.log('✓ Telnet connected!');
});

client.on('data', (d) => {
  const s = d.toString();
  if (!loggedIn && s.includes('login:')) {
    client.write('root\n');
  } else if (!loggedIn && s.includes('[root@vi')) {
    loggedIn = true;
    console.log('✓ Login OK. Preparing /mnt/sdcard/rtsp.b64...');
    client.write('rm -f /mnt/sdcard/rtsp.b64 /mnt/sdcard/rtsp_pack.tar.gz\n');
    setTimeout(sendNextChunk, 500);
  } else if (s.includes('CHUNK_ACK')) {
    sendNextChunk();
  } else if (s.includes('MD5_OUT:')) {
    console.log('\n[Kamera]:', s.trim());
    if (s.toLowerCase().includes(EXPECTED_MD5)) {
      console.log('✓✓✓ MD5 MATCH! File 100% identik sempurna!');
    }
  } else if (s.includes('EXTRACT_DONE')) {
    console.log('\n[Kamera]:', s.trim());
    client.write('ls -la /mnt/sdcard/rtsp /mnt/sdcard/lib\n');
    setTimeout(() => {
      client.end();
      process.exit(0);
    }, 2000);
  } else if (loggedIn && chunkIdx >= chunks.length) {
    process.stdout.write(s);
  }
});

function sendNextChunk() {
  if (chunkIdx < chunks.length) {
    const chunk = chunks[chunkIdx];
    chunkIdx++;
    const pct = Math.min(100, Math.round((chunkIdx / chunks.length) * 100));
    process.stdout.write(`\rProgress: ${pct}% (${chunkIdx}/${chunks.length})`);
    // Kirim chunk dan echo CHUNK_ACK
    client.write(`echo -n "${chunk}" >> /mnt/sdcard/rtsp.b64; echo "CHUNK_ACK"\n`);
  } else {
    console.log('\nSemua chunk terkirim! Mendekode dan memverifikasi...');
    client.write('base64 -d /mnt/sdcard/rtsp.b64 > /mnt/sdcard/rtsp_pack.tar.gz && rm -f /mnt/sdcard/rtsp.b64\n');
    client.write('echo "MD5_OUT:" `md5sum /mnt/sdcard/rtsp_pack.tar.gz`\n');
    client.write('cd /mnt/sdcard && tar -xzf rtsp_pack.tar.gz && chmod +x /mnt/sdcard/rtsp\n');
    client.write('echo "EXTRACT_DONE"\n');
  }
}

client.on('error', e => console.error('Error:', e.message));
