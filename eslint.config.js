import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { files: ["**/*.{js,mjs,cjs,jsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  {
    ...pluginReactConfig,
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
        ...pluginReactConfig.rules,
        "react/react-in-jsx-scope": "off",
        "react/prop-types": "off"
    }
  },
  {
    plugins: {
      'react-refresh': reactRefresh
    },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    }
  },
  { ignores: ["dist", "eslint.config.js", "postcss.config.js", "tailwind.config.js", "vite.config.js"] }
];
