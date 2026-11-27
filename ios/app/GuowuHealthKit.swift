import Foundation
import HealthKit

@objc(GuowuHealthKit)
final class GuowuHealthKit: NSObject {
  private let store = HKHealthStore()

  @objc static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(isAvailable:rejecter:)
  func isAvailable(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    resolve(HKHealthStore.isHealthDataAvailable())
  }

  private func readTypes() -> Set<HKObjectType> {
    var set = Set<HKObjectType>()
    if let weight = HKObjectType.quantityType(forIdentifier: .bodyMass) { set.insert(weight) }
    if let steps = HKObjectType.quantityType(forIdentifier: .stepCount) { set.insert(steps) }
    if let sleep = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) { set.insert(sleep) }
    return set
  }

  private func shareTypes() -> Set<HKSampleType> {
    var set = Set<HKSampleType>()
    if let mindful = HKObjectType.categoryType(forIdentifier: .mindfulSession) { set.insert(mindful) }
    return set
  }

  @objc(requestAuthorization:rejecter:)
  func requestAuthorization(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard HKHealthStore.isHealthDataAvailable() else {
      resolve(false)
      return
    }
    store.requestAuthorization(toShare: shareTypes(), read: readTypes()) { success, _ in
      resolve(success)
    }
  }

  @objc(saveMindfulMinutes:endMs:resolver:rejecter:)
  func saveMindfulMinutes(
    _ startMs: Double,
    endMs: Double,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard HKHealthStore.isHealthDataAvailable(),
          let mindfulType = HKObjectType.categoryType(forIdentifier: .mindfulSession),
          endMs > startMs else {
      resolve(false)
      return
    }
    let start = Date(timeIntervalSince1970: startMs / 1000.0)
    let end = Date(timeIntervalSince1970: endMs / 1000.0)
    let sample = HKCategorySample(type: mindfulType, value: HKCategoryValue.notApplicable.rawValue, start: start, end: end)
    store.save(sample) { success, _ in
      resolve(success)
    }
  }

  @objc(syncLatestMetrics:rejecter:)
  func syncLatestMetrics(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard HKHealthStore.isHealthDataAvailable() else {
      resolve([:])
      return
    }

    let group = DispatchGroup()
    var latestWeightKg: Double?
    var todaySteps: Double?
    var lastNightSleepHours: Double?
    var sleepByDate: [String: Double] = [:]

    // 1. Latest body mass (kg)
    if let weightType = HKObjectType.quantityType(forIdentifier: .bodyMass) {
      group.enter()
      let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
      let query = HKSampleQuery(sampleType: weightType, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
        if let sample = samples?.first as? HKQuantitySample {
          latestWeightKg = (sample.quantity.doubleValue(for: .gramUnit(with: .kilo)) * 10).rounded() / 10
        }
        group.leave()
      }
      store.execute(query)
    }

    // 2. Today steps
    if let stepType = HKObjectType.quantityType(forIdentifier: .stepCount) {
      group.enter()
      let now = Date()
      let startOfDay = Calendar.current.startOfDay(for: now)
      let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)
      let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, stats, _ in
        if let sum = stats?.sumQuantity() {
          todaySteps = sum.doubleValue(for: .count()).rounded()
        }
        group.leave()
      }
      store.execute(query)
    }

    // 3. Last 14 days sleep analysis grouped by wake-up local date
    if let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
      group.enter()
      let now = Date()
      let start14d = Calendar.current.date(byAdding: .day, value: -14, to: now) ?? now.addingTimeInterval(-14 * 86400)
      let predicate = HKQuery.predicateForSamples(withStart: start14d, end: now, options: .strictStartDate)
      let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, _ in
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        var secondsMap: [String: Double] = [:]

        for case let sample as HKCategorySample in samples ?? [] {
          let isAsleep: Bool
          if #available(iOS 16.0, *) {
            isAsleep =
              sample.value == HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue ||
              sample.value == HKCategoryValueSleepAnalysis.asleepCore.rawValue ||
              sample.value == HKCategoryValueSleepAnalysis.asleepDeep.rawValue ||
              sample.value == HKCategoryValueSleepAnalysis.asleepREM.rawValue
          } else {
            isAsleep = sample.value == HKCategoryValueSleepAnalysis.asleep.rawValue
          }
          if isAsleep {
            let dayKey = formatter.string(from: sample.endDate)
            secondsMap[dayKey, default: 0] += sample.endDate.timeIntervalSince(sample.startDate)
          }
        }

        let todayKey = formatter.string(from: now)
        for (dayKey, secs) in secondsMap {
          let hrs = ((secs / 3600.0) * 10).rounded() / 10
          sleepByDate[dayKey] = hrs
        }
        if let todaySleep = sleepByDate[todayKey] {
          lastNightSleepHours = todaySleep
        } else if let latestDay = sleepByDate.keys.sorted().last {
          lastNightSleepHours = sleepByDate[latestDay]
        }
        group.leave()
      }
      store.execute(query)
    }

    group.notify(queue: .main) {
      var result: [String: Any] = ["sleepByDate": sleepByDate]
      if let latestWeightKg { result["latestWeightKg"] = latestWeightKg }
      if let todaySteps { result["todaySteps"] = todaySteps }
      if let lastNightSleepHours { result["lastNightSleepHours"] = lastNightSleepHours }
      resolve(result)
    }
  }
}
