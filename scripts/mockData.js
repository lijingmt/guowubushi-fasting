/**
 * 模拟数据脚本 - 用于测试 Grace Day 和冰冻功能
 *
 * 功能说明：
 * 1. Grace Day（宽限期）：允许1天宽限，偶尔忘记不会中断连胜
 * 2. 冰冻状态：当今天和昨天都没打卡时，火苗会被"冰冻"
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEYS = {
  CHECKIN_RECORDS: '@guowu_checkin_records',
};

// 获取今天的日期 (YYYY-MM-DD)
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

// 获取指定天数前的日期
const getDateDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

// 生成打卡记录
const generateCheckInRecord = (date, completed = true) => {
  return {
    id: `checkin-${date}`,
    date,
    completed,
    brokeAfterNoon: !completed,
    checkInTime: new Date(date + 'T20:00:00').getTime(),
    notes: completed ? '完成过午不食' : '未完成',
  };
};

// 场景1：处于冰冻状态（今天和昨天都没打卡，但之前有连胜）
const mockFrozenFlameScenario = async () => {
  console.log('🧊 生成冰冻火苗场景数据...');

  const today = getTodayDate();
  const yesterday = getDateDaysAgo(1);

  // 生成过去10天的连续打卡记录（不包括昨天和今天）
  const records = [];
  for (let i = 10; i >= 2; i--) {
    const date = getDateDaysAgo(i);
    records.push(generateCheckInRecord(date, true));
  }

  // 昨天和今天不打卡（或不完成）
  records.push(generateCheckInRecord(yesterday, false));
  records.push(generateCheckInRecord(today, false));

  await AsyncStorage.setItem(KEYS.CHECKIN_RECORDS, JSON.stringify(records));
  console.log('✅ 冰冻场景数据已生成！');
  console.log(`   - 连续打卡: 10天`);
  console.log(`   - 昨天未打卡: ${yesterday}`);
  console.log(`   - 今天未打卡: ${today}`);
  console.log('   - 当前状态: 🧊 火苗已冰冻！请下拉刷新查看效果。');
};

// 场景2：使用宽限期后恢复连胜
const mockGracePeriodScenario = async () => {
  console.log('🛡️ 生成宽限期恢复场景数据...');

  const today = getTodayDate();
  const yesterday = getDateDaysAgo(1);

  // 生成过去10天的连续打卡记录
  const records = [];
  for (let i = 10; i >= 2; i--) {
    const date = getDateDaysAgo(i);
    records.push(generateCheckInRecord(date, true));
  }

  // 昨天未打卡（使用宽限期）
  records.push(generateCheckInRecord(yesterday, false));
  // 今天打卡（恢复连胜）
  records.push(generateCheckInRecord(today, true));

  await AsyncStorage.setItem(KEYS.CHECKIN_RECORDS, JSON.stringify(records));
  console.log('✅ 宽限期场景数据已生成！');
  console.log(`   - 连续打卡: 9天`);
  console.log(`   - 昨天未打卡: ${yesterday} (使用宽限期)`);
  console.log(`   - 今天打卡: ${today} (恢复连胜)`);
  console.log('   - 当前状态: 🔥 连胜保持！请下拉刷新查看效果。');
};

// 场景3：超过宽限期（连胜中断）
const mockStreakBrokenScenario = async () => {
  console.log('💔 生成连胜中断场景数据...');

  const today = getTodayDate();
  const yesterday = getDateDaysAgo(1);
  const dayBefore = getDateDaysAgo(2);

  // 生成过去10天的连续打卡记录
  const records = [];
  for (let i = 12; i >= 4; i--) {
    const date = getDateDaysAgo(i);
    records.push(generateCheckInRecord(date, true));
  }

  // 连续两天未打卡（超过宽限期）
  records.push(generateCheckInRecord(dayBefore, false));
  records.push(generateCheckInRecord(yesterday, false));
  // 今天重新开始
  records.push(generateCheckInRecord(today, true));

  await AsyncStorage.setItem(KEYS.CHECKIN_RECORDS, JSON.stringify(records));
  console.log('✅ 连胜中断场景数据已生成！');
  console.log(`   - 之前连胜: 10天`);
  console.log(`   - 前天未打卡: ${dayBefore}`);
  console.log(`   - 昨天未打卡: ${yesterday}`);
  console.log(`   - 今天打卡: ${today} (重新开始)`);
  console.log('   - 当前状态: 💔 连胜已中断，当前连胜: 1天。请下拉刷新查看效果。');
};

// 清除所有打卡数据
const clearData = async () => {
  await AsyncStorage.removeItem(KEYS.CHECKIN_RECORDS);
  console.log('🗑️  打卡数据已清除');
};

// 自动生成冰冻火苗测试数据（仅在开发模式下）
if (__DEV__) {
  // 延迟执行，确保 AsyncStorage 已准备好
  setTimeout(() => {
    mockFrozenFlameScenario().catch(err => {
      console.log('测试数据生成失败:', err);
    });
  }, 1000);

  // 同时挂载到 global 对象供手动调用
  if (Platform.OS === 'web') {
    window.mockFrozenFlame = mockFrozenFlameScenario;
    window.mockGracePeriod = mockGracePeriodScenario;
    window.mockStreakBroken = mockStreakBrokenScenario;
    window.clearMockData = clearData;
  } else {
    // React Native 环境
    global.mockFrozenFlame = mockFrozenFlameScenario;
    global.mockGracePeriod = mockGracePeriodScenario;
    global.mockStreakBroken = mockStreakBrokenScenario;
    global.clearMockData = clearData;
  }

  console.log(`
🎮 模拟数据控制台已加载！
自动生成冰冻火苗测试数据...

手动调用方法：
  global.mockFrozenFlame()    - 生成冰冻火苗场景
  global.mockGracePeriod()    - 生成宽限期恢复场景
  global.mockStreakBroken()   - 生成连胜中断场景
  global.clearMockData()      - 清除所有数据
  `);
}

export {
  mockFrozenFlameScenario,
  mockGracePeriodScenario,
  mockStreakBrokenScenario,
  clearData,
};
