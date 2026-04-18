import baseConfig from '@allsetlabs/reusable/tailwind.config';

/** @type {import('tailwindcss').Config} */
export default {
  ...baseConfig,
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../reusables/src/**/*.{js,ts,jsx,tsx}',
  ],
};
