<template>
  <!-- Hidden slot for fetching default slot content -->
  <slot v-if="false" />
  <pre v-show="rendered" ref="el" class="not-prose">
    {{ mermaidSyntax }}
  </pre>
</template>

<script setup>
// edit from: https://gitlab.com/dokos/documentation/-/blob/main/components/content/Mermaid.vue

import { nodeTextContent } from '@nuxtjs/mdc/runtime/utils/node';

const el = ref(null);
const rendered = ref(false);
const rerenderCounter = ref(0);
const slots = useSlots();

// Compute Mermaid syntax from slot
const mermaidSyntax = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  rerenderCounter.value; // trigger re-compute

  const defaultSlot = slots.default?.()[0];
  if (!defaultSlot) return '';

  if (typeof defaultSlot.children === 'string') return defaultSlot.children;

  const codeChild = defaultSlot.children?.default?.()[0];
  if (!codeChild || codeChild.type !== 'code') return '';

  return typeof codeChild.children === 'string'
    ? codeChild.children
    : nodeTextContent(codeChild.children);
});

// Render Mermaid diagram
const renderMermaid = async () => {
  if (!el.value || el.value.querySelector('svg')) return;

  // Remove comment nodes
  Array.from(el.value.childNodes)
    .filter((node) => node.nodeType === Node.COMMENT_NODE)
    .forEach((node) => el.value.removeChild(node));

  const { default: mermaid } = await import('mermaid');
  el.value.classList.add('mermaid');
  rendered.value = true;

  await mermaid.run({ nodes: [el.value] });
};

onBeforeUpdate(() => rerenderCounter.value++);
onMounted(renderMermaid);
watch(mermaidSyntax, renderMermaid);
</script>
