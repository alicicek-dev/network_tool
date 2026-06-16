export interface NetworkInterface {
  name: string;
  ip: string;
  mac: string;
  gateway?: string;
}

export interface SerialPortInfo {
  path: string;
  friendlyName?: string;
  manufacturer?: string;
}
