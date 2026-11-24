const http = require('http');
const fs = require('fs');
const net = require('net');

const TAR_PATH = 'd:/Elektro/scratch/rtsp_pack.tar';
const PORT = 8088;
const PC_IP = '192.168.11.24';
const CAM_IP = 'process.env.CAMERA_IP || "192.168.1.100"';

// 1. Start HTTP Server to serve the tar package
const server = http.createServer((req, res) => {
  console.log(`[HTTP Server] Camera requested: ${req.url}`);
  if (req.url === '/rtsp_pack.tar') {
    const stat = fs.statSync(TAR_PATH);
    res.writeHead(200, {
      'Content-Type': 'application/x-tar',
      'Content-Length': stat.size
    });
    fs.createReadStream(TAR_PATH).pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[HTTP Server] Listening on http://0.0.0.0:${PORT} ...`);
  
  // 2. Connect to camera via Telnet
  console.log(`[Telnet] Connecting to ${CAM_IP}:23 ...`);
  const client = new net.Socket();
  client.setTimeout(20000);

  client.connect(23, CAM_IP, () => {
    console.log(`[Telnet] Connected to camera! Sending root login...`);
    setTimeout(() => client.write('root\n'), 400);

    // Mount SD card and download package
    setTimeout(() => {
      console.log(`[Telnet] Downloading rtsp_pack.tar to camera SD card...`);
      const cmds = [
        'mkdir -p /mnt/sdcard',
        'mount -t vfat /dev/mmcblk0 /mnt/sdcard 2>/dev/null',
        `wget -O /mnt/sdcard/rtsp_pack.tar http://${PC_IP}:${PORT}/rtsp_pack.tar`,
        'cd /mnt/sdcard && tar -xf rtsp_pack.tar',
        'chmod +x /mnt/sdcard/rtsp',
        'ls -la /mnt/sdcard/rtsp /mnt/sdcard/lib',
        'echo "DOWNLOAD_AND_EXTRACT_DONE"'
      ].join(' && ');

      client.write(cmds + '\n');
    }, 1500);
  });

  client.on('data', (d) => {
    const text = d.toString();
    process.stdout.write(text);
    if (text.includes('DOWNLOAD_AND_EXTRACT_DONE')) {
      console.log('\n✓ Berhasil mengunduh dan mengekstrak RTSP package ke MicroSD kamera!');
      setTimeout(() => {
        client.end();
        server.close();
      }, 1000);
    }
  });

  client.on('error', (err) => {
    console.error('[Telnet Error]:', err.message);
    server.close();
  });
});
