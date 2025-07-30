import 'package:json_annotation/json_annotation.dart';

part 'command.g.dart';

@JsonSerializable()
class Command {
  @JsonKey(name: '_id')
  final String id;
  final String userId;
  final String userName;
  final String action; // 'forward', 'backward', 'left', 'right', 'stop'
  final DateTime timestamp;
  final bool executed;
  final DateTime? executedAt;
  final String? esp32Response;
  final String? error;

  Command({
    required this.id,
    required this.userId,
    required this.userName,
    required this.action,
    required this.timestamp,
    required this.executed,
    this.executedAt,
    this.esp32Response,
    this.error,
  });

  factory Command.fromJson(Map<String, dynamic> json) =>
      _$CommandFromJson(json);
  Map<String, dynamic> toJson() => _$CommandToJson(this);
}
