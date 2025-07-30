# 🚀 HƯỚNG DẪN CHẠY HỆ THỐNG CAR CONTROL

## 📋 **DANH SÁCH KIỂM TRA**

### 📦 **1. Chuẩn bị phần cứng:**
- ✅ ESP32 board
- ✅ Ultrasonic sensor (HC-SR04)
- ✅ Servo motor
- ✅ Motor driver (L298N)
- ✅ 2x DC motors
- ✅ Nguồn điện
- ✅ Dây nối

### 📚 **2. Thư viện Arduino cần cài:**
```
ESP32Servo
ArduinoJson (version 6.x)
WebSocketsClient by Markus Sattler
```

### 🌐 **3. Mạng WiFi:**
- ✅ Tên: "TruongVu"
- ✅ Password: "20042006"
- ✅ Đảm bảo ESP32 và máy tính cùng mạng

---

## 🔧 **BƯỚC 1: UPLOAD CODE LÊN ESP32**

### 1.1 Mở Arduino IDE
```bash
# Mở file: esp32_car_control.ino
```

### 1.2 Cài đặt thư viện
```
Tools > Manage Libraries > Search:
- ESP32Servo
- ArduinoJson
- WebSocketsClient
```

### 1.3 Chọn board ESP32
```
Tools > Board > ESP32 Arduino > ESP32 Dev Module
```

### 1.4 Upload code
```
Click Upload button (→)
```

### 1.5 Mở Serial Monitor
```
Tools > Serial Monitor
Baud rate: 115200
```

**Kết quả mong đợi:**
```
=== ESP32 Car Control Starting ===
✅ WiFi connected!
📍 ESP32 IP address: 192.168.1.xxx
🔍 Searching for backend server...
Testing: 192.168.1.1... ❌
Testing: 192.168.1.100... ✅ FOUND!
🎯 Backend server: 192.168.1.100:3000
🔌 WebSocket client started
=== ESP32 Car Control Ready! ===
```

---

## 🔧 **BƯỚC 2: CHẠY BACKEND**

### 2.1 Mở terminal trong thư mục backend
```powershell
cd c:\src\car_app\backend
```

### 2.2 Cài đặt dependencies (nếu chưa)
```powershell
npm install
```

### 2.3 Khởi động backend
```powershell
npm start
```

**Kết quả mong đợi:**
```
🚀 Car Control Backend Server Started!
📍 Server running on port 3000
🌐 API Base URL: http://localhost:3000/api
🔌 WebSocket URL: ws://localhost:3000
MongoDB Connected: ...
WebSocket service initialized
```

---

## 🔧 **BƯỚC 3: CHẠY FLUTTER APP**

### 3.1 Mở terminal trong thư mục app
```powershell
cd c:\src\car_app
```

### 3.2 Khởi động Flutter app
```powershell
# Chạy trên web (Chrome)
flutter run -d chrome

# HOẶC chạy trên Android emulator
flutter run -d emulator-5554
```

**Kết quả mong đợi:**
```
Launching lib\main.dart on Chrome in debug mode...
Flutter app running on: http://localhost:xxxxx
```

---

## ✅ **BƯỚC 4: KIỂM TRA KẾT NỐI**

### 4.1 Kiểm tra Serial Monitor ESP32
```
🔌 WebSocket Connected to: ws://192.168.1.100:3000
📨 Received: {"type":"device_info",...}
📊 Sensor: 25cm, Mode: IDLE
```

### 4.2 Kiểm tra Backend Log
```
Client connected: xyz123
ESP32 device registered: xyz123
Sensor data from ESP32: {"distance":25,...}
```

### 4.3 Kiểm tra Flutter App
- ✅ "Backend: Connected" (màu xanh)
- ✅ "ESP32 Car: Online" (màu xanh)
- ✅ Hiển thị sensor data

---

## 🎮 **BƯỚC 5: TEST HỆ THỐNG**

### 5.1 Test từ Flutter App
1. Mở User Page > Car Control
2. Chọn "Manual" mode
3. Nhấn các nút: Forward, Backward, Left, Right, Stop
4. Kiểm tra xe di chuyển theo lệnh

### 5.2 Test từ Serial Monitor
```
# Gõ lệnh vào Serial Monitor:
forward
backward
left
right
stop
auto
manual
```

### 5.3 Test Auto Mode
1. Chọn "Auto" mode trong app
2. Đặt vật cản trước xe
3. Xe sẽ tự động lùi lại và quay hướng

---

## 🔧 **BƯỚC 6: TROUBLESHOOTING**

### 6.1 ESP32 không kết nối WiFi
```
❌ WiFi connection failed!
```
**Giải pháp:**
- Kiểm tra tên WiFi và password
- Kiểm tra tín hiệu WiFi
- Reset ESP32 và thử lại

### 6.2 ESP32 không tìm thấy Backend
```
⚠️ Backend server not found. Using manual IP...
```
**Giải pháp:**
- Kiểm tra backend có đang chạy
- Kiểm tra IP máy tính: `ipconfig`
- Cập nhật IP trong code ESP32

### 6.3 Flutter App không kết nối
```
❌ WebSocket connection failed
```
**Giải pháp:**
- Kiểm tra backend đang chạy
- Kiểm tra URL trong API service
- Restart Flutter app

### 6.4 Xe không di chuyển
```
📨 Received: {"type":"command","action":"forward"}
```
**Giải pháp:**
- Kiểm tra kết nối motor
- Kiểm tra nguồn điện
- Kiểm tra code motor control

---

## 🎯 **BƯỚC 7: DEMO HOÀN CHỈNH**

### 7.1 Kịch bản demo
1. **Khởi động:** Backend → ESP32 → Flutter App
2. **Kết nối:** Tất cả hiển thị "Connected/Online"
3. **Manual Control:** Điều khiển xe từ app
4. **Auto Mode:** Xe tự động tránh vật cản
5. **Sensor Data:** Hiển thị real-time trên app
6. **Logs:** Xem lịch sử commands trong Admin Panel

### 7.2 Thử nghiệm
- ✅ Điều khiển xe từ xa qua WiFi
- ✅ Hiển thị sensor data real-time
- ✅ Chế độ tự động tránh vật cản
- ✅ Ghi log tất cả hoạt động
- ✅ Quản lý users và permissions

---

## 🎉 **THÀNH CÔNG!**

Nếu tất cả các bước trên hoạt động, bạn đã có một hệ thống car control hoàn chỉnh:
- 🎮 **Flutter App** - Giao diện điều khiển
- 🔧 **Node.js Backend** - API và WebSocket server
- 🤖 **ESP32 Car** - Xe thông minh với sensor
- 📊 **Real-time Communication** - Tất cả kết nối với nhau

**Chúc mừng! Hệ thống của bạn đã sẵn sàng! 🚀**
