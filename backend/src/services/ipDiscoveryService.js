const os = require('os');

class IPDiscoveryService {
  constructor() {
    this.currentIP = null;
    this.lastChecked = null;
    this.ipHistory = [];
    this.checkInterval = null;
    this.callbacks = [];
  }

  // Tự động tìm IP hotspot
  getCurrentNetworkIP() {
    const interfaces = os.networkInterfaces();
    const ips = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ips.push({
            interface: name,
            ip: iface.address,
            netmask: iface.netmask,
            isHotspot: this.isHotspotIP(iface.address)
          });
        }
      }
    }

    // Ưu tiên IP hotspot
    const hotspotIP = ips.find(item => item.isHotspot);
    if (hotspotIP) {
      if (this.currentIP !== hotspotIP.ip) {
        console.log(`🔄 IP changed: ${this.currentIP} → ${hotspotIP.ip}`);
        this.ipHistory.push({
          oldIP: this.currentIP,
          newIP: hotspotIP.ip,
          changedAt: new Date()
        });
        this.currentIP = hotspotIP.ip;
        this.notifyCallbacks(hotspotIP.ip);
      }
      this.lastChecked = new Date();
      return hotspotIP;
    }

    // Fallback to first available IP
    if (ips.length > 0) {
      if (this.currentIP !== ips[0].ip) {
        console.log(`🔄 IP changed: ${this.currentIP} → ${ips[0].ip}`);
        this.currentIP = ips[0].ip;
        this.notifyCallbacks(ips[0].ip);
      }
      this.lastChecked = new Date();
      return ips[0];
    }

    return null;
  }

  isHotspotIP(ip) {
    const hotspotPatterns = [
      /^172\.20\.10\./,   // iPhone hotspot
      /^192\.168\.43\./,  // Android hotspot
      /^192\.168\.137\./  // Windows hotspot
    ];
    return hotspotPatterns.some(pattern => pattern.test(ip));
  }

  // Theo dõi thay đổi IP
  startMonitoring(interval = 10000) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    console.log(`🔍 Starting IP monitoring every ${interval/1000}s`);
    this.getCurrentNetworkIP(); // Initial check

    this.checkInterval = setInterval(() => {
      this.getCurrentNetworkIP();
    }, interval);
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🛑 IP monitoring stopped');
    }
  }

  // Callback khi IP thay đổi
  onIPChange(callback) {
    this.callbacks.push(callback);
  }

  notifyCallbacks(newIP) {
    this.callbacks.forEach(callback => {
      try {
        callback(newIP);
      } catch (error) {
        console.error('Error in IP change callback:', error);
      }
    });
  }

  // Tạo CORS origins động cho tất cả IPs có thể
  generateCORSOrigins() {
    const interfaces = os.networkInterfaces();
    const origins = new Set();

    // Default origins
    origins.add('http://localhost:3000');
    origins.add('http://localhost:8080');
    origins.add('http://127.0.0.1:3000');
    origins.add('http://127.0.0.1:8080');

    // Thêm tất cả IPs với nhiều ports
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          const ip = iface.address;
          const ports = [3000, 8080, 3001, 3002, 5000];
          
          ports.forEach(port => {
            origins.add(`http://${ip}:${port}`);
            origins.add(`https://${ip}:${port}`);
          });
        }
      }
    }

    return Array.from(origins);
  }

  getNetworkInfo() {
    const current = this.getCurrentNetworkIP();
    const interfaces = os.networkInterfaces();
    const allIPs = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          allIPs.push({
            interface: name,
            ip: iface.address,
            netmask: iface.netmask,
            isHotspot: this.isHotspotIP(iface.address)
          });
        }
      }
    }

    return {
      currentIP: current?.ip,
      currentInterface: current?.interface,
      allIPs,
      ipHistory: this.ipHistory,
      lastChecked: this.lastChecked,
      isMonitoring: this.checkInterval !== null
    };
  }

  // Tạo danh sách IP ranges để ESP32 scan
  getIPRangesForESP32() {
    const current = this.getCurrentNetworkIP();
    if (!current) return [];

    const ip = current.ip;
    const parts = ip.split('.');
    const baseIP = `${parts[0]}.${parts[1]}.${parts[2]}`;
    
    return [
      { range: baseIP, start: 1, end: 10 },
      { gateway: `${baseIP}.1`, server: ip }
    ];
  }
}

module.exports = new IPDiscoveryService();
