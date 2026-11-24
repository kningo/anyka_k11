const net = require('net');

console.log('Menghubungkan ke Telnet 192.165.56.1:23 ...');
const client = new net.Socket();
client.setTimeout(6000);

client.connect(23, '192.165.56.1', () => {
  setTimeout(() => client.write('root\n'), 1000);
  setTimeout(() => {
    client.write('echo "=== LISTENING PORTS ==="; netstat -tlpn 2>/dev/null || netstat -an | grep LISTEN; echo "=== PROCESSES ==="; ps; echo "=== END ==="\n');
  }, 2000);
  setTimeout(() => client.end(), 5000);
});

client.on('data', (d) => process.stdout.write(d.toString()));
client.on('error', (e) => console.error('Error:', e.message));
client.on('timeout', () => { console.error('Timeout'); client.destroy(); });
