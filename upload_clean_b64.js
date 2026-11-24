const net = require('net');
const fs = require('fs');

const GZ_PATH = 'd:/Elektro/scratch/rtsp_pack.tar.gz';
const CAM_IP = 'process.env.CAMERA_IP || "192.168.1.100"';
const EXPECTED_MD5 = '88436d5df6247586f4fda05f706127e4';

const data = fs.readFileSync(GZ_PATH);
const b64 = data.toString('base64');
console.log(`Menyiapkan upload ${data.length} bytes (${b64.length} karakter b64)...`);

// Format base64 ke baris-baris 76 karakter
const lines = [];
for (let i = 0; i < b64.length; i += 76) {
  lines.push(b64.substring(i, i + 76));
}
console.log(`Total baris: ${lines.length}`);

const client = new net.Socket();
client.setTimeout(60000);

let stage = 'login';
let lineIdx = 0;

client.connect(23, CAM_IP, () => {
  console.log('✓ Terhubung ke Telnet kamera!');
});

client.on('data', (d) => {
  const s = d.toString();
  // console.log('[Kamera]:', s.trim());

  if (s.includes('login:') && stage === 'login') {
    stage = 'shell';
    client.write('root\n');
  } else if (s.includes('[root@vi') && stage === 'shell') {
    stage = 'uploading';
    console.log('✓ Login sukses. Mulai menulis base64 ke /mnt/sdcard/rtsp.b64...');
    client.write('rm -f /mnt/sdcard/rtsp.b64 /mnt/sdcard/rtsp_pack.tar.gz\n');
    client.write('cat << \'EOF_K11\' > /mnt/sdcard/rtsp.b64\n');
    
    sendChunk();
  } else if (s.includes('MD5_RESULT:')) {
    console.log('\n' + s.trim());
    if (s.toLowerCase().includes(EXPECTED_MD5)) {
      console.log('✓ MD5 COCOK 100%! Data di kamera identik sempurna!');
    }
  } else if (s.includes('EXTRACT_FINISHED')) {
    console.log('\n' + s.trim());
    console.log('✓ Selesai!');
    setTimeout(() => {
      client.end();
      process.exit(0);
    }, 1000);
  }
});

function sendChunk() {
  const BATCH_SIZE = 100; // kirim 100 baris per batch
  let canWrite = true;
  while (lineIdx < lines.length && canWrite) {
    const chunk = lines.slice(lineIdx, lineIdx + BATCH_SIZE).join('\n') + '\n';
    lineIdx += BATCH_SIZE;
    canWrite = client.write(chunk);
    const pct = Math.min(100, Math.round((lineIdx / lines.length) * 100));
    process.stdout.write(`\rProgress upload: ${pct}% (${lineIdx}/${lines.length} baris)`);
  }

  if (lineIdx < lines.length) {
    client.once('drain', () => {
      setTimeout(sendChunk, 10);
    });
  } else {
    console.log('\nSeluruh baris terkirim! Mengirim EOF_K11...');
    client.write('EOF_K11\n');
    setTimeout(() => {
      console.log('Mendekode base64 di kamera...');
      client.write('base64 -d /mnt/sdcard/rtsp.b64 > /mnt/sdcard/rtsp_pack.tar.gz && rm -f /mnt/sdcard/rtsp.b64\n');
      client.write('echo "MD5_RESULT:" `md5sum /mnt/sdcard/rtsp_pack.tar.gz`\n');
      client.write('cd /mnt/sdcard && tar -xzf rtsp_pack.tar.gz && chmod +x /mnt/sdcard/rtsp\n');
      client.write('ls -la /mnt/sdcard/rtsp /mnt/sdcard/lib\n');
      client.write('echo "EXTRACT_FINISHED"\n');
    }, 1500);
  }
}

client.on('error', (e) => console.error('Error:', e.message));
