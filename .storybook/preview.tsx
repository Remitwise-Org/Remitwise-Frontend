import type { Preview } from '@storybook/react'
import { withRtl } from '../components/i18n/rtlDecorator'

const preview: Preview = {
  decorators: [withRtl],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview