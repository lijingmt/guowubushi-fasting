import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Switch, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { responsiveSize, fs, rs, vs, layout, responsive } from '../theme/responsive';
import { MeditationType } from '../types';

// Time options for meditation and standing meditation
const TIME_OPTIONS = [
  { label: '5', value: 5 },
  { label: '10', value: 10 },
  { label: '15', value: 15 },
  { label: '20', value: 20 },
  { label: '30', value: 30 },
  { label: '45', value: 45 },
  { label: '60', value: 60 },
];

// Weight options (dropdown style) - 1kg steps
const WEIGHT_OPTIONS = Array.from({ length: 61 }, (_, i) => ({
  label: `${40 + i}`,
  value: 40 + i,
}));

export const CheckInCard: React.FC = () => {
  const {
    t,
    hasCheckedToday,
    todayCheckIn,
    dailyCheckIn,
    stats,
    addWeight,
    addWater,
    addPractice,
    colors,
    language,
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [weight, setWeight] = useState('');
  const [isAbstinence, setIsAbstinence] = useState(false);
  const [selectedWater, setSelectedWater] = useState<number | null>(null);

  // Practice states
  const [isMeditation, setIsMeditation] = useState(false);
  const [meditationType, setMeditationType] = useState<MeditationType>('cross_leg');
  const [selectedMeditationTime, setSelectedMeditationTime] = useState<number | null>(null);
  const [isStandingMeditation, setIsStandingMeditation] = useState(false);
  const [selectedStandingTime, setSelectedStandingTime] = useState<number | null>(null);
  const [isScriptureChanting, setIsScriptureChanting] = useState(false);
  const [isScriptureListening, setIsScriptureListening] = useState(false);

  // Water options
  const waterOptions = [
    { label: '500ml', value: 500 },
    { label: '1000ml', value: 1000 },
    { label: '1500ml', value: 1500 },
    { label: '2000ml', value: 2000 },
    { label: '>2000ml', value: 2500 },
  ];

  const getAbstinenceNote = () => {
    if (language === 'en') return '🙏 Abstinence Completed';
    if (language === 'es') return '🙏 Abstinencia Completada';
    return '🙏 禁欲完成';
  };

  const getWaterNote = (waterText: string) => {
    if (language === 'en') return `💧 Water ${waterText}`;
    if (language === 'es') return `💧 Agua ${waterText}`;
    return `💧 饮水 ${waterText}`;
  };

  const getMeditationNote = () => {
    const typeLabel = meditationType === 'cross_leg' ? t.meditationCrossLeg : t.meditationSingleLeg;
    if (language === 'en') return `🧘 Meditation (${typeLabel}) ${selectedMeditationTime}min`;
    if (language === 'es') return `🧘 Meditación (${typeLabel}) ${selectedMeditationTime}min`;
    return `🧘 打坐(${typeLabel}) ${selectedMeditationTime}分钟`;
  };

  const getStandingNote = () => {
    if (language === 'en') return `🧍 Standing ${selectedStandingTime}min`;
    if (language === 'es') return `🧍 De Pie ${selectedStandingTime}min`;
    return `🧍 站桩 ${selectedStandingTime}分钟`;
  };

  const getChantingNote = () => {
    if (language === 'en') return '📿 Scripture Chanting (+10 merit)';
    if (language === 'es') return '📿 Cantar Escrituras (+10 mérito)';
    return '📿 诵经 (+10功德)';
  };

  const getListeningNote = () => {
    if (language === 'en') return '🎧 Scripture Listening (+5 merit)';
    if (language === 'es') return '🎧 Escuchar Escrituras (+5 mérito)';
    return '🎧 听经 (+5功德)';
  };

  const resetForm = () => {
    setNotes('');
    setWeight('');
    setIsAbstinence(false);
    setSelectedWater(null);
    setIsMeditation(false);
    setMeditationType('cross_leg');
    setSelectedMeditationTime(null);
    setIsStandingMeditation(false);
    setSelectedStandingTime(null);
    setIsScriptureChanting(false);
    setIsScriptureListening(false);
  };

  const openEditModal = () => {
    // Reset form for fresh input - user can re-do their check-in
    resetForm();
    setShowModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCheckIn = async (completed: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (weight && parseFloat(weight) > 0) {
      await addWeight(parseFloat(weight));
    }

    if (selectedWater) {
      await addWater(selectedWater);
    }

    // Save practice records
    if (isMeditation && selectedMeditationTime) {
      await addPractice('meditation', selectedMeditationTime, meditationType);
    }
    if (isStandingMeditation && selectedStandingTime) {
      await addPractice('standing_meditation', selectedStandingTime);
    }
    if (isScriptureChanting) {
      await addPractice('scripture_chanting');
    }
    if (isScriptureListening) {
      await addPractice('scripture_listening');
    }

    let finalNotes = notes;
    if (isAbstinence) {
      finalNotes = finalNotes ? `${finalNotes}\n${getAbstinenceNote()}` : getAbstinenceNote();
    }
    if (selectedWater) {
      const waterText = selectedWater >= 2500 ? '>2000ml' : `${selectedWater}ml`;
      finalNotes = finalNotes ? `${finalNotes}\n${getWaterNote(waterText)}` : getWaterNote(waterText);
    }
    if (isMeditation && selectedMeditationTime) {
      finalNotes = finalNotes ? `${finalNotes}\n${getMeditationNote()}` : getMeditationNote();
    }
    if (isStandingMeditation && selectedStandingTime) {
      finalNotes = finalNotes ? `${finalNotes}\n${getStandingNote()}` : getStandingNote();
    }
    if (isScriptureChanting) {
      finalNotes = finalNotes ? `${finalNotes}\n${getChantingNote()}` : getChantingNote();
    }
    if (isScriptureListening) {
      finalNotes = finalNotes ? `${finalNotes}\n${getListeningNote()}` : getListeningNote();
    }

    await dailyCheckIn(completed, finalNotes || undefined);
    resetForm();
    setShowModal(false);
  };

  // 响应式样式
  const styles = createResponsiveStyles();

  if (hasCheckedToday && todayCheckIn) {
    return (
      <>
        <LinearGradient
          colors={todayCheckIn.completed ? ['#FF9800', '#FF5722'] : ['#9E9E9E', '#757575']}
          style={styles.completedContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.completedIcon}>
            {todayCheckIn.completed ? '🔥' : '😔'}
          </Text>
          <Text style={styles.completedTitle}>
            {todayCheckIn.completed ? t.todayCompleted : t.todayNotCompleted}
          </Text>
          <View style={styles.streakRow}>
            <Text style={styles.streakLabel}>{t.streak}</Text>
            <Text style={styles.streakValue}>{stats.currentStreak}</Text>
            <Text style={styles.streakDays}>{t.dayUnit}</Text>
          </View>
          {todayCheckIn.notes && (
            <Text style={styles.notes}>{todayCheckIn.notes}</Text>
          )}
        </LinearGradient>

        {/* Edit/Re-check button */}
        <TouchableOpacity
          style={[styles.editCheckInButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={openEditModal}
          activeOpacity={0.7}
        >
          <Text style={[styles.editCheckInButtonText, { color: colors.textSecondary }]}>
            ✏️ {language === 'zh' ? '修改打卡' : language === 'es' ? 'Editar registro' : 'Edit Check-in'}
          </Text>
        </TouchableOpacity>
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.checkInButton}
        onPress={() => setShowModal(true)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#4CAF50', '#8BC34A']}
          style={styles.checkInGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.checkInTitle}>{t.checkInToday}</Text>
          <Text style={styles.checkInSubtitle}>{t.checkInQuestion}</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t.checkInToday}</Text>
              <Text style={[styles.modalQuestion, { color: colors.text }]}>
                {t.checkInQuestion}
              </Text>
              <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
                {t.checkInHint}
              </Text>

              {/* Weight dropdown selector */}
              <View style={[styles.weightSection, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.weightLabel, { color: colors.textSecondary }]}>{t.todaysWeight}</Text>
                <View style={styles.weightDropdownContainer}>
                  {WEIGHT_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.weightOption,
                        { backgroundColor: colors.divider, borderColor: colors.border },
                        weight === option.value.toString() && styles.weightOptionSelected,
                      ]}
                      onPress={() => setWeight(option.value.toString())}
                    >
                      <Text
                        style={[
                          styles.weightOptionText,
                          { color: colors.textSecondary },
                          weight === option.value.toString() && [styles.weightOptionTextSelected, { color: colors.primary }],
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.weightUnitLabel, { color: colors.textLight }]}>{t.kg}</Text>
              </View>

              {/* Abstinence toggle */}
              <View style={[styles.abstinenceSection, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.abstinenceRow}>
                  <Text style={[styles.abstinenceLabel, { color: colors.text }]}>🙏 {t.todaysAbstinence}</Text>
                  <Switch
                    value={isAbstinence}
                    onValueChange={setIsAbstinence}
                    trackColor={{ false: colors.divider, true: colors.primary }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

              {/* Water selection */}
              <View style={styles.waterSection}>
                <Text style={[styles.waterLabel, { color: colors.textSecondary }]}>💧 {t.todaysWater}</Text>
                <View style={styles.waterOptionsContainer}>
                  {waterOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.waterOption,
                        { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                        selectedWater === option.value && styles.waterOptionSelected,
                      ]}
                      onPress={() =>
                        setSelectedWater(selectedWater === option.value ? null : option.value)
                      }
                    >
                      <Text
                        style={[
                          styles.waterOptionText,
                          { color: colors.textSecondary },
                          selectedWater === option.value && [styles.waterOptionTextSelected, { color: colors.primary }],
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* === 修行部分 === */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>✨ {t.practiceTitle}</Text>

              {/* 打坐 Meditation */}
              <View style={[styles.practiceSection, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.practiceHeaderRow}>
                  <Text style={[styles.practiceLabel, { color: colors.text }]}>🧘 {t.meditation}</Text>
                  <Switch
                    value={isMeditation}
                    onValueChange={setIsMeditation}
                    trackColor={{ false: colors.divider, true: colors.info }}
                    thumbColor="#fff"
                  />
                </View>
                {isMeditation && (
                  <>
                    {/* 打坐类型 */}
                    <View style={styles.subOptionSection}>
                      <Text style={[styles.subOptionLabel, { color: colors.textSecondary }]}>{t.meditationType}</Text>
                      <View style={styles.optionButtonsRow}>
                        <TouchableOpacity
                          style={[
                            styles.optionButton,
                            { backgroundColor: colors.divider, borderColor: colors.border },
                            meditationType === 'cross_leg' && styles.optionButtonSelected,
                          ]}
                          onPress={() => setMeditationType('cross_leg')}
                        >
                          <Text
                            style={[
                              styles.optionButtonText,
                              { color: colors.textSecondary },
                              meditationType === 'cross_leg' && [styles.optionButtonTextSelected, { color: colors.info }],
                            ]}
                          >
                            {t.meditationCrossLeg}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.optionButton,
                            { backgroundColor: colors.divider, borderColor: colors.border },
                            meditationType === 'single_leg' && styles.optionButtonSelected,
                          ]}
                          onPress={() => setMeditationType('single_leg')}
                        >
                          <Text
                            style={[
                              styles.optionButtonText,
                              { color: colors.textSecondary },
                              meditationType === 'single_leg' && [styles.optionButtonTextSelected, { color: colors.info }],
                            ]}
                          >
                            {t.meditationSingleLeg}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    {/* 打坐时长 */}
                    <View style={styles.subOptionSection}>
                      <Text style={[styles.subOptionLabel, { color: colors.textSecondary }]}>{t.meditationMinutes}</Text>
                      <View style={styles.timeOptionsContainer}>
                        {TIME_OPTIONS.map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.timeOption,
                              { backgroundColor: colors.divider, borderColor: colors.border },
                              selectedMeditationTime === option.value && styles.timeOptionSelected,
                            ]}
                            onPress={() =>
                              setSelectedMeditationTime(selectedMeditationTime === option.value ? null : option.value)
                            }
                          >
                            <Text
                              style={[
                                styles.timeOptionText,
                                { color: colors.textSecondary },
                                selectedMeditationTime === option.value && [styles.timeOptionTextSelected, { color: colors.info }],
                              ]}
                            >
                              {option.label}{t.minutes}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* 站桩 Standing Meditation */}
              <View style={[styles.practiceSection, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.practiceHeaderRow}>
                  <Text style={[styles.practiceLabel, { color: colors.text }]}>🧍 {t.standingMeditation}</Text>
                  <Switch
                    value={isStandingMeditation}
                    onValueChange={setIsStandingMeditation}
                    trackColor={{ false: colors.divider, true: colors.warning }}
                    thumbColor="#fff"
                  />
                </View>
                {isStandingMeditation && (
                  <View style={styles.subOptionSection}>
                    <Text style={[styles.subOptionLabel, { color: colors.textSecondary }]}>{t.standingMeditationMinutes}</Text>
                    <View style={styles.timeOptionsContainer}>
                      {TIME_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.timeOption,
                            { backgroundColor: colors.divider, borderColor: colors.border },
                            selectedStandingTime === option.value && styles.timeOptionSelected,
                          ]}
                          onPress={() =>
                            setSelectedStandingTime(selectedStandingTime === option.value ? null : option.value)
                          }
                        >
                          <Text
                            style={[
                              styles.timeOptionText,
                              { color: colors.textSecondary },
                              selectedStandingTime === option.value && [styles.timeOptionTextSelected, { color: colors.warning }],
                            ]}
                          >
                            {option.label}{t.minutes}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* 诵经 Scripture Chanting */}
              <View style={[styles.practiceSection, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.practiceHeaderRow}>
                  <Text style={[styles.practiceLabel, { color: colors.text }]}>📿 {t.scriptureChanting}</Text>
                  <Switch
                    value={isScriptureChanting}
                    onValueChange={setIsScriptureChanting}
                    trackColor={{ false: colors.divider, true: colors.primary }}
                    thumbColor="#fff"
                  />
                </View>
                {isScriptureChanting && (
                  <Text style={[styles.meritText, { color: colors.primary }]}>+10 {(t as any).practiceMerit || '功德'}</Text>
                )}
              </View>

              {/* 听经 Scripture Listening */}
              <View style={[styles.practiceSection, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.practiceHeaderRow}>
                  <Text style={[styles.practiceLabel, { color: colors.text }]}>🎧 {t.scriptureListening}</Text>
                  <Switch
                    value={isScriptureListening}
                    onValueChange={setIsScriptureListening}
                    trackColor={{ false: colors.divider, true: colors.success }}
                    thumbColor="#fff"
                  />
                </View>
                {isScriptureListening && (
                  <Text style={[styles.meritText, { color: colors.success }]}>+5 {(t as any).practiceMerit || '功德'}</Text>
                )}
              </View>

              <TextInput
                style={[styles.notesInput, { color: colors.text, backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                placeholder={t.addNote}
                placeholderTextColor={colors.textLight}
                value={notes}
                onChangeText={setNotes}
                multiline
                maxLength={100}
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.noButton, { backgroundColor: colors.divider }]}
                  onPress={() => handleCheckIn(false)}
                >
                  <Text style={[styles.noButtonText, { color: colors.text }]}>{t.notCompleted} 😔</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.yesButton, { backgroundColor: colors.success }]}
                  onPress={() => handleCheckIn(true)}
                >
                  <Text style={styles.yesButtonText}>{t.completed} 🔥</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  resetForm();
                  setShowModal(false);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t.cancel}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

// 创建响应式样式
const createResponsiveStyles = () => {
  const isTablet = layout.maxWidth >= 600;

  return StyleSheet.create({
    checkInButton: {
      borderRadius: responsiveSize.borderRadius.xl,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: vs(4) },
      shadowOpacity: 0.3,
      shadowRadius: rs(8),
      elevation: 8,
    },
    checkInGradient: {
      padding: responsiveSize.spacing['2xl'],
      alignItems: 'center',
    },
    checkInTitle: {
      fontSize: responsive({
        small: fs(24),
        tablet: fs(36),
        default: fs(28),
      }),
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: rs(8),
    },
    checkInSubtitle: {
      fontSize: responsiveSize.fontSize.lg,
      color: 'rgba(255, 255, 255, 0.9)',
    },
    completedContainer: {
      borderRadius: responsiveSize.borderRadius.xl,
      padding: responsiveSize.spacing['2xl'],
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: vs(4) },
      shadowOpacity: 0.3,
      shadowRadius: rs(8),
      elevation: 8,
    },
    completedIcon: {
      fontSize: responsive({
        small: fs(48),
        tablet: fs(72),
        default: fs(56),
      }),
      marginBottom: rs(8),
    },
    completedTitle: {
      fontSize: responsive({
        small: fs(20),
        tablet: fs(28),
        default: fs(24),
      }),
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: rs(12),
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    streakLabel: {
      fontSize: responsiveSize.fontSize.lg,
      color: 'rgba(255, 255, 255, 0.8)',
      marginRight: rs(8),
    },
    streakValue: {
      fontSize: responsive({
        small: fs(24),
        tablet: fs(36),
        default: fs(28),
      }),
      fontWeight: 'bold',
      color: '#fff',
    },
    streakDays: {
      fontSize: responsiveSize.fontSize.lg,
      color: 'rgba(255, 255, 255, 0.8)',
      marginLeft: rs(4),
    },
    notes: {
      fontSize: responsiveSize.fontSize.base,
      color: 'rgba(255, 255, 255, 0.8)',
      marginTop: rs(8),
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      borderRadius: responsive({
        small: rs(16),
        tablet: rs(24),
        default: rs(20),
      }),
      padding: responsive({
        small: rs(20),
        tablet: rs(40),
        default: rs(28),
      }),
      width: layout.modalWidth as string | number,
      maxWidth: layout.modalMaxWidth as number,
      maxHeight: '85%',
    },
    modalScroll: {
      width: '100%',
    },
    modalTitle: {
      fontSize: responsive({
        small: fs(22),
        tablet: fs(32),
        default: fs(28),
      }),
      fontWeight: 'bold',
      color: '#333',
      marginBottom: rs(16),
      textAlign: 'center',
    },
    modalQuestion: {
      fontSize: responsive({
        small: fs(16),
        tablet: fs(20),
        default: fs(18),
      }),
      color: '#333',
      textAlign: 'center',
      marginBottom: rs(4),
    },
    modalHint: {
      fontSize: responsiveSize.fontSize.sm,
      color: '#999',
      textAlign: 'center',
      marginBottom: vs(20),
    },
    weightSection: {
      width: '100%',
      marginBottom: vs(16),
      borderRadius: responsiveSize.borderRadius.md,
      padding: rs(16),
    },
    weightLabel: {
      fontSize: responsiveSize.fontSize.base,
      color: '#666',
      marginBottom: rs(8),
      textAlign: 'left',
      width: '100%',
    },
    weightDropdownContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: rs(6),
      marginBottom: rs(8),
    },
    weightOption: {
      flex: 1,
      minWidth: rs(50),
      paddingVertical: vs(8),
      paddingHorizontal: rs(10),
      borderRadius: responsiveSize.borderRadius.sm,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    weightOptionSelected: {
      backgroundColor: '#E3F2FD',
      borderColor: '#2196F3',
    },
    weightOptionText: {
      fontSize: responsiveSize.fontSize.sm,
      color: '#666',
      fontWeight: '500',
    },
    weightOptionTextSelected: {
      color: '#2196F3',
      fontWeight: 'bold',
    },
    weightUnitLabel: {
      fontSize: responsiveSize.fontSize.sm,
      textAlign: 'center',
    },
    abstinenceSection: {
      width: '100%',
      marginBottom: vs(16),
      borderRadius: responsiveSize.borderRadius.md,
      padding: rs(16),
    },
    abstinenceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    abstinenceLabel: {
      fontSize: responsiveSize.fontSize.lg,
      color: '#333',
      fontWeight: '500',
    },
    waterSection: {
      width: '100%',
      marginBottom: vs(16),
    },
    waterLabel: {
      fontSize: responsiveSize.fontSize.base,
      color: '#666',
      marginBottom: rs(10),
      textAlign: 'left',
      width: '100%',
    },
    waterOptionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: rs(8),
    },
    waterOption: {
      flex: 1,
      minWidth: isTablet ? rs(80) : rs(70),
      paddingVertical: vs(10),
      paddingHorizontal: rs(8),
      borderRadius: responsiveSize.borderRadius.md,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    waterOptionSelected: {
      backgroundColor: '#E3F2FD',
      borderColor: '#2196F3',
    },
    waterOptionText: {
      fontSize: responsiveSize.fontSize.sm,
      color: '#666',
      fontWeight: '500',
    },
    waterOptionTextSelected: {
      color: '#2196F3',
      fontWeight: 'bold',
    },
    // Practice sections
    sectionTitle: {
      fontSize: responsiveSize.fontSize.xl,
      fontWeight: 'bold',
      marginTop: vs(16),
      marginBottom: vs(12),
    },
    practiceSection: {
      width: '100%',
      marginBottom: vs(12),
      borderRadius: responsiveSize.borderRadius.md,
      padding: rs(16),
    },
    practiceHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    practiceLabel: {
      fontSize: responsiveSize.fontSize.lg,
      fontWeight: '500',
    },
    subOptionSection: {
      marginTop: rs(12),
    },
    subOptionLabel: {
      fontSize: responsiveSize.fontSize.sm,
      marginBottom: rs(8),
    },
    optionButtonsRow: {
      flexDirection: 'row',
      gap: rs(8),
    },
    optionButton: {
      flex: 1,
      paddingVertical: vs(10),
      borderRadius: responsiveSize.borderRadius.sm,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    optionButtonSelected: {
      backgroundColor: '#E3F2FD',
      borderColor: '#2196F3',
    },
    optionButtonText: {
      fontSize: responsiveSize.fontSize.sm,
      fontWeight: '500',
    },
    optionButtonTextSelected: {
      fontWeight: 'bold',
    },
    timeOptionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: rs(6),
    },
    timeOption: {
      minWidth: rs(50),
      paddingVertical: vs(8),
      paddingHorizontal: rs(10),
      borderRadius: responsiveSize.borderRadius.sm,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    timeOptionSelected: {
      backgroundColor: '#FFF3E0',
      borderColor: '#FF9800',
    },
    timeOptionText: {
      fontSize: responsiveSize.fontSize.xs,
      fontWeight: '500',
    },
    timeOptionTextSelected: {
      fontWeight: 'bold',
    },
    meritText: {
      fontSize: responsiveSize.fontSize.sm,
      marginTop: rs(8),
      fontWeight: '600',
    },
    notesInput: {
      width: '100%',
      borderWidth: 1,
      borderRadius: responsiveSize.borderRadius.md,
      padding: rs(14),
      fontSize: responsiveSize.fontSize.lg,
      minHeight: vs(80),
      textAlignVertical: 'top',
      marginTop: vs(16),
      marginBottom: vs(24),
    },
    buttonRow: {
      flexDirection: 'row',
      width: '100%',
      gap: rs(12),
    },
    modalButton: {
      flex: 1,
      paddingVertical: vs(16),
      borderRadius: responsiveSize.borderRadius.md,
      alignItems: 'center',
    },
    yesButton: {
      backgroundColor: '#4CAF50',
    },
    noButton: {
      backgroundColor: '#9E9E9E',
    },
    yesButtonText: {
      fontSize: responsive({
        small: fs(16),
        tablet: fs(20),
        default: fs(18),
      }),
      fontWeight: 'bold',
      color: '#fff',
    },
    noButtonText: {
      fontSize: responsive({
        small: fs(16),
        tablet: fs(20),
        default: fs(18),
      }),
      fontWeight: 'bold',
      color: '#fff',
    },
    cancelButton: {
      marginTop: vs(16),
      paddingVertical: vs(8),
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: responsiveSize.fontSize.lg,
      color: '#999',
    },
    // Edit check-in button styles
    editCheckInButton: {
      marginTop: vs(12),
      paddingVertical: vs(12),
      paddingHorizontal: rs(20),
      borderRadius: responsiveSize.borderRadius.md,
      borderWidth: 1,
      alignItems: 'center',
      alignSelf: 'center',
    },
    editCheckInButtonText: {
      fontSize: responsive({
        small: fs(13),
        tablet: fs(16),
        default: fs(14),
      }),
      fontWeight: '500',
    },
  });
};
