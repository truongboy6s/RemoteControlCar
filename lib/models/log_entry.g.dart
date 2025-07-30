// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'log_entry.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LogEntry _$LogEntryFromJson(Map<String, dynamic> json) => LogEntry(
  id: LogEntry._idFromJson(json['id']),
  userId: json['userId'] as String?,
  userName: json['userName'] as String?,
  userEmail: json['userEmail'] as String?,
  userRole: json['userRole'] as String?,
  action: json['action'] as String?,
  description: json['description'] as String?,
  timestamp: LogEntry._timestampFromJson(json['timestamp']),
  metadata: json['metadata'] as Map<String, dynamic>?,
  ipAddress: json['ipAddress'] as String?,
  userAgent: json['userAgent'] as String?,
  category: json['category'] as String?,
);

Map<String, dynamic> _$LogEntryToJson(LogEntry instance) => <String, dynamic>{
  'id': instance.id,
  'userId': instance.userId,
  'userName': instance.userName,
  'userEmail': instance.userEmail,
  'userRole': instance.userRole,
  'action': instance.action,
  'description': instance.description,
  'timestamp': instance.timestamp.toIso8601String(),
  'metadata': instance.metadata,
  'ipAddress': instance.ipAddress,
  'userAgent': instance.userAgent,
  'category': instance.category,
};
