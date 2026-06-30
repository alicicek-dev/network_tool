# NetTool Sürüm Notları / Release Notes

Bu dosya, NetTool (Network Engineer Toolkit) uygulamasının sürüm geçmişini, yapılan iyileştirmeleri ve eklenen yeni özellikleri belgelendirmektedir. GitHub ve Microsoft Store (Partner Center) güncellemelerinde referans olarak kullanılabilir.

## [v1.0.5] - 2026-06-30

Bu sürüm, önceki sürümde (v1.0.3/v1.0.4) tespit edilen kritik bir Otomatik Güncelleme (Auto-Updater) indirme hatasını çözer. Ayrıca uygulamanın mimarisindeki büyük darboğazları ve arayüz kilitlenmelerini ortadan kaldıran çekirdek refaktörleri içerir.

### ✦ Mimari ve Kararlılık İyileştirmeleri (Architecture & Stability)
*   **Dinamik Port ve Arka Plan İzolasyonu (Process Isolation):** Backend Node.js sunucusunun Electron ana sürecini dondurmaması için `child_process.fork()` ile tamamen ayrı bir iş parçacığında çalışması sağlandı. Backend artık çakışma riski taşıyan sabit `3001` yerine dinamik olarak rastgele boş bir porta atanıyor ve bu port URL parametresi (`?port=XXXX`) ile güvenli şekilde Frontend'e besleniyor.
*   **Arayüz Donmalarının (Event Loop Blocking) Engellenmesi:** Uygulamanın ağ geçidini okurken `execSync` kullanarak tüm arayüzü geçici olarak dondurması (özellikle PowerShell'de yaşanan 1-2 saniyelik takılmalar) tamamen önlendi. Asenkron `util.promisify(exec)` kullanılarak Event Loop'un akıcı çalışması sağlandı.
*   **Çoklu Terminal İzolasyonu:** Soketlerin `forceNew: true` yapısı sayesinde her bir terminal bağlantısının (`sshClient`, `telnetSocket`, vb.) izole bir scope içinde barındığı, bağlantı kapandığında eksiksiz `disconnect` temizlik rutinlerinin (`.end()`, `.destroy()`) çalıştığı test edilip onaylandı.

### ◆ Hata Gidermeleri (Bug Fixes)
*   **Auto-Updater Sessiz İndirme Hatası:** Bir önceki güncellemede çökmeyi engellemek adına devre dışı bırakılan otomatik indirme (`autoDownload: false`) özelliğinin, yeni güncelleme bulunduğunda manuel olarak indirmeyi tetiklemesi gerekiyordu. Eksik olan `autoUpdater.downloadUpdate()` fonksiyonu eklenerek, güncelleme bulundu uyarısından sonra indirme işleminin başarıyla başlaması ve ilerleme çubuğunun (progress) çalışması sağlandı.

---

## [v1.0.4] - 2026-06-30

Bu sürüm; Kapsamlı Kod İnceleme (Code Review) raporu sonucunda tespit edilen güvenlik açıklarının, bellek sızıntılarının (memory leak) ve kararlılık sorunlarının giderilmesini içerir. Ayrıca Ping & Traceroute sekmesindeki UI boşlukları optimize edilmiştir.

### ✦ İyileştirmeler (Improvements)
*   **UI Boşluk Optimizasyonu:** Ping & Traceroute sekmesindeki bileşenler arasında oluşan aşırı dikey boşluklar (margin stacking) giderildi ve daha kompakt bir düzen sağlandı.

### ◆ Hata Gidermeleri (Bug Fixes)
*   **Electron Güvenliği Sıkılaştırıldı:** `openExternal` (URL açma) fonksiyonu sadece `http:` ve `https:` protokolleriyle sınırlandırılarak `file://` veya özel URI tabanlı RCE güvenlik açıkları kapatıldı. `nodeIntegration: false` yapıldı ve Content-Security-Policy (CSP) meta etiketi eklendi.
*   **TFTP Güvenlik Açığı (Path Traversal) Düzeltildi:** Dosya yollarının kök dizinden dışarı çıkmasını sağlayan `../` kullanımı temizlenerek okuma/yazma işlemleri çalışma dizini içine kısıtlandı.
*   **Ayrık Terminal (Active Terminal) İzolasyonu:** `socket.emit('terminal-input')` olayındaki dinleyici tüm açık terminal oturumlarına yayın yapacak şekilde hatalı yapılandırılmıştı. Etkin sekmeyi belirten `activeTerminal` durumuyla sadece aktif ssh/telnet/serial bağlantılarına veri gönderilmesi sağlandı.
*   **Bağlantı Kopmalarında Zombi İşlem Temizliği:** İstemci (tarayıcı) bağlantısı koptuğunda veya sekme kapatıldığında arka planda açık unutulan ping/traceroute döngüleri sonlandırılarak bellek/işlemci sızıntıları önlendi.
*   **SerialPort Hata Denetimi:** Seri port kapanırken veya koptuğunda oluşan Exception hataları giderilerek uygulamadaki çökme (crash) senaryoları önlendi ve bağlantı olay dinleyicileri (event listeners) temizlendi.
*   **React Sonsuz Döngü Riskleri Giderildi:** `TerminalTab` ve `ThemeContext` bileşenlerindeki bağımlılık (dependency) listeleri `useMemo` ve `useRef` yöntemleriyle refaktör edilerek, lüzumsuz `chroma.js` palet hesaplamaları temizlendi.
*   **Auto-Updater Çökme Riski:** İnen güncellemeler esnasında pencere kapanırsa referans hatasından kaynaklanan (`win.isDestroyed`) çökme senaryosu engellendi, sessiz indirme (`autoDownload`) devre dışı bırakıldı.
*   **Hardcoded Renkler Temizlendi:** Tema desteğini (Açık/Koyu) bozan CSS dosyalarındaki sabit renkler, temanın aktif CSS palet değişkenleriyle (örn. `var(--text-primary)`, `var(--danger)`) değiştirildi.

### ■ Yapısal Doğrulamalar & Derleme
*   **Tip Güvenliği:** TypeScript derleyici kontrolü (`tsc --noEmit`) sıfır hata ile tamamlandı.
*   **Paketleme:** Vite üretim derlemesi (`npm run build`) başarıyla tamamlanarak sürüm v1.0.4 kurulum dosyaları oluşturuldu.

### ▲ Açıklama Şablonu (Description Snippet)
```markdown
# NetTool v1.0.4

## Yenilikler (What's New)
- ◆ **Güvenlik İyileştirmeleri**: RCE ve Path Traversal risklerine karşı Electron ve TFTP katmanlarında sıkılaştırmalar yapıldı.
- ◆ **Performans ve Kararlılık**: Zombi işlem temizliği, React re-render optimizasyonları ve seri port çökme korumaları eklendi.
- ◆ **UI İyileştirmeleri**: Ping & Traceroute araçlarındaki aşırı dikey boşluklar düzeltilerek daha derli toplu bir görünüm elde edildi.
```

---

## [v1.0.3] - 2026-06-29

Bu sürüm; ağ protokolleri (SSH, Ping, TFTP, FTP) üzerindeki kritik hata düzeltmelerini, kararlılık iyileştirmelerini ve dosya aktarım süreçlerinin gerçek zamanlı izlenmesini sağlayan ilerleme göstergelerini içerir.

### ✦ Yeni Özellikler (New Features)
*   **FTP & TFTP Dosya Transferi İlerleme Göstergesi:** FTP ve TFTP dosya gönderme/alma işlemlerinin gerçek zamanlı takibi eklendi. İndirme (Download) işlemlerinde yüzdesel (%) ilerleme gösterilirken, yükleme (Upload) işlemlerinde eğer karşı istemci dosya boyutunu önceden bildirirse (TFTP tsize / FTP STOR stream) yüzdesel ilerleme, bildirilmezse toplam aktarılan dosya boyutu MB cinsinden anlık olarak sunucu loglarında takip edilebilmektedir.

### ◆ Hata Gidermeleri (Bug Fixes)
*   **TFTP Büyük Dosya (>32MB) Gönderim Hatası Düzeltildi:** TFTP protokolünde kullanılan 16-bitlik sıra numarası (block number) sınırı olan 65535 aşıldığında, `tftp2` kütüphanesi taşma (wrap-around) yapmıyor ve Buffer'a 65536 yazmaya çalışırken `RangeError: The value of "value" is out of range` hatası vererek transferi kesiyordu. `servers-manager.js` başlangıcına eklenen dinamik yama (monkeypatch) sayesinde, paket kodlama ve doğrulama aşamalarındaki blok numaraları `modulo 65536` işlemine tabi tutularak, 32MB'tan büyük dosyaların (örneğin Cisco IOS `.tar` imajları) sorunsuz bir şekilde taşma yaparak aktarılması sağlandı.
*   **Ping Arayüzü Kilitlenme ve Bağlantı Kopma Hatası Düzeltildi:** Ping ve Multi-ping araçlarında kullanılan asenkron `setInterval` döngüsü, ardışık zaman aşımları (request timeout) sırasında yeni `ping.exe` süreçlerinin birikmesine ve Node.js event loop'unu bloke ederek Socket.IO bağlantısının kopmasına yol açıyordu. Bu döngüler, birbirini bekleyen sıralı `setTimeout` mekanizması ile yeniden yapılandırılarak işlem birikmesi önlendi ve sıra numaralarının (seq) tutarlılığı sağlandı.
*   **SSH Handshake Hatası Düzeltildi:** SSH bağlantılarında yaşanan `Handshake failed: no matching C->S MAC` hatası giderildi. Bağlantı yöneticisinin algoritma listesine hem modern güvenli varsayılanlar (Encrypt-then-MAC - EtM algoritmaları, SHA-2 tabanlı RSA imzaları vb.) hem de eski ağ cihazlarıyla geriye dönük uyumluluğu korumak için gerekli legacy algoritmalar eklendi. Electron ortamındaki BoringSSL kısıtlamaları nedeniyle desteklenmeyen `chacha20-poly1305@openssh.com` şifreleyicisi listeden hariç tutularak uyumluluk sağlandı.
*   **SSH Klavye-Etkileşimli (Keyboard-Interactive) Kimlik Doğrulama Hataları Düzeltildi:** Özellikle TACACS+ veya local AAA yapılandırmasına sahip bazı Cisco ağ cihazlarına bağlanırken oluşan `SSH Error: All configured authentication methods failed` hatası giderildi. SSH bağlantı seçeneklerine `tryKeyboard: true` eklenerek ve `keyboard-interactive` olayı dinlenerek, cihazın şifre veya kullanıcı adı istemlerine (prompts) otomatik cevap verilmesi sağlandı. Ayrıca eski cihazlarla uyumluluk için `blowfish-cbc`, `cast128-cbc`, `arcfour` gibi legacy şifreleyiciler (ciphers) destek listesine eklendi ve bağlantı zaman aşımı süresi (`readyTimeout`) 20 saniyeye yükseltildi.
*   **Network Overview Tablo Yazı Tipleri Tutarsızlığı Düzeltildi:** Tablodaki karışık yazı tipi kullanımı (monospace ve sans-serif karışımı) giderildi; tablo başlıkları ile IP, Gateway ve MAC adresleri gibi hücrelerdeki tüm veriler uygulamanın genel temasıyla uyumlu olacak şekilde temiz **Inter** (sans-serif) fontu ile birleştirildi.
*   **Web Terminal Tam Ekran Uyumsuzluğu Düzeltildi:** Ping ve terminal ekranı tam ekran yapıldığında veya pencere boyutu değiştirildiğinde, xterm.js terminal satır ve sütun boyutlarının konteynere otomatik uyum sağlayamaması (text-wrap bozulması) giderildi. `TerminalComponent` içindeki klasik pencere `resize` dinleyicisi yerine, DOM elemanındaki her türlü boyut değişimini (tam ekran yapma, sekmeler arası geçişler vb.) anlık olarak yakalayan **`ResizeObserver`** mekanizması entegre edildi.
*   **FTP Dosya Çekme (Download/RETR) ve İletişim Protokolü Hataları Düzeltildi:** Cisco cihazlarından `copy ftp://...` ile dosya çekmek istenirken yaşanan `Protocol error` hatası giderildi. `ftp-srv` kütüphanesinin Promise dönen `read()` yöntemi ve sarmalanmış nesne dönen `write()` yöntemi `ProgressFileSystem` alt sınıfında yanlış (doğrudan stream objesi olarak) ele alınmasından kaynaklanan TypeError çökmeleri giderildi. Ayrıca, FTP sunucusuna tüm komut alışverişini (`USER`, `PASS`, `PORT`, `PASV`, `RETR`, `STOR` ve sunucu yanıt kodlarını) arayüze anlık yazdıran bir **detaylı log sistemi** eklendi; böylece dosya transferi sırasında yaşanan dosya bulunamadı (550) veya ağ kesintisi gibi durumların tam teşhisi sağlandı.
*   **SSH Dinamik Terminal Boyutlandırma (Resize) Senkronizasyonu Sağlandı:** SSH bağlantısı etkinken başka bir sekmeye gidip tekrar SSH sayfasına dönüldüğünde veya pencere boyutu değiştiğinde, xterm.js ekranındaki sütun ve satırların daralarak yazıların yarım kalması veya bozulması giderildi. Frontend'deki `onResize` olay dinleyicisi ile xterm.js üzerindeki her boyut değişimi yakalanarak backend'e `terminal-resize` soket sinyaliyle iletildi ve backend üzerindeki aktif SSH pseudo-terminal (pty) penceresi `sshStream.setWindow(rows, cols, 0, 0)` ile anlık olarak güncellendi. Ayrıca bağlantı kurulurken (`connect-ssh`) mevcut terminal satır ve sütun boyutları ilk parametre olarak gönderilerek oturumun doğrudan doğru boyutlarda başlaması sağlandı.
*   **Cisco Switch FTP Agresif Kopma ve Log Hataları Düzeltildi:** Cisco anahtarlarının dosya aktarımı sırasında veya hemen sonrasında bağlantıyı aniden kesmesi (TCP RST) sebebiyle terminalde oluşan `ECONNRESET`, `socket has been ended by the other party` gibi zararsız kopma uyarılarının loglanması engellendi. Ayrıca sunucunun özel loglama motoru güncellenerek, hata objelerinin ekranda `[object Object]` olarak basılması hatası giderildi ve gerçek hata mesajlarının okunabilir bir formatta yansıtılması sağlandı.

### ▲ Açıklama Şablonu (Description Snippet)
```markdown
# NetTool v1.0.3

## Yenilikler (What's New)
- ◆ **Dosya Transferi İlerleme Göstergesi**: FTP ve TFTP üzerinden dosya transfer işlemlerinin yüzdesel ilerleme (%) ve hız bilgilerini anlık olarak izleyin.
- ◆ **Büyük Dosya Transfer Desteği (TFTP Rollover)**: Cisco switch yazılım paketleri gibi 32 MB'tan büyük dosyaların aktarımındaki limit aşımı hatası giderildi.
- ◆ ** SSH Uyumluluk ve Ping Kararlılığı**: Eski Cisco cihazları ile SSH bağlantı sorunları ve ping süreçlerinin birikerek bağlantıyı koparma hataları çözüldü.
```

---

## [v1.0.2] - 2026-06-17

Bu sürüm; uygulamanın görsel kimliğini jenerik yapay zekâ şablonlarından arındırıp premium, yüksek performanslı bir "koyu teknoloji" (dark tech) temasına ("Sapphire & Steel") kavuşturmak için gerçekleştirilen kapsamlı görsel yeniden tasarım ve arayüz cilalama çalışmasını içerir.

### ✦ Görsel Yeniden Tasarım & Estetik (Premium Overhaul)
*   **Koyu Teknoloji Renk Paleti:** Arka plan renkleri derin bir lacivert-siyah tonuna (`#08080d`), panel arka planları ise ince kenarlıklı (`rgba(255, 255, 255, 0.04)`) yarı saydam panellere dönüştürüldü.
*   **Modern Kenar Çubuğu Navigasyonu:** Sol menüdeki eski kalın ve sol kenara dayalı aktif durum çizgisi yerine, modern ve yüzen safir mavisi (`#74c7ec`) kapsül göstergeleri (`.nav-item.active::before`) uygulandı. Aktif tıklamada mikro ölçek küçülmesi (`scale(0.97)`) ile dokunsal geri bildirim güçlendirildi.
*   **Tipografik Düzenleme:** Başlıklar (`h1`, `h2`) sıkı harf aralığı ve net kalınlık ayarlarıyla optimize edildi. Monospace metinler teknik telemetri verisi görünümünü artırmak için özel boyutlandırma ve harf aralığı ile güncellendi.
*   **Gelişmiş Telemetri Tabloları:** Donanım arayüz listesi tablosu, gereksiz satır içi stillerden arındırılarak `.telemetry-table` ve `.telemetry-row` yapısına kavuşturuldu; veriler monospace ve kompakt biçimde hizalandı.
*   **Bento Hızlı İşlem Modülleri:** Sayfa altındaki basit işlem butonları, fareyle üzerine gelindiğinde yukarı doğru kayma ve kenarlık parlaması (glow) efekti sunan, ikonlu ve teknik açıklamalı üç adet Bento Kartından oluşan modern bir ızgara düzenine dönüştürüldü.

### ✦ Yeni Özellikler (New Features)
*   **"Hakkında" (About) Modalı:** Uygulamanın genel bilgilerini (geliştirici, lisans, telif hakkı ve sürüm bilgisi) dinamik olarak `package.json` üzerinden okuyup gösteren, güncellemeleri kontrol etme butonu ve GitHub bağlantısı içeren modern bir modal eklendi. Menü çubuğunun en altına entegre edildi.

### ◆ Hata Gidermeleri (Bug Fixes)
*   **Açık Tema (Light Theme) Hataları Düzeltildi:** Uygulamanın açık (light) temaya geçiş yaptığında karanlık kalması sorunu tamamen giderildi. CSS dosyasındaki hardcoded arka plan, başlık, kenarlık, girdi alanları ve buton renkleri CSS değişkenleriyle değiştirildi.
*   **Ağ Keşfi, Ping ve Hızlı Sunucular Temalandırması:** Network Discovery, Ping ve Quick Server bileşenlerindeki tüm gömülü/hardcoded `rgba(0,0,0,0.2)` vb. koyu tonlar CSS değişkenleriyle (`var(--hover-overlay)`, `var(--card-bg)`, `var(--input-bg)`) değiştirilerek açık ve özel temaya tam uyum sağlandı.
*   **Web Terminal Dinamik Temalandırma:** `TerminalComponent` (xterm.js) arkaplan, yazı ve seçim renkleri uygulamanın aktif tema paletine (`palette`) bağlandı. Tema değiştiğinde terminal renkleri dinamik ve anlık olarak güncellenir hale getirildi. Terminal konteyner arkaplanı (`.terminal-container`) sert siyah renk yerine tema bazlı dinamik `var(--card-bg)` olarak ayarlandı.
*   **Terminal Bağlantı Formu Görsel Düzeltmeleri:** Seri port yenileme butonu, baudrate açılır seçim menüsü ve girdi alanları, açık ve koyu temalarda okunabilirliği bozmayacak şekilde tema değişkenleriyle güncellendi.
*   **Özel Tema (Custom Theme) Refaktörü:** Özel temanın renk seçicisi mantıksal gruplara ayrıldı (Paneller, Arka Plan, Kenarlıklar vb.). Eksik olan saydam renkler veya uyumlu arayüz zeminleri kullanıcı renklerinden dinamik olarak türetilerek (derived) arayüzde karanlık kalan parçaların olması engellendi.
*   **Tema-Duyarlı Durum ve Bildirim Renkleri:** Başarı (success), tehlike (danger) ve uyarı (warning) durum renkleri ile bunlara ait yarı saydam arka plan ve kenarlık stilleri, açık ve koyu temalara dinamik ve kontrastlı uyum sağlayacak şekilde CSS değişkenleri (`--success`, `--success-rgb`, vb.) ile yeniden yapılandırıldı. Özel tema seçeneği içine bu renkler de eklendi.
*   **Hız Testi ve Ping Statü Renkleri:** Hız testi, ping ve ağ yardımcı araçlarında eksik veya tanımlanmamış olan `var(--primary)` renk değişkeni, uygulamanın dinamik vurgu rengi (`var(--accent-color)`) ile değiştirilerek görsellik onarıldı.
*   **Varsayılan Görünüm Ayarları:** Uygulamanın ilk açılışındaki varsayılan yazı tipi boyutu 14px yerine 16px olarak güncellendi.

### ▲ Açıklama Şablonu (Description Snippet)
```markdown
# NetTool v1.0.2

## Yenilikler (What's New)
- ◆ **"Hakkında" Ekranı**: Sürüm, lisans, telif hakkı ve güncelleme denetimi sunan modern modal entegrasyonu.
- ◆ **Premium Görsel Kimlik**: "Sapphire & Steel" temalı, yüksek yoğunluklu koyu teknoloji tasarımı.
- ◆ **Bento Hızlı İşlemler**: Arayüzün altındaki basit butonlar, hover mikro animasyonlu etkileşimli bento kartlarına dönüştürüldü.
- ◆ **Telemetri Düzeni**: Ağ donanım arayüzleri tablosu, temiz monospace fontlar ve kompakt durum etiketleriyle yeniden tasarlandı.
- ◆ **GPU Hızlandırmalı Animasyonlar**: Menü geçişleri ve pencereler donanım hızlandırma için özel özellik geçişleriyle optimize edildi.
```

---

## [v1.0.1] - 2026-06-16

Bu sürüm; uygulamanın modülerliğini artırmak, performans optimizasyonları sağlamak, çoklu oturum desteği sunmak amacıyla gerçekleştirilen büyük bir refaktör çalışmasını ve **emil-design-eng** kurallarına göre gerçekleştirilen kapsamlı bir arayüz/animasyon parlatma çalışmasını içerir.

### ✦ Arayüz ve Animasyon İyileştirmeleri (UI/UX Polish)
*   **Kayıp Tab Geçişleri (Fade-In Animasyonu)**: React sekmelerinde kullanılan ancak CSS dosyasında eksik olan `.fade-in` sınıfı, özel `cubic-bezier(0.23, 1, 0.32, 1)` yumuşatması ve 220ms geçiş hızıyla yeniden tanımlandı. Sekmeler artık yumuşak bir yükselme ve opaklık animasyonuyla açılmaktadır.
*   **Köken-Duyarlı Açılır Menü Animasyonları (Origin-Aware Dropdowns)**: Custom select ve baudrate preset menüleri gibi açılır pencerelerin instant (anında çıtlayarak) belirmesi yerine tetikleyici butonun altından aşağı doğru yumuşakça ölçeklenerek (`transform-origin: top` ve `scaleY`) açılması sağlandı.
*   **Snappy Kart Hover Geçişleri**: Dashboard'daki `.stat-card` bileşenlerindeki aşırı esnek/sekme yapan demode hover eğrisi, modern ve çok daha hızlı (`200ms`) bir `ease-out` eğrisiyle değiştirildi.
*   **Gereksiz "all" Geçişlerinin Kaldırılması**: Menü ögeleri ve butonlar gibi elemanlarda kullanılan performans düşürücü `transition: all` tanımları yerine, sadece değişen özellikler (`background-color`, `transform` vb.) spesifik olarak tanımlanarak donanım hızlandırma (GPU) optimizasyonu yapıldı.
*   **Mobil/Touch Hover Koruması**: Dokunmatik ekranlarda buton ve menü ögelerinin üzerine tıklandığında hover durumunun yapışkan kalmasını (sticky hover) önlemek için tüm hover kuralları `@media (hover: hover) and (pointer: fine)` medya sorgusu içerisine alındı.
*   **Buton Ölçekleme Senkronizasyonu**: Açılarak/kapatılarak durum değiştiren bazı butonların inline geçiş (transition) tanımları güncellenerek hover/click anındaki `scale` dönüşümünün anlık sıçraması engellendi ve akıcılık sağlandı.

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
# NetTool v1.0.1

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
