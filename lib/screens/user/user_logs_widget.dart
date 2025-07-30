import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../services/api_service.dart';
import '../../models/log_entry.dart';

class UserLogsWidget extends StatefulWidget {
  const UserLogsWidget({super.key});

  @override
  State<UserLogsWidget> createState() => _UserLogsWidgetState();
}

class _UserLogsWidgetState extends State<UserLogsWidget> {
  final ApiService _apiService = ApiService();
  List<LogEntry> _logs = [];
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadLogs();
  }

  // Method to manually refresh logs - useful for debugging
  Future<void> _forceRefresh() async {
    print('Force refreshing user logs...');
    await _loadLogs();
  }

  Future<void> _loadLogs() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      print('Loading user movement logs...');
      // Use user-specific endpoint for movement logs
      final logs = await _apiService.getUserMovementLogs();
      print('Successfully loaded ${logs.length} user movement logs');

      // Debug log each entry
      for (int i = 0; i < logs.length && i < 3; i++) {
        final log = logs[i];
        print(
          'User log $i: action=${log.action}, description=${log.description}',
        );
      }

      setState(() {
        _logs = logs;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading user logs: $e');
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: EdgeInsets.all(16.w),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Lịch sử di chuyển',
                  style: TextStyle(
                    fontSize: 20.sp,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF1E3C72),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.refresh),
                  onPressed: _loadLogs,
                  tooltip: 'Tải lại',
                ),
              ],
            ),
            SizedBox(height: 16.h),

            if (_isLoading)
              const Expanded(child: Center(child: CircularProgressIndicator()))
            else if (_error != null)
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error, size: 64.sp, color: Colors.red),
                      SizedBox(height: 16.h),
                      Text(
                        'Lỗi tải logs',
                        style: TextStyle(
                          fontSize: 18.sp,
                          fontWeight: FontWeight.bold,
                          color: Colors.red,
                        ),
                      ),
                      SizedBox(height: 8.h),
                      Text(
                        _error!,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14.sp,
                          color: Colors.grey[600],
                        ),
                      ),
                      SizedBox(height: 16.h),
                      ElevatedButton(
                        onPressed: _loadLogs,
                        child: const Text('Thử lại'),
                      ),
                    ],
                  ),
                ),
              )
            else if (_logs.isEmpty)
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.history, size: 64.sp, color: Colors.grey),
                      SizedBox(height: 16.h),
                      Text(
                        'Chưa có hoạt động',
                        style: TextStyle(
                          fontSize: 18.sp,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[600],
                        ),
                      ),
                      SizedBox(height: 8.h),
                      Text(
                        'Hãy bắt đầu điều khiển xe để xem lịch sử di chuyển',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14.sp,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _loadLogs,
                  child: ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: _logs.length,
                    itemBuilder: (context, index) {
                      final log = _logs[index];
                      return _buildLogCard(log);
                    },
                  ),
                ),
              ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _forceRefresh,
        tooltip: 'Tải lại lịch sử',
        child: Icon(Icons.refresh),
        backgroundColor: const Color(0xFF1E3C72),
      ),
    );
  }

  Widget _buildLogCard(LogEntry log) {
    IconData iconData;
    Color iconColor;
    final action = log.action?.toLowerCase() ?? 'unknown';

    switch (action) {
      case 'forward':
        iconData = Icons.keyboard_arrow_up;
        iconColor = Colors.blue;
        break;
      case 'backward':
        iconData = Icons.keyboard_arrow_down;
        iconColor = Colors.orange;
        break;
      case 'left':
        iconData = Icons.keyboard_arrow_left;
        iconColor = Colors.green;
        break;
      case 'right':
        iconData = Icons.keyboard_arrow_right;
        iconColor = Colors.purple;
        break;
      case 'stop':
        iconData = Icons.stop;
        iconColor = Colors.red;
        break;
      case 'auto':
        iconData = Icons.smart_toy;
        iconColor = Colors.indigo;
        break;
      case 'manual':
        iconData = Icons.gamepad;
        iconColor = Colors.teal;
        break;
      default:
        iconData = Icons.directions_car;
        iconColor = Colors.grey;
    }

    return Card(
      margin: EdgeInsets.only(bottom: 8.h),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: iconColor.withOpacity(0.2),
          child: Icon(iconData, color: iconColor),
        ),
        title: Text(
          log.description ?? 'Không có mô tả',
          style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w500),
        ),
        subtitle: Text(
          _formatDateTime(log.timestamp),
          style: TextStyle(fontSize: 12.sp, color: Colors.grey[600]),
        ),
        trailing: Container(
          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12.r),
          ),
          child: Text(
            _getActionDisplayText(action),
            style: TextStyle(
              fontSize: 10.sp,
              fontWeight: FontWeight.bold,
              color: iconColor,
            ),
          ),
        ),
      ),
    );
  }

  String _getActionDisplayText(String action) {
    switch (action) {
      case 'forward':
        return 'TIẾN';
      case 'backward':
        return 'LÙI';
      case 'left':
        return 'TRÁI';
      case 'right':
        return 'PHẢI';
      case 'stop':
        return 'DỪNG';
      case 'auto':
        return 'TỰ ĐỘNG';
      case 'manual':
        return 'THỦ CÔNG';
      default:
        return action.toUpperCase();
    }
  }

  String _formatDateTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h ago';
    } else {
      return '${dateTime.day}/${dateTime.month}/${dateTime.year} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    }
  }
}
