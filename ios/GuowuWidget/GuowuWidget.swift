import WidgetKit
import SwiftUI

struct GuowuWidgetSnapshot: Codable {
  let updatedAt: Double?
  let tier: String?
  let mode: String?
  let cutoffHour: Int?
  let countdownMinutes: Int?
  let fastingElapsedMinutes: Int?
  let stageId: String?
  let stageTitleZh: String?
  let stageTitleEn: String?
  let shichenZh: String?
  let shichenEn: String?
  let solarTermZh: String?
  let solarTermEn: String?
  let solarTermSeal: String?
  let solarTermQuoteZh: String?
  let solarTermQuoteEn: String?
  let fastStartEpochMs: Double?
  let fastEndEpochMs: Double?
  let targetDurationHours: Double?
  let currentStreak: Int?
  let hasCheckedToday: Bool?
  let language: String?
  let themeSkin: String?
}

struct GuowuTimelineEntry: TimelineEntry {
  let date: Date
  let snapshot: GuowuWidgetSnapshot
}

struct GuowuProvider: TimelineProvider {
  private let appGroupId = "group.com.guowu.fasting"
  private let snapshotKey = "guowu_widget_snapshot"

  func placeholder(in context: Context) -> GuowuTimelineEntry {
    GuowuTimelineEntry(date: Date(), snapshot: defaultSnapshot())
  }

  func getSnapshot(in context: Context, completion: @escaping (GuowuTimelineEntry) -> Void) {
    completion(GuowuTimelineEntry(date: Date(), snapshot: loadSnapshot()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<GuowuTimelineEntry>) -> Void) {
    let now = Date()
    let entry = GuowuTimelineEntry(date: now, snapshot: loadSnapshot())
    let nextRefresh = Calendar.current.date(byAdding: .minute, value: 15, to: now) ?? now.addingTimeInterval(900)
    completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
  }

  private func loadSnapshot() -> GuowuWidgetSnapshot {
    guard let defaults = UserDefaults(suiteName: appGroupId),
          let raw = defaults.string(forKey: snapshotKey),
          let data = raw.data(using: .utf8),
          let parsed = try? JSONDecoder().decode(GuowuWidgetSnapshot.self, from: data) else {
      return defaultSnapshot()
    }
    return parsed
  }

  private func defaultSnapshot() -> GuowuWidgetSnapshot {
    GuowuWidgetSnapshot(
      updatedAt: nil,
      tier: "classic",
      mode: "fasting",
      cutoffHour: 13,
      countdownMinutes: 180,
      fastingElapsedMinutes: 600,
      stageId: "steady_glucose",
      stageTitleZh: "糖原稳态期",
      stageTitleEn: "Steady Glucose",
      shichenZh: "戌时",
      shichenEn: "Xu Hour",
      solarTermZh: "节律清明",
      solarTermEn: "Seasonal Rhythm",
      solarTermSeal: "过午守心",
      solarTermQuoteZh: "心定神安，轻断自明。",
      solarTermQuoteEn: "Quiet rhythm clears the mind.",
      fastStartEpochMs: nil,
      fastEndEpochMs: nil,
      targetDurationHours: 16,
      currentStreak: 0,
      hasCheckedToday: false,
      language: Locale.current.language.languageCode?.identifier ?? "en",
      themeSkin: "bamboo"
    )
  }
}

struct GuowuFastingWidgetView: View {
  @Environment(\.widgetFamily) var family
  var entry: GuowuProvider.Entry

  private var isZh: Bool {
    (entry.snapshot.language ?? "").hasPrefix("zh")
  }

  private var isFasting: Bool {
    (entry.snapshot.mode ?? "fasting") == "fasting"
  }

  private var accentColor: Color {
    switch entry.snapshot.themeSkin {
    case "celadon": return Color(red: 0.18, green: 0.42, blue: 0.45)
    case "dunhuang": return Color(red: 0.61, green: 0.40, blue: 0.14)
    case "ink": return Color(red: 0.20, green: 0.25, blue: 0.29)
    default: return Color(red: 0.15, green: 0.35, blue: 0.28)
    }
  }

  private var progressRatio: Double {
    if !isFasting { return 0.25 }
    let elapsedMin = Double(entry.snapshot.fastingElapsedMinutes ?? 0)
    let targetMin = max(60.0, (entry.snapshot.targetDurationHours ?? 16.0) * 60.0)
    return min(1.0, max(0.05, elapsedMin / targetMin))
  }

  private var fastStartDate: Date? {
    guard let ms = entry.snapshot.fastStartEpochMs, ms > 0 else { return nil }
    return Date(timeIntervalSince1970: ms / 1000.0)
  }

  private var elapsedFormatted: String {
    let mins = max(0, entry.snapshot.fastingElapsedMinutes ?? 0)
    return String(format: "%dh %02dm", mins / 60, mins % 60)
  }

  private var countdownFormatted: String {
    let mins = max(0, entry.snapshot.countdownMinutes ?? 0)
    return String(format: "%dh %02dm", mins / 60, mins % 60)
  }

  var body: some View {
    switch family {
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        Gauge(value: progressRatio) {
          Text(isFasting ? "F" : "E")
        } currentValueLabel: {
          Text("\((entry.snapshot.fastingElapsedMinutes ?? 0) / 60)h")
            .font(.system(size: 12, weight: .bold))
        }
        .gaugeStyle(.accessoryCircular)
      }
      .widgetContainerBackground()

    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 2) {
        Text(isZh ? (isFasting ? "过午修整中" : "早午进食窗") : (isFasting ? "Guowu Fasting" : "Nourish Window"))
          .font(.headline)
        Text(isZh ? (entry.snapshot.stageTitleZh ?? "轻断食节律") : (entry.snapshot.stageTitleEn ?? "Circadian Rhythm"))
          .font(.caption)
        Text(isFasting ? elapsedFormatted : countdownFormatted)
          .font(.caption2.monospacedDigit())
      }
      .widgetContainerBackground()

    case .systemMedium:
      HStack(spacing: 14) {
        ZStack {
          Circle()
            .stroke(accentColor.opacity(0.18), lineWidth: 9)
          Circle()
            .trim(from: 0, to: progressRatio)
            .stroke(accentColor, style: StrokeStyle(lineWidth: 9, lineCap: .round))
            .rotationEffect(.degrees(-90))
          VStack(spacing: 2) {
            Text(isZh ? (isFasting ? "断食已过" : "距止食") : (isFasting ? "Fasted" : "Window"))
              .font(.system(size: 10, weight: .semibold))
              .foregroundColor(.secondary)
            if let start = fastStartDate, isFasting {
              Text(start, style: .timer)
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .multilineTextAlignment(.center)
                .foregroundColor(accentColor)
            } else {
              Text(isFasting ? elapsedFormatted : countdownFormatted)
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .foregroundColor(accentColor)
            }
          }
        }
        .frame(width: 96, height: 96)

        VStack(alignment: .leading, spacing: 5) {
          HStack {
            Text(isZh ? (entry.snapshot.stageTitleZh ?? "糖原稳态期") : (entry.snapshot.stageTitleEn ?? "Steady Glucose"))
              .font(.system(size: 15, weight: .bold))
              .foregroundColor(accentColor)
            Spacer()
            Text("🔥 \(entry.snapshot.currentStreak ?? 0)")
              .font(.system(size: 12, weight: .bold))
          }
          Text(isZh
               ? "\(entry.snapshot.shichenZh ?? "戌时") · \(entry.snapshot.solarTermZh ?? "节气")"
               : "\(entry.snapshot.shichenEn ?? "Circadian") · \(entry.snapshot.solarTermEn ?? "Season")")
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(.secondary)
          Text(isZh
               ? (entry.snapshot.solarTermQuoteZh ?? "心静身轻，顺时而养。")
               : (entry.snapshot.solarTermQuoteEn ?? "Light digestion, calm spirit."))
            .font(.system(size: 11))
            .foregroundColor(.secondary)
            .lineLimit(2)
        }
      }
      .padding(4)
      .widgetContainerBackground()

    default:
      VStack(alignment: .leading, spacing: 8) {
        HStack {
          Text(isZh ? "过午日晷" : "Guowu")
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(accentColor)
          Spacer()
          Text("🔥 \(entry.snapshot.currentStreak ?? 0)")
            .font(.system(size: 11, weight: .bold))
        }
        Spacer()
        if let start = fastStartDate, isFasting {
          Text(start, style: .timer)
            .font(.system(size: 22, weight: .heavy, design: .rounded))
            .foregroundColor(accentColor)
        } else {
          Text(isFasting ? elapsedFormatted : countdownFormatted)
            .font(.system(size: 22, weight: .heavy, design: .rounded))
            .foregroundColor(accentColor)
        }
        Text(isZh ? (entry.snapshot.stageTitleZh ?? "轻断食") : (entry.snapshot.stageTitleEn ?? "Circadian"))
          .font(.system(size: 12, weight: .semibold))
          .lineLimit(1)
        Text(isZh ? (entry.snapshot.solarTermSeal ?? "清静自持") : (entry.snapshot.solarTermEn ?? "Mindful"))
          .font(.system(size: 10))
          .foregroundColor(.secondary)
      }
      .padding(2)
      .widgetContainerBackground()
    }
  }
}

private extension View {
  @ViewBuilder
  func widgetContainerBackground() -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      self.containerBackground(Color(red: 0.97, green: 0.95, blue: 0.91), for: .widget)
    } else {
      self.padding(10).background(Color(red: 0.97, green: 0.95, blue: 0.91))
    }
  }
}

struct GuowuFastingWidget: Widget {
  let kind: String = "GuowuFastingWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: GuowuProvider()) { entry in
      GuowuFastingWidgetView(entry: entry)
    }
    .configurationDisplayName("过午不食 · 日晷节律")
    .description("查看当前断食时长、代谢阶段、时辰节气与连胜。")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
  }
}
