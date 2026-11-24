const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

console.log('=== MEMBANGUN MASTER FIRMWARE v1.5 STANDALONE RTSP + CUSTOM BOOT SOUND ===');

const workDir = path.join(__dirname, 'scratch', 'opt_work');
const rtspDir = path.join(workDir, 'rtsp');
const rtspBinDir = path.join(rtspDir, 'bin');
const rtspSoundDir = path.join(rtspDir, 'sound');

// 1. Buat direktori bin dan sound di opt_work/rtsp
fs.mkdirSync(rtspBinDir, { recursive: true });
fs.mkdirSync(rtspSoundDir, { recursive: true });

// 2. Salin binary pemutar audio ak_adec_demo
const adecSrc = path.join(__dirname, 'scratch', 'extracted_audio', 'bin', 'ak_adec_demo');
fs.copyFileSync(adecSrc, path.join(rtspBinDir, 'ak_adec_demo'));
console.log('1. ak_adec_demo berhasil disalin ke opt_work/rtsp/bin/');

// 3. Salin file sound camera_on
const soundAacSrc = path.join(__dirname, 'Sound', 'camera_on.aac');
const soundMp3Src = path.join(__dirname, 'Sound', 'camera_on.mp3');
fs.copyFileSync(soundAacSrc, path.join(rtspSoundDir, 'camera_on.aac'));
fs.copyFileSync(soundMp3Src, path.join(rtspSoundDir, 'camera_on.mp3'));
console.log('2. File suara camera_on.aac dan camera_on.mp3 berhasil disalin ke opt_work/rtsp/sound/');

// 4. Perbarui S99dotstart untuk memutar boot sound saat startup
const s99Script = `#!/bin/sh

case "$1" in
    start)
        echo "[K11] Starting Standalone Services..."
        # 1. Reset dan kalibrasi motor PTZ
        /sbin/reset_motor &

        # 2. Feedback mekanis IR-Cut Solenoid (Klik-Klak)
        echo 1 > /sys/user-gpio/ircutA; usleep 60000; echo 0 > /sys/user-gpio/ircutA

        # 3. Jalankan Auto Night Vision daemon (v4 Settled ADC)
        chmod +x /opt/rtsp/night_vision.sh /opt/rtsp/start_rtsp.sh /opt/rtsp/bin/ak_adec_demo
        /opt/rtsp/night_vision.sh &

        # 4. Jalankan RTSP Server
        /opt/rtsp/start_rtsp.sh &

        # 5. Putar Boot Sound Chime (camera_on) via Speaker Internal
        (
            sleep 2
            echo 1 > /sys/user-gpio/pa-en
            export LD_LIBRARY_PATH=/opt/rtsp/lib:/opt/vicam:/lib:/usr/lib:/system/lib
            /opt/rtsp/bin/ak_adec_demo 16000 1 aac /opt/rtsp/sound/camera_on.aac > /dev/null 2>&1
            echo 0 > /sys/user-gpio/pa-en
        ) &
        ;;
    stop)
        killall -9 rtsp night_vision.sh start_rtsp.sh ak_adec_demo 2>/dev/null
        echo 0 > /sys/user-gpio/pa-en 2>/dev/null
        ;;
    restart)
        $0 stop
        sleep 1
        $0 start
        ;;
    *)
        echo "usage: $0 {start|stop|restart}"
        ;;
esac
exit 0
`;
fs.writeFileSync(path.join(workDir, 'boot', 'S99dotstart'), s99Script.replace(/\r\n/g, '\n'), 'utf8');
console.log('3. S99dotstart diperbarui dengan trigger audio boot sound.');

// 5. Buat Pack File untuk gensquashfs
const packLines = [];
function scanAndPack(dir, relPath) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const subRel = relPath ? `${relPath}/${entry.name}` : entry.name;
    const normRel = subRel.replace(/\\/g, '/');

    if (entry.isDirectory()) {
      packLines.push(`dir ${normRel} 0755 0 0`);
      scanAndPack(full, subRel);
    } else if (entry.isFile()) {
      let mode = '0644';
      if (normRel.endsWith('.sh') || 
          normRel.startsWith('bin/') || 
          normRel.startsWith('boot/S') || 
          normRel.startsWith('boot/anyboot') ||
          normRel.startsWith('rtsp/rtsp') ||
          normRel.startsWith('rtsp/bin/') ||
          normRel.endsWith('.so') ||
          normRel.includes('cmdclient') ||
          normRel.includes('hextool') ||
          normRel === 'autoboot.sh') {
        mode = '0755';
      }
      packLines.push(`file ${normRel} ${mode} 0 0`);
    }
  }
}
scanAndPack(workDir, '');

packLines.push('slink vicam/daemon.sh 0777 0 0 app.sh');
packLines.push('slink vicam/setting.sh 0777 0 0 app.sh');
packLines.push('slink vicam/start.sh 0777 0 0 app.sh');
packLines.push('slink vicam/stop.sh 0777 0 0 app.sh');
packLines.push('slink vicam/version.sh 0777 0 0 app.sh');

const packFilePath = path.join(__dirname, 'scratch', 'opt_master_v1.5_pack.txt');
fs.writeFileSync(packFilePath, packLines.join('\n') + '\n', 'utf8');

// 6. Jalankan gensquashfs
const sqfsOut = path.join(__dirname, 'scratch', 'opt_master_v1.5.sqfs');
if (fs.existsSync(sqfsOut)) fs.unlinkSync(sqfsOut);

const gensquashfsExe = path.join(__dirname, 'scratch', 'squashfs-tools-ng', 'squashfs-tools-ng-1.3.2-mingw64', 'bin', 'gensquashfs.exe');
execSync(`"${gensquashfsExe}" -c xz -b 131072 -e --force "${sqfsOut}" -F "${packFilePath}" -D "${workDir}"`);

// 7. Patch Superblock flag ke 0x00c0
const sqfsBuf = fs.readFileSync(sqfsOut);
sqfsBuf.writeUInt16LE(0x00c0, 24);
fs.writeFileSync(sqfsOut, sqfsBuf);
console.log(`4. SquashFS v1.5 selesai: ${sqfsBuf.length} bytes (${(sqfsBuf.length / 1024).toFixed(1)} KB)`);

// 8. Rakit ke Master Firmware 8MB
const baseFirmwarePath = path.join(__dirname, 'k11-firmware-v1.2-standalone-rtsp.bin');
const masterBuf = Buffer.from(fs.readFileSync(baseFirmwarePath));

const OPT_START = 0x3E0000;
const OPT_END = 0x710000;

masterBuf.fill(0xff, OPT_START, OPT_END);
sqfsBuf.copy(masterBuf, OPT_START);

const outputPath = path.join(__dirname, 'k11-firmware-v1.5-standalone-rtsp.bin');
fs.writeFileSync(outputPath, masterBuf);

const finalStats = fs.statSync(outputPath);
const sha256 = crypto.createHash('sha256').update(masterBuf).digest('hex');
const md5 = crypto.createHash('md5').update(masterBuf).digest('hex');

console.log(`\n======================================================`);
console.log(`✓ FILE FIRMWARE BARU v1.5 BERHASIL DIRAKIT!`);
console.log(`  File    : ${outputPath}`);
console.log(`  Ukuran  : ${finalStats.size} bytes (Tepat 8 MB / 64 Mbit)`);
console.log(`  MD5     : ${md5}`);
console.log(`  SHA-256 : ${sha256}`);
console.log(`======================================================`);
