const net = require('net');

console.log('Menghubungkan ke Telnet kamera di 192.165.56.1:23 ...');
const client = new net.Socket();
client.setTimeout(6000);

client.connect(23, '192.165.56.1', () => {
  setTimeout(() => client.write('root\n'), 1000);
  setTimeout(() => {
    client.write('echo "=== MAC ADDRESS KAMERA ==="; cat /sys/class/net/wlan0/address; echo "=========================="\n');
  }, 2000);
  setTimeout(() => client.end(), 4000);
});

client.on('data', (d) => console.log(d.toString().trim()));
client.on('error', (e) => console.error('Koneksi gagal (pastikan laptop terhubung ke Wi-Fi K11-SETUP):', e.message));
client.on('timeout', () => { console.error('Timeout'); client.destroy(); });
