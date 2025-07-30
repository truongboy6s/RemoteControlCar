import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../../providers/auth_provider.dart';
import '../../providers/car_control_provider.dart';
import '../../models/sensor_data.dart';
import '../login_page.dart';
import 'car_control_widget.dart';
import 'sensor_display_widget.dart';
import 'user_logs_widget.dart';
import 'user_profile_widget.dart';

class UserPage extends StatefulWidget {
  const UserPage({super.key});

  @override
  State<UserPage> createState() => _UserPageState();
}

class _UserPageState extends State<UserPage> {
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    // Initialize car control provider
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<CarControlProvider>(context, listen: false).initialize();
    });
  }

  void _logout() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.logout();

    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (context) => const LoginPage()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    if (!authProvider.hasAccess) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Car Control'),
          backgroundColor: const Color(0xFF1E3C72),
          foregroundColor: Colors.white,
          actions: [
            IconButton(icon: const Icon(Icons.logout), onPressed: _logout),
          ],
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.block, size: 80.sp, color: Colors.red),
              SizedBox(height: 16.h),
              Text(
                'Access Denied',
                style: TextStyle(
                  fontSize: 24.sp,
                  fontWeight: FontWeight.bold,
                  color: Colors.red,
                ),
              ),
              SizedBox(height: 8.h),
              Text(
                'You do not have permission to control the car.\nPlease contact an administrator.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16.sp, color: Colors.grey[600]),
              ),
            ],
          ),
        ),
      );
    }

    final List<Widget> pages = [
      const CarControlWidget(),
      const UserLogsWidget(),
      const UserProfileWidget(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text('Welcome, ${authProvider.currentUser?.name ?? 'User'}'),
        backgroundColor: const Color(0xFF1E3C72),
        foregroundColor: Colors.white,
        actions: [
          Consumer<CarControlProvider>(
            builder: (context, carProvider, child) {
              return IconButton(
                icon: Icon(
                  carProvider.isConnected ? Icons.wifi : Icons.wifi_off,
                  color: carProvider.isConnected ? Colors.green : Colors.red,
                ),
                onPressed: () {
                  if (carProvider.isConnected) {
                    carProvider.disconnect();
                  } else {
                    carProvider.reconnect();
                  }
                },
              );
            },
          ),
          IconButton(icon: const Icon(Icons.logout), onPressed: _logout),
        ],
      ),
      body: IndexedStack(index: _selectedIndex, children: pages),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFF1E3C72),
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(
            icon: FaIcon(FontAwesomeIcons.gamepad),
            label: 'Control',
          ),
          BottomNavigationBarItem(icon: Icon(Icons.history), label: 'Logs'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
