import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';

export const HistoryScreen: React.FC = () => {
  const { checkInRecords, colors } = useApp();

  const sortedRecords = [...checkInRecords].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const weekday = weekdays[d.getDay()];
      return `${month}月${day}日 ${weekday}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>打卡历史</Text>

      {sortedRecords.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>还没有打卡记录</Text>
          <Text style={[styles.emptyHint, { color: colors.textLight }]}>开始你的第一天过午不食吧！</Text>
        </Card>
      ) : (
        sortedRecords.map((record) => (
          <Card key={record.id} style={styles.recordCard}>
            <View style={styles.recordHeader}>
              <Text style={[styles.recordDate, { color: colors.text }]}>
                {formatDate(record.date)}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: record.completed ? colors.success : colors.divider },
                ]}
              >
                <Text style={[styles.statusText, { color: record.completed ? '#fff' : colors.textSecondary }]}>
                  {record.completed ? '✅ 已完成' : '😔 未完成'}
                </Text>
              </View>
            </View>
            {record.notes && (
              <Text style={[styles.recordNotes, { color: colors.textSecondary }]}>{record.notes}</Text>
            )}
          </Card>
        ))
      )}
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
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  emptyCard: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#ccc',
  },
  recordCard: {
    marginBottom: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
  },
  statusFailed: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordNotes: {
    fontSize: 14,
    color: '#666',
  },
});
