# NetTool — Network Engineer Toolkit

NetTool is a high-performance, modern desktop utility application designed specifically for network engineers, system administrators, and developers. Built on a cutting-edge stack of **React 19**, **TypeScript**, and **Electron**, it brings together essential diagnostic tools, remote terminals, subnet scanners, and utility engines into a single, unified, and beautiful **glassmorphic dark-mode** application.

---

## Key Features

### Multi-Tabbed Web Terminal
Manage multiple remote connections concurrently using xterm.js terminal emulation:
* **SSH Client**: Secure Shell shell sessions with custom port, credential options, and support for legacy Diffie-Hellman algorithms.
* **Telnet Client**: Raw TCP socket sessions with custom Interpret As Command (IAC) option filtering to ensure clean and correct character rendering.
* **Serial Port Manager**: Connect to hardware interfaces (COM ports) featuring a natural-sorting port list, custom baud rates, and live port auto-refresh.

### Ping, Traceroute & Jitter Diagnostics
* **Live Latency Analytics**: Real-time round-trip latency tracking calculating minimum, maximum, and average times with live packet loss percentages.
* **Jitter Verification**: Advanced ping variation calculations crucial for VoIP diagnostics and high-stability network validations.
* **Traceroute**: Live path discovery charting routing hops to destination hosts.

### Network Discovery
* **Ping Sweep**: Fast subnet scanning engine to discover active IP addresses and responsive devices across local networks.

### Quick File Servers
Spin up local file-sharing servers instantly with a single click:
* **FTP Server**: Configurable port, anonymous or credentialed access.
* **TFTP Server**: Fast file transfer server for firmware upgrades.
* **HTTP & HTTPS Servers**: Static file servers with support for automatic self-signed SSL certificate generation.

### Network Utilities
* **Wake-on-LAN**: Broadcasts Magic Packets to remote MAC addresses to wake up offline nodes.
* **MAC Vendor Query**: Identifies hardware manufacturers using MAC address queries.
* **DNS Resolver**: Performs full DNS record resolution (A, MX, TXT, CNAME, etc.) for specified domains.
* **WHOIS Lookup**: Queries domain registration records.
* **ARP Table Diagnostics**: Inspects Address Resolution Protocol mappings.

### Integrated Speed Test
* **Measurement Engine**: Diagnostic speed check measuring latency, download, and upload rates using a parallel HTTP stream architecture connected to Cloudflare infrastructure.

---

## Design & Craftsmanship
The interface has been meticulously designed following advanced design engineering principles:
* **Glassmorphic Theme**: Sophisticated dark-mode panel transparency using hardware-accelerated backdrop filters.
* **Snappy Micro-animations**: Custom timing curves (`cubic-bezier(0.23, 1, 0.32, 1)`) for UI interactions, active button presses (`scale(0.97)`), and smooth dropdown reveals.
* **Mobile/Touch Protection**: Touch devices are shielded from "sticky hovers" using fine-pointer media query wrappers.

---

## Technology Stack
* **Frontend**: React 19 (Hooks, Context, Conditional Rendering), TypeScript, Tailwind CSS, Xterm.js
* **Backend**: Electron, Node.js, Express, Socket.IO (for real-time communication), SSH2, SerialPort

---

## Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* [npm](https://www.npmjs.com/) (Node Package Manager)

### Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/alicicek-dev/network_tool.git
   cd network_tool
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Launch the development server and Electron container:
   ```bash
   npm run dev
   ```

### Production Build
To compile and package the application into standalone Windows installers (NSIS) and portable binaries:
1. Ensure all active NetTool runtime instances are closed.
2. Run the build script:
   ```bash
   npm run build
   ```
3. Standalone binaries will be compiled and saved to the `release/` directory.

---

## License
This project is licensed under the MIT License.
