import 'package:json_annotation/json_annotation.dart';

part 'sensor_data.g.dart';

@JsonSerializable()
class SensorData {
  final double distance;
  final DateTime timestamp;
  final bool isObstacleDetected;

  SensorData({
    required this.distance,
    required this.timestamp,
    required this.isObstacleDetected,
  });

  // These methods will use the generated code
  factory SensorData.fromJson(Map<String, dynamic> json) =>
      _$SensorDataFromJson(json);
  Map<String, dynamic> toJson() => _$SensorDataToJson(this);
}
