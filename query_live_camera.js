const net = require('net');

const cmd = process.argv[2] || 'uptime; ifconfig';

const client = new net.Socket();
client.setTimeout(12000);

let stage = 'init';

client.connect(23, 'process.env.CAMERA_IP || "192.168.1.100"', () => {
  // Connected
});

client.on('data', (d) => {
  const s = d.toString();
  process.stdout.write(s);

  if (stage === 'init' && s.includes('login:')) {
    stage = 'logged_in';
    setTimeout(() => {
      client.write('root\n');
    }, 200);
  } else if (stage === 'logged_in' && s.includes('[root@vi')) {
    stage = 'executing';
    setTimeout(() => {
      client.write(cmd + '\n');
    }, 200);
    setTimeout(() => {
      client.end();
    }, 3000);
  }
});

client.on('error', (e) => console.error('Error:', e.message));
client.on('timeout', () => { client.destroy(); });
