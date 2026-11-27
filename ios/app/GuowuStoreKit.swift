import Foundation
import StoreKit

@objc(GuowuStoreKit)
final class GuowuStoreKit: NSObject {
  private let proProductIds: Set<String> = [
    "com.guowu.fasting.pro.monthly",
    "com.guowu.fasting.pro.yearly",
  ]
  private var updatesTask: Task<Void, Never>?

  override init() {
    super.init()
    updatesTask = Task.detached(priority: .background) {
      for await result in Transaction.updates {
        if case .verified(let transaction) = result {
          await transaction.finish()
        }
      }
    }
  }

  deinit {
    updatesTask?.cancel()
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(isAvailable:rejecter:)
  func isAvailable(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    resolve(true)
  }

  @objc(fetchProducts:resolver:rejecter:)
  func fetchProducts(
    _ productIds: [String],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      do {
        let products = try await Product.products(for: productIds)
        let mapped: [[String: Any]] = products
          .sorted { $0.price < $1.price }
          .map { p in
            let typeStr: String
            switch p.type {
            case .autoRenewable:
              typeStr = "autoRenewable"
            case .consumable:
              typeStr = "consumable"
            default:
              typeStr = "other"
            }

            var hasFreeTrial = false
            var trialDays = 0
            if let intro = p.subscription?.introductoryOffer, intro.paymentMode == .freeTrial {
              hasFreeTrial = true
              let val = intro.period.value
              switch intro.period.unit {
              case .day:
                trialDays = val
              case .week:
                trialDays = val * 7
              case .month:
                trialDays = val * 30
              case .year:
                trialDays = val * 365
              @unknown default:
                trialDays = 7
              }
            }

            return [
              "id": p.id,
              "displayName": p.displayName,
              "description": p.description,
              "displayPrice": p.displayPrice,
              "price": NSDecimalNumber(decimal: p.price).doubleValue,
              "type": typeStr,
              "hasFreeTrial": hasFreeTrial,
              "trialDays": trialDays,
            ]
          }
        resolve(mapped)
      } catch {
        reject("STOREKIT_FETCH_ERROR", error.localizedDescription, error)
      }
    }
  }

  @objc(purchase:resolver:rejecter:)
  func purchase(
    _ productId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      do {
        let products = try await Product.products(for: [productId])
        guard let product = products.first else {
          resolve(["status": "unavailable", "productId": productId])
          return
        }

        let result = try await product.purchase()
        switch result {
        case .success(let verification):
          switch verification {
          case .verified(let transaction):
            await transaction.finish()
            let expVal: Any = transaction.expirationDate.map { $0.timeIntervalSince1970 * 1000.0 } ?? NSNull()
            resolve([
              "status": "purchased",
              "productId": transaction.productID,
              "transactionId": String(transaction.id),
              "expirationDateMs": expVal,
            ])
          case .unverified:
            resolve(["status": "unverified", "productId": productId])
          }
        case .userCancelled:
          resolve(["status": "cancelled", "productId": productId])
        case .pending:
          resolve(["status": "pending", "productId": productId])
        @unknown default:
          resolve(["status": "unknown", "productId": productId])
        }
      } catch {
        reject("STOREKIT_PURCHASE_ERROR", error.localizedDescription, error)
      }
    }
  }

  private func scanEntitlements() async -> [String: Any] {
    var activeProductIds: [String] = []
    var maxExpirationMs: Double?
    let now = Date()

    for await result in Transaction.currentEntitlements {
      guard case .verified(let transaction) = result else {
        continue
      }
      if transaction.revocationDate != nil {
        continue
      }
      if let exp = transaction.expirationDate, exp <= now {
        continue
      }
      activeProductIds.append(transaction.productID)
      if let exp = transaction.expirationDate {
        let ms = exp.timeIntervalSince1970 * 1000.0
        if maxExpirationMs == nil || ms > maxExpirationMs! {
          maxExpirationMs = ms
        }
      }
    }

    let isPro = activeProductIds.contains { proProductIds.contains($0) }
    let expVal: Any = maxExpirationMs ?? NSNull()
    return [
      "isPro": isPro,
      "activeProductIds": activeProductIds,
      "expiresAtMs": expVal,
    ]
  }

  @objc(getCurrentEntitlements:rejecter:)
  func getCurrentEntitlements(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      let summary = await scanEntitlements()
      resolve(summary)
    }
  }

  @objc(restorePurchases:rejecter:)
  func restorePurchases(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      do {
        try await AppStore.sync()
        let summary = await scanEntitlements()
        resolve(summary)
      } catch {
        reject("STOREKIT_RESTORE_ERROR", error.localizedDescription, error)
      }
    }
  }
}
