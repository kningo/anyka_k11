const net = require('net');

const client = new net.Socket();
client.setTimeout(10000);

client.connect(23, 'process.env.CAMERA_IP || "192.168.1.100"', () => {
  setTimeout(() => client.write('root\n'), 400);

  setTimeout(() => {
    client.write('base64 -d > /tmp/test.txt\n');
    setTimeout(() => {
      // Send base64 for "Hello from Antigravity!\n" -> "SGVsbG8gZnJvbSBBbnRpZ3Jhdml0eSEK"
      client.write('SGVsbG8gZnJvbSBBbnRpZ3Jhdml0eSEK\n');
      client.write('\x04'); // Ctrl+D (EOF)
      setTimeout(() => {
        client.write('cat /tmp/test.txt; rm /tmp/test.txt\n');
        setTimeout(() => client.end(), 1500);
      }, 500);
    }, 500);
  }, 1000);
});

client.on('data', d => process.stdout.write(d.toString()));
