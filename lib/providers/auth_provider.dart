import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  User? _currentUser;
  bool _isLoading = false;
  String? _error;

  User? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isLoggedIn => _currentUser != null;
  bool get isAdmin => _currentUser?.isAdmin ?? false;
  bool get isUser => _currentUser?.isUser ?? false;
  bool get hasAccess => _currentUser?.hasAccess ?? false;

  // Login
  Future<bool> login(String email, String password) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _apiService.login(email, password);
      _currentUser = User.fromJson(response['user']);
      _setLoading(false);
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  // Register
  Future<bool> register(String email, String password, String name) async {
    _setLoading(true);
    _clearError();

    try {
      await _apiService.register(email, password, name);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  // Logout
  Future<void> logout() async {
    await _apiService.clearToken();
    _currentUser = null;
    notifyListeners();
  }

  // Load user profile
  Future<void> loadUserProfile() async {
    try {
      final token = await _apiService.getToken();
      if (token != null) {
        // Debug: Print token for verification
        print('Loading user profile with token: ${token.substring(0, 20)}...');
        try {
          _currentUser = await _apiService.getCurrentUser();
          print(
            'User profile loaded: ${_currentUser?.name} (${_currentUser?.role})',
          );
          notifyListeners();
        } catch (apiError) {
          print('API error while loading profile: $apiError');
          // If API call fails (e.g., 401), clear invalid token
          await logout();
        }
      } else {
        print('No token found, user not logged in');
      }
    } catch (e) {
      print('Failed to load user profile: $e');
      await logout();
    }
  }

  // Change password
  Future<bool> changePassword(String oldPassword, String newPassword) async {
    _setLoading(true);
    _clearError();

    try {
      await _apiService.changePassword(oldPassword, newPassword);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  // Update user info
  Future<bool> updateUserInfo(Map<String, dynamic> updates) async {
    _setLoading(true);
    _clearError();

    try {
      if (_currentUser != null) {
        _currentUser = await _apiService.updateUser(_currentUser!.id, updates);
        _setLoading(false);
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  // Check if current session is valid
  Future<bool> validateSession() async {
    if (_currentUser == null) {
      return false;
    }

    try {
      // Try to make an authenticated API call to verify token
      await _apiService.getCurrentUser();
      return true;
    } catch (e) {
      print('Session validation failed: $e');
      await logout();
      return false;
    }
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String error) {
    _error = error;
    notifyListeners();
  }

  void _clearError() {
    _error = null;
  }

  void clearError() {
    _clearError();
    notifyListeners();
  }
}
