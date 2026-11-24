const net = require('net');
const fs = require('fs');

const GZ_PATH = 'd:/Elektro/scratch/rtsp_pack.tar.gz';
const CAM_IP = 'process.env.CAMERA_IP || "192.168.1.100"';

const data = fs.readFileSync(GZ_PATH);
const b64 = data.toString('base64');
console.log(`Mengunggah rtsp_pack.tar.gz (${data.length} bytes / ${b64.length} base64 chars) ke kamera...`);

const client = new net.Socket();
client.setTimeout(30000);

client.connect(23, CAM_IP, () => {
  console.log('✓ Terhubung ke Telnet kamera!');
  setTimeout(() => client.write('root\n'), 400);

  setTimeout(() => {
    client.write('mkdir -p /mnt/sdcard && mount -t vfat /dev/mmcblk0 /mnt/sdcard 2>/dev/null\n');
    setTimeout(() => {
      console.log('Memulai streaming base64 ke /mnt/sdcard/rtsp_pack.tar.gz ...');
      client.write('base64 -d > /mnt/sdcard/rtsp_pack.tar.gz\n');

      // Send base64 in 4KB chunks with brief pauses
      const CHUNK_SIZE = 4096;
      let offset = 0;
      function sendNext() {
        if (offset < b64.length) {
          const chunk = b64.substring(offset, offset + CHUNK_SIZE);
          client.write(chunk + '\n');
          offset += CHUNK_SIZE;
          const pct = Math.min(100, Math.round((offset / b64.length) * 100));
          process.stdout.write(`\rProgress: ${pct}%`);
          setTimeout(sendNext, 20);
        } else {
          console.log('\nSelesai mengirim data, mengirim EOF (Ctrl+D)...');
          client.write('\n\x04');
          setTimeout(() => {
            console.log('Mengekstrak package di /mnt/sdcard ...');
            client.write('cd /mnt/sdcard && tar -xzf rtsp_pack.tar.gz && chmod +x /mnt/sdcard/rtsp && ls -la /mnt/sdcard/rtsp /mnt/sdcard/lib && echo "TRANSFER_COMPLETED_SUCCESSFULLY"\n');
          }, 1500);
        }
      }
      setTimeout(sendNext, 500);
    }, 1000);
  }, 1000);
});

client.on('data', (d) => {
  const s = d.toString();
  if (s.includes('TRANSFER_COMPLETED_SUCCESSFULLY') || s.includes('/mnt/sdcard/')) {
    console.log(s.trim());
  }
  if (s.includes('TRANSFER_COMPLETED_SUCCESSFULLY')) {
    console.log('\n✓ SUKSES! RTSP server dan libraries telah terpasang di kamera!');
    setTimeout(() => client.end(), 1000);
  }
});

client.on('error', (e) => console.error('Telnet Error:', e.message));
client.on('timeout', () => { console.error('Timeout!'); client.destroy(); });
