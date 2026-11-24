# Panduan Lengkap Firmware & Setup RTSP Standalone Kamera BoyKeep K11 (Anyka AK3918)
**Status:** 100% Standalone (Tanpa MicroSD) | **Protokol:** Standard RTSP H.264 (Port 554) | **Akses Shell:** Root Telnet (Port 23)

---

## 📌 Ringkasan Masalah dari Screenshot & Analisis Solusi

Berdasarkan screenshot yang Anda kirimkan:

1. **Screenshot 1 & 2 (`k11-firmware-universal-hotspot.bin` & Web Config):**
   - Anda membuka file `k11-web-config.html` di Google Chrome saat terhubung ke Wi-Fi `K11-SETUP`.
   - Tombol *"Kirim Pengaturan ke Kamera"* di browser web tidak dapat mengirim langsung ke soket Telnet kamera karena pembatasan keamanan browser (*sandbox browser* melarang koneksi raw TCP ke port 23).

2. **Screenshot 3 (`send_wifi_telnet.js`):**
   - Saat dijalankan di PowerShell, skrip mengirim perintah `/opt/network/wifi_cmd.sh connect ...`.
   - Muncul respon: `no udhcpc process`. Hal ini terjadi karena saat kamera memancarkan Hotspot (AP mode), kamera menjalankan `udhcpd` (DHCP Server), bukan `udhcpc` (DHCP Client). Akibatnya skrip bawaan kamera menolak perintah dan kamera **tidak melakukan restart**.

3. **Screenshot 4 (Angry IP Scanner di 192.168.11.X):**
   - Scanner tidak mendeteksi kamera di jaringan rumah karena kamera belum berpindah dari Hotspot `K11-SETUP` (`192.165.56.1`).

4. **Screenshot 5 (VLC Player & Port 8080):**
   - **Port 8080 ("Not Found"):** Port 8080 pada kamera bawaan pabrik adalah protokol cloud tertutup P2P WebRTC milik vendor Blurams/Ease Life, bukan server web biasa.
   - **VLC Error (`rtsp://192.165.56.1:554/live`):** Pada firmware bawaan vendor, port RTSP 554 belum ada/belum berjalan, dan format URL RTSP Anyka standar adalah `/vs0` (bukan `/live`).

---

## 🚀 Solusi Sempurna: Master Firmware Standalone RTSP (Tanpa Kartu MicroSD)

Kami telah merakit dan menguji secara live **Master Firmware Standalone** yang menggabungkan:
1. **Wi-Fi Otomatis:** Langsung tersambung ke router rumah Anda (`YOUR_WIFI_SSID` / `YOUR_WIFI_PASSWORD`).
2. **Server RTSP H.264:** Otomatis aktif saat kamera menyala di port standar **554**.
3. **Sensor BF314A Terintegrasi:** Otomatis terhubung dengan konfigurasi ISP kamera (`1280x720 @ 25fps`).
4. **De-Clouded (Bebas Cloud):** Menghapus program vendor `viCam` (6.5 MB) yang menyebabkan suara error dan ketergantungan cloud.
5. **100% Standalone:** **TIDAK MEMERLUKAN KARTU MICROSD SAMA SEKALI!** Semua binary server dan 17 library Anyka telah disuntikkan langsung ke dalam chip SPI NOR Flash (8 MB).

File Master Firmware (Versi Terbaru - Final Teruji Live):
👉 **[k11-firmware-v1.5-standalone-rtsp.bin](file:///d:/Elektro/K11-Camera/k11-firmware-v1.5-standalone-rtsp.bin)** *(Versi 1.5 - Auto Night Vision Fix + Custom Boot Sound camera_on - 8,388,608 bytes)*

File Versi Sebelumnya:
* [k11-firmware-v1.4-standalone-rtsp.bin](file:///d:/Elektro/K11-Camera/k11-firmware-v1.4-standalone-rtsp.bin) *(Versi 1.4)*
* [k11-firmware-v1.3-standalone-rtsp.bin](file:///d:/Elektro/K11-Camera/k11-firmware-v1.3-standalone-rtsp.bin) *(Versi 1.3)*
* [k11-firmware-v1.2-standalone-rtsp.bin](file:///d:/Elektro/K11-Camera/k11-firmware-v1.2-standalone-rtsp.bin) *(Versi 1.2)*
* [k11-firmware-v1.1-standalone-rtsp.bin](file:///d:/Elektro/K11-Camera/k11-firmware-v1.1-standalone-rtsp.bin) *(Versi 1.1)*
* [k11-dump4.bin](file:///d:/Elektro/K11-Camera/k11-dump4.bin) *(Golden Backup fisik tes MicroSD)*

> [!NOTE]
> Riwayat perubahan lengkap dan verifikasi checksum untuk setiap versi dapat dilihat di [CHANGELOG.md](file:///d:/Elektro/K11-Camera/CHANGELOG.md).

---

## 🛠️ Langkah Flashing Semua Unit Kamera (NeoProgrammer)

Untuk menerapkan ke satu atau banyak kamera BoyKeep K11 agar langsung siap pakai:

1. Buka **NeoProgrammer 2.2.0.10** dengan programmer CH341A terpasang ke chip flash **FM25Q64**.
2. Klik tombol **Detect** &rarr; pastikan terdeteksi `FM25Q64 [3.3V]`.
3. Klik menu **File &rarr; Open** (ikon folder kuning), lalu pilih file:
   `D:\Elektro\K11-Camera\k11-firmware-v1.5-standalone-rtsp.bin`
4. Klik tombol **Write IC** (ikon chip panah hijau / Erase + Write + Verify).
5. Tunggu hingga proses selesai dengan tulisan hijau: **`Verify memory... Success`**.
6. Pasang kembali chip/kabel dan nyalakan kamera. Selesai! Kamera langsung aktif tanpa perlu setting apapun lagi.

---

## 📹 Cara Memutar Video Streaming RTSP di VLC Media Player

Setelah kamera dinyalakan dan mendapatkan IP dari router (misal `<CAMERA_IP>`):

### 1. Buka VLC Player di Laptop/PC
1. Buka **VLC Media Player**.
2. Klik menu **Media** &rarr; **Open Network Stream...** (atau tekan `Ctrl + N`).
3. Masukkan salah satu URL berikut:
   - **Kualitas Utama (Main Stream HD 720p / 2 Mbps):**
     ```text
     rtsp://<CAMERA_IP>:554/vs0
     ```
   - **Kualitas Ringan (Sub Stream 480p / 200 Kbps untuk multi-view):**
     ```text
     rtsp://<CAMERA_IP>:554/vs1
     ```
4. Klik **Play**. Video langsung tayang secara *real-time* dengan latensi sangat rendah!

> [!NOTE]
> Ganti `<CAMERA_IP>` dengan alamat IP kamera yang tertera di router / Angry IP Scanner Anda jika kamera lain mendapatkan IP berbeda dari DHCP router (misal `.60`, `.61`, dst).

---

## 🌙 Fitur Mode Malam (Auto Night Vision)

Firmware master ini dilengkapi daemon **Auto Night Vision** otomatis (`/opt/rtsp/night_vision.sh`):

1. **Sensor Cahaya Otomatis (LDR):**
   - Kamera membaca intensitas cahaya ruangan secara berkala melalui sensor analog ADC di `/sys/kernel/ain/ain0`.
2. **Perpindahan Otomatis (IR-Cut Solenoid):**
   - **Saat Gelap (Malam):** Kamera mematikan filter IR-Cut (`ircutB`), menyalakan lampu inframerah **IR LED** 850nm (`irled`), dan video otomatis berpindah ke Night Vision hitam-putih yang tajam dalam kegelapan total.
   - **Saat Terang (Siang):** Kamera menyalakan filter IR-Cut (`ircutA`) dan mematikan IR LED agar warna gambar di siang hari terlihat alami.
3. **Kontrol Spotlight / White LED (Opsional):**
   - Kamera juga memiliki lampu LED putih terang di bodi depan yang bisa dinyalakan manual via Telnet atau skrip:
     ```sh
     # Menyalakan Lampu Putih (Spotlight):
     echo 1 > /sys/user-gpio/whitelight

     # Mematikan Lampu Putih:
     echo 0 > /sys/user-gpio/whitelight
     ```

---

## 💾 Fungsi Kartu MicroSD (Edge / Backup Recording)

### Apakah fungsi MicroSD tetap bisa digunakan walau rekaman utama terpusat ke NVR/NAS?
**BISA, 100% TETAP BERFUNGSI!**

1. **Tidak Wajib (Opsional):** Kamera dirancang agar dapat menyala, terhubung Wi-Fi, dan memancarkan video RTSP **tanpa perlu ada kartu MicroSD** terpasang di dalamnya.
2. **Tetap Terbaca Jika Dipasang:** Jika sewaktu-waktu Anda memasang kartu MicroSD (format FAT32), sistem Linux kamera secara otomatis me-*mount* kartu tersebut ke direktori:
   ```text
   /mnt/sdcard
   ```
3. **Kelebihan Skema Ini (Dual / Redundant Storage):**
   - **Kamera tanpa MicroSD:** Merekam 24/7 langsung ke NVR / NAS / PC penyimpanan terpusat.
   - **Kamera dengan MicroSD (jika ingin dipasang di titik rawan):** Bisa merekam cadangan (*redundant edge recording*) sehingga jika jaringan Wi-Fi router sempat mati, rekaman tetap tersimpan aman di dalam MicroSD kamera.

---

## 🌐 Integrasi ke NVR, NAS, Home Assistant, atau Frigate

Semua rekaman dari banyak kamera dapat disimpan terpusat ke satu PC / NAS / NVR tanpa butuh MicroSD:

### Konfigurasi NVR / Synology Surveillance Station / iSpy / Agent DVR / Frigate:
- **Protocol:** `RTSP`
- **Port:** `554`
- **RTSP Path (Stream 1):** `/vs0`
- **RTSP Path (Stream 2):** `/vs1`
- **Transport Mode:** `TCP` (atau `UDP`)
- **Username & Password:** *(Dikosongkan / Anonymous)*
- **Video Codec:** `H.264`
- **Audio Codec:** `G.711A (PCMA) 8000 Hz`

---

## 💻 Akses Shell Root (Telnet)

Jika sewaktu-waktu Anda ingin memeriksa kondisi internal kamera:
```powershell
telnet <CAMERA_IP> 23
```
- **Login:** `root`
- **Password:** *(Kosong, langsung tekan Enter)*

---

## 🔄 Cara Mengubah Wi-Fi Kamera (Jika Pindah Lokasi / Ganti Router)

Kamera tidak terkunci pada satu Wi-Fi. Jika Anda ingin memindahkan kamera ke tempat lain atau mengganti password Wi-Fi, tersedia **4 cara mudah**:

### Cara A: Menggunakan Kartu MicroSD Sementara (Paling Praktis Tanpa Bongkar Chip)
1. Siapkan kartu MicroSD (format FAT32).
2. Buat file bernama `wifi.conf` di kartu MicroSD menggunakan Notepad:
   - **Jika Wi-Fi Ber-password (WPA/WPA2):**
     ```sh
     SSID="Nama_WiFi_Baru"
     PASS="Password_WiFi_Baru"
     ```
   - **Jika Wi-Fi Terbuka (Open / Tanpa Password):**
     ```sh
     SSID="Nama_WiFi_Open"
     PASS="NONE"
     ```
3. Masukkan MicroSD ke kamera, lalu nyalakan kamera.
4. Kamera otomatis membaca dan tersambung ke Wi-Fi baru serta menyimpannya ke memori flash.
5. Setelah terhubung, kartu MicroSD **bisa langsung dicabut**.

### Cara B: Otomatis Menyalakan Hotspot Darurat (Fallback Mode)
1. Jika Wi-Fi rumah tidak ditemukan dalam 25 detik, kamera otomatis memancarkan hotspot darurat:
   **`K11-SETUP`** (tanpa password, IP: `192.165.56.1`).
2. Sambungkan laptop/HP Anda ke Wi-Fi `K11-SETUP`.
3. Buka terminal (CMD / PowerShell / PuTTY), masuk ke Telnet:
   ```powershell
   telnet 192.165.56.1 23
   ```
   *(Username: `root`, Password: kosongkan)*.
4. Tuliskan Wi-Fi baru:
   - **Untuk Wi-Fi Ber-password (WPA/WPA2):**
     ```sh
     cat << 'EOF' > /etc/conf/wpa.conf
     ctrl_interface=/var/run/wpa_supplicant
     network={
       ssid="Nama_WiFi_Baru"
       scan_ssid=1
       psk="Password_WiFi_Baru"
     }
     EOF
     reboot
     ```
   - **Untuk Wi-Fi Terbuka (Open / Tanpa Password):**
     ```sh
     cat << 'EOF' > /etc/conf/wpa.conf
     ctrl_interface=/var/run/wpa_supplicant
     network={
       ssid="Nama_WiFi_Open"
       scan_ssid=1
       key_mgmt=NONE
     }
     EOF
     reboot
     ```
5. Kamera akan restart, hotspot padam, dan kamera otomatis terhubung ke router baru.
5. Kamera akan restart, hotspot padam, dan kamera otomatis terhubung ke router baru.

### Cara C: Mengubah via Telnet (Saat Kamera Sedang Terhubung ke Jaringan)
```powershell
telnet <IP_KAMERA> 23
```
Ketik perintah:
```sh
sed -i 's/ssid=.*/ssid="Nama_WiFi_Baru"/' /etc/conf/wpa.conf
sed -i 's/psk=.*/psk="Password_WiFi_Baru"/' /etc/conf/wpa.conf
reboot
```

### Cara D: Membuat File Firmware Baru Sebelum Di-Flash (Untuk Unit Kamera Baru)
Jika ingin mem-flash kamera lain dengan nama Wi-Fi berbeda sejak awal:
- **Untuk Wi-Fi Ber-password:**
  ```powershell
  node generate_custom_wifi.js "Nama_WiFi_Anda" "Password_WiFi_Anda"
  node build_master_firmware.js
  ```
- **Untuk Wi-Fi Terbuka (Open / Tanpa Password):**
  ```powershell
  node generate_custom_wifi.js "Nama_WiFi_Open" "NONE"
  node build_master_firmware.js
  ```
File `k11-firmware-standalone-rtsp.bin` akan otomatis terbuat dengan pengaturan Wi-Fi tersebut dan siap di-*flash* via NeoProgrammer.

---

## 🚨 Deteksi Gerakan & Notifikasi ke HP (Motion Detection)

Pada sistem IP camera RTSP dan penyimpanan terpusat:
- **Di mana Motion Detection diproses?**
  Deteksi gerakan diproses langsung oleh software server terpusat (**Frigate NVR**, **Agent DVR / iSpy**, **Synology Surveillance Station**, atau **Home Assistant**).
- **Keunggulan Dibanding Cloud Vendor:**
  1. **AI Human / Vehicle Detection:** Server menganalisis video dengan kecerdasan buatan (*AI Object Detection*), sehingga hanya memberi peringatan saat ada **orang (Person)** atau **kendaraan (Car)**. Angin, daun, atau bayangan lampu tidak akan memicu alarm palsu.
  2. **Notifikasi Instan ke HP (Gratis Tanpa Biaya Cloud):**
     - **Telegram Bot:** Mengirim foto snapshot pelaku + klip video kejadian langsung ke chat Telegram Anda.
     - **Aplikasi Mobile (Push Notification):** Melalui aplikasi Home Assistant, DS Cam (Synology), atau Agent DVR Web App.
     - **Email Alert:** Mengirim email laporan kejadian otomatis.
  3. **Zona Sensitivitas:** Anda bebas menggambar area pantau di layar (misal hanya pintu gerbang).

---

## 🎙️ Two-Way Audio (Audio Dua Arah)

1. **Mendengar Suara Sekitar (Audio In / Listening):**
   - **Sudah aktif 100%** di dalam stream RTSP (`Codec: G.711A / PCMA 8000 Hz, mono, 64 kbps`).
   - Suara ruangan langsung terdengar secara *real-time* saat video diputar di VLC, NVR, Synology, atau Frigate.
2. **Berbicara ke Kamera (Audio Out / Talk-back Speaker):**
   - Kamera memiliki speaker internal dan amplifier audio di `/sys/user-gpio/pa-en`.
   - **Sirine Alarm Lokal:** Anda bisa memicu pemutaran file audio sirine di kamera via Telnet/script (file bawaan: `/etc/audio/tips_8k_16bit/en/alarm.wav`).
   - **Push-to-Talk Real-Time:** Dapat diintegrasikan menggunakan server WebRTC (seperti **go2rtc** atau **Agent DVR**) melalui audio backchannel ke DAC `/dev/akpcm_cdev1`.

### 🎵 Daftar File Audio WAV Bawaan Kamera
Semua file audio internal bertipe **WAV PCM (8000 Hz, 16-bit Mono)**:

| Lokasi File | Nama File | Deskripsi / Fungsi |
| :--- | :--- | :--- |
| `/etc/audio/tips_8k_16bit/en/` | `alarm.wav` | Suara sirine alarm darurat / peringatan pengusir maling |
| `/etc/audio/tips_8k_16bit/en/` | `wificonnected.wav` | Suara wanita: *"Wi-Fi connected"* |
| `/etc/audio/tips_8k_16bit/en/` | `networkconnectsuccess.wav` | Suara wanita: *"Network connection successful"* |
| `/etc/audio/tips_8k_16bit/en/` | `configure_succ.wav` | Suara wanita: *"Configuration successful"* |
| `/etc/audio/tips_8k_16bit/en/` | `waitconnect.wav` | Suara wanita: *"Waiting to connect"* |
| `/etc/audio/tips_8k_16bit/en/` | `reset.wav` | Suara wanita: *"Resetting to factory defaults"* |
| `/etc/audio/tips_8k_16bit/en/` | `failed_to_get_ip.wav` | Suara wanita: *"Failed to obtain IP address"* |
| `/etc/audio/tips_8k_16bit/en/` | `wifi_nossid.wav` | Suara peringatan: *"Wi-Fi network not found"* |
| `/etc/audio/tips_8k_16bit/en/` | `wifi_wrongpasswd.wav` | Suara peringatan: *"Incorrect Wi-Fi password"* |
| `/etc/audio/tips_8k_16bit/en/` | `wifi_weak.wav` | Suara peringatan: *"Wi-Fi signal is weak"* |
| `/etc/audio/tips_8k_16bit/en/` | `adderror.wav` | Suara error vendor saat gagal registrasi cloud |
| `/etc/audio/tips_8k_16bit/en/` | `dudu.wav` & `dududu.wav` | Nada bunyi "tuut tuut" saat pairing / booting |
| `/opt/vicam/` | `qrcode_ok.wav` | Nada bunyi "ding" saat sukses mendeteksi QR Code |

> [!TIP]
> Anda juga dapat menambahkan rekaman suara atau file `.wav` sendiri (format 8kHz 16-bit mono) ke MicroSD atau memori kamera untuk dijadikan bunyi bel pintu, sapaan tamu, atau peringatan suara kustom.

---

## 📂 Ringkasan File di Folder `d:\Elektro\K11-Camera\`

| File | Keterangan |
| :--- | :--- |
| **[k11-firmware-standalone-rtsp.bin](file:///d:/Elektro/K11-Camera/k11-firmware-standalone-rtsp.bin)** | **Firmware Utama (Master):** Flash file ini untuk semua kamera. Otomatis konek Wi-Fi `YOUR_WIFI_SSID` & langsung stream RTSP tanpa MicroSD. |
| **[k11-dump2.bin](file:///d:/Elektro/K11-Camera/k11-dump2.bin)** | Backup dump original bawaan pabrik sebelum dimodifikasi. |
| **[scratch/camera_snapshot.jpg](file:///d:/Elektro/K11-Camera/scratch/camera_snapshot.jpg)** | Bukti hasil tangkapan gambar asli dari kamera via stream RTSP port 554. |
| **[build_master_firmware.js](file:///d:/Elektro/K11-Camera/build_master_firmware.js)** | Script pembuat firmware master jika di masa depan Anda ingin mengganti Wi-Fi atau parameter lainnya. |
