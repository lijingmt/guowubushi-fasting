import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { responsiveSize, fs, rs, vs } from '../theme/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { height } = Dimensions.get('window');

const TERMS_AGREED_KEY = '@guowu_terms_agreed';

interface WelcomeScreenProps {
  onDismiss: () => void;
  colors: any;
  language: 'zh' | 'en' | 'es';
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onDismiss, colors, language }) => {
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleGetStarted = async () => {
    if (!agreed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await AsyncStorage.setItem(TERMS_AGREED_KEY, 'true');
    onDismiss();
  };

  const getContent = () => {
    if (language === 'en') {
      return {
        title: 'Welcome',
        appName: 'No Fasting After Noon',
        subtitle: 'Your mindful fasting companion',
        agreeText: 'I have read and agree to the ',
        termsLink: 'Terms of Service',
        getStarted: 'Get Started',
        termsTitle: 'Terms of Service',
        terms: {
          section1: {
            title: '⚠️ Health Disclaimer',
            content: 'This app is for informational purposes only and is not intended to provide medical advice. Always consult with a qualified healthcare professional before starting any fasting program, especially if you are under 18, pregnant or breastfeeding, have diabetes, heart disease, eating disorders, or are taking prescription medications.',
          },
          section2: {
            title: '🚨 Stop If Unwell',
            content: 'If you experience dizziness, fainting, chest pain, palpitations, severe headache, nausea, or any other concerning symptoms during fasting, STOP immediately and eat. Seek medical attention if symptoms persist.',
          },
          section3: {
            title: '⚖️ Limitation of Liability',
            content: 'This app and its creators are not responsible for any injury, health issues, or damages resulting from the use of this app. Use at your own risk.',
          },
          section4: {
            title: '🔒 Privacy & Data',
            content: 'Your data is stored locally on your device. We do not collect, sell, or share your personal information with third parties.',
          },
        },
      };
    }
    if (language === 'es') {
      return {
        title: 'Bienvenido',
        appName: 'No Ayuno Después del Mediodía',
        subtitle: 'Tu compañero de ayuno consciente',
        agreeText: 'He leído y acepto los ',
        termsLink: 'Términos de Servicio',
        getStarted: 'Comenzar',
        termsTitle: 'Términos de Servicio',
        terms: {
          section1: {
            title: '⚠️ Descargo de Responsabilidad de Salud',
            content: 'Esta aplicación es solo para fines informativos y no tiene como objetivo proporcionar consejo médico. Siempre consulta con un profesional de la salud calificado antes de comenzar cualquier programa de ayuno, especialmente si eres menor de 18, estás embarazada o dando de lactar, tienes diabetes, enfermedades cardíacas, trastornos alimentarios o estás tomando medicamentos recetados.',
          },
          section2: {
            title: '🚨 Detente Si Te Sientes Mal',
            content: 'Si experimentas mareos, desmayos, dolor en el pecho, palpitaciones, dolor de cabeza severo, náuseas o cualquier otro síntoma preocupante durante el ayuno, DETENTE inmediatamente y come. Busca atención médica si los síntomas persisten.',
          },
          section3: {
            title: '⚖️ Limitación de Responsabilidad',
            content: 'Esta aplicación y sus creadores no son responsables de ninguna lesión, problema de salud o daños resultantes del uso de esta aplicación. Úsala bajo tu propia responsabilidad.',
          },
          section4: {
            title: '🔒 Privacidad y Datos',
            content: 'Tus datos se almacenan localmente en tu dispositivo. No recopilamos, vendemos ni compartimos tu información personal con terceros.',
          },
        },
      };
    }
    return {
      title: '欢迎',
      appName: '过午不食',
      subtitle: '您的正念禁食伴侣',
      agreeText: '我已阅读并同意',
      termsLink: '《用户服务条款》',
      getStarted: '开始使用',
      termsTitle: '用户服务条款',
      terms: {
        section1: {
          title: '⚠️ 健康免责声明',
          content: '本应用仅供信息参考，不提供医疗建议。开始禁食前请咨询医生，特别是未满18岁、孕期哺乳期、患有糖尿病心脏病饮食失调或正在服药的人群。',
        },
        section2: {
          title: '🚨 身体不适立即停止',
          content: '如出现头晕、昏厥、胸痛、心慌、剧烈头痛、恶心等症状，请立即停止禁食并进食。症状持续请就医。',
        },
        section3: {
          title: '⚖️ 责任限制',
          content: '本应用创作者不对因使用本应用导致的任何伤害、健康问题或损害承担责任。使用风险由您自行承担。',
        },
        section4: {
          title: '🔒 隐私与数据',
          content: '您的数据仅存储在本地设备。我们不会收集、出售或与第三方共享您的个人信息。',
        },
      },
    };
  };

  const content = getContent();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Logo */}
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
        <Text style={styles.icon}>🏔️</Text>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>{content.title}</Text>
      <Text style={[styles.appName, { color: colors.primary }]}>{content.appName}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{content.subtitle}</Text>

      {/* Checkbox */}
      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => {
          Haptics.selectionAsync();
          setAgreed(!agreed);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, agreed && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          {agreed && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={[styles.agreeText, { color: colors.text }]}>
          {content.agreeText}
          <TouchableOpacity onPress={() => setShowTerms(true)} activeOpacity={0.7}>
            <Text style={[styles.termsLink, { color: colors.primary }]}> {content.termsLink}</Text>
          </TouchableOpacity>
        </Text>
      </TouchableOpacity>

      {/* Get Started Button */}
      <TouchableOpacity
        style={[
          styles.getStartedButton,
          { backgroundColor: agreed ? colors.primary : colors.divider },
        ]}
        onPress={handleGetStarted}
        disabled={!agreed}
      >
        <Text style={styles.getStartedButtonText}>{content.getStarted}</Text>
      </TouchableOpacity>

      {/* Terms Modal */}
      <TermsModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
        colors={colors}
        language={language}
        content={content}
      />
    </View>
  );
};

// Terms Modal
interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  colors: any;
  language: 'zh' | 'en' | 'es';
  content: any;
}

const TermsModal: React.FC<TermsModalProps> = ({ visible, onClose, colors, language, content }) => {
  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
        <Text style={[styles.modalTitle, { color: colors.text }]}>{content.termsTitle}</Text>

        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.termsSection, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.termsSectionTitle, { color: colors.warning }]}>
              {content.terms.section1.title}
            </Text>
            <Text style={[styles.termsSectionText, { color: colors.textSecondary }]}>
              {content.terms.section1.content}
            </Text>
          </View>

          <View style={[styles.termsSection, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.termsSectionTitle, { color: colors.error }]}>
              {content.terms.section2.title}
            </Text>
            <Text style={[styles.termsSectionText, { color: colors.textSecondary }]}>
              {content.terms.section2.content}
            </Text>
          </View>

          <View style={[styles.termsSection, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.termsSectionTitle, { color: colors.text }]}>
              {content.terms.section3.title}
            </Text>
            <Text style={[styles.termsSectionText, { color: colors.textSecondary }]}>
              {content.terms.section3.content}
            </Text>
          </View>

          <View style={[styles.termsSection, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.termsSectionTitle, { color: colors.text }]}>
              {content.terms.section4.title}
            </Text>
            <Text style={[styles.termsSectionText, { color: colors.textSecondary }]}>
              {content.terms.section4.content}
            </Text>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
          onPress={onClose}
        >
          <Text style={styles.modalCloseButtonText}>{language === 'zh' ? '关闭' : language === 'es' ? 'Cerrar' : 'Close'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(24),
  },
  iconContainer: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(24),
  },
  icon: {
    fontSize: fs(40),
  },
  title: {
    fontSize: fs(28),
    fontWeight: '600',
    marginBottom: vs(4),
  },
  appName: {
    fontSize: fs(36),
    fontWeight: 'bold',
    marginBottom: vs(8),
  },
  subtitle: {
    fontSize: fs(14),
    marginBottom: vs(48),
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: vs(32),
  },
  checkbox: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(8),
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rs(12),
  },
  checkmark: {
    color: '#fff',
    fontSize: fs(18),
    fontWeight: 'bold',
  },
  agreeText: {
    fontSize: fs(15),
    flex: 1,
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
  getStartedButton: {
    width: '100%',
    paddingVertical: vs(18),
    borderRadius: rs(16),
    alignItems: 'center',
  },
  getStartedButtonText: {
    color: '#fff',
    fontSize: fs(18),
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(20),
  },
  modalContent: {
    width: '100%',
    maxWidth: rs(380),
    borderRadius: rs(24),
    padding: rs(24),
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: fs(22),
    fontWeight: 'bold',
    marginBottom: vs(16),
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: vs(350),
  },
  termsSection: {
    borderRadius: rs(12),
    padding: rs(16),
    marginBottom: vs(12),
  },
  termsSectionTitle: {
    fontSize: fs(15),
    fontWeight: '700',
    marginBottom: vs(8),
  },
  termsSectionText: {
    fontSize: fs(13),
    lineHeight: vs(22),
  },
  modalCloseButton: {
    marginTop: vs(16),
    paddingVertical: vs(14),
    borderRadius: rs(12),
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: fs(16),
    fontWeight: '600',
  },
});

export const checkTermsAgreed = async (): Promise<boolean> => {
  try {
    const agreed = await AsyncStorage.getItem(TERMS_AGREED_KEY);
    return agreed === 'true';
  } catch {
    return false;
  }
};
