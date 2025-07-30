import 'package:flutter/foundation.dart';
import '../models/sensor_data.dart';
import '../services/api_service.dart';

class CarControlProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  SensorData? _latestSensorData;
  bool _isConnected = false;
  bool _esp32Connected = false;
  String? _error;
  bool _isLoading = false;
  String _currentMode = 'manual';

  // Battery monitoring
  double _batteryVoltage = 0.0;
  int _batteryPercentage = 0;
  String _batteryStatus = 'unknown';
  bool _powerSaveMode = false;

  // Getters
  SensorData? get latestSensorData => _latestSensorData;
  bool get isConnected => _isConnected;
  bool get esp32Connected => _esp32Connected;
  String? get error => _error;
  bool get isLoading => _isLoading;
  String get currentMode => _currentMode;

  // Battery getters
  double get batteryVoltage => _batteryVoltage;
  int get batteryPercentage => _batteryPercentage;
  String get batteryStatus => _batteryStatus;
  bool get powerSaveMode => _powerSaveMode;

  CarControlProvider() {
    _initializeProvider();
  }

  void _initializeProvider() {
    // Simulate connection status for testing
    _isConnected = true;
    _esp32Connected = true;
    notifyListeners();
  }

  // Initialize method called from UI
  Future<void> initialize() async {
    _setLoading(true);
    try {
      // Connect to backend and ESP32
      await connect();

      // Start sensor data simulation
      _startSensorDataSimulation();

      _addLog('Car control system initialized');
    } catch (e) {
      _setError('Failed to initialize: $e');
    } finally {
      _setLoading(false);
    }
  }

  void _startSensorDataSimulation() {
    // Simulate sensor data updates every 2 seconds
    Stream.periodic(const Duration(seconds: 2)).listen((_) {
      if (_isConnected && _esp32Connected) {
        final distance = 50.0 + (DateTime.now().millisecondsSinceEpoch % 100);
        _latestSensorData = SensorData(
          distance: distance,
          timestamp: DateTime.now(),
          isObstacleDetected:
              distance < 30, // Detect obstacle if distance < 30cm
        );
        notifyListeners();
      }
    });
  }

  // Car movement methods
  Future<void> moveForward() async {
    if (_isLoading) return;

    _setLoading(true);
    try {
      await _apiService.sendCommand('forward');
      _addLog('Car moved forward');
    } catch (e) {
      _setError('Failed to move forward: $e');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> moveBackward() async {
    if (_isLoading) return;

    _setLoading(true);
    try {
      await _apiService.sendCommand('backward');
      _addLog('Car moved backward');
    } catch (e) {
      _setError('Failed to move backward: $e');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> turnLeft() async {
    if (_isLoading) return;

    _setLoading(true);
    try {
      await _apiService.sendCommand('left');
      _addLog('Car turned left');
    } catch (e) {
      _setError('Failed to turn left: $e');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> turnRight() async {
    if (_isLoading) return;

    _setLoading(true);
    try {
      await _apiService.sendCommand('right');
      _addLog('Car turned right');
    } catch (e) {
      _setError('Failed to turn right: $e');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> stopCar() async {
    if (_isLoading) return;

    _setLoading(true);
    try {
      await _apiService.sendCommand('stop');
      _addLog('Car stopped');
    } catch (e) {
      _setError('Failed to stop car: $e');
    } finally {
      _setLoading(false);
    }
  }

  // Mode switching
  Future<void> enableManualMode() async {
    if (_isLoading || _currentMode == 'manual') return;

    _setLoading(true);
    try {
      await _apiService.sendCommand('manual');
      _currentMode = 'manual';
      _addLog('Switched to manual mode');
      notifyListeners();
    } catch (e) {
      _setError('Failed to enable manual mode: $e');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> enableAutoMode() async {
    if (_isLoading || _currentMode == 'auto') return;

    _setLoading(true);
    try {
      await _apiService.sendCommand('auto');
      _currentMode = 'auto';
      _addLog('Switched to auto mode');
      notifyListeners();
    } catch (e) {
      _setError('Failed to enable auto mode: $e');
    } finally {
      _setLoading(false);
    }
  }

  // Connection management
  Future<void> connect() async {
    // Simulate connection for testing
    _isConnected = true;
    _esp32Connected = true;
    _addLog('Connected to backend');
    notifyListeners();
  }

  Future<void> disconnect() async {
    // Simulate disconnection
    _isConnected = false;
    _esp32Connected = false;
    _addLog('Disconnected from backend');
    notifyListeners();
  }

  Future<void> reconnect() async {
    await disconnect();
    await Future.delayed(Duration(milliseconds: 500));
    await connect();
  }

  // Helper methods
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String errorMessage) {
    _error = errorMessage;
    _addLog('Error: $errorMessage');
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void _addLog(String message) {
    if (kDebugMode) {
      print('[CarControl] $message');
    }
  }

  void updateSensorData(SensorData data) {
    _latestSensorData = data;
    notifyListeners();
  }

  void updateBatteryData(Map<String, dynamic> batteryData) {
    _batteryVoltage = (batteryData['voltage'] ?? 0.0).toDouble();
    _batteryPercentage = batteryData['percentage'] ?? 0;
    _batteryStatus = batteryData['status'] ?? 'unknown';
    _powerSaveMode = batteryData['powerSave'] ?? false;

    // Add battery warnings to logs
    if (_batteryStatus == 'critical') {
      _addLog('🚨 CRITICAL BATTERY: ${_batteryVoltage.toStringAsFixed(1)}V');
    } else if (_batteryStatus == 'low') {
      _addLog('⚠️ Low Battery: ${_batteryVoltage.toStringAsFixed(1)}V');
    }

    notifyListeners();
  }

  void handleWebSocketMessage(Map<String, dynamic> data) {
    switch (data['type']) {
      case 'sensor_data':
        if (data['data'] != null) {
          final sensorData = SensorData(
            distance: (data['data']['distance'] ?? 0).toDouble(),
            timestamp: DateTime.now(),
            isObstacleDetected: (data['data']['distance'] ?? 400) < 30,
          );
          updateSensorData(sensorData);

          // Update battery info if present in sensor data
          if (data['data']['battery'] != null) {
            updateBatteryData({
              'percentage': data['data']['battery'],
              'powerSave': data['data']['powerSave'] ?? false,
            });
          }
        }
        break;

      case 'battery_status':
        updateBatteryData(data);
        break;

      case 'alert':
        final message = data['message'] ?? 'Unknown alert';
        final level = data['level'] ?? 'info';
        if (level == 'critical' || level == 'warning') {
          _setError('$level: $message');
        }
        _addLog('Alert ($level): $message');
        break;

      case 'esp32_connected':
        _esp32Connected = true;
        _addLog('ESP32 connected');
        notifyListeners();
        break;

      case 'esp32_disconnected':
        _esp32Connected = false;
        _addLog('ESP32 disconnected');
        notifyListeners();
        break;
    }
  }

  @override
  void dispose() {
    super.dispose();
  }
}
