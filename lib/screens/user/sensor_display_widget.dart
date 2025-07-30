import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../providers/car_control_provider.dart';

class SensorDisplayWidget extends StatelessWidget {
  const SensorDisplayWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<CarControlProvider>(
      builder: (context, carProvider, child) {
        final sensorData = carProvider.latestSensorData;

        return Card(
          elevation: 4,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12.r),
          ),
          child: Padding(
            padding: EdgeInsets.all(16.w),
            child: Column(
              children: [
                Text(
                  'Sensor Data',
                  style: TextStyle(
                    fontSize: 18.sp,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF1E3C72),
                  ),
                ),
                SizedBox(height: 16.h),

                if (sensorData != null) ...[
                  // Distance Display
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Distance:',
                        style: TextStyle(
                          fontSize: 16.sp,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Text(
                        '${sensorData.distance.toStringAsFixed(1)} cm',
                        style: TextStyle(
                          fontSize: 16.sp,
                          fontWeight: FontWeight.bold,
                          color: sensorData.distance < 20
                              ? Colors.red
                              : Colors.green,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12.h),

                  // Obstacle Detection
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Obstacle:',
                        style: TextStyle(
                          fontSize: 16.sp,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Row(
                        children: [
                          Icon(
                            sensorData.isObstacleDetected
                                ? Icons.warning
                                : Icons.check_circle,
                            color: sensorData.isObstacleDetected
                                ? Colors.red
                                : Colors.green,
                            size: 20.sp,
                          ),
                          SizedBox(width: 4.w),
                          Text(
                            sensorData.isObstacleDetected
                                ? 'Detected'
                                : 'Clear',
                            style: TextStyle(
                              fontSize: 16.sp,
                              fontWeight: FontWeight.bold,
                              color: sensorData.isObstacleDetected
                                  ? Colors.red
                                  : Colors.green,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  SizedBox(height: 12.h),

                  // Distance Bar Indicator
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Distance Indicator:',
                        style: TextStyle(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      SizedBox(height: 8.h),
                      Container(
                        width: double.infinity,
                        height: 20.h,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10.r),
                          border: Border.all(color: Colors.grey),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10.r),
                          child: LinearProgressIndicator(
                            value: (sensorData.distance / 100).clamp(0.0, 1.0),
                            backgroundColor: Colors.grey[200],
                            valueColor: AlwaysStoppedAnimation<Color>(
                              sensorData.distance < 20
                                  ? Colors.red
                                  : sensorData.distance < 50
                                  ? Colors.orange
                                  : Colors.green,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 8.h),

                  // Last Update Time
                  Text(
                    'Last update: ${_formatTime(sensorData.timestamp)}',
                    style: TextStyle(fontSize: 12.sp, color: Colors.grey[600]),
                  ),
                ] else ...[
                  // No data available
                  Column(
                    children: [
                      Icon(Icons.sensors_off, size: 48.sp, color: Colors.grey),
                      SizedBox(height: 8.h),
                      Text(
                        'No sensor data available',
                        style: TextStyle(
                          fontSize: 16.sp,
                          color: Colors.grey[600],
                        ),
                      ),
                      SizedBox(height: 4.h),
                      Text(
                        'Check connection status',
                        style: TextStyle(
                          fontSize: 12.sp,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inSeconds < 60) {
      return '${difference.inSeconds}s ago';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else {
      return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    }
  }
}
