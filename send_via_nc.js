const net = require('net');
const fs = require('fs');

const CAMERA_IP = 'process.env.CAMERA_IP || "192.168.1.100"';
const NC_PORT = 9999;
const FILE_PATH = 'd:/Elektro/scratch/rtsp_pack.tar.gz';
const fileData = fs.readFileSync(FILE_PATH);
console.log(`Ukuran file asli PC: ${fileData.length} bytes`);

// 1. Lewat Telnet, perintahkan kamera mendengarkan di port 9999
const telnet = new net.Socket();
telnet.connect(23, CAMERA_IP, () => {
  console.log('✓ Telnet terhubung, menyiapkan netcat listener di kamera...');
  setTimeout(() => telnet.write('root\n'), 800);
  setTimeout(() => {
    telnet.write(`rm -f /mnt/sdcard/rtsp_pack.tar.gz\n`);
    telnet.write(`nc -l -p ${NC_PORT} > /mnt/sdcard/rtsp_pack.tar.gz &\n`);
  }, 1800);

  // 2. Hubungkan socket pengirim dari PC ke kamera:9999
  setTimeout(() => {
    console.log(`Mengirim file ke ${CAMERA_IP}:${NC_PORT} via raw TCP...`);
    const sender = new net.Socket();
    sender.connect(NC_PORT, CAMERA_IP, () => {
      console.log('✓ Socket raw TCP tersambung, streaming bytes...');
      sender.write(fileData, () => {
        console.log('✓ Seluruh byte terkirim! Menutup socket...');
        sender.end();
      });
    });

    sender.on('close', () => {
      console.log('✓ Transfer selesai!');
      // 3. Verifikasi ukuran di kamera dan ekstrak
      setTimeout(() => {
        telnet.write('ls -la /mnt/sdcard/rtsp_pack.tar.gz\n');
        telnet.write('cd /mnt/sdcard && tar -xzvf rtsp_pack.tar.gz\n');
        telnet.write('ls -la /mnt/sdcard\n');
        telnet.write('ls -la /mnt/sdcard/lib\n');
      }, 2000);

      setTimeout(() => {
        telnet.end();
        process.exit(0);
      }, 6000);
    });

    sender.on('error', (e) => {
      console.error('Sender error:', e.message);
    });
  }, 3000);
});

telnet.on('data', (d) => {
  process.stdout.write(d.toString());
});

telnet.on('error', (e) => console.error('Telnet error:', e.message));
