import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useApp } from '../context/AppContext';
import { responsiveSize, layout } from '../theme/responsive';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'compact' | 'spacious';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'default' }) => {
  const { colors } = useApp();

  // 根据变体获取内边距
  const getPadding = () => {
    switch (variant) {
      case 'compact':
        return responsiveSize.spacing.sm;
      case 'spacious':
        return responsiveSize.spacing['3xl'];
      default:
        return layout.cardPadding;
    }
  };

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: colors.card,
        borderRadius: responsiveSize.borderRadius.lg,
        padding: getPadding(),
      },
      style
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
