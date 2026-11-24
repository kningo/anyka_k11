const net = require('net');
const fs = require('fs');

const GZ_PATH = 'd:/Elektro/scratch/extra_libs.tar.gz';
const CAM_IP = 'process.env.CAMERA_IP || "192.168.1.100"';

const data = fs.readFileSync(GZ_PATH);
const b64 = data.toString('base64');
console.log(`Mengunggah extra_libs.tar.gz (${data.length} bytes / ${b64.length} karakter b64)...`);

const client = new net.Socket();
client.setTimeout(90000);

let stage = 'init';

client.connect(23, CAM_IP, () => {
  console.log('✓ Telnet connected!');
});

client.on('data', (d) => {
  const s = d.toString();

  if (stage === 'init' && s.includes('login:')) {
    stage = 'login';
    client.write('root\n');
  } else if (stage === 'login' && s.includes('[root@vi')) {
    stage = 'transferring';
    console.log('✓ Login sukses. Menyiapkan base64 -d di kamera...');
    client.write('rm -f /mnt/sdcard/extra_libs.tar.gz\n');
    setTimeout(() => {
      client.write('base64 -d > /mnt/sdcard/extra_libs.tar.gz\n');
      setTimeout(startStreaming, 1000);
    }, 1000);
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
      setTimeout(sendNext, 20);
    } else {
      console.log('\nSemua byte terkirim! Menunggu 3 detik...');
      setTimeout(() => {
        client.write('\n');
        setTimeout(() => {
          client.write('\x04');
          setTimeout(() => {
            console.log('Mengekstrak extra_libs ke /mnt/sdcard/lib ...');
            client.write('cd /mnt/sdcard/lib && tar -xzf /mnt/sdcard/extra_libs.tar.gz && rm -f /mnt/sdcard/extra_libs.tar.gz\n');
            client.write('ls -la /mnt/sdcard/lib\n');
            client.write('export LD_LIBRARY_PATH=/mnt/sdcard/lib:/opt/vicam:/lib:/usr/lib\n');
            client.write('/mnt/sdcard/rtsp -h\n');
            client.write('echo "EXTRACT_COMPLETED"\n');
          }, 2000);
        }, 1000);
      }, 3000);
    }
  }

  sendNext();
}

client.on('error', e => console.error('Error:', e.message));
