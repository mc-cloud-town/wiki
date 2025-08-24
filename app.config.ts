export default defineAppConfig({
  shadcnDocs: {
    site: {
      name: 'CTEC - WiKi',
      description:
        '本網站將收入本鎮的各種公開研究數據，讓大家可以更方便地查閱和了解。',
      ogImageColor: 'dark',
      ogImageComponent: 'CustomShadcnDocs',
    },

    main: {
      breadCrumb: true,
      showTitle: true,
      codeIcon: {
        java: 'mdi:language-java',
      },
    },

    aside: { useLevel: true, collapse: false },
    search: { enable: true, inAside: false },
    theme: { customizable: true, color: 'green', radius: 0.5 },

    header: {
      title: 'CTEC - WiKi',
      showTitle: true,
      darkModeToggle: true,
      languageSwitcher: {
        enable: false,
        triggerType: 'icon',
        dropdownType: 'select',
      },
      logo: { light: '/base-logo.png', dark: '/base-logo.png' },
      nav: [
        {
          title: 'ThreadStore',
          to: '/thread-store',
          target: '_self',
          description: 'ThreadStore',
        },
      ],
      links: [],
    },
    footer: {
      credits: 'WiKi Copyright © 2025 CTEC',
      links: [
        {
          icon: 'lucide:github',
          to: 'https://github.com/mc-cloud-town/wiki',
          target: '_blank',
        },
      ],
    },
    toc: {
      enable: true,
      links: [
        {
          title: '按個星星給我們吧!!',
          icon: 'lucide:star',
          to: 'https://github.com/mc-cloud-town/wiki',
          target: '_blank',
        },
        {
          title: '問題提交',
          icon: 'lucide:circle-dot',
          to: 'https://github.com/mc-cloud-town/wiki/issues',
          target: '_blank',
        },
      ],
    },
  },
});
