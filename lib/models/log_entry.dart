import 'package:json_annotation/json_annotation.dart';

part 'log_entry.g.dart';

@JsonSerializable()
class LogEntry {
  @JsonKey(name: 'id', fromJson: _idFromJson)
  final String id;
  final String? userId;
  final String? userName;
  final String? userEmail;
  final String? userRole;
  final String? action;
  final String? description;
  @JsonKey(fromJson: _timestampFromJson)
  final DateTime timestamp;
  final Map<String, dynamic>? metadata;
  final String? ipAddress;
  final String? userAgent;
  final String? category;

  LogEntry({
    required this.id,
    this.userId,
    this.userName,
    this.userEmail,
    this.userRole,
    this.action,
    this.description,
    required this.timestamp,
    this.metadata,
    this.ipAddress,
    this.userAgent,
    this.category,
  });

  static String _idFromJson(dynamic json) {
    if (json == null) return '';
    return json.toString();
  }

  static DateTime _timestampFromJson(dynamic json) {
    if (json == null) return DateTime.now();
    if (json is String) {
      try {
        return DateTime.parse(json);
      } catch (e) {
        return DateTime.now();
      }
    }
    return DateTime.now();
  }

  factory LogEntry.fromJson(Map<String, dynamic> json) =>
      _$LogEntryFromJson(json);
  Map<String, dynamic> toJson() => _$LogEntryToJson(this);
}
