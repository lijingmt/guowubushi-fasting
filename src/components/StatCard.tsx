import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { responsiveSize, layout } from '../theme/responsive';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: string;
  colors?: readonly [string, string, ...string[]];
  size?: 'small' | 'medium' | 'large';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon = '📊',
  colors = ['#6C63FF', '#4CAF50'],
  size = 'medium',
}) => {
  // 根据size确定字体大小
  const getSizing = () => {
    switch (size) {
      case 'small':
        return {
          icon: responsiveSize.fontSize.lg,
          title: responsiveSize.fontSize.sm,
          value: responsiveSize.fontSize['2xl'],
          unit: responsiveSize.fontSize.sm,
          padding: responsiveSize.spacing.md,
        };
      case 'large':
        return {
          icon: responsiveSize.fontSize['3xl'],
          title: responsiveSize.fontSize.base,
          value: responsiveSize.fontSize['4xl'],
          unit: responsiveSize.fontSize.base,
          padding: responsiveSize.spacing.xl,
        };
      default:
        return {
          icon: responsiveSize.fontSize.xl,
          title: responsiveSize.fontSize.base,
          value: responsiveSize.fontSize['3xl'],
          unit: responsiveSize.fontSize.base,
          padding: layout.cardPadding,
        };
    }
  };

  const sizing = getSizing();

  return (
    <LinearGradient
      colors={colors}
      style={[
        styles.container,
        { padding: sizing.padding, borderRadius: responsiveSize.borderRadius.lg }
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={[styles.icon, { fontSize: sizing.icon, marginBottom: responsiveSize.spacing.sm }]}>{icon}</Text>
      <Text style={[styles.title, { fontSize: sizing.title, marginBottom: responsiveSize.spacing.xs }]}>{title}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { fontSize: sizing.value }]}>{value}</Text>
        {unit && <Text style={[styles.unit, { fontSize: sizing.unit, marginLeft: responsiveSize.spacing.xs }]}>{unit}</Text>}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: responsiveSize.spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    textAlign: 'center',
  },
  title: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  value: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  unit: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
