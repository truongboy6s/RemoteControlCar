import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../models/command.dart';
import '../models/log_entry.dart';

class ApiService {
  // Dynamic base URL based on platform
  static String get baseUrl {
    if (kIsWeb) {
      // Web platform
      return 'http://localhost:3000/api';
    } else if (Platform.isAndroid) {
      // Android emulator - use 10.0.2.2 to access host machine
      return 'http://10.0.2.2:3000/api';
    } else {
      // iOS simulator and other platforms
      return 'http://localhost:3000/api';
    }
  }

  String? _token;

  // Get stored token
  Future<String?> getToken() async {
    if (_token != null) return _token;
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    return _token;
  }

  // Save token
  Future<void> saveToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  // Clear token
  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  // Get headers with auth token
  Future<Map<String, String>> get headers async {
    await getToken(); // Ensure token is loaded
    final headers = {'Content-Type': 'application/json'};
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
      print('API call with token: ${_token!.substring(0, 20)}...');
    } else {
      print('API call without token');
    }
    return headers;
  }

  // Authentication APIs
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      await saveToken(data['token']);
      return data;
    } else {
      throw Exception('Login failed: ${response.body}');
    }
  }

  Future<Map<String, dynamic>> register(
    String email,
    String password,
    String name,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password, 'name': name}),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Registration failed: ${response.body}');
    }
  }

  Future<void> changePassword(String oldPassword, String newPassword) async {
    final requestHeaders = await headers;
    final response = await http.post(
      Uri.parse('$baseUrl/auth/change-password'),
      headers: requestHeaders,
      body: jsonEncode({
        'oldPassword': oldPassword,
        'newPassword': newPassword,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Password change failed: ${response.body}');
    }
  }

  // User management APIs (Admin only)
  Future<List<User>> getUsers() async {
    final requestHeaders = await headers;
    final response = await http.get(
      Uri.parse('$baseUrl/users'),
      headers: requestHeaders,
    );

    print('GetUsers API response status: ${response.statusCode}');
    print('GetUsers API response body: ${response.body}');

    if (response.statusCode == 200) {
      final jsonData = jsonDecode(response.body);
      print('GetUsers parsed JSON: $jsonData');

      // Backend returns {success: true, users: [...]}
      if (jsonData['success'] == true && jsonData['users'] != null) {
        final usersData = jsonData['users'] as List;
        return usersData.map((json) => User.fromJson(json)).toList();
      } else {
        throw Exception('Invalid response format: ${response.body}');
      }
    } else {
      throw Exception('Failed to fetch users: ${response.body}');
    }
  }

  Future<User> createUser(
    String email,
    String password,
    String name,
    String role,
  ) async {
    final requestHeaders = await headers;
    final response = await http.post(
      Uri.parse('$baseUrl/users'),
      headers: requestHeaders,
      body: jsonEncode({
        'email': email,
        'password': password,
        'name': name,
        'role': role,
      }),
    );

    print('CreateUser API response status: ${response.statusCode}');
    print('CreateUser API response body: ${response.body}');

    if (response.statusCode == 201) {
      final jsonData = jsonDecode(response.body);
      print('CreateUser parsed JSON: $jsonData');

      // Backend returns {success: true, user: {...}}
      if (jsonData['success'] == true && jsonData['user'] != null) {
        return User.fromJson(jsonData['user']);
      } else {
        throw Exception('Invalid response format: ${response.body}');
      }
    } else {
      throw Exception('Failed to create user: ${response.body}');
    }
  }

  Future<User> updateUser(String userId, Map<String, dynamic> updates) async {
    final requestHeaders = await headers;
    final response = await http.put(
      Uri.parse('$baseUrl/users/$userId'),
      headers: requestHeaders,
      body: jsonEncode(updates),
    );

    if (response.statusCode == 200) {
      final jsonData = jsonDecode(response.body);
      // Backend returns {success: true, user: {...}}
      if (jsonData['success'] == true && jsonData['user'] != null) {
        return User.fromJson(jsonData['user']);
      } else {
        throw Exception('Invalid response format: ${response.body}');
      }
    } else {
      throw Exception('Failed to update user: ${response.body}');
    }
  }

  Future<void> deleteUser(String userId) async {
    final requestHeaders = await headers;
    final response = await http.delete(
      Uri.parse('$baseUrl/users/$userId'),
      headers: requestHeaders,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to delete user: ${response.body}');
    }
  }

  Future<void> grantAccess(String userId, bool hasAccess) async {
    final requestHeaders = await headers;
    final response = await http.post(
      Uri.parse('$baseUrl/users/grant-access'),
      headers: requestHeaders,
      body: jsonEncode({'userId': userId, 'hasAccess': hasAccess}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to grant access: ${response.body}');
    }
  }

  // Command APIs
  Future<void> sendCommand(String action) async {
    final requestHeaders = await headers;
    final response = await http.post(
      Uri.parse('$baseUrl/commands/send'),
      headers: requestHeaders,
      body: jsonEncode({'action': action}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to send command: ${response.body}');
    }
  }

  // Logs APIs
  Future<List<LogEntry>> getLogs({String? userId}) async {
    String url;

    // Determine which endpoint to use based on user role
    // For now, always use user endpoint - we'll check user role in provider
    if (userId != null) {
      // Admin requesting specific user's logs
      url = '$baseUrl/logs?user_id=$userId';
    } else {
      // Get current user's logs
      url = '$baseUrl/logs/user';
    }

    final requestHeaders = await headers;
    final response = await http.get(Uri.parse(url), headers: requestHeaders);

    print('GetLogs API response status: ${response.statusCode}');
    print('GetLogs API response body: ${response.body}');

    if (response.statusCode == 200) {
      final jsonData = jsonDecode(response.body);
      print('GetLogs parsed JSON: $jsonData');

      // Backend returns {success: true, logs: [...]}
      if (jsonData['success'] == true && jsonData['logs'] != null) {
        final logsData = jsonData['logs'] as List;
        return logsData.map((json) => LogEntry.fromJson(json)).toList();
      } else if (jsonData is List) {
        // Fallback if backend returns array directly
        return jsonData.map((json) => LogEntry.fromJson(json)).toList();
      } else {
        throw Exception('Invalid response format: ${response.body}');
      }
    } else {
      throw Exception('Failed to fetch logs: ${response.body}');
    }
  }

  // Get user's movement logs only
  Future<List<LogEntry>> getUserMovementLogs() async {
    try {
      final url = '$baseUrl/logs/user';
      final requestHeaders = await headers;
      final response = await http.get(Uri.parse(url), headers: requestHeaders);

      print('GetUserMovementLogs API response status: ${response.statusCode}');
      print('GetUserMovementLogs API response body: ${response.body}');

      if (response.statusCode == 200) {
        final jsonData = jsonDecode(response.body);
        print('GetUserMovementLogs parsed JSON: $jsonData');

        // Backend returns {success: true, logs: [...]}
        if (jsonData['success'] == true && jsonData['logs'] != null) {
          final logsData = jsonData['logs'] as List;
          return logsData.map((json) {
            try {
              return LogEntry.fromJson(json as Map<String, dynamic>);
            } catch (e) {
              print('Error parsing user log entry: $e');
              print('Log data: $json');
              // Return a safe default log entry
              return LogEntry(
                id: json['id']?.toString() ?? 'unknown',
                timestamp: DateTime.now(),
                action: json['action']?.toString(),
                description:
                    json['description']?.toString() ?? 'Failed to parse log',
                userName: json['userName']?.toString(),
                userId: json['userId']?.toString(),
                ipAddress: json['ipAddress']?.toString(),
                userAgent: json['userAgent']?.toString(),
                metadata: json['metadata'] as Map<String, dynamic>?,
              );
            }
          }).toList();
        } else {
          throw Exception('Invalid response format: ${response.body}');
        }
      } else {
        throw Exception('Failed to fetch user movement logs: ${response.body}');
      }
    } catch (e) {
      print('GetUserMovementLogs error: $e');
      throw Exception('Failed to fetch user movement logs: $e');
    }
  }

  // Get admin logs by category
  Future<List<LogEntry>> getAdminLogsByCategory({
    String category = 'all',
  }) async {
    try {
      final url = '$baseUrl/logs/category?category=$category';
      final requestHeaders = await headers;
      final response = await http.get(Uri.parse(url), headers: requestHeaders);

      print(
        'GetAdminLogsByCategory API response status: ${response.statusCode}',
      );
      print('GetAdminLogsByCategory API response body: ${response.body}');

      if (response.statusCode == 200) {
        final jsonData = jsonDecode(response.body);
        print('GetAdminLogsByCategory parsed JSON: $jsonData');

        // Backend returns {success: true, logs: [...]}
        if (jsonData['success'] == true && jsonData['logs'] != null) {
          final logsData = jsonData['logs'] as List;
          return logsData.map((json) {
            try {
              return LogEntry.fromJson(json as Map<String, dynamic>);
            } catch (e) {
              print('Error parsing log entry: $e');
              print('Log data: $json');
              // Return a safe default log entry
              return LogEntry(
                id: json['id']?.toString() ?? 'unknown',
                timestamp: DateTime.now(),
                action: json['action']?.toString(),
                description:
                    json['description']?.toString() ?? 'Failed to parse log',
                userName: json['userName']?.toString(),
                userId: json['userId']?.toString(),
                userEmail: json['userEmail']?.toString(),
                userRole: json['userRole']?.toString(),
                ipAddress: json['ipAddress']?.toString(),
                userAgent: json['userAgent']?.toString(),
                category: json['category']?.toString(),
                metadata: json['metadata'] as Map<String, dynamic>?,
              );
            }
          }).toList();
        } else {
          throw Exception('Invalid response format: ${response.body}');
        }
      } else {
        throw Exception('Failed to fetch admin logs: ${response.body}');
      }
    } catch (e) {
      print('GetAdminLogsByCategory error: $e');
      throw Exception('Failed to fetch admin logs: $e');
    }
  }

  // Get all logs (admin only)
  Future<List<LogEntry>> getAllLogs({String? userId}) async {
    String url = '$baseUrl/logs';
    if (userId != null) {
      url += '?user_id=$userId';
    }

    final requestHeaders = await headers;
    final response = await http.get(Uri.parse(url), headers: requestHeaders);

    print('GetAllLogs API response status: ${response.statusCode}');
    print('GetAllLogs API response body: ${response.body}');

    if (response.statusCode == 200) {
      final jsonData = jsonDecode(response.body);
      print('GetAllLogs parsed JSON: $jsonData');

      // Backend returns {success: true, logs: [...]}
      if (jsonData['success'] == true && jsonData['logs'] != null) {
        final logsData = jsonData['logs'] as List;
        print('getAllLogs: Found ${logsData.length} logs');
        if (logsData.isNotEmpty) {
          print('Sample log data: ${logsData.first}');
        }
        return logsData.map((json) => LogEntry.fromJson(json)).toList();
      } else {
        throw Exception('Invalid response format: ${response.body}');
      }
    } else {
      throw Exception('Failed to fetch logs: ${response.body}');
    }
  }

  // Get current user profile
  Future<User> getCurrentUser() async {
    final requestHeaders = await headers;
    final response = await http.get(
      Uri.parse('$baseUrl/auth/profile'),
      headers: requestHeaders,
    );

    print('Profile API response status: ${response.statusCode}');
    print('Profile API response body: ${response.body}');

    if (response.statusCode == 200) {
      try {
        final jsonData = jsonDecode(response.body);
        print('Parsed JSON: $jsonData');

        // Backend returns {success: true, user: {...}}
        if (jsonData['success'] == true && jsonData['user'] != null) {
          final user = User.fromJson(jsonData['user']);
          print('User parsed successfully: ${user.name}');
          return user;
        } else {
          throw Exception('Invalid response format: ${response.body}');
        }
      } catch (e) {
        print('Error parsing user JSON: $e');
        throw Exception('Failed to parse user data: $e');
      }
    } else {
      throw Exception('Failed to fetch profile: ${response.body}');
    }
  }
}
