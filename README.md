# NetTool

NetTool is a desktop utility application designed for network engineers and administrators. Built with React, TypeScript, and Electron, it provides a unified glassmorphic interface to run diagnostic tools, manage remote terminal sessions, scan local subnets, query network data, and verify internet speeds.

[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.0-blue?style=flat-square&logo=vite)](https://vite.dev)
[![Electron](https://img.shields.io/badge/Electron-42-blue?style=flat-square&logo=electron)](https://www.electronjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](https://opensource.org/licenses/MIT)

---

## Key Features

### Web Terminal
A tabbed connection manager with integrated Xterm.js terminal emulation:
* **SSH Client**: Secure Shell connections with support for customizable ports, credentials, and legacy Diffie-Hellman algorithms.
* **Telnet Client**: Raw TCP socket sessions with integrated IAC (Interpret As Command) option filtering to filter control sequences and keep terminal output clean.
* **Serial Port Manager**: Connection capability for serial interfaces (COM ports) with a natural-sorting port list, custom baud rates, and automatic port refresh.

### Ping and Traceroute
* **Live Analytics**: Real-time stats calculation displaying packet loss percentages, minimum, maximum, and average latency.
* **Jitter Calculation**: Tracks ping variation metrics crucial for diagnostic validation of VoIP and high-stability connections.
* **Traceroute**: Live path discovery mapping for packet routing jumps.

### Network Discovery
* **Ping Sweep**: Subnet scanning tool to discover active IP addresses and responsive devices across local networks.

### Network Utilities
* **Wake-on-LAN**: Broadcasts Magic Packets to remote MAC addresses for system wake-up.
* **MAC Vendor Search**: Identifies hardware manufacturers using MAC address queries.
* **DNS Resolver**: Queries and lists DNS records (A, MX, TXT, etc.) for specified hostnames.
* **WHOIS Lookup**: Queries domain registration information.
* **ARP Table Diagnostics**: Views local Address Resolution Protocol table mappings.

### Speed Test
* **Measurement Engine**: Diagnostic speed check measuring round-trip ping latency, download rate, and upload rate using a parallel HTTP streams architecture.

---

## Technology Stack

* **Frontend**: React 19, TypeScript, Tailwind CSS, Xterm.js (for terminal emulation).
* **Backend Shell**: Electron, Node.js `net` core, Express, Socket.IO, `ssh2`, `serialport`.

---

## Installation and Setup

### Prerequisites
* Node.js (v18 or higher)
* npm (Node Package Manager)

### Local Development
1. Clone this repository:
   ```bash
   git clone https://github.com/alicicek-dev/network_tool.git
   cd network_tool
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server and Electron shell:
   ```bash
   npm run dev
   ```

### Production Build
To package the application into standalone Windows installers (NSIS) and portable executables:
1. Ensure all active NetTool running instances are closed.
2. Run the build script:
   ```bash
   npm run build
   ```
3. Standalone binaries will be compiled and saved to the `release/` directory.

---

## License

This project is licensed under the MIT License.
