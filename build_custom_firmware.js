/**
 * BoyKeep K11 - Standalone Firmware Customizer
 * Injects custom Wi-Fi SSID & Password into BoyKeep K11 8MB SPI NOR Flash firmware.
 *
 * Usage:
 *   node build_custom_firmware.js "MyHomeWiFi" "MySecretPassword"
 *   OR
 *   node build_custom_firmware.js (reads wifi.conf automatically)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function makeCrcTable() {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[n] = c >>> 0;
  }
  return table;
}
const crcTable = makeCrcTable();
function jffs2_crc32(buf, start, end) {
  let crc = 0;
  for (let i = start; i < end; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  return crc >>> 0;
}

// 1. Parse Wi-Fi parameters
let ssid = process.argv[2];
let pass = process.argv[3];
let baseFile = process.argv[4];

if (!ssid) {
  const confPath = path.join(__dirname, 'wifi.conf');
  if (fs.existsSync(confPath)) {
    const confContent = fs.readFileSync(confPath, 'utf8');
    const ssidMatch = confContent.match(/SSID=["']?([^"'\r\n]+)["']?/);
    const passMatch = confContent.match(/PASS=["']?([^"'\r\n]+)["']?/);
    if (ssidMatch) ssid = ssidMatch[1];
    if (passMatch) pass = passMatch[1];
  }
}

if (!ssid) {
  console.log('===========================================================');
  console.log('BoyKeep K11 - Custom Wi-Fi Firmware Generator');
  console.log('===========================================================');
  console.log('Cara Penggunaan:');
  console.log('  node build_custom_firmware.js "Nama_WiFi" "Password_WiFi" [base_firmware.bin]');
  console.log('');
  console.log('Atau salin wifi.conf.example menjadi wifi.conf, isi detail Wi-Fi Anda, lalu jalankan:');
  console.log('  node build_custom_firmware.js');
  console.log('===========================================================');
  process.exit(1);
}

pass = pass || '';

// 2. Tentukan Base Firmware
const candidates = [
  baseFile,
  path.join(__dirname, 'k11-firmware-v1.5-standalone-rtsp.bin'),
  path.join(__dirname, 'k11-firmware-v1.4-standalone-rtsp.bin'),
  path.join(__dirname, 'k11-firmware-v1.2-standalone-rtsp.bin'),
  path.join(__dirname, 'k11-dump4.bin'),
  path.join(__dirname, 'k11-dump2.bin')
].filter(Boolean);

let targetBase = candidates.find(f => fs.existsSync(f));

if (!targetBase) {
  console.error('ERROR: Base firmware .bin tidak ditemukan!');
  console.error('Letakkan base firmware (.bin) di folder ini sebelum menjalankan script.');
  process.exit(1);
}

console.log(`Menggunakan Base Firmware: ${path.basename(targetBase)}`);
const buf = Buffer.from(fs.readFileSync(targetBase));

if (buf.length !== 8388608) {
  console.error(`ERROR: Ukuran base firmware (${buf.length}) bukan 8,388,608 bytes (8 MB)!`);
  process.exit(1);
}

// 3. Patch WPA Supplicant Config di JFFS2 Partition (0x710000 - 0x7F0000)
let patchCount = 0;
const wpaPattern = Buffer.from('ctrl_interface=/var/run/wpa_supplicant');
let searchPos = 0x710000;

while (searchPos < 0x7f0000) {
  const matchIdx = buf.indexOf(wpaPattern, searchPos);
  if (matchIdx === -1 || matchIdx >= 0x7f0000) break;

  // Temukan header JFFS2 node sebelum matchIdx
  // Node header JFFS2: magic 0x1985 (2 bytes)
  let headerPos = -1;
  for (let p = matchIdx - 100; p < matchIdx; p += 4) {
    if (buf.readUInt16LE(p) === 0x1985) {
      headerPos = p;
      break;
    }
  }

  if (headerPos !== -1) {
    const dsize = buf.readUInt32LE(headerPos + 52); // data size in jffs2 inode
    const dataStart = headerPos + 68; // standard jffs2 raw inode header size
    
    // Bentuk wpa.conf baru
    const newWpa = `ctrl_interface=/var/run/wpa_supplicant\nnetwork={\n    ssid="${ssid}"\n    scan_ssid=1\n    ${pass ? `psk="${pass}"` : 'key_mgmt=NONE'}\n}\n`;
    if (newWpa.length <= dsize) {
      const padded = newWpa + ' '.repeat(dsize - newWpa.length);
      Buffer.from(padded, 'ascii').copy(buf, dataStart);
      const newCrc = jffs2_crc32(buf, dataStart, dataStart + dsize);
      buf.writeUInt32LE(newCrc, headerPos + 0x3c);
      patchCount++;
    }
  }
  searchPos = matchIdx + 40;
}

// 4. Update U-Boot rcS Chunk 5 jika ada k11_daemon
const rcS5Header = 0x7ea00c;
if (buf.readUInt16LE(rcS5Header) === 0x1985) {
  const rcS5Data = rcS5Header + 68;
  const rcS5Dsize = 1004;
  const chunk5Str = buf.slice(rcS5Data, rcS5Data + rcS5Dsize).toString('ascii');
  if (chunk5Str.includes('k11_daemon') || chunk5Str.includes('wifi_cmd.sh')) {
    const newChunk5Script = 
`        done
    fi
}

mount /dev/mmcblk0p1 /mnt/sdcard 2>/dev/null || mount /dev/mmcblk0 /mnt/sdcard 2>/dev/null
[ -f /mnt/sdcard/run.sh ] && sh /mnt/sdcard/run.sh &

k11_daemon() {
    W=\`cat /etc/wlanname 2>/dev/null\`
    [ -z "$W" ] && W=wlan0
    for i in 1 2 3 4 5; do ifconfig $W up 2>/dev/null && break; sleep 1; done
    ${pass ? `/opt/network/wifi_cmd.sh connect "${ssid}" "${pass}" WPA2 &` : `/opt/network/wifi_cmd.sh connect "${ssid}" &`}
    if [ -f /mnt/sdcard/wifi.conf ]; then
        . /mnt/sdcard/wifi.conf
        [ -n "$SSID" ] && /opt/network/wifi_cmd.sh connect "$SSID" "$PASS" WPA2
    fi
}
k11_daemon &

[ -x /opt/autoboot.sh ] && /opt/autoboot.sh
`;
    if (newChunk5Script.length <= rcS5Dsize) {
      let padded = newChunk5Script + ' '.repeat(rcS5Dsize - newChunk5Script.length);
      Buffer.from(padded, 'ascii').copy(buf, rcS5Data);
      let newRcs5Crc = jffs2_crc32(buf, rcS5Data, rcS5Data + rcS5Dsize);
      buf.writeUInt32LE(newRcs5Crc, rcS5Header + 0x3c);
      patchCount++;
    }
  }
}

// 5. Simpan firmware hasil kustomisasi
const outName = 'k11-firmware-custom.bin';
const outPath = path.join(__dirname, outName);
fs.writeFileSync(outPath, buf);

const stats = fs.statSync(outPath);
const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
const md5 = crypto.createHash('md5').update(buf).digest('hex');

console.log('\n===========================================================');
console.log('✓ FIRMWARE KUSTOM BERHASIL DIBUAT!');
console.log('===========================================================');
console.log(`  File Output : ${outPath}`);
console.log(`  Ukuran      : ${stats.size} bytes (Tepat 8 MB)`);
console.log(`  SSID Target : ${ssid}`);
console.log(`  Password    : ${pass ? '******** (Terdaftar)' : '(Open / Tanpa Password)'}`);
console.log(`  MD5         : ${md5}`);
console.log(`  SHA-256     : ${sha256}`);
console.log('');
console.log('Langkah Flashing:');
console.log('  1. Buka NeoProgrammer 2.2.0.10');
console.log('  2. Pasang programmer CH341A ke chip SPI Flash FM25Q64 (8MB)');
console.log('  3. Open file "k11-firmware-custom.bin"');
console.log('  4. Klik Write IC (Erase + Write + Verify)');
console.log('  5. Nyalakan kamera. Kamera langsung tersambung otomatis ke Wi-Fi!');
console.log('===========================================================');
