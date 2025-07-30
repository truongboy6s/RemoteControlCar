import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../../providers/car_control_provider.dart';
import 'sensor_display_widget.dart';

class CarControlWidget extends StatelessWidget {
  const CarControlWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<CarControlProvider>(
      builder: (context, carProvider, child) {
        return LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Padding(
                  padding: EdgeInsets.all(16.w),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Connection Status Cards
                      Row(
                        children: [
                          Expanded(
                            child: _buildStatusCard(
                              'Backend',
                              carProvider.isConnected,
                              Icons.cloud,
                              carProvider.isConnected
                                  ? 'Connected'
                                  : 'Disconnected',
                            ),
                          ),
                          SizedBox(width: 8.w),
                          Expanded(
                            child: _buildStatusCard(
                              'ESP32 Car',
                              carProvider.esp32Connected,
                              Icons.directions_car,
                              carProvider.esp32Connected ? 'Online' : 'Offline',
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 16.h),

                      // Mode Selection
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: carProvider.isLoading
                                  ? null
                                  : () => carProvider.enableManualMode(),
                              icon: Icon(Icons.gamepad),
                              label: Text('Manual'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor:
                                    carProvider.currentMode == 'manual'
                                    ? Colors.blue
                                    : Colors.grey,
                              ),
                            ),
                          ),
                          SizedBox(width: 8.w),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: carProvider.isLoading
                                  ? null
                                  : () => carProvider.enableAutoMode(),
                              icon: Icon(Icons.smart_toy),
                              label: Text('Auto'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor:
                                    carProvider.currentMode == 'auto'
                                    ? Colors.green
                                    : Colors.grey,
                              ),
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 12.h),

                      // Sensor Display
                      const SensorDisplayWidget(),
                      SizedBox(height: 16.h),

                      // Battery Status
                      _buildBatteryStatus(carProvider),
                      SizedBox(height: 16.h),

                      // Error Display
                      if (carProvider.error != null)
                        Container(
                          width: double.infinity,
                          padding: EdgeInsets.all(8.w),
                          margin: EdgeInsets.only(bottom: 12.h),
                          decoration: BoxDecoration(
                            color: Colors.red[100],
                            borderRadius: BorderRadius.circular(8.r),
                            border: Border.all(color: Colors.red),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error, color: Colors.red),
                              SizedBox(width: 8.w),
                              Expanded(
                                child: Text(
                                  carProvider.error!,
                                  style: const TextStyle(color: Colors.red),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(
                                  Icons.close,
                                  color: Colors.red,
                                ),
                                onPressed: () {
                                  carProvider.clearError();
                                },
                              ),
                            ],
                          ),
                        ),

                      SizedBox(height: 16.h),

                      // Control Buttons
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Forward Button
                          _buildControlButton(
                            icon: FontAwesomeIcons.arrowUp,
                            label: 'Forward',
                            onPressed: () => carProvider.moveForward(),
                            isLoading: carProvider.isLoading,
                          ),
                          SizedBox(height: 12.h),

                          // Left and Right Buttons
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              Expanded(
                                child: _buildControlButton(
                                  icon: FontAwesomeIcons.arrowLeft,
                                  label: 'Left',
                                  onPressed: () => carProvider.turnLeft(),
                                  isLoading: carProvider.isLoading,
                                ),
                              ),
                              SizedBox(width: 12.w),
                              Expanded(
                                child: _buildControlButton(
                                  icon: FontAwesomeIcons.stop,
                                  label: 'Stop',
                                  onPressed: () => carProvider.stopCar(),
                                  isLoading: carProvider.isLoading,
                                  color: Colors.red,
                                ),
                              ),
                              SizedBox(width: 12.w),
                              Expanded(
                                child: _buildControlButton(
                                  icon: FontAwesomeIcons.arrowRight,
                                  label: 'Right',
                                  onPressed: () => carProvider.turnRight(),
                                  isLoading: carProvider.isLoading,
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: 12.h),

                          // Backward Button
                          _buildControlButton(
                            icon: FontAwesomeIcons.arrowDown,
                            label: 'Backward',
                            onPressed: () => carProvider.moveBackward(),
                            isLoading: carProvider.isLoading,
                          ),
                        ],
                      ),

                      // Connection Status
                      Container(
                        width: double.infinity,
                        padding: EdgeInsets.all(8.w),
                        decoration: BoxDecoration(
                          color: carProvider.isConnected
                              ? Colors.green[100]
                              : Colors.red[100],
                          borderRadius: BorderRadius.circular(6.r),
                          border: Border.all(
                            color: carProvider.isConnected
                                ? Colors.green
                                : Colors.red,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              carProvider.isConnected
                                  ? Icons.wifi
                                  : Icons.wifi_off,
                              color: carProvider.isConnected
                                  ? Colors.green
                                  : Colors.red,
                              size: 16.sp,
                            ),
                            SizedBox(width: 6.w),
                            Text(
                              carProvider.isConnected
                                  ? 'Connected'
                                  : 'Disconnected',
                              style: TextStyle(
                                color: carProvider.isConnected
                                    ? Colors.green
                                    : Colors.red,
                                fontSize: 12.sp,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildStatusCard(
    String title,
    bool isConnected,
    IconData icon,
    String status,
  ) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
      child: Padding(
        padding: EdgeInsets.all(12.w),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 24.sp,
              color: isConnected ? Colors.green : Colors.red,
            ),
            SizedBox(height: 4.h),
            Text(
              title,
              style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.bold),
            ),
            Text(
              status,
              style: TextStyle(
                fontSize: 10.sp,
                color: isConnected ? Colors.green : Colors.red,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildControlButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
    required bool isLoading,
    Color? color,
  }) {
    return Container(
      constraints: BoxConstraints(
        minWidth: 60.w,
        maxWidth: 100.w,
        minHeight: 60.h,
        maxHeight: 80.h,
      ),
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: color ?? const Color(0xFF1E3C72),
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12.r),
          ),
          elevation: 4,
          padding: EdgeInsets.all(6.w),
        ),
        child: isLoading
            ? SizedBox(
                width: 20.w,
                height: 20.h,
                child: const CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2,
                ),
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  FaIcon(icon, size: 18.sp),
                  SizedBox(height: 2.h),
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 10.sp,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildBatteryStatus(CarControlProvider carProvider) {
    Color batteryColor;
    IconData batteryIcon;

    if (carProvider.batteryPercentage > 50) {
      batteryColor = Colors.green;
      batteryIcon = Icons.battery_full;
    } else if (carProvider.batteryPercentage > 20) {
      batteryColor = Colors.orange;
      batteryIcon = Icons.battery_3_bar;
    } else {
      batteryColor = Colors.red;
      batteryIcon = Icons.battery_1_bar;
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.r)),
      child: Padding(
        padding: EdgeInsets.all(12.w),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(batteryIcon, color: batteryColor, size: 24.sp),
                SizedBox(width: 8.w),
                Text(
                  '${carProvider.batteryPercentage}%',
                  style: TextStyle(
                    color: batteryColor,
                    fontSize: 16.sp,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(width: 4.w),
                Text(
                  '(${carProvider.batteryVoltage.toStringAsFixed(1)}V)',
                  style: TextStyle(fontSize: 12.sp, color: Colors.grey[600]),
                ),
              ],
            ),
            if (carProvider.powerSaveMode) ...[
              SizedBox(height: 4.h),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                decoration: BoxDecoration(
                  color: Colors.orange[100],
                  borderRadius: BorderRadius.circular(4.r),
                ),
                child: Text(
                  '💤 Power Save Mode',
                  style: TextStyle(
                    color: Colors.orange[800],
                    fontSize: 10.sp,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
            if (carProvider.batteryStatus == 'critical') ...[
              SizedBox(height: 4.h),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                decoration: BoxDecoration(
                  color: Colors.red[100],
                  borderRadius: BorderRadius.circular(4.r),
                ),
                child: Text(
                  '🚨 Critical Battery',
                  style: TextStyle(
                    color: Colors.red[800],
                    fontSize: 10.sp,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
