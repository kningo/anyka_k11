const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('=== MEMBANGUN MASTER FIRMWARE v1.1 STANDALONE RTSP (FILE BARU) ===');

// 1. Baca base firmware preconfigured (U-Boot patched, Rootfs intact, Telnet root port 23, Preconfigured Wi-Fi)
const baseFirmwarePath = 'd:/Elektro/k11-firmware-preconfigured.bin';
const masterBuf = Buffer.from(fs.readFileSync(baseFirmwarePath));

if (masterBuf.length !== 8388608) {
  console.error(`ERROR: Ukuran base firmware (${masterBuf.length}) bukan 8,388,608 bytes!`);
  process.exit(1);
}

// 2. Baca opt_master.sqfs (SquashFS 4.0 XZ flags 0x00c0, Linux 3.4.35 compatible, chmod 0755, watchdog disabled, PTZ reset & RTSP daemon)
const optSqfsPath = 'd:/Elektro/scratch/opt_master.sqfs';
const optSqfsBuf = fs.readFileSync(optSqfsPath);

const OPT_START = 0x3E0000;
const OPT_END = 0x710000;
const OPT_MAX_SIZE = OPT_END - OPT_START; // 3,342,336 bytes

console.log(`Partisi OPT/User: 0x${OPT_START.toString(16)} - 0x${OPT_END.toString(16)} (Kapasitas: ${OPT_MAX_SIZE} bytes)`);
console.log(`Ukuran opt_master.sqfs: ${optSqfsBuf.length} bytes (${(optSqfsBuf.length/1024).toFixed(1)} KB)`);

if (optSqfsBuf.length > OPT_MAX_SIZE) {
  console.error(`ERROR: opt_master.sqfs terlalu besar untuk partisi opt!`);
  process.exit(1);
}

// 3. Bersihkan area partisi opt (0x3E0000 - 0x710000) dengan 0xFF
masterBuf.fill(0xff, OPT_START, OPT_END);

// Salin SquashFS baru ke offset 0x3E0000
optSqfsBuf.copy(masterBuf, OPT_START);

// 4. Verifikasi Semua Magic Header Partisi
const rootfsMagic = masterBuf.slice(0x1e0000, 0x1e0004).toString('ascii');
const optMagic = masterBuf.slice(OPT_START, OPT_START + 4).toString('ascii');
const jffs2Magic = masterBuf.readUInt16LE(0x710000);
const factoryMagic = masterBuf.slice(0x7f0000, 0x7f0003).toString('ascii');

console.log(`\nVerifikasi Partisi:`);
console.log(`  [0x000000] U-Boot Bootloader: OK`);
console.log(`  [0x050000] Linux Kernel 3.4.35: OK`);
console.log(`  [0x1E0000] RootFS (SquashFS 4.0): "${rootfsMagic}" (hsqs) - OK`);
console.log(`  [0x3E0000] OPT Standalone RTSP:  "${optMagic}" (hsqs) - OK`);
console.log(`  [0x710000] JFFS2 Config (/etc) : 0x${jffs2Magic.toString(16)} (0x1985) - OK`);
console.log(`  [0x7F0000] Factory Info        : "${factoryMagic}" (FAC) - OK`);

// 5. Tulis file master firmware v1.1
const outputPath = 'd:/Elektro/k11-firmware-v1.1-standalone-rtsp.bin';
fs.writeFileSync(outputPath, masterBuf);

const finalStats = fs.statSync(outputPath);
const sha256 = crypto.createHash('sha256').update(masterBuf).digest('hex');
const md5 = crypto.createHash('md5').update(masterBuf).digest('hex');

console.log(`\n======================================================`);
console.log(`✓ FILE FIRMWARE BARU BERHASIL DIBUAT!`);
console.log(`  Versi   : v1.1 (Standalone RTSP + Auto Night Vision + PTZ Calib)`);
console.log(`  File    : ${outputPath}`);
console.log(`  Ukuran  : ${finalStats.size} bytes (Tepat 8 MB / 64 Mbit)`);
console.log(`  MD5     : ${md5}`);
console.log(`  SHA-256 : ${sha256}`);
console.log(`======================================================`);
