import type { Preview } from "@storybook/react";

// Import global Tailwind styles so tokens render correctly in stories
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /date$/i,
      },
    },
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#010101" },
        { name: "card", value: "#0f0f0f" },
      ],
    },
  },
};

export default preview;
