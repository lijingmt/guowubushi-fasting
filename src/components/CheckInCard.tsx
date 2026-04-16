import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';

export const CheckInCard: React.FC = () => {
  const { t, hasCheckedToday, todayCheckIn, dailyCheckIn, stats, addWeight, addWater, colors, language } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [weight, setWeight] = useState('');
  const [isAbstinence, setIsAbstinence] = useState(false);
  const [selectedWater, setSelectedWater] = useState<number | null>(null);

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

  const handleCheckIn = async (completed: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (weight && parseFloat(weight) > 0) {
      await addWeight(parseFloat(weight));
    }

    if (selectedWater) {
      await addWater(selectedWater);
    }

    let finalNotes = notes;
    if (isAbstinence) {
      finalNotes = finalNotes ? `${finalNotes}\n${getAbstinenceNote()}` : getAbstinenceNote();
    }
    if (selectedWater) {
      const waterText = selectedWater >= 2500 ? '>2000ml' : `${selectedWater}ml`;
      finalNotes = finalNotes ? `${finalNotes}\n${getWaterNote(waterText)}` : getWaterNote(waterText);
    }

    await dailyCheckIn(completed, finalNotes || undefined);
    setNotes('');
    setWeight('');
    setIsAbstinence(false);
    setSelectedWater(null);
    setShowModal(false);
  };

  if (hasCheckedToday && todayCheckIn) {
    return (
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.checkInToday}</Text>
            <Text style={[styles.modalQuestion, { color: colors.text }]}>
              {t.checkInQuestion}
            </Text>
            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              {t.checkInHint}
            </Text>

            {/* Weight input */}
            <View style={[styles.weightSection, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.weightLabel, { color: colors.textSecondary }]}>{t.todaysWeight}</Text>
              <View style={styles.weightInputRow}>
                <TextInput
                  style={[styles.weightInput, { color: colors.text }]}
                  placeholder="60.5"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={[styles.weightUnit, { color: colors.textLight }]}>{t.kg}</Text>
              </View>
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
                setNotes('');
                setWeight('');
                setIsAbstinence(false);
                setSelectedWater(null);
                setShowModal(false);
              }}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  checkInButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  checkInGradient: {
    padding: 24,
    alignItems: 'center',
  },
  checkInTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  checkInSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  completedContainer: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  completedIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 8,
  },
  streakValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  streakDays: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
  notes: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '85%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modalQuestion: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalHint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  weightSection: {
    width: '100%',
    marginBottom: 16,
  },
  weightLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'left',
    width: '100%',
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  abstinenceSection: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    padding: 16,
  },
  abstinenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  abstinenceLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  waterSection: {
    width: '100%',
    marginBottom: 16,
  },
  waterLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    textAlign: 'left',
    width: '100%',
  },
  waterOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  waterOption: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  waterOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  waterOptionText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  waterOptionTextSelected: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  weightInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    paddingVertical: 12,
  },
  weightUnit: {
    fontSize: 18,
    color: '#999',
    marginLeft: 8,
  },
  notesInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  yesButton: {
    backgroundColor: '#4CAF50',
  },
  noButton: {
    backgroundColor: '#9E9E9E',
  },
  yesButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  noButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#999',
  },
});
