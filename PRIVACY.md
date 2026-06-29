# Privacy Policy for NetTool

This Privacy Policy describes how NetTool ("we", "our", or "us") handles data within the NetTool desktop application.

## 1. Information Collection and Use
NetTool is a local network utility client. 
* **No Personal Data Collection**: We do not collect, store, or process any personal identification information (PII) from our users.
* **No Data Transmission**: All network tools, terminal connections (SSH, Telnet, Serial), ping sweeps, and network utilities run locally on your device. We do not transmit any of your configuration data, network logs, connection credentials, or target hosts to any external servers or third parties.
* **Local Processing**: Any diagnostic logs (such as ping stats, trace routes, speed test results, or terminal logs) are processed in-memory locally within the application and are discarded when you close the session.

## 2. Permissions and Capabilities
Our application requests capabilities such as `runFullTrust` solely to execute local operating system commands (like `ping` and `tracert`), list serial (COM) ports, and initialize local TCP socket streams. These capabilities do not access or harvest user files or personal information.

## 3. Contact Us
If you have any questions or suggestions about this Privacy Policy, feel free to open an issue or contact us on our GitHub repository:
[https://github.com/alicicek-dev/network_tool](https://github.com/alicicek-dev/network_tool)
