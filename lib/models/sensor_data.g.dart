// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sensor_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SensorData _$SensorDataFromJson(Map<String, dynamic> json) => SensorData(
  distance: (json['distance'] as num).toDouble(),
  timestamp: DateTime.parse(json['timestamp'] as String),
  isObstacleDetected: json['isObstacleDetected'] as bool,
);

Map<String, dynamic> _$SensorDataToJson(SensorData instance) =>
    <String, dynamic>{
      'distance': instance.distance,
      'timestamp': instance.timestamp.toIso8601String(),
      'isObstacleDetected': instance.isObstacleDetected,
    };
