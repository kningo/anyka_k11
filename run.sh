#!/bin/sh
# ===============================================================
# BoyKeep K11 - MicroSD Auto-Diagnostic & Wi-Fi Connector
# ===============================================================

# 1. Pastikan Telnet aktif di port 23
/usr/sbin/telnetd &

LOG=/mnt/sdcard/diag.txt
echo "=== K11 SYSTEM DIAGNOSTIC ===" > $LOG
date >> $LOG 2>&1
echo "--- Uptime ---" >> $LOG
uptime >> $LOG

# 2. Konfigurasi Wi-Fi (Ganti dengan SSID dan Password Anda)
mkdir -p /etc/conf
cat << 'EOF' > /etc/conf/wpa.conf
ctrl_interface=/var/run/wpa_supplicant
network={
    ssid="YOUR_WIFI_SSID"
    scan_ssid=1
    psk="YOUR_WIFI_PASSWORD"
}
EOF
cp /etc/conf/wpa.conf /etc/wpa.conf
sync

# 3. Jalankan Wi-Fi STA mode
/opt/vicam/wifi_stream.sh STA >> $LOG 2>&1 &

# 4. Kumpulkan info hardware & sensor
echo "--- Loaded Kernel Modules ---" >> $LOG
lsmod >> $LOG

echo "--- Camera & Video Devices in /dev ---" >> $LOG
ls -la /dev/ak* /dev/video* /dev/media* /dev/camera* 2>> $LOG >> $LOG

echo "--- Current Sensor Config ---" >> $LOG
cat /tmp/current_sensor 2>> $LOG >> $LOG
ls -la /etc/snr* 2>> $LOG >> $LOG

echo "--- Network Interfaces (Before connect) ---" >> $LOG
ifconfig -a >> $LOG

# 5. Tunggu koneksi Wi-Fi selama 12 detik
sleep 12

echo "--- Network Interfaces (After connect) ---" >> $LOG
ifconfig >> $LOG

echo "--- Listening Network Ports ---" >> $LOG
netstat -tlpn 2>/dev/null >> $LOG || netstat -an | grep LISTEN >> $LOG

echo "--- Running Processes ---" >> $LOG
ps >> $LOG

echo "--- Dmesg Sensor/Camera Logs ---" >> $LOG
dmesg | grep -iE 'bf314|sensor|camera|video|atbm|wifi' >> $LOG

echo "=== DIAGNOSTIC COMPLETE ===" >> $LOG
sync

# 6. Bunyikan nada beep sukses
if [ -f /opt/vicam/qrcode_ok.wav ]; then
    aplay -D default /opt/vicam/qrcode_ok.wav 2>/dev/null &
fi
