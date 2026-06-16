import baseConfig from '@allsetlabs/forge/tailwind.config';

/** @type {import('tailwindcss').Config} */
export default {
  ...baseConfig,
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../../forge/src/**/*.{js,ts,jsx,tsx}'],
};
