import type { StorybookConfig } from '@storybook/react'

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.tsx', '../components/**/*.stories.ts'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
}

export default config