import Foundation
#if canImport(ActivityKit)
import ActivityKit

@available(iOS 16.2, *)
public struct GuowuFastingAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var mode: String
    public var startTimeMs: Double
    public var endTimeMs: Double
    public var targetHours: Double
    public var stageTitleZh: String
    public var stageTitleEn: String
    public var shichenZh: String
    public var shichenEn: String
    public var language: String

    public init(
      mode: String,
      startTimeMs: Double,
      endTimeMs: Double,
      targetHours: Double,
      stageTitleZh: String,
      stageTitleEn: String,
      shichenZh: String,
      shichenEn: String,
      language: String
    ) {
      self.mode = mode
      self.startTimeMs = startTimeMs
      self.endTimeMs = endTimeMs
      self.targetHours = targetHours
      self.stageTitleZh = stageTitleZh
      self.stageTitleEn = stageTitleEn
      self.shichenZh = shichenZh
      self.shichenEn = shichenEn
      self.language = language
    }
  }

  public var sessionLabel: String

  public init(sessionLabel: String) {
    self.sessionLabel = sessionLabel
  }
}
#endif
