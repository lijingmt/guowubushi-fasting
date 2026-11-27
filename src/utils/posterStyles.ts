import type { PosterStyleId } from '../types';

export interface PosterStyleMeta {
  id: PosterStyleId;
  nameZh: string;
  nameEn: string;
  nameEs: string;
  paperBg: string;
  innerBg: string;
  border: string;
  titleColor: string;
  numberColor: string;
  bodyColor: string;
  mutedColor: string;
  tileBg: string;
  sealBorder: string;
  sealBg: string;
  sealText: string;
  qrBg: string;
  qrColor: string;
}

export const POSTER_STYLES: PosterStyleMeta[] = [
  {
    id: 'xuan_paper',
    nameZh: '素雅宣纸',
    nameEn: 'Xuan Paper',
    nameEs: 'Papel Xuan',
    paperBg: '#F8F3E6',
    innerBg: '#FBF8EF',
    border: '#D5CBB6',
    titleColor: '#265947',
    numberColor: '#1F2A24',
    bodyColor: '#5A675F',
    mutedColor: '#7B857D',
    tileBg: '#EFE9DC',
    sealBorder: '#B93A32',
    sealBg: '#B93A3214',
    sealText: '#B93A32',
    qrBg: '#FFFDF8',
    qrColor: '#1F2A24',
  },
  {
    id: 'song_celadon',
    nameZh: '宋瓷青釉',
    nameEn: 'Song Celadon',
    nameEs: 'Celadón Song',
    paperBg: '#E6F0EF',
    innerBg: '#F3F9F8',
    border: '#BFD6D4',
    titleColor: '#235962',
    numberColor: '#182A2E',
    bodyColor: '#486266',
    mutedColor: '#6D8589',
    tileBg: '#E1ECEB',
    sealBorder: '#A9413B',
    sealBg: '#A9413B14',
    sealText: '#A9413B',
    qrBg: '#F9FCFC',
    qrColor: '#182A2E',
  },
  {
    id: 'vermilion_gilt',
    nameZh: '朱砂泥金',
    nameEn: 'Gilt Ochre',
    nameEs: 'Ocre Dorado',
    paperBg: '#F4E8D4',
    innerBg: '#FCF6EA',
    border: '#DFC7A1',
    titleColor: '#8B5318',
    numberColor: '#2C1E12',
    bodyColor: '#68513C',
    mutedColor: '#8E755C',
    tileBg: '#EFE1CA',
    sealBorder: '#B13227',
    sealBg: '#B1322718',
    sealText: '#B13227',
    qrBg: '#FFFBF2',
    qrColor: '#2C1E12',
  },
  {
    id: 'midnight_ink',
    nameZh: '暗夜墨金',
    nameEn: 'Midnight Gold',
    nameEs: 'Noche Oro',
    paperBg: '#171E22',
    innerBg: '#1E272C',
    border: '#43525B',
    titleColor: '#E5B968',
    numberColor: '#F5EFE2',
    bodyColor: '#BAC5CA',
    mutedColor: '#8A98A0',
    tileBg: '#273238',
    sealBorder: '#D46055',
    sealBg: '#D4605522',
    sealText: '#F08378',
    qrBg: '#F6F2E9',
    qrColor: '#171E22',
  },
];
