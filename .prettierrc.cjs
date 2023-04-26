module.exports = {
  ...require('@torchmedia/prettier-config'),
  importOrder: [
    '^react$',
    '^react(.*)$',
    '<THIRD_PARTY_MODULES>',
    '^@fortawesome(.*)$',
    '^/?components/(.*)$',
    '^../(.*)$',
    '^./(.*)$',
    '^[./]',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  plugins: [],
};
