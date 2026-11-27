package com.guowu.fasting

import android.app.Activity
import android.os.Build
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ConsumeParams
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class GuowuPlayBillingModule(private val reactCtx: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactCtx), PurchasesUpdatedListener {

  private val proProductIds = setOf(
    "com.guowu.fasting.pro.monthly",
    "com.guowu.fasting.pro.yearly"
  )
  private val liteProductIds = setOf(
    "com.guowu.fasting.lite.monthly",
    "com.guowu.fasting.lite.yearly"
  )
  private val teaTipProductIds = setOf(
    "com.guowu.fasting.tip.tea6",
    "com.guowu.fasting.tip.tea18",
    "com.guowu.fasting.tip.tea68"
  )

  private val productDetailsCache = ConcurrentHashMap<String, ProductDetails>()
  private val billingLock = Any()
  @Volatile private var billingClient: BillingClient? = null
  @Volatile private var pendingPurchasePromise: Promise? = null
  @Volatile private var pendingPurchaseProductId: String? = null

  override fun getName(): String = "GuowuPlayBilling"

  private fun resolveBillingChannel(): Pair<Boolean, String> {
    return when (BuildConfig.GUOWU_BILLING_MODE) {
      "play" -> true to "google_play"
      "direct" -> false to "direct_free"
      else -> {
        val installer = try {
          val pm = reactCtx.packageManager
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            pm.getInstallSourceInfo(reactCtx.packageName).installingPackageName
          } else {
            @Suppress("DEPRECATION")
            pm.getInstallerPackageName(reactCtx.packageName)
          }
        } catch (_: Exception) {
          null
        }
        if (installer == "com.android.vending") {
          true to "google_play"
        } else {
          false to "direct_free"
        }
      }
    }
  }

  private fun getOrCreateClient(): BillingClient {
    synchronized(billingLock) {
      val existing = billingClient
      if (existing != null) return existing
      val created = BillingClient.newBuilder(reactCtx)
        .setListener(this)
        .enablePendingPurchases(
          PendingPurchasesParams.newBuilder()
            .enableOneTimeProducts()
            .build()
        )
        .enableAutoServiceReconnection()
        .build()
      billingClient = created
      return created
    }
  }

  private fun ensureConnected(onResult: (Boolean) -> Unit) {
    val client = getOrCreateClient()
    if (client.isReady) {
      onResult(true)
      return
    }
    val completed = AtomicBoolean(false)
    client.startConnection(object : BillingClientStateListener {
      override fun onBillingSetupFinished(billingResult: BillingResult) {
        if (completed.compareAndSet(false, true)) {
          onResult(billingResult.responseCode == BillingClient.BillingResponseCode.OK)
        }
      }

      override fun onBillingServiceDisconnected() {
        if (completed.compareAndSet(false, true)) {
          onResult(false)
        }
      }
    })
  }

  private fun parseIsoTrialDays(isoPeriod: String?): Int {
    if (isoPeriod.isNullOrBlank()) return 0
    val trimmed = isoPeriod.trim().uppercase()
    val num = trimmed.drop(1).dropLast(1).toIntOrNull() ?: return 0
    return when {
      trimmed.endsWith("D") -> num
      trimmed.endsWith("W") -> num * 7
      trimmed.endsWith("M") -> num * 30
      trimmed.endsWith("Y") -> num * 365
      else -> 0
    }
  }

  private fun pickBestSubOffer(details: ProductDetails): ProductDetails.SubscriptionOfferDetails? {
    val offers = details.subscriptionOfferDetails ?: return null
    return offers.firstOrNull { offer ->
      offer.pricingPhases.pricingPhaseList.firstOrNull()?.priceAmountMicros == 0L
    } ?: offers.firstOrNull()
  }

  private fun queryProductDetailsSync(
    client: BillingClient,
    ids: List<String>,
    productType: String
  ): List<ProductDetails> {
    if (ids.isEmpty()) return emptyList()
    val items = ids.map { pid ->
      QueryProductDetailsParams.Product.newBuilder()
        .setProductId(pid)
        .setProductType(productType)
        .build()
    }
    val params = QueryProductDetailsParams.newBuilder()
      .setProductList(items)
      .build()
    val latch = CountDownLatch(1)
    var found: List<ProductDetails> = emptyList()
    client.queryProductDetailsAsync(params) { billingResult, queryProductDetailsResult ->
      if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
        found = queryProductDetailsResult.productDetailsList ?: emptyList()
      }
      latch.countDown()
    }
    latch.await(15, TimeUnit.SECONDS)
    return found
  }

  @ReactMethod
  fun getBillingMode(promise: Promise) {
    val (enabled, channel) = resolveBillingChannel()
    val map = Arguments.createMap().apply {
      putBoolean("enabled", enabled)
      putString("channel", channel)
      putString("buildMode", BuildConfig.GUOWU_BILLING_MODE)
    }
    promise.resolve(map)
  }

  @ReactMethod
  fun isAvailable(promise: Promise) {
    val (enabled, _) = resolveBillingChannel()
    if (!enabled) {
      promise.resolve(false)
      return
    }
    ensureConnected { ready ->
      promise.resolve(ready)
    }
  }

  @ReactMethod
  fun fetchProducts(productIds: ReadableArray, promise: Promise) {
    val (enabled, _) = resolveBillingChannel()
    if (!enabled) {
      promise.resolve(Arguments.createArray())
      return
    }
    ensureConnected { ready ->
      if (!ready) {
        promise.resolve(Arguments.createArray())
        return@ensureConnected
      }
      Thread {
        try {
          val client = getOrCreateClient()
          val allIds = (0 until productIds.size()).mapNotNull { idx ->
            productIds.getString(idx)
          }
          val subIds = allIds.filter { proProductIds.contains(it) || liteProductIds.contains(it) }
          val inappIds = allIds.filter { teaTipProductIds.contains(it) }

          val allDetails = mutableListOf<ProductDetails>()
          allDetails.addAll(queryProductDetailsSync(client, subIds, BillingClient.ProductType.SUBS))
          allDetails.addAll(queryProductDetailsSync(client, inappIds, BillingClient.ProductType.INAPP))

          for (pd in allDetails) {
            productDetailsCache[pd.productId] = pd
          }

          val arr = Arguments.createArray()
          val sorted = allDetails.sortedBy { pd ->
            if (pd.productType == BillingClient.ProductType.SUBS) {
              val offer = pickBestSubOffer(pd)
              val paidPhase = offer?.pricingPhases?.pricingPhaseList?.lastOrNull { it.priceAmountMicros > 0L }
                ?: offer?.pricingPhases?.pricingPhaseList?.lastOrNull()
              (paidPhase?.priceAmountMicros ?: 0L).toDouble()
            } else {
              (pd.oneTimePurchaseOfferDetails?.priceAmountMicros ?: 0L).toDouble()
            }
          }

          for (pd in sorted) {
            val item = Arguments.createMap()
            item.putString("id", pd.productId)
            item.putString("displayName", pd.name)
            item.putString("description", pd.description)

            if (pd.productType == BillingClient.ProductType.SUBS) {
              val offer = pickBestSubOffer(pd)
              val phases = offer?.pricingPhases?.pricingPhaseList ?: emptyList()
              val trialPhase = phases.firstOrNull { it.priceAmountMicros == 0L }
              val paidPhase = phases.lastOrNull { it.priceAmountMicros > 0L } ?: phases.lastOrNull()

              item.putString("type", "autoRenewable")
              item.putString("displayPrice", paidPhase?.formattedPrice ?: "")
              item.putDouble("price", (paidPhase?.priceAmountMicros ?: 0L) / 1_000_000.0)
              item.putBoolean("hasFreeTrial", trialPhase != null)
              item.putInt("trialDays", parseIsoTrialDays(trialPhase?.billingPeriod))
            } else {
              val inappOffer = pd.oneTimePurchaseOfferDetails
              item.putString("type", "consumable")
              item.putString("displayPrice", inappOffer?.formattedPrice ?: "")
              item.putDouble("price", (inappOffer?.priceAmountMicros ?: 0L) / 1_000_000.0)
              item.putBoolean("hasFreeTrial", false)
              item.putInt("trialDays", 0)
            }
            arr.pushMap(item)
          }
          promise.resolve(arr)
        } catch (e: Exception) {
          promise.reject("PLAY_FETCH_ERROR", e.localizedMessage ?: "Failed to fetch products", e)
        }
      }.start()
    }
  }

  private fun querySubPurchasesSync(client: BillingClient): List<Purchase> {
    val latch = CountDownLatch(1)
    var found: List<Purchase> = emptyList()
    val params = QueryPurchasesParams.newBuilder()
      .setProductType(BillingClient.ProductType.SUBS)
      .build()
    client.queryPurchasesAsync(params) { billingResult, list ->
      if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
        found = list
      }
      latch.countDown()
    }
    latch.await(10, TimeUnit.SECONDS)
    return found
  }

  @ReactMethod
  fun purchase(productId: String, promise: Promise) {
    val (enabled, _) = resolveBillingChannel()
    if (!enabled) {
      val map = Arguments.createMap().apply {
        putString("status", "unavailable")
        putString("productId", productId)
      }
      promise.resolve(map)
      return
    }

    val activity: Activity? = reactCtx.currentActivity
    if (activity == null) {
      val map = Arguments.createMap().apply {
        putString("status", "error")
        putString("productId", productId)
        putString("errorMessage", "No foreground Activity available")
      }
      promise.resolve(map)
      return
    }

    ensureConnected { ready ->
      if (!ready) {
        val map = Arguments.createMap().apply {
          putString("status", "unavailable")
          putString("productId", productId)
        }
        promise.resolve(map)
        return@ensureConnected
      }

      Thread {
        try {
          val client = getOrCreateClient()
          var details = productDetailsCache[productId]
          if (details == null) {
            val isSub = proProductIds.contains(productId) || liteProductIds.contains(productId)
            val queried = queryProductDetailsSync(
              client,
              listOf(productId),
              if (isSub) BillingClient.ProductType.SUBS else BillingClient.ProductType.INAPP
            )
            details = queried.firstOrNull()
            if (details != null) {
              productDetailsCache[productId] = details
            }
          }

          if (details == null) {
            val map = Arguments.createMap().apply {
              putString("status", "unavailable")
              putString("productId", productId)
            }
            promise.resolve(map)
            return@Thread
          }

          val pdParamsBuilder = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(details)

          var existingSubToken: String? = null
          if (details.productType == BillingClient.ProductType.SUBS) {
            val offer = pickBestSubOffer(details)
            if (offer != null) {
              pdParamsBuilder.setOfferToken(offer.offerToken)
            }
            val activeSubs = querySubPurchasesSync(client).filter {
              it.purchaseState == Purchase.PurchaseState.PURCHASED
            }
            val oldPurchase = activeSubs.firstOrNull { !it.products.contains(productId) }
            if (oldPurchase != null) {
              existingSubToken = oldPurchase.purchaseToken
            }
          }

          val flowBuilder = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(pdParamsBuilder.build()))

          if (!existingSubToken.isNullOrBlank()) {
            val updateParams = BillingFlowParams.SubscriptionUpdateParams.newBuilder()
              .setOldPurchaseToken(existingSubToken)
              .setSubscriptionReplacementMode(
                BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.WITH_TIME_PRORATION
              )
              .build()
            flowBuilder.setSubscriptionUpdateParams(updateParams)
          }

          pendingPurchasePromise?.resolve(Arguments.createMap().apply {
            putString("status", "cancelled")
            putString("productId", pendingPurchaseProductId ?: productId)
          })
          pendingPurchasePromise = promise
          pendingPurchaseProductId = productId

          activity.runOnUiThread {
            val launchResult = client.launchBillingFlow(activity, flowBuilder.build())
            if (launchResult.responseCode != BillingClient.BillingResponseCode.OK) {
              val p = pendingPurchasePromise
              pendingPurchasePromise = null
              pendingPurchaseProductId = null
              p?.resolve(Arguments.createMap().apply {
                putString("status", "error")
                putString("productId", productId)
                putString("errorMessage", launchResult.debugMessage)
              })
            }
          }
        } catch (e: Exception) {
          pendingPurchasePromise = null
          pendingPurchaseProductId = null
          promise.reject("PLAY_PURCHASE_ERROR", e.localizedMessage ?: "Purchase failed", e)
        }
      }.start()
    }
  }

  override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
    val promise = pendingPurchasePromise
    val fallbackProductId = pendingPurchaseProductId ?: ""
    pendingPurchasePromise = null
    pendingPurchaseProductId = null

    if (billingResult.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
      promise?.resolve(Arguments.createMap().apply {
        putString("status", "cancelled")
        putString("productId", fallbackProductId)
      })
      return
    }

    if (billingResult.responseCode != BillingClient.BillingResponseCode.OK || purchases.isNullOrEmpty()) {
      promise?.resolve(Arguments.createMap().apply {
        putString("status", "error")
        putString("productId", fallbackProductId)
        putString("errorMessage", billingResult.debugMessage)
      })
      return
    }

    val purchase = purchases.first()
    val pid = purchase.products.firstOrNull() ?: fallbackProductId

    if (purchase.purchaseState == Purchase.PurchaseState.PENDING) {
      promise?.resolve(Arguments.createMap().apply {
        putString("status", "pending")
        putString("productId", pid)
      })
      return
    }

    if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) {
      promise?.resolve(Arguments.createMap().apply {
        putString("status", "unverified")
        putString("productId", pid)
      })
      return
    }

    val client = getOrCreateClient()
    if (teaTipProductIds.contains(pid)) {
      val consumeParams = ConsumeParams.newBuilder()
        .setPurchaseToken(purchase.purchaseToken)
        .build()
      client.consumeAsync(consumeParams) { consumeResult, _ ->
        if (consumeResult.responseCode == BillingClient.BillingResponseCode.OK) {
          promise?.resolve(Arguments.createMap().apply {
            putString("status", "purchased")
            putString("productId", pid)
            putString("transactionId", purchase.orderId ?: purchase.purchaseToken)
            putNull("expirationDateMs")
          })
        } else {
          promise?.resolve(Arguments.createMap().apply {
            putString("status", "error")
            putString("productId", pid)
            putString("errorMessage", consumeResult.debugMessage)
          })
        }
      }
      return
    }

    val finishSubSuccess = {
      promise?.resolve(Arguments.createMap().apply {
        putString("status", "purchased")
        putString("productId", pid)
        putString("transactionId", purchase.orderId ?: purchase.purchaseToken)
        putNull("expirationDateMs")
      })
    }

    if (!purchase.isAcknowledged) {
      val ackParams = AcknowledgePurchaseParams.newBuilder()
        .setPurchaseToken(purchase.purchaseToken)
        .build()
      client.acknowledgePurchase(ackParams) { ackResult ->
        if (ackResult.responseCode == BillingClient.BillingResponseCode.OK) {
          finishSubSuccess()
        } else {
          promise?.resolve(Arguments.createMap().apply {
            putString("status", "error")
            putString("productId", pid)
            putString("errorMessage", ackResult.debugMessage)
          })
        }
      }
    } else {
      finishSubSuccess()
    }
  }

  private fun buildEntitlementsSummary(client: BillingClient): com.facebook.react.bridge.WritableMap {
    val activeSubs = querySubPurchasesSync(client).filter {
      it.purchaseState == Purchase.PurchaseState.PURCHASED
    }
    val activeIds = mutableListOf<String>()
    for (p in activeSubs) {
      if (!p.isAcknowledged) {
        val ackParams = AcknowledgePurchaseParams.newBuilder()
          .setPurchaseToken(p.purchaseToken)
          .build()
        client.acknowledgePurchase(ackParams) { }
      }
      activeIds.addAll(p.products)
    }

    val uniqueIds = activeIds.distinct()
    val hasPro = uniqueIds.any { proProductIds.contains(it) }
    val hasLite = uniqueIds.any { liteProductIds.contains(it) }
    val tier = when {
      hasPro -> "pro"
      hasLite -> "lite"
      else -> "free"
    }

    val idsArray = Arguments.createArray()
    uniqueIds.forEach { idsArray.pushString(it) }

    return Arguments.createMap().apply {
      putString("tier", tier)
      putBoolean("isLite", hasPro || hasLite)
      putBoolean("isPro", hasPro)
      putArray("activeProductIds", idsArray)
      putNull("expiresAtMs")
    }
  }

  @ReactMethod
  fun getCurrentEntitlements(promise: Promise) {
    val (enabled, _) = resolveBillingChannel()
    if (!enabled) {
      promise.resolve(Arguments.createMap().apply {
        putString("tier", "free")
        putBoolean("isLite", false)
        putBoolean("isPro", false)
        putArray("activeProductIds", Arguments.createArray())
        putNull("expiresAtMs")
      })
      return
    }

    ensureConnected { ready ->
      if (!ready) {
        promise.resolve(Arguments.createMap().apply {
          putString("tier", "free")
          putBoolean("isLite", false)
          putBoolean("isPro", false)
          putArray("activeProductIds", Arguments.createArray())
          putNull("expiresAtMs")
        })
        return@ensureConnected
      }
      Thread {
        try {
          val summary = buildEntitlementsSummary(getOrCreateClient())
          promise.resolve(summary)
        } catch (e: Exception) {
          promise.reject("PLAY_ENTITLEMENTS_ERROR", e.localizedMessage ?: "Failed to read purchases", e)
        }
      }.start()
    }
  }

  @ReactMethod
  fun restorePurchases(promise: Promise) {
    getCurrentEntitlements(promise)
  }
}
