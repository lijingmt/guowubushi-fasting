import ActivityKit
import SwiftUI
import WidgetKit

@available(iOS 16.2, *)
struct GuowuFastingLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: GuowuFastingAttributes.self) { context in
      let startDate = Date(timeIntervalSince1970: context.state.startTimeMs / 1000.0)
      let isZh = context.state.language.hasPrefix("zh")

      HStack(spacing: 12) {
        VStack(alignment: .leading, spacing: 4) {
          HStack(spacing: 6) {
            Text("🪷")
            Text(context.attributes.sessionLabel)
              .font(.caption.bold())
              .foregroundColor(Color(red: 0.78, green: 0.55, blue: 0.20))
            Text("· \(isZh ? context.state.shichenZh : context.state.shichenEn)")
              .font(.caption)
              .foregroundColor(.secondary)
          }
          Text(isZh ? context.state.stageTitleZh : context.state.stageTitleEn)
            .font(.headline.bold())
            .foregroundColor(.primary)
        }
        Spacer()
        VStack(alignment: .trailing, spacing: 2) {
          Text(startDate, style: .timer)
            .font(.system(size: 22, weight: .heavy, design: .rounded))
            .monospacedDigit()
            .foregroundColor(Color(red: 0.15, green: 0.35, blue: 0.28))
          Text(isZh ? "目标 \(Int(context.state.targetHours))h" : "Goal \(Int(context.state.targetHours))h")
            .font(.caption2)
            .foregroundColor(.secondary)
        }
      }
      .padding(14)
      .activityBackgroundTint(Color(red: 0.97, green: 0.95, blue: 0.91))
      .activitySystemActionForegroundColor(Color(red: 0.15, green: 0.35, blue: 0.28))
    } dynamicIsland: { context in
      let startDate = Date(timeIntervalSince1970: context.state.startTimeMs / 1000.0)
      let isZh = context.state.language.hasPrefix("zh")

      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 4) {
            Text("🪷")
            Text(isZh ? context.state.shichenZh : context.state.shichenEn)
              .font(.caption.bold())
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(startDate, style: .timer)
            .font(.headline.monospacedDigit())
            .foregroundColor(Color(red: 0.45, green: 0.74, blue: 0.62))
        }
        DynamicIslandExpandedRegion(.bottom) {
          HStack {
            Text(isZh ? context.state.stageTitleZh : context.state.stageTitleEn)
              .font(.subheadline.bold())
            Spacer()
            Text(isZh ? "过午修心 · \(Int(context.state.targetHours))h" : "Guowu · \(Int(context.state.targetHours))h")
              .font(.caption)
              .foregroundColor(.secondary)
          }
        }
      } compactLeading: {
        Text("🪷")
      } compactTrailing: {
        Text(startDate, style: .timer)
          .font(.caption2.monospacedDigit())
          .frame(maxWidth: 46)
      } minimal: {
        Text("🪷")
      }
    }
  }
}
