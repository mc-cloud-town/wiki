// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  extends: ['shadcn-docs-nuxt'],

  css: ['katex/dist/katex.min.css'],

  site: {
    url: 'https://wiki.mc-ctec.org',
    name: 'CTEC WiKi Website',
  },

  i18n: {
    defaultLocale: 'zh-TW',
    locales: [{ code: 'zh-TW', name: '中文', language: 'zh-TW' }],
  },

  compatibilityDate: '2024-07-06',
  modules: [
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    '@nuxt/eslint',
    'nuxt-component-meta',
  ],

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

  ogImage: {
    fonts: [
      'Noto+Sans+SC:400',
      'Noto+Sans:400',
      'Noto+Sans:700',
      'Work+Sans:ital:400',
    ],
  },
});
