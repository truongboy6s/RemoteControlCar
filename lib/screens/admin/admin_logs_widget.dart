import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../services/api_service.dart';
import '../../models/log_entry.dart';

class AdminLogsWidget extends StatefulWidget {
  const AdminLogsWidget({super.key});

  @override
  State<AdminLogsWidget> createState() => _AdminLogsWidgetState();
}

class _AdminLogsWidgetState extends State<AdminLogsWidget> {
  final ApiService _apiService = ApiService();
  List<LogEntry> _logs = [];
  bool _isLoading = false;
  String? _error;
  String _filterBy = 'all'; // 'all', 'commands', 'login', 'user_management'

  @override
  void initState() {
    super.initState();
    _loadLogs();
  }

  Future<void> _loadLogs() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      print('Loading admin logs with category: $_filterBy');
      final logs = await _apiService.getAdminLogsByCategory(
        category: _filterBy,
      );
      print('Successfully loaded ${logs.length} logs');
      setState(() {
        _logs = logs;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading admin logs: $e');
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _onFilterChanged(String newFilter) {
    setState(() {
      _filterBy = newFilter;
    });
    _loadLogs(); // Reload with new filter
  }

  String _getCategoryDisplayName(String category) {
    switch (category) {
      case 'all':
        return 'Tất cả';
      case 'commands':
        return 'Lệnh';
      case 'login':
        return 'Đăng nhập';
      case 'user_management':
        return 'Quản lý';
      default:
        return category;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(16.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Quản lý Logs',
                style: TextStyle(
                  fontSize: 20.sp,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1E3C72),
                ),
              ),
              IconButton(icon: const Icon(Icons.refresh), onPressed: _loadLogs),
            ],
          ),
          SizedBox(height: 8.h),

          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip('Tất cả', 'all'),
                SizedBox(width: 8.w),
                _buildFilterChip('Lệnh điều khiển', 'commands'),
                SizedBox(width: 8.w),
                _buildFilterChip('Đăng nhập', 'login'),
                SizedBox(width: 8.w),
                _buildFilterChip('Quản lý user', 'user_management'),
              ],
            ),
          ),
          SizedBox(height: 16.h),

          // Stats Row
          if (_logs.isNotEmpty) ...[
            Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    'Tổng Logs',
                    _logs.length.toString(),
                    Icons.list,
                    Colors.blue,
                  ),
                ),
                SizedBox(width: 8.w),
                Expanded(
                  child: _buildStatCard(
                    'Category',
                    _getCategoryDisplayName(_filterBy),
                    Icons.category,
                    Colors.green,
                  ),
                ),
                SizedBox(width: 8.w),
                Expanded(
                  child: _buildStatCard(
                    'Users',
                    _logs
                        .where((log) => log.userId != null)
                        .map((log) => log.userId!)
                        .toSet()
                        .length
                        .toString(),
                    Icons.people,
                    Colors.orange,
                  ),
                ),
              ],
            ),
            SizedBox(height: 16.h),
          ],

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
                      'Error loading logs',
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
                      child: const Text('Retry'),
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
                      _filterBy == 'all'
                          ? 'No logs found'
                          : 'No logs match the filter',
                      style: TextStyle(
                        fontSize: 18.sp,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.builder(
                itemCount: _logs.length,
                itemBuilder: (context, index) {
                  final log = _logs[index];
                  return _buildLogCard(log);
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _filterBy == value;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        _onFilterChanged(value);
      },
      selectedColor: const Color(0xFF1E3C72).withOpacity(0.3),
      checkmarkColor: const Color(0xFF1E3C72),
    );
  }

  Widget _buildStatCard(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: EdgeInsets.all(12.w),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24.sp),
            SizedBox(height: 4.h),
            Text(
              value,
              style: TextStyle(
                fontSize: 18.sp,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              title,
              style: TextStyle(fontSize: 12.sp, color: Colors.grey[600]),
            ),
          ],
        ),
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
      case 'login':
        iconData = Icons.login;
        iconColor = Colors.green;
        break;
      case 'logout':
        iconData = Icons.logout;
        iconColor = Colors.grey;
        break;
      case 'login_failed':
        iconData = Icons.error;
        iconColor = Colors.red;
        break;
      default:
        if (action.contains('user')) {
          iconData = Icons.person;
          iconColor = Colors.indigo;
        } else {
          iconData = Icons.info;
          iconColor = Colors.grey;
        }
    }

    return Card(
      margin: EdgeInsets.only(bottom: 4.h),
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
      child: ListTile(
        dense: true,
        leading: CircleAvatar(
          radius: 16.r,
          backgroundColor: iconColor.withOpacity(0.2),
          child: Icon(iconData, color: iconColor, size: 16.sp),
        ),
        title: Text(
          log.description ?? 'Không có mô tả',
          style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w500),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${log.userName ?? 'Unknown User'} • ${_formatDateTime(log.timestamp)}',
              style: TextStyle(fontSize: 11.sp, color: Colors.grey[600]),
            ),
            if (log.ipAddress != null && log.ipAddress!.isNotEmpty)
              Text(
                'IP: ${log.ipAddress}',
                style: TextStyle(fontSize: 10.sp, color: Colors.grey[500]),
              ),
          ],
        ),
        trailing: Container(
          padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 2.h),
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8.r),
          ),
          child: Text(
            _getActionDisplayText(action),
            style: TextStyle(
              fontSize: 9.sp,
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
      case 'login':
        return 'ĐĂNG NHẬP';
      case 'logout':
        return 'ĐĂNG XUẤT';
      case 'login_failed':
        return 'ĐĂNG NHẬP LỖI';
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
      return '${dateTime.day}/${dateTime.month} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    }
  }
}
