const net = require('net');

const ssid = process.argv[2] || 'YOUR_WIFI_SSID';
const pass = process.argv[3] || 'YOUR_WIFI_PASSWORD';

console.log(`Menghubungkan ke kamera K11-SETUP di 192.165.56.1:23 ...`);
const client = new net.Socket();
client.setTimeout(10000);

client.connect(23, '192.165.56.1', () => {
  console.log('✓ Terhubung ke Telnet kamera!');
  
  // 1. Kirim user login
  setTimeout(() => {
    client.write('root\n');
  }, 1000);

  // 2. Tulis wpa.conf permanen ke flash kamera
  setTimeout(() => {
    console.log(`Menulis konfigurasi Wi-Fi "${ssid}" langsung ke flash kamera...`);
    const writeScript = 
`mkdir -p /etc/conf
cat << 'EOF' > /etc/conf/wpa.conf
ctrl_interface=/var/run/wpa_supplicant
network={
  ssid="${ssid}"
  scan_ssid=1
  psk="${pass}"
}
EOF
cp /etc/conf/wpa.conf /etc/wpa.conf
sync
echo "=== VERIFIKASI ISI FLASH ==="
cat /etc/conf/wpa.conf
echo "============================"
sync
sleep 1
reboot
`;
    client.write(writeScript + '\n');
  }, 2500);

  // 3. Konfirmasi dan tutup
  setTimeout(() => {
    console.log('✓ SUKSES! Perintah reboot terkirim.');
    console.log(`  Kamera akan menyambung ke Wi-Fi "${ssid}".`);
    console.log('  Hotspot K11-SETUP akan otomatis mati dan kamera mendapat IP dari router Anda.');
    client.end();
  }, 7000);
});

client.on('data', (data) => {
  console.log('[Kamera]:', data.toString().trim());
});

client.on('error', (err) => {
  console.error('Koneksi gagal:', err.message);
  console.log('Pastikan laptop Anda sedang terhubung ke Wi-Fi K11-SETUP saat menjalankan script ini.');
});

client.on('timeout', () => {
  console.error('Timeout! Kamera tidak merespons di 192.165.56.1.');
  client.destroy();
});
