import baseConfig from '@allsetlabs/forge/tailwind.config';

/** @type {import('tailwindcss').Config} */
export default {
  ...baseConfig,
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../plugins/**/frontend/**/*.{js,ts,jsx,tsx}', // plugin UIs are imported by the app; scan their classes too
    '../../forge/src/**/*.{js,ts,jsx,tsx}',
  ],
};
