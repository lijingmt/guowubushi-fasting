import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { isChineseLanguage } from '../utils/date';
import {
  ALL_SUBSCRIPTION_FALLBACKS,
  APPLE_EULA_URL,
  APPLE_MANAGE_SUBS_URL,
  LITE_MONTHLY_ID,
  LITE_PRODUCT_FALLBACKS,
  LITE_YEARLY_ID,
  PRIVACY_POLICY_URL,
  PRO_MONTHLY_ID,
  PRO_PRODUCT_FALLBACKS,
  PRO_YEARLY_ID,
  TEA_TIP_FALLBACKS,
  getTeaSupporterBadge,
  type PaidTier,
} from '../utils/proCatalog';
import { fs, rs, vs } from '../theme/responsive';

export const ProStoreModal: React.FC = () => {
  const {
    colors,
    language,
    proState,
    subscriptionTier,
    isProUnlocked,
    proProducts,
    proStoreVisible,
    proStoreHint,
    proStorePreferredTier,
    proBusy,
    teaThankYouProductId,
    closeProStore,
    dismissTeaThankYou,
    purchaseProProduct,
    restoreProPurchases,
  } = useApp();

  const isZh = isChineseLanguage(language);
  const isEs = language === 'es';
  const [activeTierTab, setActiveTierTab] = useState<PaidTier>('pro');
  const [selectedPlanId, setSelectedPlanId] = useState<string>(PRO_YEARLY_ID);

  useEffect(() => {
    if (proStoreVisible) {
      const targetTier: PaidTier = proStorePreferredTier === 'lite' ? 'lite' : 'pro';
      setActiveTierTab(targetTier);
      setSelectedPlanId(targetTier === 'lite' ? LITE_YEARLY_ID : PRO_YEARLY_ID);
    }
  }, [proStoreVisible, proStorePreferredTier]);

  const handleSwitchTier = (tier: PaidTier) => {
    Haptics.selectionAsync();
    setActiveTierTab(tier);
    setSelectedPlanId(tier === 'lite' ? LITE_YEARLY_ID : PRO_YEARLY_ID);
  };

  const findProduct = (id: string) => proProducts.find((p) => p.id === id);

  const getPriceText = (id: string) => {
    const live = findProduct(id);
    if (live?.displayPrice) return live.displayPrice;
    const fb =
      ALL_SUBSCRIPTION_FALLBACKS[id] ||
      TEA_TIP_FALLBACKS.find((t) => t.id === id);
    if (!fb) return '--';
    return isZh ? fb.fallbackPriceZh : fb.fallbackPriceEn;
  };

  const currentPlanIds =
    activeTierTab === 'lite'
      ? [LITE_YEARLY_ID, LITE_MONTHLY_ID]
      : [PRO_YEARLY_ID, PRO_MONTHLY_ID];
  const currentFallbacks =
    activeTierTab === 'lite' ? LITE_PRODUCT_FALLBACKS : PRO_PRODUCT_FALLBACKS;
  const selectedFallback =
    ALL_SUBSCRIPTION_FALLBACKS[selectedPlanId] ||
    PRO_PRODUCT_FALLBACKS[PRO_YEARLY_ID];
  const selectedLive = findProduct(selectedPlanId);
  const selectedHasTrial =
    selectedPlanId === PRO_YEARLY_ID && (selectedLive ? selectedLive.hasFreeTrial : true);

  const supporterBadge = getTeaSupporterBadge(proState.teaTipsCount);

  const liteFeatures = isZh
    ? [
        '🎨 宋瓷天青 / 敦煌泥金 / 水墨清秋 3 套东方美学皮肤',
        '🏮 4 套二十四节气限定日签模板与名山印章自由搭配',
        '🌧️ 打坐双轨氛围混音台（主音+环境副音叠播+禅意预设）',
      ]
    : isEs
    ? [
        '🎨 3 temas orientales (Celadón, Dunhuang, Tinta)',
        '🏮 4 estilos de póster Zen de los 24 términos solares',
        '🌧️ Mezclador dual ambiental con preajustes para meditación',
      ]
    : [
        '🎨 3 Eastern themes (Celadon, Dunhuang Gold, Ink)',
        '🏮 4 Solar-Term Zen Poster templates + pilgrimage seals',
        '🌧️ Dual-track ambient sound mixer + quick presets',
      ];

  const proFeatures = isZh
    ? [
        '✨ 包含「雅致清修 Lite」全部皮肤、日签与双轨混音',
        '📊 近 30 日 / 90 日身心体感与腰围趋势深度对比',
        '🛡️ 护航暂停券每月不限次数（免费版每月 1 次）',
        '☁️ Apple iCloud 私有自动备份与换机一键恢复',
      ]
    : isEs
    ? [
        '✨ Incluye todo lo de Guowu Lite (temas, pósters y mezclador)',
        '📊 Tendencias avanzadas de bienestar y cintura (30 y 90 días)',
        '🛡️ Pases de pausa ilimitados al mes (1 gratis en básico)',
        '☁️ Copia privada automática y restauración en iCloud',
      ]
    : [
        '✨ Everything in Guowu Lite (themes, posters & mixer)',
        '📊 30-day & 90-day wellness & waist trend analytics',
        '🛡️ Unlimited monthly Pause Passes (free includes 1/mo)',
        '☁️ Private iCloud Auto-Backup & cross-device restore',
      ];

  const features = activeTierTab === 'lite' ? liteFeatures : proFeatures;

  const alreadyOwnsDisplayedTier =
    subscriptionTier === 'pro' ||
    (subscriptionTier === 'lite' && activeTierTab === 'lite');

  const handleSubscribe = async () => {
    if (proBusy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await purchaseProProduct(selectedPlanId);
  };

  const handleTeaTip = async (tipId: string) => {
    if (proBusy) return;
    Haptics.selectionAsync();
    await purchaseProProduct(tipId);
  };

  const handleRestore = async () => {
    if (proBusy) return;
    Haptics.selectionAsync();
    await restoreProPurchases();
  };

  return (
    <>
      <Modal
        visible={proStoreVisible}
        transparent
        animationType="slide"
        onRequestClose={closeProStore}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.headerRow}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {isZh
                  ? '清修会员 · 分层定制与奉茶'
                  : isEs
                  ? 'Membresía Guowu · Planes y Apoyo'
                  : 'Guowu Membership · Lite & Pro'}
              </Text>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.backgroundSecondary }]}
                onPress={closeProStore}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: vs(12) }}
            >
              <View
                style={[
                  styles.pledgeBanner,
                  { backgroundColor: colors.primary + '14', borderColor: colors.primary + '40' },
                ]}
              >
                <Text style={[styles.pledgeText, { color: colors.primary }]}>
                  {isZh
                    ? '🪷 核心断食打卡、打坐、Apple Health、小组件与本地导出永久免费，零广告'
                    : isEs
                    ? '🪷 Núcleo, temporizador, Health, widgets y respaldo JSON son 100% gratis'
                    : '🪷 Core fasting tracker, timer, Health, widgets & local export stay free forever'}
                </Text>
              </View>

              {proStoreHint ? (
                <View
                  style={[
                    styles.hintBanner,
                    { backgroundColor: colors.warning + '18', borderColor: colors.warning + '55' },
                  ]}
                >
                  <Text style={[styles.hintText, { color: colors.text }]}>{proStoreHint}</Text>
                </View>
              ) : null}

              {Platform.OS === 'ios' && (
                <>
                  {subscriptionTier !== 'free' && (
                    <View
                      style={[
                        styles.activeBox,
                        { backgroundColor: colors.success + '16', borderColor: colors.success },
                      ]}
                    >
                      <Text style={[styles.activeTitle, { color: colors.success }]}>
                        {isProUnlocked
                          ? isZh ? '✓ 禅境全享 Pro 生效中' : isEs ? '✓ Guowu Pro Activo' : '✓ Guowu Pro Active'
                          : isZh ? '✓ 雅致清修 Lite 生效中' : isEs ? '✓ Guowu Lite Activo' : '✓ Guowu Lite Active'}
                      </Text>
                      {proState.expiresAtMs ? (
                        <Text style={[styles.activeMeta, { color: colors.textSecondary }]}>
                          {isZh
                            ? `当前周期至 ${new Date(proState.expiresAtMs).toLocaleDateString()}`
                            : `Renews / ends ${new Date(proState.expiresAtMs).toLocaleDateString()}`}
                        </Text>
                      ) : null}
                      {!isProUnlocked && (
                        <Text style={[styles.activeMeta, { color: colors.primary, fontWeight: '700' }]}>
                          {isZh
                            ? '可随时升级「全享版 Pro」解锁 30/90日深析与 iCloud 云备份'
                            : 'Upgrade below anytime for 30/90d trends & iCloud backup'}
                        </Text>
                      )}
                      <TouchableOpacity
                        style={[styles.manageBtn, { borderColor: colors.success }]}
                        onPress={() => Linking.openURL(APPLE_MANAGE_SUBS_URL)}
                      >
                        <Text style={[styles.manageBtnText, { color: colors.success }]}>
                          {isZh ? '前往 Apple ID 管理订阅' : isEs ? 'Gestionar en Apple ID' : 'Manage Subscription'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!isProUnlocked && (
                    <>
                      {/* 分层切换：雅致版 Lite vs 全享版 Pro */}
                      <View
                        style={[
                          styles.tierSwitcher,
                          { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                        ]}
                      >
                        {(['lite', 'pro'] as const).map((tierKey) => {
                          const selected = activeTierTab === tierKey;
                          return (
                            <TouchableOpacity
                              key={tierKey}
                              style={[
                                styles.tierTabBtn,
                                selected && { backgroundColor: colors.primary },
                              ]}
                              onPress={() => handleSwitchTier(tierKey)}
                              activeOpacity={0.85}
                            >
                              <Text
                                style={[
                                  styles.tierTabTitle,
                                  { color: selected ? '#FFFFFF' : colors.text },
                                ]}
                              >
                                {tierKey === 'lite'
                                  ? isZh ? '🎋 雅致版 Lite' : '🎋 Lite'
                                  : isZh ? '🪷 全享版 Pro · 推荐' : '🪷 Pro · Full'}
                              </Text>
                              <Text
                                style={[
                                  styles.tierTabSub,
                                  { color: selected ? 'rgba(255,255,255,0.88)' : colors.textSecondary },
                                ]}
                              >
                                {tierKey === 'lite'
                                  ? isZh ? '皮肤/日签/混音 · ¥6/月起' : `${getPriceText(LITE_YEARLY_ID)}/yr`
                                  : isZh ? '含全套+深析+iCloud · 7天试用' : `${getPriceText(PRO_YEARLY_ID)}/yr`}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {!alreadyOwnsDisplayedTier && (
                        <View style={styles.planRow}>
                          {currentPlanIds.map((planId) => {
                            const fb = currentFallbacks[planId];
                            const selected = selectedPlanId === planId;
                            const badge = isZh ? fb.badgeZh : isEs ? fb.badgeEs : fb.badgeEn;
                            return (
                              <TouchableOpacity
                                key={planId}
                                style={[
                                  styles.planCard,
                                  {
                                    backgroundColor: selected
                                      ? colors.primary + '16'
                                      : colors.backgroundSecondary,
                                    borderColor: selected ? colors.primary : colors.border,
                                  },
                                ]}
                                onPress={() => {
                                  Haptics.selectionAsync();
                                  setSelectedPlanId(planId);
                                }}
                                activeOpacity={0.85}
                              >
                                {badge ? (
                                  <View style={[styles.planBadge, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.planBadgeText}>{badge}</Text>
                                  </View>
                                ) : (
                                  <View style={{ height: vs(18) }} />
                                )}
                                <Text style={[styles.planTitle, { color: colors.text }]}>
                                  {isZh ? fb.titleZh : isEs ? fb.titleEs : fb.titleEn}
                                </Text>
                                <Text style={[styles.planPrice, { color: colors.primary }]}>
                                  {getPriceText(planId)}
                                </Text>
                                <Text style={[styles.planSub, { color: colors.textSecondary }]}>
                                  {isZh ? fb.periodLabelZh : isEs ? fb.periodLabelEs : fb.periodLabelEn}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </>
                  )}

                  <View
                    style={[
                      styles.featuresBox,
                      { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.featuresHeading, { color: colors.text }]}>
                      {activeTierTab === 'lite'
                        ? isZh ? '🎋 雅致版 Lite 包含以下 3 项美学静心体验' : isEs ? 'Incluye 3 funciones Lite' : 'Guowu Lite Aesthetics'
                        : isZh ? '🪷 全享版 Pro 包含以下全套 4 大进阶权益' : isEs ? 'Incluye todo Guowu Pro' : 'Guowu Pro Complete Suite'}
                    </Text>
                    {features.map((line, i) => (
                      <Text key={i} style={[styles.featureItem, { color: colors.textSecondary }]}>
                        {line}
                      </Text>
                    ))}
                  </View>

                  {!alreadyOwnsDisplayedTier && (
                    <TouchableOpacity
                      style={[styles.subscribeBtn, { backgroundColor: colors.primary }]}
                      onPress={handleSubscribe}
                      disabled={proBusy}
                      activeOpacity={0.86}
                    >
                      {proBusy ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.subscribeBtnText}>
                          {selectedHasTrial
                            ? isZh
                              ? `开启 7 天免费试用（后 ${getPriceText(selectedPlanId)}/年）`
                              : isEs
                              ? `Probar 7 días gratis (luego ${getPriceText(selectedPlanId)}/año)`
                              : `Start 7-Day Free Trial (then ${getPriceText(selectedPlanId)}/yr)`
                            : isZh
                            ? `订阅${selectedFallback.titleZh} (${getPriceText(selectedPlanId)})`
                            : `Subscribe ${isEs ? selectedFallback.titleEs : selectedFallback.titleEn} (${getPriceText(selectedPlanId)})`}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.restoreBtn}
                    onPress={handleRestore}
                    disabled={proBusy}
                  >
                    <Text style={[styles.restoreText, { color: colors.primary }]}>
                      {isZh ? '恢复购买 (Restore Purchases)' : isEs ? 'Restaurar Compras' : 'Restore Purchases'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* 随喜奉茶 */}
              <View style={styles.teaDividerRow}>
                <View style={[styles.teaDividerLine, { backgroundColor: colors.divider }]} />
                <Text style={[styles.teaDividerLabel, { color: colors.textSecondary }]}>
                  {isZh
                    ? '🍵 随喜奉茶 · 纯属自愿赞赏'
                    : isEs
                    ? '🍵 Invitar un Té · Apoyo Voluntario'
                    : '🍵 Voluntary Tea Tip'}
                </Text>
                <View style={[styles.teaDividerLine, { backgroundColor: colors.divider }]} />
              </View>

              <Text style={[styles.teaNote, { color: colors.textSecondary }]}>
                {isZh
                  ? '纯属自愿支持独立开发，不解锁亦不锁定任何软件功能。'
                  : isEs
                  ? 'Propinas 100% voluntarias sin bloquear funciones.'
                  : '100% voluntary indie support — unlocks no hidden gates.'}
                {supporterBadge
                  ? ` (${isZh ? supporterBadge.titleZh : isEs ? supporterBadge.titleEs : supporterBadge.titleEn} ×${proState.teaTipsCount})`
                  : ''}
              </Text>

              <View style={styles.teaRow}>
                {TEA_TIP_FALLBACKS.map((tip) => (
                  <TouchableOpacity
                    key={tip.id}
                    style={[
                      styles.teaCard,
                      { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                    ]}
                    onPress={() => handleTeaTip(tip.id)}
                    disabled={proBusy}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.teaIcon}>{tip.icon}</Text>
                    <Text style={[styles.teaTitle, { color: colors.text }]}>
                      {isZh ? tip.titleZh : isEs ? tip.titleEs : tip.titleEn}
                    </Text>
                    <Text style={[styles.teaPrice, { color: colors.warning }]}>
                      {getPriceText(tip.id)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {Platform.OS === 'ios' && (
                <View style={[styles.legalBox, { borderColor: colors.divider }]}>
                  <Text style={[styles.legalText, { color: colors.textLight }]}>
                    {isZh
                      ? '自动续期说明：确认购买（或试用期满后）将通过 Apple ID 账户扣款。订阅结束前 24 小时内将自动续费；您可随时前往 iPhone「设置 → Apple ID → 订阅」管理或取消。本订阅仅提供当前周期内本地进阶功能使用权，不包含终身或永久云端承诺。'
                      : isEs
                      ? 'El pago se carga a tu Apple ID al confirmar. Se renueva automáticamente salvo cancelación 24h antes en Ajustes → Apple ID → Suscripciones. Sin compromiso vitalicio.'
                      : 'Payment is charged to your Apple ID account. Subscriptions auto-renew unless cancelled at least 24 hours before period end in iPhone Settings → Apple ID → Subscriptions. Billing unlocks selected features for the current period only (no lifetime obligation).'}
                  </Text>
                  <View style={styles.legalLinksRow}>
                    <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
                      <Text style={[styles.legalLink, { color: colors.primary }]}>
                        {isZh ? '《隐私政策》' : isEs ? 'Privacidad' : 'Privacy Policy'}
                      </Text>
                    </TouchableOpacity>
                    <Text style={{ color: colors.textLight }}> · </Text>
                    <TouchableOpacity onPress={() => Linking.openURL(APPLE_EULA_URL)}>
                      <Text style={[styles.legalLink, { color: colors.primary }]}>
                        {isZh ? '《使用条款 (EULA)》' : isEs ? 'Términos (EULA)' : 'Terms (EULA)'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 感谢茶笺弹窗 */}
      <Modal
        visible={Boolean(teaThankYouProductId)}
        transparent
        animationType="fade"
        onRequestClose={dismissTeaThankYou}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.thankCard,
              { backgroundColor: colors.card, borderColor: colors.warning },
            ]}
          >
            <Text style={styles.thankIcon}>🍵</Text>
            <Text style={[styles.thankTitle, { color: colors.text }]}>
              {isZh ? '感恩奉茶 · 清心同修' : isEs ? '¡Gracias por el Té!' : 'Thank You for the Tea'}
            </Text>
            <Text style={[styles.thankBody, { color: colors.textSecondary }]}>
              {isZh
                ? `已收到您的诚挚茶礼，感谢支持《过午不食》坚持零广告独立更新！「${supporterBadge?.titleZh || '🍵 清茶知音'}」荣誉小印已在您的个人档案点亮。`
                : isEs
                ? 'Tu apoyo mantiene Guowu libre de anuncios. Tu sello de honor ya brilla en tu perfil.'
                : 'Your kindness helps keep Guowu ad-free and open. Your Supporter Seal is now lit in Settings.'}
            </Text>
            <TouchableOpacity
              style={[styles.subscribeBtn, { backgroundColor: colors.primary, width: '100%' }]}
              onPress={dismissTeaThankYou}
            >
              <Text style={styles.subscribeBtnText}>
                {isZh ? '收下谢意' : isEs ? 'Con gusto' : 'With Gratitude'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 20, 18, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(14),
  },
  sheet: {
    width: '100%',
    maxWidth: rs(420),
    maxHeight: '90%',
    borderRadius: rs(22),
    borderWidth: 1,
    padding: rs(18),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: vs(10),
  },
  headerTitle: {
    fontSize: fs(17.5),
    fontWeight: '800',
  },
  closeBtn: {
    width: rs(30),
    height: rs(30),
    borderRadius: rs(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: fs(14),
    fontWeight: '700',
  },
  pledgeBanner: {
    borderRadius: rs(12),
    borderWidth: 1,
    paddingHorizontal: rs(12),
    paddingVertical: vs(8),
    marginBottom: vs(10),
  },
  pledgeText: {
    fontSize: fs(11.5),
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: fs(16.5),
  },
  hintBanner: {
    borderRadius: rs(10),
    borderWidth: 1,
    paddingHorizontal: rs(12),
    paddingVertical: vs(7),
    marginBottom: vs(10),
  },
  hintText: {
    fontSize: fs(12),
    fontWeight: '600',
    textAlign: 'center',
  },
  activeBox: {
    borderRadius: rs(14),
    borderWidth: 1.5,
    padding: rs(14),
    alignItems: 'center',
    marginBottom: vs(12),
  },
  activeTitle: {
    fontSize: fs(15.5),
    fontWeight: '800',
  },
  activeMeta: {
    fontSize: fs(11.5),
    marginTop: vs(4),
    textAlign: 'center',
  },
  manageBtn: {
    marginTop: vs(10),
    paddingHorizontal: rs(14),
    paddingVertical: vs(6),
    borderRadius: rs(10),
    borderWidth: 1,
  },
  manageBtnText: {
    fontSize: fs(12),
    fontWeight: '700',
  },
  tierSwitcher: {
    flexDirection: 'row',
    borderRadius: rs(14),
    borderWidth: 1,
    padding: rs(4),
    gap: rs(6),
    marginBottom: vs(10),
  },
  tierTabBtn: {
    flex: 1,
    borderRadius: rs(10),
    paddingVertical: vs(8),
    paddingHorizontal: rs(6),
    alignItems: 'center',
  },
  tierTabTitle: {
    fontSize: fs(12.5),
    fontWeight: '800',
  },
  tierTabSub: {
    fontSize: fs(10),
    marginTop: vs(2),
    textAlign: 'center',
  },
  planRow: {
    flexDirection: 'row',
    gap: rs(10),
    marginBottom: vs(12),
  },
  planCard: {
    flex: 1,
    borderRadius: rs(14),
    borderWidth: 1.5,
    padding: rs(12),
    alignItems: 'center',
  },
  planBadge: {
    paddingHorizontal: rs(8),
    paddingVertical: vs(2),
    borderRadius: rs(8),
    marginBottom: vs(4),
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: fs(10),
    fontWeight: '800',
  },
  planTitle: {
    fontSize: fs(13),
    fontWeight: '800',
    marginTop: vs(4),
    textAlign: 'center',
  },
  planPrice: {
    fontSize: fs(21),
    fontWeight: '900',
    marginTop: vs(4),
  },
  planSub: {
    fontSize: fs(11),
    marginTop: vs(2),
    textAlign: 'center',
  },
  featuresBox: {
    borderRadius: rs(14),
    borderWidth: 1,
    padding: rs(12),
    marginBottom: vs(12),
    gap: vs(5),
  },
  featuresHeading: {
    fontSize: fs(12.5),
    fontWeight: '800',
    marginBottom: vs(2),
  },
  featureItem: {
    fontSize: fs(12),
    lineHeight: fs(18),
  },
  subscribeBtn: {
    borderRadius: rs(14),
    paddingVertical: vs(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeBtnText: {
    color: '#FFFFFF',
    fontSize: fs(14.5),
    fontWeight: '800',
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: vs(8),
    marginTop: vs(2),
  },
  restoreText: {
    fontSize: fs(12.5),
    fontWeight: '700',
  },
  teaDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginTop: vs(8),
    marginBottom: vs(6),
  },
  teaDividerLine: {
    flex: 1,
    height: 1,
  },
  teaDividerLabel: {
    fontSize: fs(11.5),
    fontWeight: '700',
  },
  teaNote: {
    fontSize: fs(11),
    textAlign: 'center',
    marginBottom: vs(8),
  },
  teaRow: {
    flexDirection: 'row',
    gap: rs(8),
    marginBottom: vs(12),
  },
  teaCard: {
    flex: 1,
    borderRadius: rs(12),
    borderWidth: 1,
    paddingVertical: vs(10),
    paddingHorizontal: rs(6),
    alignItems: 'center',
  },
  teaIcon: {
    fontSize: fs(20),
  },
  teaTitle: {
    fontSize: fs(11.5),
    fontWeight: '700',
    marginTop: vs(4),
    textAlign: 'center',
  },
  teaPrice: {
    fontSize: fs(14),
    fontWeight: '800',
    marginTop: vs(2),
  },
  legalBox: {
    borderTopWidth: 1,
    paddingTop: vs(10),
  },
  legalText: {
    fontSize: fs(10.5),
    lineHeight: fs(15),
    textAlign: 'center',
  },
  legalLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: vs(6),
  },
  legalLink: {
    fontSize: fs(11),
    fontWeight: '700',
  },
  thankCard: {
    width: '100%',
    maxWidth: rs(340),
    borderRadius: rs(20),
    borderWidth: 1.5,
    padding: rs(22),
    alignItems: 'center',
  },
  thankIcon: {
    fontSize: fs(42),
    marginBottom: vs(8),
  },
  thankTitle: {
    fontSize: fs(18),
    fontWeight: '800',
    marginBottom: vs(8),
    textAlign: 'center',
  },
  thankBody: {
    fontSize: fs(13),
    lineHeight: fs(20),
    textAlign: 'center',
    marginBottom: vs(16),
  },
});
