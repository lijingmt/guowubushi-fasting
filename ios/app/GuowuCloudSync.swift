import Foundation

@objc(GuowuCloudSync)
final class GuowuCloudSync: NSObject {
  private let dataKey = "guowu_backup_v1"
  private let timestampKey = "guowu_backup_ts_v1"

  @objc static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(getStatus:rejecter:)
  func getStatus(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let store = NSUbiquitousKeyValueStore.default
    store.synchronize()
    let hasBackup = store.data(forKey: dataKey) != nil || store.string(forKey: dataKey) != nil
    let ts = store.double(forKey: timestampKey)
    let lastSyncedAt: Any = ts > 0 ? ts : NSNull()
    let available = FileManager.default.ubiquityIdentityToken != nil
    resolve([
      "available": available,
      "hasBackup": hasBackup,
      "lastSyncedAt": lastSyncedAt,
    ])
  }

  @objc(saveBackup:resolver:rejecter:)
  func saveBackup(
    _ jsonString: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let rawData = jsonString.data(using: .utf8) else {
      resolve(["success": false])
      return
    }
    let store = NSUbiquitousKeyValueStore.default
    let nowMs = Date().timeIntervalSince1970 * 1000.0
    if let compressed = try? (rawData as NSData).compressed(using: .lzfse) as Data {
      store.set(compressed, forKey: dataKey)
    } else {
      store.set(jsonString, forKey: dataKey)
    }
    store.set(nowMs, forKey: timestampKey)
    let ok = store.synchronize()
    resolve([
      "success": ok || FileManager.default.ubiquityIdentityToken != nil,
      "lastSyncedAt": nowMs,
    ])
  }

  @objc(loadBackup:rejecter:)
  func loadBackup(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let store = NSUbiquitousKeyValueStore.default
    store.synchronize()
    let ts = store.double(forKey: timestampKey)
    let lastSyncedAt: Any = ts > 0 ? ts : NSNull()

    if let compressed = store.data(forKey: dataKey),
       let decompressed = try? (compressed as NSData).decompressed(using: .lzfse) as Data,
       let jsonString = String(data: decompressed, encoding: .utf8) {
      resolve([
        "found": true,
        "jsonString": jsonString,
        "lastSyncedAt": lastSyncedAt,
      ])
      return
    }

    if let plain = store.string(forKey: dataKey), !plain.isEmpty {
      resolve([
        "found": true,
        "jsonString": plain,
        "lastSyncedAt": lastSyncedAt,
      ])
      return
    }

    resolve([
      "found": false,
      "jsonString": NSNull(),
      "lastSyncedAt": NSNull(),
    ])
  }
}
