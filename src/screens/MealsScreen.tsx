import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { CALORIE_REFERENCES } from '../constants/achievements';

export const MealsScreen: React.FC = () => {
  const {
    t,
    todayMeals,
    mealRecords,
    todayCalories,
    settings,
    addMeal,
    removeMeal,
    colors,
    language,
  } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [mealNotes, setMealNotes] = useState('');

  const handleAddMeal = async () => {
    if (!mealName.trim() || !mealCalories) return;

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    await addMeal({
      time,
      name: mealName,
      calories: parseInt(mealCalories, 10) || 0,
      type: 'snack',
      notes: mealNotes || undefined,
    });

    setMealName('');
    setMealCalories('');
    setMealNotes('');
    setShowAddModal(false);
  };

  const handleQuickAdd = (name: string, calories: number) => {
    setMealName(name);
    setMealCalories(calories.toString());
  };

  const getMealTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      breakfast: t.breakfast,
      lunch: t.lunch,
      dinner: t.dinner,
      snack: t.snack,
    };
    return labels[type] || type;
  };

  const todayMealCards = todayMeals.map((meal) => (
    <Card key={meal.id} style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <Text style={[styles.mealName, { color: colors.text }]}>{meal.name}</Text>
        <Text style={[styles.mealCalories, { color: colors.textSecondary }]}>{meal.calories} kcal</Text>
      </View>
      <View style={styles.mealDetails}>
        <Text style={[styles.mealTime, { color: colors.textLight }]}>{meal.time}</Text>
        {meal.notes && <Text style={[styles.mealNotes, { color: colors.textSecondary }]}>{meal.notes}</Text>}
      </View>
      <TouchableOpacity
        style={[styles.deleteButton, { borderColor: colors.border }]}
        onPress={() => removeMeal(meal.id)}
      >
        <Text style={[styles.deleteButtonText, { color: colors.error }]}>{t.delete}</Text>
      </TouchableOpacity>
    </Card>
  ));

  const remainingCalories = settings.dailyCalorieGoal - todayCalories;
  const isOverGoal = todayCalories > settings.dailyCalorieGoal;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t.meals}</Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {new Date().toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'es' ? 'es-ES' : 'en-US', {
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      <Card style={styles.summaryCard}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t.totalCalories}</Text>
        <View style={styles.calorieRow}>
          <Text
            style={[styles.calorieAmount, { color: isOverGoal ? colors.error : colors.warning }, isOverGoal && styles.calorieOver]}
          >
            {todayCalories}
          </Text>
          <Text style={[styles.calorieSeparator, { color: colors.textSecondary }]}> / </Text>
          <Text style={[styles.calorieGoal, { color: colors.textLight }]}>{settings.dailyCalorieGoal}</Text>
        </View>
        <Text style={[styles.remainingLabel, { color: isOverGoal ? colors.error : colors.success }]}>
          {isOverGoal ? t.overGoal : t.remainingCalories}: {Math.abs(remainingCalories)} kcal
        </Text>
      </Card>

      {todayMeals.length > 0 ? (
        <View style={styles.mealsContainer}>{todayMealCards}</View>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.noMealsToday}</Text>
        </Card>
      )}

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.addButtonText}>+ {t.addMeal}</Text>
      </TouchableOpacity>

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t.addMeal}</Text>

              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                placeholder={t.mealName}
                placeholderTextColor={colors.textLight}
                value={mealName}
                onChangeText={setMealName}
              />

              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                placeholder={t.calories}
                placeholderTextColor={colors.textLight}
                value={mealCalories}
                onChangeText={setMealCalories}
                keyboardType="numeric"
              />

              <TextInput
                style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                placeholder={t.notes}
                placeholderTextColor={colors.textLight}
                value={mealNotes}
                onChangeText={setMealNotes}
                multiline
              />

              <Text style={[styles.quickAddTitle, { color: colors.textSecondary }]}>{t.quickAdd}</Text>
              <ScrollView
                horizontal
                style={styles.quickAddScroll}
                showsHorizontalScrollIndicator={false}
              >
                {Object.entries(CALORIE_REFERENCES).slice(0, 10).map(
                  ([name, calories]) => (
                    <TouchableOpacity
                      key={name}
                      style={[styles.quickAddChip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                      onPress={() => handleQuickAdd(name, calories)}
                    >
                      <Text style={[styles.quickAddChipText, { color: colors.text }]}>{name}</Text>
                      <Text style={[styles.quickAddChipCalories, { color: colors.textLight }]}>
                        {calories}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel, { backgroundColor: colors.divider }]}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={[styles.modalButtonText, { color: colors.text }]}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: colors.primary }]}
                  onPress={handleAddMeal}
                >
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>{t.ok}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    paddingTop: 70,
    paddingBottom: 32,
  },
  header: {
    marginTop: 50,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  date: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  summaryCard: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  calorieAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  calorieOver: {
    color: '#F44336',
  },
  calorieSeparator: {
    fontSize: 24,
    color: '#999',
  },
  calorieGoal: {
    fontSize: 24,
    color: '#999',
  },
  remainingLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  mealsContainer: {
    marginBottom: 16,
  },
  mealCard: {
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  mealCalories: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  mealDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealTime: {
    fontSize: 14,
    color: '#999',
  },
  mealNotes: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
  },
  emptyCard: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  quickAddTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  quickAddScroll: {
    marginBottom: 16,
  },
  quickAddChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    minWidth: 100,
  },
  quickAddChipText: {
    fontSize: 12,
    color: '#333',
  },
  quickAddChipCalories: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#E0E0E0',
    marginRight: 8,
  },
  modalButtonConfirm: {
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
