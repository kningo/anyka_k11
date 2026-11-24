const net = require('net');
const fs = require('fs');

const GZ_PATH = 'd:/Elektro/scratch/rtsp_pack.tar.gz';
const CAM_IP = 'process.env.CAMERA_IP || "192.168.1.100"';
const EXPECTED_MD5 = '88436d5df6247586f4fda05f706127e4';

const data = fs.readFileSync(GZ_PATH);
const b64 = data.toString('base64');
console.log(`Mengunggah ${data.length} bytes (${b64.length} karakter b64)...`);

const client = new net.Socket();
client.setTimeout(60000);

let stage = 'init';

client.connect(23, CAM_IP, () => {
  console.log('✓ Telnet connected!');
});

client.on('data', (d) => {
  const s = d.toString();
  // console.log('DEBUG:', s.trim());

  if (stage === 'init' && s.includes('login:')) {
    stage = 'login';
    client.write('root\n');
  } else if (stage === 'login' && s.includes('[root@vi')) {
    stage = 'transferring';
    console.log('✓ Login sukses. Menyiapkan base64 -d di kamera...');
    client.write('rm -f /mnt/sdcard/rtsp_pack.tar.gz\n');
    setTimeout(() => {
      client.write('base64 -d > /mnt/sdcard/rtsp_pack.tar.gz\n');
      setTimeout(startStreaming, 1000);
    }, 1000);
  } else if (s.includes('MD5_CHECK:')) {
    console.log('\n' + s.trim());
    if (s.toLowerCase().includes(EXPECTED_MD5)) {
      console.log('✓✓✓ BERHASIL 100%! MD5 cocok sempurna!');
    } else {
      console.log('✗ MD5 belum cocok.');
    }
  } else if (s.includes('EXTRACT_COMPLETED')) {
    console.log('\n' + s.trim());
    setTimeout(() => {
      client.end();
      process.exit(0);
    }, 1000);
  }
});

function startStreaming() {
  console.log('Memulai streaming...');
  const CHUNK_SIZE = 512;
  let offset = 0;

  function sendNext() {
    if (offset < b64.length) {
      const chunk = b64.substring(offset, offset + CHUNK_SIZE);
      client.write(chunk + '\n');
      offset += CHUNK_SIZE;
      const pct = Math.min(100, Math.round((offset / b64.length) * 100));
      process.stdout.write(`\rProgress: ${pct}% (${offset}/${b64.length})`);
      setTimeout(sendNext, 25);
    } else {
      console.log('\nSemua byte terkirim! Menunggu 3 detik agar buffer bersih...');
      setTimeout(() => {
        console.log('Mengirim baris baru dan EOF (Ctrl+D)...');
        client.write('\n');
        setTimeout(() => {
          client.write('\x04');
          setTimeout(() => {
            console.log('Memeriksa hasil transfer...');
            client.write('ls -la /mnt/sdcard/rtsp_pack.tar.gz\n');
            client.write('echo "MD5_CHECK:" `md5sum /mnt/sdcard/rtsp_pack.tar.gz`\n');
            client.write('cd /mnt/sdcard && tar -xzf rtsp_pack.tar.gz && chmod +x /mnt/sdcard/rtsp\n');
            client.write('ls -la /mnt/sdcard/rtsp /mnt/sdcard/lib\n');
            client.write('echo "EXTRACT_COMPLETED"\n');
          }, 2000);
        }, 1000);
      }, 3000);
    }
  }

  sendNext();
}

client.on('error', e => console.error('Error:', e.message));
