// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'command.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Command _$CommandFromJson(Map<String, dynamic> json) => Command(
  id: json['_id'] as String,
  userId: json['userId'] as String,
  userName: json['userName'] as String,
  action: json['action'] as String,
  timestamp: DateTime.parse(json['timestamp'] as String),
  executed: json['executed'] as bool,
  executedAt: json['executedAt'] == null
      ? null
      : DateTime.parse(json['executedAt'] as String),
  esp32Response: json['esp32Response'] as String?,
  error: json['error'] as String?,
);

Map<String, dynamic> _$CommandToJson(Command instance) => <String, dynamic>{
  '_id': instance.id,
  'userId': instance.userId,
  'userName': instance.userName,
  'action': instance.action,
  'timestamp': instance.timestamp.toIso8601String(),
  'executed': instance.executed,
  'executedAt': instance.executedAt?.toIso8601String(),
  'esp32Response': instance.esp32Response,
  'error': instance.error,
};
