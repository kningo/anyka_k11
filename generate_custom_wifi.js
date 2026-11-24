const fs = require('fs');

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

const ssid = process.argv[2];
const rawPass = process.argv[3];
if (!ssid) {
  console.log('Cara Penggunaan:');
  console.log('node generate_custom_wifi.js "Nama_WiFi" "Password_WiFi"');
  console.log('Untuk Wi-Fi Open (tanpa password):');
  console.log('node generate_custom_wifi.js "Nama_WiFi_Open" "NONE"');
  process.exit(1);
}
const pass = (rawPass && rawPass !== 'NONE') ? rawPass : '';

const buf = Buffer.from(fs.readFileSync('d:/Elektro/k11-dump2.bin'));

// 1. U-Boot Patches
buf.writeUInt32LE(0xea000030, 0xe944);
buf.writeUInt32LE(0x03a06005, 0xe7d0);
const promptStr = "Hit any key to stop autoboot in %d seconds\n\0";
const pBuf = Buffer.alloc(48, 0);
pBuf.write(promptStr, 'ascii');
pBuf.copy(buf, 0x2a18e);

// 2. Inittab Patches
const inittabHeader = 0x7ea68c;
const inittabData = 0x7ea6d0;
const inittabDsize = 999;
const oldInittab = "#console::respawn:-/bin/sh\nconsole::respawn:/sbin/getty -L console 115200 vt100 # GENERIC_SERIAL\n";
const newInittab = "ttySAK0::respawn:-/bin/sh \n#console::respawn:/sbin/getty -L console 115200 vt100 #GENERIC_SERIAL\n";
let iIdx = buf.indexOf(Buffer.from(oldInittab), inittabData);
if (iIdx !== -1 && iIdx < inittabData + inittabDsize) {
  Buffer.from(newInittab, 'ascii').copy(buf, iIdx);
  let newInittabCrc = jffs2_crc32(buf, inittabData, inittabData + inittabDsize);
  buf.writeUInt32LE(newInittabCrc, inittabHeader + 0x3c);
}

// 3. rcS Chunk 1 Patch (telnetd &)
const rcS1Header = 0x7ed7a4;
const rcS1Data = 0x7ed7e8;
const rcS1Dsize = 2072;
const oldRcSTarget = "# telnetd &";
const newRcSTarget = "telnetd &  ";
let r1Idx = buf.indexOf(Buffer.from(oldRcSTarget), rcS1Data);
if (r1Idx !== -1 && r1Idx < rcS1Data + rcS1Dsize) {
  Buffer.from(newRcSTarget, 'ascii').copy(buf, r1Idx);
  let newRcSCrc = jffs2_crc32(buf, rcS1Data, rcS1Data + rcS1Dsize);
  buf.writeUInt32LE(newRcSCrc, rcS1Header + 0x3c);
}

// Fix /etc/wlanname node\nbuf.writeUInt16LE(0xffff, 0x7e832c);\n\n// 4. rcS Chunk 5 Complete Manager with Custom Wi-Fi
const rcS5Header = 0x7ea00c;
const rcS5Data = rcS5Header + 68;
const rcS5Dsize = 1004;

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
    sleep 15
    if ! ifconfig $W 2>/dev/null | grep -q 'inet addr:'; then
        echo "[K11] Starting Hotspot K11-SETUP..."
        /opt/vicam/wifi_stream.sh AP "K11-SETUP" "NULL"
    fi
}
k11_daemon &

[ -x /opt/autoboot.sh ] && /opt/autoboot.sh
`;

if (newChunk5Script.length > rcS5Dsize) {
  console.error("SSID/Password terlalu panjang untuk ukuran blok kernel!");
  process.exit(1);
}

let paddedChunk5 = newChunk5Script + ' '.repeat(rcS5Dsize - newChunk5Script.length);
Buffer.from(paddedChunk5, 'ascii').copy(buf, rcS5Data);
let newRcs5Crc = jffs2_crc32(buf, rcS5Data, rcS5Data + rcS5Dsize);
buf.writeUInt32LE(newRcs5Crc, rcS5Header + 0x3c);

// 5. Shadow Password Patch
let sNode = 0;
for (let p = 0x7e9c00; p < 0x7e9c50; p += 4) {
  if (buf[p] === 0x85 && buf[p+1] === 0x19 && buf.readUInt16LE(p+2) === 0xe002) {
    sNode = p;
    break;
  }
}
if (sNode) {
  const sData = sNode + 68;
  const sDsize = buf.readUInt32LE(sNode + 52);
  const oldShadowStr = "root:$1$lGLrnnTc$KF.zto25XYdUnxUXE.zNg.:15874:0:99999:7:::\n";
  const newShadowStr = "root::15874:0:99999:7:::                                    \n";
  let sIdx = buf.indexOf(Buffer.from(oldShadowStr), sData);
  if (sIdx !== -1 && sIdx < sData + sDsize) {
    Buffer.from(newShadowStr, 'ascii').copy(buf, sIdx);
    let newShadowCrc = jffs2_crc32(buf, sData, sData + sDsize);
    buf.writeUInt32LE(newShadowCrc, sNode + 0x3c);
  }
}

const outPath = 'd:/Elektro/k11-firmware-preconfigured.bin';
fs.writeFileSync(outPath, buf);
console.log('BERHASIL!');
console.log('File firmware preconfigured dibuat: ' + outPath);
console.log('Ukuran: ' + buf.length + ' bytes (8 MB)');
console.log('Wi-Fi terdaftar: ' + ssid);
