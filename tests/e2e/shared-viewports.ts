export const VIEWPORTS = [
  { name: 'iPhone SE', width: 320, height: 568 },
  { name: 'iPhone 14', width: 375, height: 667 },
  { name: 'iPhone 14 Plus', width: 414, height: 896 },
  { name: 'Foldable', width: 450, height: 800 },
  { name: 'iPad Portrait', width: 768, height: 1024 },
  { name: 'iPad Landscape', width: 1024, height: 768 },
  { name: 'Small Desktop', width: 1280, height: 800 },
  { name: 'Desktop', width: 1440, height: 900 },
] as const;

export const RESPONSIVE_VIEWPORTS = [
  { name: 'iPhone SE', width: 320, height: 568 },
  { name: 'iPhone 14', width: 375, height: 667 },
  { name: 'iPad Portrait', width: 768, height: 1024 },
] as const;

export const VR_VIEWPORTS = [
  { label: '360px', width: 360, height: 640 },
  { label: '768px', width: 768, height: 1024 },
  { label: '1280px', width: 1280, height: 800 },
] as const;

export type Viewport = { width: number; height: number };
