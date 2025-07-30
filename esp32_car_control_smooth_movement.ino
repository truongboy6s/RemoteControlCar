#include <WiFi.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <WebSocketsClient.h>

// WiFi credentials
const char* ssid = "TruongVu";
const char* password = "20042006";

// Backend server configuration
const char* websocket_server = "192.168.1.101";
const int websocket_port = 3001;

// Hardware pins
#define trigPin 5
#define echoPin 18
#define servoPin 13  // Changed from pin 4 to pin 13 - better PWM pin
#define ENA 25
#define ENB 33
#define IN1 26
#define IN2 27
#define IN3 14
#define IN4 12
#define LED_PIN 2

// Control variables
Servo myServo;
WebSocketsClient webSocket;
bool autoMode = false;
bool remoteMode = false;
String currentCommand = "";
unsigned long lastHeartbeat = 0;
unsigned long lastSensorRead = 0;
unsigned long lastActivity = 0;
bool isConnected = false;

// Timing intervals
const unsigned long SENSOR_INTERVAL = 2000;    // 2 seconds
const unsigned long HEARTBEAT_INTERVAL = 30000; // 30 seconds
const unsigned long AUTO_SENSOR_INTERVAL = 100; // 0.1 seconds in auto mode - FAST response

// Motor speed - MAXIMUM POWER FOR GROUND MOVEMENT
const int MOTOR_SPEED = 255; // MAXIMUM speed for better movement on ground

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== ESP32 Car Control - Fixed Motor Movement ===");

  // Initialize hardware pins
  setupHardware();
  
  // Connect to WiFi
  setupWiFi();

  // Setup WebSocket connection
  setupWebSocket();

  Serial.println("🚗 ESP32 Car Ready!");
  lastActivity = millis();
}

void setupHardware() {
  // Motor control pins
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);
  
  // Sensor pins
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(LED_PIN, OUTPUT);

  // NO SERVO - Using ultrasonic sensor only for navigation
  Serial.println("🔧 Hardware setup - NO SERVO, ultrasonic sensor only");

  // Stop motors initially
  stopMotors();
  
  Serial.println("✅ Hardware initialized - Ready for ultrasonic navigation");
}

void setupWiFi() {
  Serial.print("🌐 Connecting to WiFi: " + String(ssid));
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
    digitalWrite(LED_PIN, attempts % 2); // Flash LED
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.println("📡 IP: " + WiFi.localIP().toString());
    Serial.println("📶 RSSI: " + String(WiFi.RSSI()) + " dBm");
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.println("\n❌ WiFi Connection Failed!");
    digitalWrite(LED_PIN, LOW);
  }
}

void setupWebSocket() {
  Serial.println("🔌 Connecting to WebSocket: ws://" + String(websocket_server) + ":" + String(websocket_port));
  webSocket.begin(websocket_server, websocket_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  webSocket.enableHeartbeat(15000, 3000, 2);
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("🔌❌ WebSocket Disconnected!");
      isConnected = false;
      remoteMode = false;
      if (!autoMode) stopMotors();
      updateStatusLED();
      break;
      
    case WStype_CONNECTED:
      Serial.printf("🔌✅ WebSocket Connected: %s\n", payload);
      isConnected = true;
      delay(1000);
      sendDeviceInfo();
      lastActivity = millis();
      updateStatusLED();
      break;
      
    case WStype_TEXT:
      Serial.printf("📨 Received: %s\n", payload);
      handleWebSocketMessage((char*)payload);
      lastActivity = millis();
      break;
      
    case WStype_ERROR:
      Serial.printf("❌ WebSocket Error: %s\n", payload);
      isConnected = false;
      updateStatusLED();
      break;
      
    default:
      break;
  }
}

void handleWebSocketMessage(const char* message) {
  DynamicJsonDocument doc(512);
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.println("❌ JSON parse failed");
    return;
  }
  
  String action = doc["action"];
  String type = doc["type"];
  
  Serial.println("📨 Command: " + action);
  
  if (action != "") {
    executeCommand(action);
    sendCommandStatus(action);
  }
}

void executeCommand(String command) {
  currentCommand = command;
  
  Serial.println("⚡ Executing: " + command);
  
  if (command == "forward") {
    moveForward();
  } else if (command == "backward") {
    moveBackward();
  } else if (command == "left") {
    turnLeft();
  } else if (command == "right") {
    turnRight();
  } else if (command == "stop") {
    stopMotors();
  } else if (command == "auto" || command == "auto_on") {
    autoMode = true;
    remoteMode = false;
    Serial.println("🤖 AUTO MODE ON - Starting obstacle avoidance");
    sendModeStatus("auto", true);
  } else if (command == "auto_off" || command == "manual") {
    autoMode = false;
    stopMotors();
    remoteMode = true;
    Serial.println("🎮 MANUAL MODE ON");
    sendModeStatus("manual", true);
  } else if (command == "manual_on") {
    autoMode = false;
    remoteMode = true;
    Serial.println("🎮 Manual mode ON");
    sendModeStatus("manual", true);
  } else if (command == "manual_off") {
    remoteMode = false;
    stopMotors();
    Serial.println("🎮 Manual mode OFF");
    sendModeStatus("idle", true);
  } else {
    Serial.println("❓ Unknown command: " + command);
  }
  
  lastActivity = millis();
}

// BALANCED MOTOR CONTROL - PREVENT CIRCULAR MOVEMENT
void moveForward() {
  Serial.println("⬆️ FORWARD - BALANCED MOTORS");
  // Both motors forward with slight adjustment for straight line
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  // Slight speed difference to compensate for motor variance
  analogWrite(ENA, 250); // Left motor slightly slower
  analogWrite(ENB, 255); // Right motor full speed
}

void moveBackward() {
  Serial.println("⬇️ BACKWARD - MAXIMUM POWER - Both motors reverse");
  // Both motors reverse at FULL speed
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  analogWrite(ENA, 255); // MAXIMUM speed
  analogWrite(ENB, 255); // MAXIMUM speed
}

void turnLeft() {
  Serial.println("⬅️ LEFT TURN - MAXIMUM POWER - Left reverse, Right forward");
  // Left motor reverse, Right motor forward for left turn
  digitalWrite(IN1, LOW);  // Left motor reverse
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH); // Right motor forward
  digitalWrite(IN4, LOW);
  analogWrite(ENA, 255); // MAXIMUM speed
  analogWrite(ENB, 255); // MAXIMUM speed
}

void turnRight() {
  Serial.println("➡️ RIGHT TURN - MAXIMUM POWER - Left forward, Right reverse");
  // Left motor forward, Right motor reverse for right turn
  digitalWrite(IN1, HIGH); // Left motor forward
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);  // Right motor reverse
  digitalWrite(IN4, HIGH);
  analogWrite(ENA, 255); // MAXIMUM speed
  analogWrite(ENB, 255); // MAXIMUM speed
}

void stopMotors() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, 0);
  analogWrite(ENB, 0);
  currentCommand = "idle";
  Serial.println("⏹️ Motors Stopped");
}

long readDistanceCM() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  long duration = pulseIn(echoPin, HIGH, 30000);
  if (duration == 0) return 400; // Max distance if no echo
  
  long distance = duration * 0.034 / 2;
  return constrain(distance, 0, 400);
}

// SIMPLE AUTO MODE - STRAIGHT LINE NAVIGATION
void autoAvoidObstacle() {
  static unsigned long lastMove = 0;
  static unsigned long lastDirectionChange = 0;
  static bool preferLeft = true; // Alternating direction preference
  unsigned long currentTime = millis();
  
  long distance = readDistanceCM();
  
  if (distance < 20) {
    // OBSTACLE DETECTED - Start avoidance sequence
    Serial.println("🚧 OBSTACLE! Distance: " + String(distance) + "cm - AVOIDING");
    stopMotors();
    delay(200); // Brief pause
    
    // Step 1: Back up
    Serial.println("⬇️ BACKING UP...");
    moveBackward();
    delay(800); // Back up for 0.8 seconds
    stopMotors();
    delay(200);
    
    // Step 2: Turn (alternate left/right to explore different paths)
    if (preferLeft) {
      Serial.println("↩️ TURNING LEFT");
      turnLeft();
      delay(600); // Turn for 0.6 seconds
      preferLeft = false; // Next time try right
    } else {
      Serial.println("↪️ TURNING RIGHT");
      turnRight();
      delay(600); // Turn for 0.6 seconds
      preferLeft = true; // Next time try left
    }
    
    stopMotors();
    delay(300);
    lastMove = currentTime;
    lastDirectionChange = currentTime;
    
    Serial.println("✅ Avoidance complete - resuming forward movement");
    
  } else if (distance > 30) {
    // CLEAR PATH - Move forward STRAIGHT ONLY
    if (currentTime - lastMove > 100) { // Smooth continuous movement
      Serial.println("🚗 CLEAR PATH - Moving STRAIGHT forward (" + String(distance) + "cm)");
      moveForward();
      lastMove = currentTime;
    }
  } else {
    // CAUTION ZONE (20-30cm) - Move forward slowly
    if (currentTime - lastMove > 200) {
      Serial.println("⚠️ CAUTION ZONE - Slow STRAIGHT forward (" + String(distance) + "cm)");
      digitalWrite(IN1, HIGH);
      digitalWrite(IN2, LOW);
      digitalWrite(IN3, HIGH);
      digitalWrite(IN4, LOW);
      analogWrite(ENA, MOTOR_SPEED * 0.5); // Half speed
      analogWrite(ENB, MOTOR_SPEED * 0.5);
      lastMove = currentTime;
    }
  }
  
  // NO RANDOM TURNS - Only turn when hitting obstacles
  // This prevents circular movement when no obstacles
}

void updateStatusLED() {
  static unsigned long lastUpdate = 0;
  static bool ledState = false;
  unsigned long currentTime = millis();
  
  if (isConnected) {
    // Solid on when connected
    digitalWrite(LED_PIN, HIGH);
  } else {
    // Flash when disconnected
    if (currentTime - lastUpdate > 500) {
      ledState = !ledState;
      digitalWrite(LED_PIN, ledState);
      lastUpdate = currentTime;
    }
  }
}

void sendDeviceInfo() {
  DynamicJsonDocument doc(512);
  doc["type"] = "device_info";
  doc["device"] = "ESP32_Car";
  doc["ip"] = WiFi.localIP().toString();
  doc["mac"] = WiFi.macAddress();
  doc["firmware"] = "3.1.0_NO_SERVO_ULTRASONIC_ONLY";
  doc["features"] = "motor_control,ultrasonic_sensor,auto_navigation_simple";
  doc["modes"]["auto"] = autoMode;
  doc["modes"]["manual"] = remoteMode;
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
  
  Serial.println("📤 Device info sent - NO SERVO, ultrasonic navigation only");
}

void sendSensorData() {
  long distance = readDistanceCM();
  
  DynamicJsonDocument doc(256);
  doc["type"] = "sensor";
  doc["device"] = "ESP32_Car";
  doc["timestamp"] = millis();
  doc["data"]["distance"] = distance;
  doc["data"]["mode"] = autoMode ? "auto" : (remoteMode ? "manual" : "idle");
  doc["data"]["command"] = currentCommand;
  doc["data"]["autoActive"] = autoMode;
  doc["data"]["manualActive"] = remoteMode;
  doc["data"]["navigation"] = "ultrasonic_only"; // No servo navigation
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
  
  String modeStr = autoMode ? "AUTO" : (remoteMode ? "MANUAL" : "IDLE");
  Serial.println("📊 Sensor: " + String(distance) + "cm, Mode: " + modeStr + " (No Servo)");
}

void sendCommandStatus(String command) {
  DynamicJsonDocument doc(256);
  doc["type"] = "command_status";
  doc["device"] = "ESP32_Car";
  doc["timestamp"] = millis();
  doc["command"] = command;
  doc["status"] = "executed";
  doc["mode"] = autoMode ? "auto" : (remoteMode ? "manual" : "idle");
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
}

void sendModeStatus(String mode, bool success) {
  DynamicJsonDocument doc(256);
  doc["type"] = "mode_change";
  doc["device"] = "ESP32_Car";
  doc["timestamp"] = millis();
  doc["mode"] = mode;
  doc["success"] = success;
  doc["autoMode"] = autoMode;
  doc["remoteMode"] = remoteMode;
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
  
  Serial.println("📤 Mode status: " + mode + " (" + String(success ? "SUCCESS" : "FAILED") + ")");
}

void sendHeartbeat() {
  DynamicJsonDocument doc(256);
  doc["type"] = "heartbeat";
  doc["device"] = "ESP32_Car";
  doc["timestamp"] = millis();
  doc["uptime"] = millis() / 1000;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["autoMode"] = autoMode;
  doc["manualMode"] = remoteMode;
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
}

void handleSerialCommand() {
  String command = Serial.readString();
  command.trim();
  Serial.println("💻 Serial: " + command);
  
  if (command == "wifi") {
    Serial.println("📶 WiFi: " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected"));
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("   IP: " + WiFi.localIP().toString());
      Serial.println("   RSSI: " + String(WiFi.RSSI()) + " dBm");
    }
  } else if (command == "status") {
    Serial.println("🔄 Status:");
    Serial.println("   WiFi: " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected"));
    Serial.println("   WebSocket: " + String(isConnected ? "Connected" : "Disconnected"));
    Serial.println("   Auto Mode: " + String(autoMode ? "ON" : "OFF"));
    Serial.println("   Manual Mode: " + String(remoteMode ? "ON" : "OFF"));
  } else if (command == "test_forward") {
    Serial.println("🧪 Testing Forward Movement...");
    moveForward();
    delay(2000);
    stopMotors();
  } else if (command == "test_backward") {
    Serial.println("🧪 Testing Backward Movement...");
    moveBackward();
    delay(2000);
    stopMotors();
  } else if (command == "test_left") {
    Serial.println("🧪 Testing Left Turn...");
    turnLeft();
    delay(2000);
    stopMotors();
  } else if (command == "test_right") {
    Serial.println("🧪 Testing Right Turn...");
    turnRight();
    delay(2000);
    stopMotors();
  } else if (command == "test_left_motor") {
    Serial.println("🔧 Testing LEFT MOTOR ONLY...");
    digitalWrite(IN1, HIGH);
    digitalWrite(IN2, LOW);
    digitalWrite(IN3, LOW);
    digitalWrite(IN4, LOW);
    analogWrite(ENA, MOTOR_SPEED);
    analogWrite(ENB, 0);
    delay(2000);
    stopMotors();
    Serial.println("LEFT MOTOR TEST COMPLETE");
  } else if (command == "test_right_motor") {
    Serial.println("🔧 Testing RIGHT MOTOR ONLY...");
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, LOW);
    digitalWrite(IN3, HIGH);
    digitalWrite(IN4, LOW);
    analogWrite(ENA, 0);
    analogWrite(ENB, MOTOR_SPEED);
    delay(2000);
    stopMotors();
    Serial.println("RIGHT MOTOR TEST COMPLETE");
  } else if (command == "test_left_reverse") {
    Serial.println("🔧 Testing LEFT MOTOR REVERSE...");
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, HIGH);
    digitalWrite(IN3, LOW);
    digitalWrite(IN4, LOW);
    analogWrite(ENA, MOTOR_SPEED);
    analogWrite(ENB, 0);
    delay(2000);
    stopMotors();
    Serial.println("LEFT MOTOR REVERSE TEST COMPLETE");
  } else if (command == "test_right_reverse") {
    Serial.println("🔧 Testing RIGHT MOTOR REVERSE...");
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, LOW);
    digitalWrite(IN3, LOW);
    digitalWrite(IN4, HIGH);
    analogWrite(ENA, 0);
    analogWrite(ENB, MOTOR_SPEED);
    delay(2000);
    stopMotors();
    Serial.println("RIGHT MOTOR REVERSE TEST COMPLETE");
  } else if (command == "test_all_pins") {
    Serial.println("🔧 Testing ALL PINS SEQUENTIALLY...");
    
    // Test IN1 HIGH
    Serial.println("Testing IN1 HIGH, ENA 255");
    digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW); digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
    analogWrite(ENA, 255); analogWrite(ENB, 0);
    delay(1500); stopMotors(); delay(500);
    
    // Test IN2 HIGH  
    Serial.println("Testing IN2 HIGH, ENA 255");
    digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH); digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
    analogWrite(ENA, 255); analogWrite(ENB, 0);
    delay(1500); stopMotors(); delay(500);
    
    // Test IN3 HIGH
    Serial.println("Testing IN3 HIGH, ENB 255");
    digitalWrite(IN1, LOW); digitalWrite(IN2, LOW); digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
    analogWrite(ENA, 0); analogWrite(ENB, 255);
    delay(1500); stopMotors(); delay(500);
    
    // Test IN4 HIGH
    Serial.println("Testing IN4 HIGH, ENB 255");
    digitalWrite(IN1, LOW); digitalWrite(IN2, LOW); digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH);
    analogWrite(ENA, 0); analogWrite(ENB, 255);
    delay(1500); stopMotors(); delay(500);
    
    Serial.println("ALL PINS TEST COMPLETE");
  } else if (command == "full_power_test") {
    Serial.println("💪 FULL POWER TEST - All combinations");
    
    // Both motors forward max power
    Serial.println("Both motors FORWARD - MAX POWER");
    digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW); digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
    analogWrite(ENA, 255); analogWrite(ENB, 255);
    delay(2000); stopMotors(); delay(1000);
    
    // Both motors reverse max power  
    Serial.println("Both motors REVERSE - MAX POWER");
    digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH); digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH);
    analogWrite(ENA, 255); analogWrite(ENB, 255);
    delay(2000); stopMotors(); delay(1000);
    
    // Left forward, Right reverse
    Serial.println("Left FORWARD, Right REVERSE - MAX POWER");
    digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW); digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH);
    analogWrite(ENA, 255); analogWrite(ENB, 255);
    delay(2000); stopMotors(); delay(1000);
    
    // Left reverse, Right forward
    Serial.println("Left REVERSE, Right FORWARD - MAX POWER");
    digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH); digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
    analogWrite(ENA, 255); analogWrite(ENB, 255);
    delay(2000); stopMotors(); delay(1000);
    
    Serial.println("FULL POWER TEST COMPLETE");
  } else if (command == "test_servo") {
    Serial.println("🔄 TESTING SERVO MOVEMENT...");
    
    Serial.println("Servo to 0°");
    myServo.write(0);
    delay(1000);
    
    Serial.println("Servo to 45°");
    myServo.write(45);
    delay(1000);
    
    Serial.println("Servo to 90°");
    myServo.write(90);
    delay(1000);
    
    Serial.println("Servo to 135°");
    myServo.write(135);
    delay(1000);
    
    Serial.println("Servo to 180°");
    myServo.write(180);
    delay(1000);
    
    Serial.println("Servo back to center (90°)");
    myServo.write(90);
    delay(1000);
    
    Serial.println("SERVO TEST COMPLETE");
  } else if (command == "servo_scan") {
    Serial.println("🔍 SERVO SCANNING TEST...");
    
    for (int pos = 0; pos <= 180; pos += 10) {
      Serial.println("Servo position: " + String(pos) + "°");
      myServo.write(pos);
      delay(200);
    }
    
    for (int pos = 180; pos >= 0; pos -= 10) {
      Serial.println("Servo position: " + String(pos) + "°");
      myServo.write(pos);
      delay(200);
    }
    
    myServo.write(90); // Back to center
    Serial.println("SERVO SCAN COMPLETE");
  } else if (command == "test_distance") {
    Serial.println("📏 TESTING DISTANCE SENSOR...");
    
    for (int i = 0; i < 10; i++) {
      long distance = readDistanceCM();
      Serial.println("Distance reading " + String(i+1) + ": " + String(distance) + "cm");
      delay(500);
    }
    
    Serial.println("DISTANCE SENSOR TEST COMPLETE");
  } else if (command == "test_straight") {
    Serial.println("🎯 TESTING STRAIGHT LINE MOVEMENT...");
    
    Serial.println("Moving forward for 3 seconds - check if car goes straight");
    moveForward();
    delay(3000);
    stopMotors();
    
    Serial.println("STRAIGHT LINE TEST COMPLETE - Did the car go straight?");
  } else if (command == "balance_motors") {
    Serial.println("⚖️ MOTOR BALANCE TEST...");
    
    Serial.println("Test 1: Both motors 250 speed");
    digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW); digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
    analogWrite(ENA, 250); analogWrite(ENB, 250);
    delay(2000); stopMotors(); delay(1000);
    
    Serial.println("Test 2: Left 240, Right 250");
    digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW); digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
    analogWrite(ENA, 240); analogWrite(ENB, 250);
    delay(2000); stopMotors(); delay(1000);
    
    Serial.println("Test 3: Left 250, Right 240");
    digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW); digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
    analogWrite(ENA, 250); analogWrite(ENB, 240);
    delay(2000); stopMotors(); delay(1000);
    
    Serial.println("BALANCE TEST COMPLETE");
  } else if (command == "servo_debug") {
    Serial.println("🔧 SERVO DEBUG TEST...");
    
    // Detach and reattach servo
    myServo.detach();
    delay(100);
    
    Serial.println("Re-attaching servo to pin " + String(servoPin));
    if (myServo.attach(servoPin)) {
      Serial.println("✅ Servo re-attached successfully");
    } else {
      Serial.println("❌ Servo re-attach failed!");
    }
    
    // Test basic movements
    Serial.println("Testing basic servo movements...");
    myServo.write(0);
    Serial.println("Position: 0°");
    delay(2000);
    
    myServo.write(90);
    Serial.println("Position: 90°");
    delay(2000);
    
    myServo.write(180);
    Serial.println("Position: 180°");
    delay(2000);
    
    myServo.write(90);
    Serial.println("Back to center: 90°");
    
    Serial.println("SERVO DEBUG COMPLETE");
  } else {
    executeCommand(command);
  }
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("📶 WiFi disconnected, reconnecting...");
    WiFi.reconnect();
    delay(3000);
    return;
  }
  
  // Handle WebSocket
  webSocket.loop();
  
  // Auto obstacle avoidance - RUN CONTINUOUSLY when enabled
  if (autoMode) {
    autoAvoidObstacle();
    lastActivity = millis();
  }
  
  // Send sensor data
  unsigned long sensorInterval = autoMode ? AUTO_SENSOR_INTERVAL : SENSOR_INTERVAL;
  if (millis() - lastSensorRead > sensorInterval) {
    if (isConnected) {
      sendSensorData();
    }
    lastSensorRead = millis();
  }
  
  // Send heartbeat
  if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
    if (isConnected) {
      sendHeartbeat();
    }
    lastHeartbeat = millis();
  }
  
  // Handle serial commands for testing
  if (Serial.available()) {
    handleSerialCommand();
    lastActivity = millis();
  }
  
  // Update LED status
  updateStatusLED();
  
  // Shorter delay for auto mode responsiveness
  delay(autoMode ? 20 : 50);
}
