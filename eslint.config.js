import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/**
 * As fronteiras da constituição são impostas aqui, não em review (Princípios II, IV, V, VI).
 * Cada bloco abaixo corresponde a uma linha da tabela do Princípio V ou a uma regra de R-03/R-04.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'supabase/**',
      'coverage/**',
      'src/services/supabase/database.types.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },

  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node },
    },
  },

  // Princípio VI / design system §7.2 — as duas regras que fecham o design system.
  {
    files: ['src/**/*.tsx', 'tests/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="className"] Literal[value=/-\\[/]',
          message:
            'Valor arbitrário do Tailwind (`-[…]`) é proibido: use um token do design system (§7.2).',
        },
        {
          selector: 'JSXAttribute[name.name="className"] TemplateElement[value.raw=/-\\[/]',
          message:
            'Valor arbitrário do Tailwind (`-[…]`) é proibido: use um token do design system (§7.2).',
        },
        {
          selector: 'JSXAttribute[name.name="style"] ObjectExpression > Property > Literal',
          message:
            'Atributo `style` com valor literal é proibido: use classe utilitária de token (§7.2).',
        },
      ],
    },
  },

  // Princípio V — @supabase/supabase-js só em src/services/supabase/.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/services/supabase/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message: 'Importe supabase-js apenas em src/services/supabase/ (Princípio IV).',
            },
          ],
        },
      ],
    },
  },

  // Princípio V — lucide-react só no átomo Icone.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/components/atoms/Icone.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'lucide-react',
              message: 'Importe lucide-react apenas em src/components/atoms/Icone.tsx (R-12).',
            },
            {
              name: '@supabase/supabase-js',
              message: 'Importe supabase-js apenas em src/services/supabase/ (Princípio IV).',
            },
          ],
        },
      ],
    },
  },

  // R-03 — createContext só em src/services/.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/services/**', 'src/components/atoms/Icone.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              importNames: ['createContext'],
              message: 'createContext é permitido apenas em src/services/ (R-03).',
            },
            {
              name: 'lucide-react',
              message: 'Importe lucide-react apenas em src/components/atoms/Icone.tsx (R-12).',
            },
            {
              name: '@supabase/supabase-js',
              message: 'Importe supabase-js apenas em src/services/supabase/ (Princípio IV).',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'React',
          property: 'createContext',
          message: 'createContext é permitido apenas em src/services/ (R-03).',
        },
      ],
    },
  },

  // R-04 — regra de negócio não navega: react-router-dom proibido em services/ e lib/.
  {
    files: ['src/services/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-router-dom',
              message:
                'react-router-dom é proibido em src/services/ e src/lib/: quem navega é o componente (R-04).',
            },
            {
              name: 'react-router',
              message:
                'react-router é proibido em src/services/ e src/lib/: quem navega é o componente (R-04).',
            },
          ],
        },
      ],
    },
  },

  // Princípio II / R-12 — atoms e molecules recebem tudo por prop.
  //
  // Um único bloco de `no-restricted-imports` por conjunto de arquivos: o flat config do ESLint
  // substitui a config de uma regra inteira quando dois blocos que casam o mesmo arquivo a
  // declaram, em vez de mesclar `paths`/`patterns` — por isso as restrições de `react-router-dom`
  // (R-04, quando algum dia se aplicar aqui), `lucide-react`, `@supabase/supabase-js` e
  // `createContext` (R-03) precisam **todas** viver neste bloco para valer dentro de
  // `atoms/`/`molecules/`; repeti-las em blocos anteriores não basta, pois este é o último a casar
  // esses arquivos (T122).
  {
    files: ['src/components/atoms/**/*.{ts,tsx}', 'src/components/molecules/**/*.{ts,tsx}'],
    ignores: ['src/components/atoms/Icone.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/services/**', '**/services'],
              message:
                'atoms e molecules não importam de src/services/ — recebem tudo por prop (R-12).',
            },
          ],
          paths: [
            {
              name: 'lucide-react',
              message: 'Importe lucide-react apenas em src/components/atoms/Icone.tsx (R-12).',
            },
            {
              name: '@supabase/supabase-js',
              message: 'Importe supabase-js apenas em src/services/supabase/ (Princípio IV).',
            },
            {
              name: 'react',
              importNames: ['createContext'],
              message: 'createContext é permitido apenas em src/services/ (R-03).',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'React',
          property: 'createContext',
          message: 'createContext é permitido apenas em src/services/ (R-03).',
        },
      ],
    },
  },

  // Princípio III — config.ts é dado puro.
  {
    files: ['src/config.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom',
                'react-router-dom',
                '**/components/**',
                '**/services/**',
              ],
              message:
                'src/config.ts contém apenas dados: sem JSX, sem roteador, sem componentes (Princípio III).',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['tests/**/*.{ts,tsx}', 'scripts/**/*.mjs', '*.config.{ts,js}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
