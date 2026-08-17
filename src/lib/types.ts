export type ItemStatus = 'queued' | 'searching' | 'ready' | 'needs_review' | 'missing_image' | 'low_resolution' | 'search_failed' | 'source_warning';

export interface SelectedImage {
  id: string;
  provider: string;
  previewUrl: string;
  fullUrl?: string;
  width: number;
  height: number;
  author?: string;
  sourcePageUrl?: string;
  licenseName?: string;
}

export interface VocabularyItem {
  id: string;
  order: number;
  word: string;
  displayWord: string;
  language: 'en' | 'ar' | string;
  searchHint?: string;
  status: ItemStatus;
  image?: SelectedImage;
  manualImageLock: boolean;
}

export interface VocabularyProject {
  id: string;
  version: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  uiLanguage: 'en' | 'ar';
  posterLanguage: 'en' | 'ar' | 'mixed';
  visualStyle: 'clean-object' | 'photo' | 'illustration' | 'mixed';
  keepVisualConsistency: boolean;
  outputProfile: 'exact-template' | 'a4-print';
  template: {
    level: string;
    titleTop: string;
    titleMain: string;
    category: string;
    footerText: string;
    accentColor: string;
  };
  items: VocabularyItem[];
}
