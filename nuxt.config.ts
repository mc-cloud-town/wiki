// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  extends: ['shadcn-docs-nuxt'],

  i18n: {
    defaultLocale: 'zh-TW',
    locales: [{ code: 'zh-TW', name: '中文', language: 'zh-TW' }],
  },

  compatibilityDate: '2024-07-06',
  modules: ['@nuxt/eslint', 'nuxt-component-meta'],

  content: {
    watch: {
      ws: {
        hostname: process.env.NUXT_CONTENT_HOSTNAME,
      },
    },
    highlight: {
      langs: ['java'],
    },
  },
});
