import { FilterItem } from '../types';

export const INITIAL_FILTERS: FilterItem[] = [
  {
    id: 'none',
    name: 'None',
    nameVi: 'Gốc',
    overlayColor: 'transparent',
    sampleThumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'film',
    name: 'Film',
    nameVi: 'Phim nhựa',
    overlayColor: 'rgba(255, 230, 200, 0.25)',
    filterStyle: { brightness: 1.05, contrast: 1.15, saturate: 1.2 },
    sampleThumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'bw',
    name: 'Black white',
    nameVi: 'Trắng đen',
    overlayColor: 'rgba(0, 0, 0, 0.45)',
    filterStyle: { saturate: 0, contrast: 1.3 },
    sampleThumbnail: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'natural',
    name: 'Natural',
    nameVi: 'Tự nhiên',
    overlayColor: 'rgba(230, 245, 255, 0.15)',
    filterStyle: { brightness: 1.08, contrast: 1.05 },
    sampleThumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'art',
    name: 'Art',
    nameVi: 'Nghệ thuật',
    overlayColor: 'rgba(128, 0, 255, 0.2)',
    filterStyle: { saturate: 1.4, contrast: 1.25 },
    sampleThumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    nameVi: 'Cổ điển',
    overlayColor: 'rgba(180, 130, 80, 0.3)',
    filterStyle: { saturate: 0.85, contrast: 1.1 },
    sampleThumbnail: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'spring',
    name: 'Spring',
    nameVi: 'Mùa xuân',
    overlayColor: 'rgba(255, 182, 193, 0.25)',
    filterStyle: { brightness: 1.12, saturate: 1.3 },
    sampleThumbnail: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'baby',
    name: 'Baby',
    nameVi: 'Em bé',
    overlayColor: 'rgba(255, 240, 245, 0.2)',
    filterStyle: { brightness: 1.15, contrast: 0.95 },
    sampleThumbnail: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'contrast',
    name: 'Contrast',
    nameVi: 'Tương phản',
    overlayColor: 'rgba(20, 20, 30, 0.2)',
    filterStyle: { contrast: 1.45, brightness: 1.05 },
    sampleThumbnail: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
  },
];

export function getCssFilterForId(filterId?: string): string {
  switch (filterId) {
    case 'film':
      return 'sepia(0.28) brightness(1.05) contrast(1.15) saturate(1.2)';
    case 'bw':
      return 'grayscale(1) contrast(1.3)';
    case 'natural':
      return 'brightness(1.08) contrast(1.05) saturate(1.1)';
    case 'art':
      return 'saturate(1.45) contrast(1.25) hue-rotate(-18deg)';
    case 'vintage':
      return 'sepia(0.5) saturate(0.85) contrast(1.1)';
    case 'spring':
      return 'brightness(1.12) saturate(1.35) sepia(0.12)';
    case 'baby':
      return 'brightness(1.15) contrast(0.95) saturate(1.08)';
    case 'contrast':
      return 'contrast(1.45) brightness(1.05)';
    case 'none':
    default:
      return 'none';
  }
}
