# NetTool Knowledge Base and Microsoft Store Submission Guide

This document serves as a persistent knowledge repository for the NetTool application (Network Engineer Toolkit), detailing its architecture, compilation steps, packaging requirements, and Microsoft Partner Center publishing workflows.

---

## 1. Technical Architecture and Key Implementations

NetTool is a desktop utility built on the Electron framework using React, TypeScript, and Vite. It provides tools for network testing and device management.

### Telnet Protocol Implementation
- **Backend Core**: Established using Node.js `net.Socket` to handle raw TCP socket connections on port 23.
- **Interpret As Command (IAC) Parsing**: A buffer-filtering mechanism is implemented to capture and filter out Telnet control codes (e.g., `WILL`, `WONT`, `DO`, `DONT`, corresponding to character code `255`). This ensures control characters do not corrupt the Xterm.js terminal output.
- **Frontend Behavior**: Hides username and password inputs when Telnet is selected because Telnet protocols handle authentication interactively through the terminal stream. Automatically switches the default port to `23`.

### SSH Protocol Integration
- **Backend Core**: Implemented using the `ssh2` npm package.
- **Frontend Behavior**: Displays host, port, username, and password fields. Automatically switches the default port to `22`.

### Serial Port (COM) Connection
- Managed via `serialport` for serial console configurations.

---

## 2. Compilation and Packaging

The application is compiled and packaged as an `.appx` bundle for the Windows Store.

### Configuration (`package.json`)
The `build` configuration inside `package.json` contains mandatory Windows Store Identity metadata:
- **identityName**: Must match the exact identity name allocated in Microsoft Partner Center.
- **publisher**: The official Publisher ID (e.g., `CN=...`).
- **publisherDisplayName**: The developer or company name registered on the Store.
- **displayName**: Must match the reserved product name (`NetTool - Network Engineer Toolkit`).

### Privacy Policy Requirement
Because the application is packaged as an Electron desktop app with `runFullTrust` capabilities, Microsoft Store requires a valid Privacy Policy URL.
- **Resolution**: Hosted as `PRIVACY.md` in the public GitHub repository and linked during the Store listing configuration.

### Store Assets (Branding)
Store submissions require specific branded icons. The custom cyan orbital network logo was cropped and saved under `release/store_assets/` in the following required sizes:
- `StoreLogo.png` (50x50)
- `Square44x44Logo.png` (44x44)
- `Square150x150Logo.png` (150x150)
- `Wide310x150Logo.png` (310x150)
- `Square71x71Logo.png` (71x71)
- `Square310x310Logo.png` (310x310)
- `BadgeLogo.png` (24x24)

### Build Command
The package is generated using:
```bash
npm run build
```
This triggers compile commands, types verification (`tsc --noEmit`), and compiles the package into `release/NetTool 1.0.0.appx`.

### Versioning Guidelines
- **Subsequent Sürüm Kuralı**: `v1.0.0` sürümünden sonraki tüm gelecek test ve beta sürümleri aksi belirtilene kadar `v1.0.1 (Beta)` veya `v1.0.1-beta` olarak adlandırılacaktır.


---

## 3. Microsoft Partner Center & Payout Registration

To publish the application as a paid product ($0.99 USD) and receive payouts, developer profiles must be fully set up.

### Tax Profile (W-8BEN)
- Non-US developers must complete the W-8BEN form to claim tax treaty benefits.
- Individual developers register using their full name as the beneficial owner, providing their local tax number (T.C. Kimlik Numarası for Turkey) as the Foreign TIN.

### Payout/Bank Profile (Enpara Bank A.Ş. Configuration)
Enpara is highly recommended due to zero incoming transfer/commission fees for developer payouts in Turkey.

1. **Bank Code / Branch Code / City Code (12-Digit Format)**:
   Microsoft expects a combined 12-digit identifier for Turkish banks:
   `[4-digit Bank Code] + [5-digit Branch Code] + [3-digit City Code]`
   
   - **Bank Code**: `0157` (Enpara Bank A.Ş. official institution code).
   - **Branch Code**: `03663` (Enpara digital branch code).
   - **City Code**: `034` (Istanbul plaka code, representing the bank's headquarters location).
   - **Combined Code**: `015703663034`

2. **Bank Account Number**:
   Extracted as the last 16 digits of the IBAN (from the 11th character to the end):
   - Example format: `0000000084270767`

3. **IBAN**:
   The full 26-character Turkish IBAN starting with `TR`.

4. **Address Details**:
   Must match the bank's registered headquarters address:
   - **Address**: `Esentepe Mahallesi, Buyukdere Caddesi, No: 215`
   - **District/City**: `Sisli / Istanbul`
   - **Postal Code**: `34394`

5. **Beneficiary Details**:
   - The account name must match the developer legal name: `Ali Cicek`.

---

## 4. Submission & Verification Lifecycle
- **Assignment**: Once the tax profile is completed and the payout profile is added, they must be assigned to the **Microsoft Store** program under the Account Settings -> Payout and tax profile assignment page.
- **Verification**: Bank verification takes 24 to 48 hours to complete.
- **Certification**: The app submission has been successfully pushed and is in the `Pre-processing` and `Certification` queue, which takes 1 to 3 business days.
