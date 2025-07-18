module.exports = {
  extends: ['stylelint-config-standard-scss'],
  plugins: ['stylelint-order'],
  overrides: [
    {
      files: ['**/*.module.scss'],
      rules: {
        'selector-class-pattern': [
          '^([a-z][a-zA-Z0-9]+)$',
          {
            message: 'Expected class selector in camelCase for CSS Modules',
          },
        ],
      },
    },
    {
      files: ['**/*.scss'],
      excludedFiles: ['**/*.module.scss'],
      rules: {
        'selector-class-pattern': [
          '^([a-z]+(-[a-z0-9]+)*)$',
          {
            message: 'Expected class selector in kebab-case for global styles',
          },
        ],
      },
    },
  ],
  rules: {
    'color-named': 'never',
    'color-no-hex': null,
    'declaration-no-important': true,
    'max-nesting-depth': 3,
    'selector-max-id': 0,
    'selector-no-qualifying-type': [true, { ignore: ['attribute'] }],
    'no-duplicate-selectors': true,

    'order/order': [
      'custom-properties',
      'dollar-variables',
      'at-rules',
      'declarations',
      {
        type: 'at-rule',
        name: 'media',
      },
      'rules',
    ],
    'order/properties-order': [
      'content',
      'display',
      'position',
      'top',
      'right',
      'bottom',
      'left',
      'z-index',
      'flex',
      'flex-grow',
      'flex-shrink',
      'flex-basis',
      'justify-content',
      'align-items',
      'align-self',
      'order',
      'width',
      'height',
      'min-width',
      'min-height',
      'max-width',
      'max-height',
      'margin',
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
      'padding',
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
      'font',
      'font-size',
      'font-weight',
      'line-height',
      'color',
      'background',
      'background-color',
      'border',
      'border-radius',
      'box-shadow',
      'opacity',
      'transition',
      'transform',
      'animation',
    ],
    'unit-allowed-list': ['px', 'em', 'rem', '%', 'vh', 'vw'],
    'property-no-vendor-prefix': true,
    'value-no-vendor-prefix': true,
    'selector-no-vendor-prefix': true,
    'media-feature-name-no-vendor-prefix': true,
  },
};
