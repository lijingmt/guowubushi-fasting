import Foundation
#if canImport(WidgetKit)
import WidgetKit
#endif
#if canImport(ActivityKit)
import ActivityKit
#endif

@objc(GuowuWidgetBridge)
final class GuowuWidgetBridge: NSObject {
  private let appGroupId = "group.com.guowu.fasting"
  private let snapshotKey = "guowu_widget_snapshot"

  @objc static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(updateSnapshot:resolver:rejecter:)
  func updateSnapshot(
    _ jsonString: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let defaults = UserDefaults(suiteName: appGroupId)
    defaults?.set(jsonString, forKey: snapshotKey)
    defaults?.synchronize()
    #if canImport(WidgetKit)
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    #endif
    resolve(true)
  }

  @objc(syncLiveActivity:mode:startTimeMs:endTimeMs:targetHours:stageTitleZh:stageTitleEn:shichenZh:shichenEn:language:resolver:rejecter:)
  func syncLiveActivity(
    _ active: Bool,
    mode: String,
    startTimeMs: Double,
    endTimeMs: Double,
    targetHours: Double,
    stageTitleZh: String,
    stageTitleEn: String,
    shichenZh: String,
    shichenEn: String,
    language: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    #if canImport(ActivityKit)
    if #available(iOS 16.2, *) {
      Task {
        let currentActivities = Activity<GuowuFastingAttributes>.activities
        if !active {
          for activity in currentActivities {
            await activity.end(nil, dismissalPolicy: .immediate)
          }
          resolve(true)
          return
        }

        let state = GuowuFastingAttributes.ContentState(
          mode: mode,
          startTimeMs: startTimeMs,
          endTimeMs: endTimeMs,
          targetHours: targetHours,
          stageTitleZh: stageTitleZh,
          stageTitleEn: stageTitleEn,
          shichenZh: shichenZh,
          shichenEn: shichenEn,
          language: language
        )
        let content = ActivityContent(state: state, staleDate: Date().addingTimeInterval(3600))

        if let existing = currentActivities.first {
          await existing.update(content)
          resolve(true)
          return
        }

        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
          resolve(false)
          return
        }

        do {
          let label = language.hasPrefix("zh") ? "过午轻断食" : "Guowu Fasting"
          _ = try Activity.request(
            attributes: GuowuFastingAttributes(sessionLabel: label),
            content: content,
            pushType: nil
          )
          resolve(true)
        } catch {
          resolve(false)
        }
      }
      return
    }
    #endif
    resolve(false)
  }
}
