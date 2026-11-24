# BoyKeep K11 Standalone RTSP Firmware (Anyka AK3918EV200 + BF314A)

Firmware kustom standalone untuk kamera BoyKeep K11 berbasis SoC Anyka AK3918EV200 dan sensor gambar BF314A dengan flash SPI NOR FM25Q64 (8 MB). Firmware ini mengaktifkan RTSP streaming H.264 standar, auto night vision hardware, kalibrasi motor PTZ, audio boot chime, serta menonaktifkan ketergantungan cloud bawaan vendor (de-clouded).

## Fitur Utama

- **100% Standalone RTSP (Port 554):** Streaming video langsung via RTSP tanpa memerlukan kartu microSD atau koneksi ke cloud vendor.
  - Main Stream: `rtsp://<CAMERA_IP>:554/vs0` (1280x720 H.264 @ 25fps + G.711A Audio)
  - Sub Stream: `rtsp://<CAMERA_IP>:554/vs1` (640x360 H.264 @ 25fps)
- **Auto Night Vision Hardware:** Daemon sensor cahaya LDR via SAR ADC (`ain0`) dengan filter settling, histeresis (710 - 790), perpindahan fisik solenoid IR-Cut, dan kontrol lampu IR LED 850nm.
- **Custom Boot Sound:** Memutar nada startup saat kamera siap beroperasi menggunakan decoder Anyka native (`ak_adec_demo`) melalui speaker internal dan amplifier (`pa-en`).
- **Kalibrasi PTZ Otomatis:** Kalibrasi posisi motor horizontal dan vertikal saat booting (`reset_motor`).
- **De-Clouded:** Menghapus aplikasi cloud vendor (`viCam`) dan menonaktifkan watchdog reboot loop.
- **Root Telnet:** Akses shell Linux port 23 (`login: root`, tanpa password).
- **Fleksibilitas Jaringan:** Mendukung Wi-Fi WPA/WPA2, fallback hotspot darurat (`K11-SETUP`), konfigurasi via microSD `wifi.conf`, atau generator firmware `build_custom_firmware.js`.

## Cara Flashing (NeoProgrammer & CH341A)

1. Pasang programmer CH341A ke chip SPI Flash FM25Q64 (8 MB / 3.3V).
2. Buka aplikasi **NeoProgrammer 2.2.0.10**, klik tombol **Detect** untuk memastikan chip terdeteksi sebagai `FM25Q64 [3.3V]`.
3. Buka file firmware `.bin` yang ingin di-flash.
4. Klik tombol **Write IC** (Erase + Write + Verify) dan tunggu hingga selesai.
5. Nyalakan kamera.

## Cara Menggunakan RTSP Stream

Setelah kamera menyala dan terhubung ke jaringan lokal:

1. Buka VLC Media Player.
2. Pilih menu **Media > Open Network Stream** (atau tekan `Ctrl + N`).
3. Masukkan URL RTSP:
   - Main Stream: `rtsp://<CAMERA_IP>:554/vs0`
   - Sub Stream: `rtsp://<CAMERA_IP>:554/vs1`
4. Klik **Play**.

Stream ini kompatibel dengan NVR, Synology Surveillance Station, Home Assistant, Frigate, Agent DVR, dan go2rtc.

## Konfigurasi Wi-Fi

### Metode 1: Menggunakan Kartu MicroSD (Paling Praktis)
1. Format kartu microSD ke format FAT32.
2. Buat file `wifi.conf` di root kartu microSD:
   ```sh
   SSID="Nama_WiFi_Anda"
   PASS="Password_WiFi_Anda"
   ```
3. Masukkan kartu microSD ke kamera lalu nyalakan kamera. Kamera akan otomatis tersambung ke Wi-Fi dan menyimpannya ke memori internal. Kartu microSD dapat dilepas setelahnya.

### Metode 2: Menggunakan Fallback Hotspot Darurat
Jika Wi-Fi yang tersimpan tidak ditemukan, kamera otomatis memancarkan hotspot darurat:
- SSID: `K11-SETUP` (Open, IP kamera: `192.165.56.1`)
- Akses via Telnet: `telnet 192.165.56.1 23`
- Edit file `/etc/conf/wpa.conf`, lalu jalankan `reboot`.

### Metode 3: Injeksi Wi-Fi ke Firmware Sebelum Flashing
Gunakan script generator untuk menyuntikkan kredensial Wi-Fi langsung ke file firmware:
```bash
node build_custom_firmware.js "Nama_WiFi_Anda" "Password_WiFi_Anda"
```
Script akan menghasilkan file `k11-firmware-custom.bin` (8 MB) yang siap di-flash via NeoProgrammer.

## Struktur Partisi Flash SPI NOR FM25Q64 (8 MB)

| Offset Awal | Offset Akhir | Ukuran | Partisi | Format / File System | Keterangan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `0x000000` | `0x050000` | 320 KB | `mtd0` (boot) | Raw Binary | U-Boot Bootloader & Environment |
| `0x050000` | `0x1E0000` | 1.56 MB | `mtd1` (kernel) | uImage XZ | Linux Kernel 3.4.35 Anyka |
| `0x1E0000` | `0x3E0000` | 2.00 MB | `mtd2` (rootfs) | SquashFS 4.0 XZ | Root Filesystem (/) |
| `0x3E0000` | `0x710000` | 3.18 MB | `mtd3` (user) | SquashFS 4.0 XZ | Partisi /opt (RTSP Server + Anyka Libs) |
| `0x710000` | `0x7F0000` | 896 KB | `mtd4` (mtd) | JFFS2 | Konfigurasi sistem (/etc) |
| `0x7F0000` | `0x800000` | 64 KB | `mtd5` (factory) | Raw Text | Factory Info: MAC, SN, Product Name |

## Kontrol Hardware Manual (Akses Telnet)

Akses Telnet port 23 (`login: root`, tanpa password):

```sh
# Kontrol Lampu Putih (Spotlight):
echo 1 > /sys/user-gpio/whitelight   # Nyala
echo 0 > /sys/user-gpio/whitelight   # Mati

# Kontrol Lampu Inframerah (IR LED 850nm):
echo 1 > /sys/user-gpio/irled        # Nyala
echo 0 > /sys/user-gpio/irled        # Mati

# Kontrol Filter Mekanik IR-Cut:
echo 1 > /sys/user-gpio/ircutA; usleep 60000; echo 0 > /sys/user-gpio/ircutA  # Mode Siang (Warna Alami)
echo 1 > /sys/user-gpio/ircutB; usleep 60000; echo 0 > /sys/user-gpio/ircutB  # Mode Malam (Night Vision)

# Membaca Nilai Sensor Cahaya LDR (SAR ADC):
cat /sys/kernel/ain/ain0
```

## Daftar File Repositori

- `README.md`: Panduan teknis firmware dan instruksi setup.
- `CHANGELOG.md`: Catatan riwayat versi, bugfix, dan checksum integritas.
- `build_custom_firmware.js`: Script pembuat firmware kustom dengan kredensial Wi-Fi pengguna.
- `wifi.conf.example`: Template konfigurasi Wi-Fi untuk kartu microSD.
- `run.sh`: Skrip auto-diagnostik dan pairing Wi-Fi via microSD.
- `Sound/`: Berkas audio boot chime (`camera_on.mp3`, `camera_on.aac`).
