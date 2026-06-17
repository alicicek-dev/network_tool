# NetTool Sürüm Notları / Release Notes

Bu dosya, NetTool (Network Engineer Toolkit) uygulamasının sürüm geçmişini, yapılan iyileştirmeleri ve eklenen yeni özellikleri belgelendirmektedir. GitHub ve Microsoft Store (Partner Center) güncellemelerinde referans olarak kullanılabilir.

---

## [v1.0.1 (Beta)] - 2026-06-16

Bu sürüm; uygulamanın modülerliğini artırmak, performans optimizasyonları sağlamak ve çoklu oturum desteği sunmak amacıyla gerçekleştirilen büyük bir refaktör çalışmasını ve hata gidermelerini içerir.

### ✦ Yeni Özellikler (New Features)
*   **Çoklu Terminal Desteği (Tabbed Terminals)**: Web Terminal sekmesinde aynı anda birden fazla SSH, Telnet veya Serial COM Port bağlantısı açma özelliği eklendi.
    *   Sekmeler arasında geçiş yapılarak bağımsız oturumlar paralel olarak yürütülebilir.
    *   Her sekme için bağımsız soket izolasyonu (`forceNew: true`) uygulanarak oturumların çakışması önlendi.
*   **Oturum Koruma (Tab Keep-Alive)**: Uygulamanın ana sekmeleri (Dashboard, Ping, Terminal, Discovery vb.) arasında geçiş yapıldığında, açık olan terminal bağlantılarının kopması ve formlardaki/araçlardaki verilerin kaybolması engellendi. (Conditional rendering yerine CSS display toggle mimarisine geçildi).
*   **Sekme İçi Dinamik Boyutlandırma**: Saklanan bir terminal sekmesi tekrar etkinleştirildiğinde xterm.js ekranının ve odağının (`focus`) otomatik olarak sığdırılması (`fit()`) sağlandı.

### ◆ Hata Gidermeleri (Bug Fixes)
*   **Quick Server Durum/Log Çakışması Giderildi**: Backend'de (`servers-manager.js`) durum güncellemelerini ve logları tekil istemci soket referansı (`this.socket`) üzerinden gönderme yapısı kaldırıldı. Sunucu olaylarını tüm bağlı istemcilere eş zamanlı iletmek için global Socket.IO (`io`) nesnesi kullanıldı. Çoklu terminal sekmeleri bağımsız soketler açsa bile, ana uygulama ekranı sunucu durum güncellemelerini ve loglarını anında almaktadır.

### ■ Yapısal ve Performans İyileştirmeleri (Refactoring & Performance)
*   **Bileşen Ayrıştırma (Decomposition)**: Devasa boyuttaki `App.tsx` bileşeni (678 satır) parçalanarak daha küçük ve modüler alt bileşenlere bölündü:
    *   `src/components/DashboardTab.tsx` (Dashboard ve Arayüz Listesi)
    *   `src/components/TerminalConnectionForm.tsx` (Terminal Bağlantı Formu)
    *   `src/components/TerminalTab.tsx` (Çoklu Oturum ve Sekme Yöneticisi)
*   **Merkezi Tip Güvenliği**: Projedeki ortak veri tipleri `src/types.ts` dosyasına taşınarak TypeScript tip denetimi (`tsc --noEmit`) standartlaştırıldı.
*   **Sunucu Sekme Düzenlemesi**: Hızlı dosya sunucusu sekmeleri soldan sağa **FTP, TFTP, HTTP, HTTPS** şeklinde hizalandı ve FTP varsayılan aktif sekme yapıldı.
*   **Yapay Zekâ Sürüm Yönetim Politikası (`GEMINI.md`)**: Versiyon numaralarının otomatik artırılmasını engelleyen ve yalnızca kullanıcı onayıyla/talebiyle değişmesini sağlayan kural sisteme dahil edildi.

### ▲ Açıklama Şablonu (Description Snippet)
```markdown
# NetTool v1.0.1-beta

## Yenilikler (What's New)
- ◆ **Çoklu Sekmeli Terminal**: Aynı anda birden fazla SSH, Telnet ve Serial console bağlantısı açın ve yönetin.
- ◆ **Oturum Koruma (Keep-Alive)**: Sekmeler arası geçişlerde terminal bağlantılarınız arka planda canlı kalır, hiçbir veri veya oturum kaybolmaz.
- ◆ **Modüler Mimari & Stabilite**: Arayüz ve durum yönetimi yenilenerek uygulama performansı ve kararlılığı artırıldı.
- ◆ **Quick Server Düzenlemesi**: Hızlı FTP, TFTP, HTTP, HTTPS sunucu başlatıcıları yeniden organize edildi.
- ◆ **Yapay Zekâ Sürüm Politikası**: Otomatik sürüm artışları kısıtlandı, kontrol kullanıcıya bırakıldı.
```

---

## [v1.0.0] - 2026-06-15

NetTool uygulamasının ilk kararlı sürümüdür. Ağ mühendisleri ve yöneticileri için kapsamlı bir yerel araç seti sunar.

### ✦ Temel Özellikler (Core Features)
*   **Web Terminal**: Xterm.js emülatörü ile SSH, Telnet (IAC filtreleme destekli) ve Seri Port (COM port) konsol bağlantıları.
*   **Ping & Traceroute**: Canlı paket kaybı ve gecikme jitter analizleriyle gelişmiş ping aracı ve traceroute rota takibi.
*   **Ağ Keşfi (Network Discovery)**: Yerel alt ağdaki aktif cihazları ve MAC adreslerini tarayan "Ping Sweep" aracı.
*   **Hızlı Dosya Sunucuları (Quick Servers)**: Yerel ağda dosya paylaşımı için tek tıkla HTTP, HTTPS (özelleştirilebilir veya dinamik self-signed SSL destekli), FTP (anonim veya şifreli) ve TFTP sunucuları kurma yöneticisi.
*   **Ağ Yardımcı Araçları (Utilities)**: DNS kaydı çözme (DNS resolver), WHOIS domain sorgulama, Wake-on-LAN sihirbazı ve ARP tablosu tanılama aracı.
*   **Hız Testi (Speed Test)**: Cloudflare altyapısını kullanarak paralel HTTP akışlarıyla indirme, yükleme ve ping gecikme testi yapan ölçüm motoru.

### ■ Masaüstü Entegrasyonu (Desktop Shell)
*   Electron çerçevesi kullanılarak frameless (çerçevesiz) modern glassmorphic kullanıcı arayüzü tasarımı.
*   Windows Store (`.appx`) paketleme yapılandırması ve MSI/NSIS kurulum sihirbazları desteği.
