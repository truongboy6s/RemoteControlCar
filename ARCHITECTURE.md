# Car Control App Architecture

## 🧱 Overall Structure

### 🧠 Backend (Node.js + Express + MongoDB)
**MongoDB URL:** `mongodb+srv://truongdodinh16:2k4truong@cluster0.n6ebrwu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

**MongoDB Collections:**
- `users`: Store user information
- `commands`: Store control commands  
- `logs`: Store activity history (who controlled, when, what action)

**API Routes:**
- `/auth/login`, `/auth/register`, `/auth/change-password`
- `/users/` (admin): CRUD + role management
- `/commands/send`: user sends commands
- `/logs`: general history (admin) or personal (user)

### 📱 Flutter App - Main Screens

#### ✅ Login Page
- Email + password input
- Send request to API `/auth/login` → returns JWT
- Role-based navigation:
  - **AdminPage** if role is admin
  - **UserPage** if role is user

#### 👑 Admin Page
**User Management (API: `/users`):**
- List accounts
- Add/Edit/Delete accounts  
- Assign roles user ↔ admin

**Activity History (API: `/logs`):**
- View all user actions
- Filter by action type

**Access Control:**
- Grant/revoke access (API: `/users/grant-access`)

#### 🙋‍♂️ User Page
**Car Control (send commands to ESP32 via backend):**
- Buttons: Forward / Backward / Left / Right / Stop
- Send API: `/commands/send`

**Real-time Distance Monitoring:**
- Backend gets data from ESP32 via MQTT or WebSocket

**Personal History (API: `/logs?user_id=xxx`):**
- Display personal control history

**Profile Management (API: `/users/update`):**
- Update personal information
- Change password (API: `/auth/change-password`)

### 🔌 ESP32 - Arduino
**ESP32 Functions:**
- Receive control commands from backend (REST API or MQTT)
- Send sensor data (distance) to server
- WiFi + HTTP or MQTT communication

---

## 📁 Current File Structure

### Models (`lib/models/`)
- `user.dart` - User data model with roles and permissions
- `command.dart` - Control command model
- `log_entry.dart` - Activity log model  
- `sensor_data.dart` - ESP32 sensor data model

### Services (`lib/services/`)
- `api_service.dart` - REST API communication
- `websocket_service.dart` - Real-time sensor data

### Providers (`lib/providers/`)
- `auth_provider.dart` - Authentication state management
- `car_control_provider.dart` - Car control and sensor state

### Screens (`lib/screens/`)
**Authentication:**
- `login_page.dart`
- `register_page.dart`

**Admin Screens (`admin/`):**
- `admin_page.dart` - Main admin navigation
- `user_management_widget.dart` - User CRUD operations
- `admin_logs_widget.dart` - System activity logs
- `admin_settings_widget.dart` - Admin profile and system settings

**User Screens (`user/`):**
- `user_page.dart` - Main user navigation
- `car_control_widget.dart` - Car control interface
- `sensor_display_widget.dart` - Distance sensor display
- `user_logs_widget.dart` - Personal activity history
- `user_profile_widget.dart` - User profile management

---

## 🚀 Next Steps

### Backend Development Needed:
1. **Node.js + Express Server Setup**
2. **MongoDB Integration**
3. **JWT Authentication Implementation**
4. **REST API Endpoints**
5. **WebSocket/MQTT for ESP32 Communication**

### ESP32 Development Needed:
1. **Motor Control Functions**
2. **Ultrasonic Sensor Integration**  
3. **WiFi Communication Setup**
4. **Command Parsing and Execution**

### Integration:
1. **Update API URLs** in `api_service.dart` and `websocket_service.dart`
2. **Test Real-time Communication**
3. **ESP32 Hardware Setup and Testing**

---

## 🔧 Configuration

**Current Backend URL:** `http://localhost:3000/api`
**Current WebSocket URL:** `ws://localhost:3000`

Update these URLs in:
- `lib/services/api_service.dart`
- `lib/services/websocket_service.dart`

When deploying, change to your production URLs.
