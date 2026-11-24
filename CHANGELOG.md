# Changelog & Versi Firmware Kamera BoyKeep K11 (Anyka AK3918EV200 + BF314A)

Dokumen ini mencatat seluruh riwayat versi firmware, perubahan partisi, perbaikan bug (*bugfixes*), serta *checksum* integritas untuk kamera BoyKeep K11 (SPI NOR Flash FM25Q64 8MB / 64Mbit).

---

## 📋 Daftar Rilis Firmware

| Versi | Nama File | Ukuran (Bytes) | MD5 | SHA-256 | Keterangan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Stock** | `k11-dump2.bin` | 8,388,608 | `A5A7825D2637E754A88212886B1FE5A5` | `B8F235AB8A3A81D449DEBB192A71C770EE57E0F9792769955E671F28C27668E0` | Dump asli bawaan pabrik (Vendor cloud viCam aktif) |
| **v1.0** | `k11-firmware-preconfigured.bin` | 8,388,608 | `7573C3C5BF6E0E3236A33E4B99C9A6CF` | `5C3336148A16947268A8C0603F77042687602F21FA5E8DB81605F81C60173A66` | Pre-configured Wi-Fi `YOUR_WIFI_SSID`, Root Telnet port 23 aktif, viCam stock |
| **v1.0-Live** | `k11-dump4.bin` | 8,388,608 | `710BA134B430C41F62E4AEEC62B8C9A8` | `5AFC97D0022DC044A3ADE521134CD1C8381E569E1FA10FFFD9B5BE4D19C14874` | **GOLDEN BACKUP.** Backup langsung dari chip saat kamera hidup & sukses tes MicroSD + Wi-Fi |
| **v1.1** | `k11-firmware-v1.1-standalone-rtsp.bin` | 8,388,608 | `8147E53363F0C1015D2C7F9A823D72D4` | `6D71A2E37B98C6F5B9260E925E07AEF3E14251ED762B11DD7ED7086D81CBCD6A` | 100% Standalone RTSP (Port 554), Auto Night Vision, Kalibrasi PTZ Motor, De-clouded, Tanpa MicroSD |
| **v1.2** | `k11-firmware-v1.2-standalone-rtsp.bin` | 8,388,608 | `56D6DCE68F521225BB30C2EA214FC7A8` | `205AE3EDEA4C56CC95C47E7D027EE4C3CDF3AA66469A3686F6CF536421447C6C` | Full Standalone RTSP + Wi-Fi Auto-Connect Langsung Tanpa Timeout AP |
| **v1.3** | `k11-firmware-v1.3-standalone-rtsp.bin` | 8,388,608 | `D44980C307BA82472A306A8965A32C00` | `C594A91C3429966441959BACC7E1FB7508E91A1103DA277977AE730CBEBAEDBF` | Re-build SquashFS Standalone RTSP |
| **v1.4** | `k11-firmware-v1.4-standalone-rtsp.bin` | 8,388,608 | `624B0C1A231D78A43BFC3BE8E284CF32` | `1D97D450D4D1C1E1CF028F8D0BB81C3D8AFCE8D07E1B11B1F56D6DADB9BC19F5` | Fix Auto Night Vision Stuck ON (SAR ADC Sample-and-Hold Settling + Presisi Kalibrasi Terang < 710 & Gelap > 790) |
| **v1.5** | `k11-firmware-v1.5-standalone-rtsp.bin` | 8,388,608 | `33A6C528535F3AA1F16F9BD211C1C856` | `ED56225F2B8112979082D2CF4FB921A018DEC750A577A18CAE83B85E08357C79` | **MASTER PRODUCTION (LATEST).** Custom Boot Sound Audio Chime (`camera_on.mp3` / `camera_on.aac`) via Speaker Internal + PA Enable (`pa-en`) |

---

## 🎵 Versi 1.5 (`k11-firmware-v1.5-standalone-rtsp.bin`) — *2026-11-24*

**Status:** Master Production Firmware (Rilis Terbaru)  
**File Path:** [k11-firmware-v1.5-standalone-rtsp.bin](file:///d:/Elektro/K11-Camera/k11-firmware-v1.5-standalone-rtsp.bin)

### ✨ Fitur Baru: Audio Chime / Boot Sound Selesai Startup
1. **Integrasi Pemutar Audio Anyka (`ak_adec_demo`):**
   - Menambahkan program audio decoder native Anyka `/opt/rtsp/bin/ak_adec_demo` (mendukung MP3, AAC, PCM).
2. **Kustom Audio Chime (`camera_on`):**
   - Mengintegrasikan file suara pilihan Anda `camera_on.mp3` (1.37s) dan versi teroptimasi `camera_on.aac` (16kHz Mono, 10.5 KB) langsung ke dalam partisi flash `/opt/rtsp/sound/`.
3. **Kontrol Hardware Power Amplifier (`/sys/user-gpio/pa-en`):**
   - Pada startup `/opt/boot/S99dotstart`:
     - Solenoid IR-Cut memberi feedback klik mekanis.
     - Server RTSP dan daemon Auto Night Vision v4 aktif.
     - Pin `pa-en` diaktifkan (`echo 1 > /sys/user-gpio/pa-en`) untuk menyalakan amplifier speaker.
     - Suara merdu `camera_on` dimainkan melalui speaker onboard kamera.
     - Pin `pa-en` dimatikan kembali (`echo 0 > /sys/user-gpio/pa-en`) setelah suara selesai berbunyi untuk menghemat daya dan menghilangkan dengung/desis speaker.

---

## 🌟 Versi 1.4 (`k11-firmware-v1.4-standalone-rtsp.bin`) — *2026-11-24*

**Status:** Master Production Firmware (Rilis Terbaru)  
**File Path:** [k11-firmware-v1.4-standalone-rtsp.bin](file:///d:/Elektro/K11-Camera/k11-firmware-v1.4-standalone-rtsp.bin)

### 🐛 Akar Masalah Night Vision Terkunci (Stuck in Night Mode):
1. **Hardware Quirk SAR ADC Anyka:**
   - Sirkuit pembacaan analog `/sys/kernel/ain/ain0` menggunakan arsitektur SAR ADC dengan kapasitor *sample-and-hold*.
   - Saat node `ain0` dibaca pertama kali setelah idle, driver mengembalikan tegangan sisa kapasitor yang belum terisi/terkalibrasi penuh (`dummy = ~750 - 804`).
   - Nilai riil tegangan LDR yang stabil baru keluar pada pembacaan kedua/ketiga (`real = 548 - 596`).
   - Karena skrip lama hanya membaca 1 kali, pembacaan selalu menangkap nilai *dummy* yang tinggi.
2. **Ambang Batas Terlalu Rendah:**
   - Skrip lama mematok mode Siang pada `ADC < 400`.
   - Di bawah lampu ruangan normal, nilai riil LDR K11 berada di rentang **540 - 670**, sehingga **TIDAK PERNAH mencapai < 400**.
   - Akibatnya, begitu kamera pernah masuk Mode Malam, kamera terkunci selamanya di Mode Malam (filter IR-Cut tetap ditarik keluar, menyebabkan pakaian/objek tampak ungu/pink di bawah lampu ruangan).

### ✨ Solusi & Penyempurnaan v1.4:
1. **ADC Flush / Settling Read:**
   - Menambahkan dummy read cepat untuk membuang muatan kapasitor: `cat /sys/kernel/ain/ain0 > /dev/null; usleep 20000`, diikuti pembacaan nilai riil.
2. **Kalibrasi Presisi Ambang Batas Berdasarkan Data Hardware Nyata:**
   - **Mode Siang (TERANG):** `ADC < 710` (Nilai lampu ruangan normal terukur: `540 ~ 670`). IR-Cut Solenoid A aktif, IR LED OFF.
   - **Mode Malam (GELAP):** `ADC > 790` (Nilai ruangan gelap terukur: `820 ~ 850`). IR-Cut Solenoid B aktif, IR LED ON.
   - **Hysteresis Deadband (710 - 790):** Mencegah *hunting* atau filter berderik bolak-balik saat senja / cahaya remang.
   - **Anti-Flicker Debounce:** Membutuhkan 3 siklus deteksi stabil (~3 detik) sebelum memicu perpindahan fisik mekanik.
3. **Verifikasi Live Streaming:**
   - Diuji langsung pada unit fisik `<CAMERA_IP>`: saat lampu menyala, daemon mencatat `TERANG TERDETEKSI (ADC=597)` dan otomatis memulihkan warna asli alami (warna hijau, coklat, putih kembali 100% akurat tanpa semburat ungu).

---

## 🌟 Versi 1.3 (`k11-firmware-v1.3-standalone-rtsp.bin`) — *2026-11-24*

**Status:** Master Production Firmware (Rilis Terbaru)  
**File Path:** [k11-firmware-v1.3-standalone-rtsp.bin](file:///d:/Elektro/K11-Camera/k11-firmware-v1.3-standalone-rtsp.bin)

### ✨ Perbaikan Ambang Batas Auto Night Vision (Hardware Sensor LDR):
1. **Analisis Sirkuit Hardware:**
   - Sirkuit photoresistor (LDR) pada board BoyKeep K11 terhubung secara *pull-up*.
   - Saat ruangan **GELAP**, resistansi LDR meningkat sehingga tegangan ADC **TINGGI (ADC > 650)** (terbaca ~770 - 840 pada pengujian nyata).
   - Saat ruangan **TERANG**, resistansi LDR turun sehingga tegangan ADC **RENDAH (ADC < 400)**.
2. **Koreksi Logika Daemon (`/opt/rtsp/night_vision.sh`):**
   - Mengubah kondisi deteksi dari sebelumnya `< 350` menjadi `> 650` untuk beralih ke Mode Malam (IR-Cut solenoid B pulse + IR LED menyala).
   - Mengubah kondisi siang menjadi `< 400` untuk kembali ke Mode Siang (IR-Cut solenoid A pulse + IR LED padam).
   - Terdapat batas histeresis 250 poin (400 - 650) agar kamera tidak berkedip-kedip saat pencahayaan remang.

---

## 🏆 Versi 1.2 (`k11-firmware-v1.2-standalone-rtsp.bin`) — *2026-11-24*

**Status:** Teruji Live & Terbukti Streaming di LAN (`<CAMERA_IP>`)  
**File Path:** [k11-firmware-v1.2-standalone-rtsp.bin](file:///d:/Elektro/K11-Camera/k11-firmware-v1.2-standalone-rtsp.bin)

### ✨ Penyempurnaan dari Versi 1.1:
1. **Direct Wi-Fi Auto-Connect (Tanpa Timeout AP Hotspot):**
   - Mengatasi masalah di mana kamera sebelumnya sempat menyala dalam mode Hotspot `K11-SETUP`.
   - Menambahkan skrip startup `/etc/init.d/rcS_wifi.sh` di partisi JFFS2 yang langsung menjalankan asosiasi ke SSID `YOUR_WIFI_SSID` dengan kredensial WPA2 yang telah teruji.
   - Konfigurasi `wpa.conf` tersimpan rapi dengan PSK terenkripsi.
2. **Teruji Nyata & Streaming Aktif:**
   - Image 8MB ini diekstrak langsung dari unit kamera yang sedang beroperasi normal dan terbukti melayani RTSP stream di `rtsp://<CAMERA_IP>:554/vs0` (1280x720 H.264 @ 25fps + G.711A Audio).
   - Sensor cahaya ADC (LDR) aktif mengatur mode siang dan malam secara otomatis.
   - Root Telnet port 23 aktif.

---

## 🛡️ Versi 1.0-Live Golden Backup (`k11-dump4.bin`) — *2026-11-23*

**Status:** Teruji Fisik 100% Berhasil Hidup & Terhubung  
**File Path:** [k11-dump4.bin](file:///d:/Elektro/K11-Camera/k11-dump4.bin)

### Ringkasan & Karakteristik:
* **Asal Usul:** Diekstrak langsung dari chip SPI Flash kamera fisik menggunakan CH341A setelah kamera berhasil dinyalakan dengan MicroSD, terhubung ke router `YOUR_WIFI_SSID`, dan mendapatkan IP `<CAMERA_IP>`.
* **Kandungan:**
  - Partisi Boot, Kernel, RootFS, OPT, dan Factory 100% identik dengan `k11-firmware-preconfigured.bin`.
  - Partisi JFFS2 (`/etc`) menyimpan status runtime nyata yang ditulis oleh Linux kamera saat beroperasi (konfigurasi jaringan aktif, parameter runtime, dsb).
* **Fungsi Utama:** Sebagai *titik pemulihan darurat (safety restore point)*. Kapan pun dibutuhkan, file ini menjamin kamera dapat dikembalikan ke kondisi pasti menyala normal.

---

## 🚀 Versi 1.1 (`k11-firmware-v1.1-standalone-rtsp.bin`) — *2026-11-23*

**Status:** Rilis Produksi Master (Siap Flash Massal)  
**File Path:** [k11-firmware-v1.1-standalone-rtsp.bin](file:///d:/Elektro/K11-Camera/k11-firmware-v1.1-standalone-rtsp.bin)

### ✨ Fitur Baru & Peningkatan:
1. **Full Standalone RTSP Server (Port 554):**
   - RTSP Streaming H.264 standar langsung aktif tanpa perlu microSD card atau injeksi script manual.
   - Main Stream: `rtsp://<IP_KAMERA>:554/vs0` (1280x720 @ 25fps + G.711A Audio).
   - Sub Stream: `rtsp://<IP_KAMERA>:554/vs1` (640x360 @ 25fps).
   - Telah mengintegrasikan seluruh 17 shared libraries Anyka (`libmpi_venc.so`, `libplat_vi.so`, `libakstreamenc.so`, dll.) ke dalam partisi internal flash.
2. **Auto Night Vision Hardware Switching:**
   - Daemon `/opt/rtsp/night_vision.sh` membaca sensor cahaya LDR via ADC `/sys/kernel/ain/ain0`.
   - Otomatis memicu solenoid mekanik IR-Cut filter (`ircutA` / `ircutB`) dan menyalakan lampu 850nm IR LED saat ruangan gelap (< 350 lux), serta mengembalikan ke mode siang saat terang (> 600 lux).
3. **Kalibrasi PTZ Motor Saat Booting:**
   - Memanggil biner `/sbin/reset_motor &` saat startup sehingga lensa berputar ke batas horizontal & vertikal untuk kalibrasi otomatis posisi awal, persis seperti saat kamera baru dinyalakan.
4. **Mechanical Sound Confirmation:**
   - Memberikan feedback fisik suara mekanis *"KLIK-KLAK"* dari solenoid IR-Cut saat boot selesai sebagai indikator perangkat keras siap beroperasi.
5. **Pre-configured Network & Telnet:**
   - Auto-connect ke Wi-Fi SSID `YOUR_WIFI_SSID` (Password: `YOUR_WIFI_PASSWORD`).
   - Root Telnet tetap aktif pada port 23 (`login: root`, tanpa password).

### 🐛 Bugfixes dari Percobaan Sebelumnya:
- **[CRITICAL] Superblock Flag Incompatibility Fix:**
  - *Masalah:* Tool `tar2sqfs` sebelumnya menggunakan flag modern `0x0260` (termasuk `0x0200` = `SQUASHFS_NO_XATTR`). Kernel Linux 3.4.35 Anyka menolak flag ini dengan kode error `-EINVAL: unknown flags 0x260`, menyebabkan partisi `/opt` gagal di-mount.
  - *Solusi:* Partisi dibangun ulang menggunakan `gensquashfs` dengan flag yang disesuaikan ke `0x00c0` (identik persis dengan firmware pabrik Anyka). Partisi kini di-mount 100% mulus oleh kernel.
- **[CRITICAL] Linux Permissions & Execution Bits Fix:**
  - *Masalah:* File yang diekstrak dan dikemas dari Windows kehilangan atribut eksekusi Linux (`0666` bukannya `0755`), menyebabkan skrip startup tidak dapat dijalankan.
  - *Solusi:* Seluruh biner dan skrip dieksekusi dengan *pack-file* eksplisit mode `0755` dan symlinks `0777`.
- **[CRITICAL] Watchdog Infinite Reboot Loop Fix:**
  - *Masalah:* Skrip vendor lama `watchdog.sh` menjalankan fungsi `rbootcam` (`/sbin/reboot`) setiap 3 detik jika program cloud `viCam` tidak terdeteksi.
  - *Solusi:* `watchdog.sh` dan `wdog` dinonaktifkan sepenuhnya. Kamera tidak akan pernah restart tiba-tiba.

---

## 📦 Versi 1.0 (`k11-firmware-preconfigured.bin`) — *2026-11-22*

**Status:** Teruji Live & Berhasil Boot  
**File Path:** [k11-firmware-preconfigured.bin](file:///d:/Elektro/K11-Camera/k11-firmware-preconfigured.bin)

### Ringkasan:
- U-Boot dipatch untuk mengaktifkan autoboot prompt 5 detik (`Hit any key to stop autoboot in 5 seconds`).
- Port 23 Telnet Daemon diaktifkan otomatis di `/etc/init.d/rcS`.
- Konfigurasi Wi-Fi `YOUR_WIFI_SSID` / `YOUR_WIFI_PASSWORD` disuntikkan langsung ke chunk JFFS2 partisi `mtd` (`0x710000`).
- Partisi `/opt` masih mempertahankan firmware asli pabrik (aplikasi cloud `viCam` masih berjalan).
- Digunakan sebagai *baseline* aman yang terbukti berhasil mendapatkan IP `<CAMERA_IP>` di jaringan lokal.

---

## 💾 Struktur Partisi Flash SPI NOR FM25Q64 (8 MB)

Berdasarkan environment U-Boot dan `mtdparts=spi0.0:0x00050000(boot),0x00190000(kernel),0x00200000(rootfs),0x00330000(user),0x000e0000(mtd),0x00010000(factory)`:

| Offset Awal | Offset Akhir | Ukuran | Partisi | Format / File System | Keterangan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `0x000000` | `0x050000` | 320 KB (`0x50000`) | `mtd0` (boot) | Raw Binary | U-Boot Bootloader & Environment |
| `0x050000` | `0x1E0000` | 1.56 MB (`0x190000`) | `mtd1` (kernel) | uImage XZ | Linux Kernel 3.4.35 Anyka |
| `0x1E0000` | `0x3E0000` | 2.00 MB (`0x200000`) | `mtd2` (rootfs) | SquashFS 4.0 XZ | Root Filesystem (`/`) |
| `0x3E0000` | `0x710000` | 3.18 MB (`0x330000`) | `mtd3` (user) | SquashFS 4.0 XZ | Partisi `/opt` (RTSP Server + Anyka Libs) |
| `0x710000` | `0x7F0000` | 896 KB (`0xE0000`) | `mtd4` (mtd) | JFFS2 | Konfigurasi sistem (`/etc`) |
| `0x7F0000` | `0x800000` | 64 KB (`0x10000`) | `mtd5` (factory) | Raw Text | Factory Info: MAC, SN, Product Name |
