# NetTool Developer & AI Instructions (GEMINI.md)

Bu dosya, NetTool projesinde çalışacak yapay zekâ asistanları ve geliştiriciler için projenin standartlarını, mimari kurallarını ve derleme komutlarını tanımlar. Her çalışma oturumunda en yüksek önceliğe sahiptir.

---

## 1. Proje Özeti & Teknoloji Yığını

NetTool, ağ yöneticileri için geliştirilmiş bir masaüstü araç setidir (React 19 + TypeScript + Electron + Socket.IO + Node.js).
*   **Arayüz**: React 19, Tailwind CSS ve Vanilla CSS (Glassmorphism temalı).
*   **Terminal**: Xterm.js (SSH, Telnet ve Seri konsol bağlantıları için).
*   **İletişim**: Socket.IO (Gerçek zamanlı ağ araçları) ve Express API'leri.

---

## 2. Derleme ve Çalıştırma Komutları (Build & Commands)

Asistanlar kod değişikliklerini doğrulamak için aşağıdaki komutları kullanmalıdır:

*   **Geliştirici Sunucusu (Dev Server)**: `npm run dev`
*   **Tip Kontrolü (Type Check)**: `npx tsc --noEmit`
*   **Üretim Derlemesi ve Paketleme**: `npm run build` (Tasarım Vite ile derlenip Electron-builder ile `.appx` veya setup dosyalarına dönüştürülür).

---

## 3. Mimari Kurallar ve Standartlar

### A. Oturum Koruma ve Performans (Tab Keep-Alive)
*   **Asla Sökme (No Unmounting)**: Ana sekmeler (Dashboard, Ping, Terminal vb.) arasında geçiş yapılırken oturumların kopmaması için sekmeler unmount edilmemelidir. Bunun yerine sekmeleri sarmalayan div'ler CSS `display: none` / `display: block` kuralları ile gizlenip gösterilmelidir.
*   **Terminal Canlandırma**: Terminal sekmesi tekrar aktif hale geldiğinde xterm.js ekranının doğru boyutlandırılması ve odağı alması için `TerminalComponent` içindeki `isActive` özelliğini ve fit tetikleyicisini kullanın.

### B. Çoklu Terminal Bağlantıları (Tabbed Terminals)
*   **Soket İzolasyonu**: Birden fazla aktif SSH/Telnet oturumunun backend üzerinde çakışmaması için, her terminal örneğinin Socket.IO bağlantısı bağımsız olmalıdır (`forceNew: true` parametresiyle çağrılmalıdır).

### C. Dosya ve Bileşen Organizasyonu
*   **Modülerlik**: Bileşenlerin çok büyük dosyalara dönüşmesini engelleyin. `App.tsx` dosyasını temiz tutun. Arayüz mantığı, bağlantı formları ve terminal yöneticisi gibi yapıları `src/components/` altında ayrı dosyalarda toplayın.
*   **Ortak Tipler**: Projedeki tüm ortak TypeScript veri tiplerini `src/types.ts` dosyası içinde tanımlayın.
*   **Tip-Güvenli İçe Aktarma**: Projede `verbatimModuleSyntax` seçeneği etkindir. Tip tanımları içe aktarılırken her zaman `import type` sentaksı kullanılmalıdır (örn: `import type { NetworkInterface } from './types';`).

### D. Telnet IAC ve Seri Port Yönetimi
*   **IAC Filtreleme**: Backend Telnet soketinde (`server.js`), terminal ekranını bozan kontrol karakterlerinin ayıklanması için buffer-filtering IAC mekanizmasının korunduğundan emin olun.
*   **Doğal Sıralama (Natural Sort)**: Seri portlar listelenirken her zaman doğal sıralama uygulanmalıdır (örn: COM2, COM10'dan önce gelmelidir).

---

## 4. Sürüm Yönetimi ve Dokümantasyon (Version Management & Documentation)

*   **Sürüm Notları Kaydı (Release Changelog)**: Uygulamanın versiyonu her değiştiğinde (örneğin `package.json` içindeki `version` değeri güncellendiğinde veya yeni bir özellik eklendiğinde), gerçekleştirilen tüm yenilikler, yapısal değişiklikler ve iyileştirmeler uygun bir formatta [RELEASE.md](file:///c:/ai_projelerim/network_tool/RELEASE.md) dosyasına işlenmelidir.

