// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  extends: ['shadcn-docs-nuxt'],

  css: ['katex/dist/katex.min.css'],

  i18n: {
    defaultLocale: 'zh-TW',
    locales: [{ code: 'zh-TW', name: '中文', language: 'zh-TW' }],
  },

  compatibilityDate: '2024-07-06',
  modules: ['@nuxt/eslint', 'nuxt-component-meta'],

  content: {
    markdown: {
      remarkPlugins: ['remark-math'],
      rehypePlugins: { 'rehype-katex': { output: 'html' } },
    },
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
