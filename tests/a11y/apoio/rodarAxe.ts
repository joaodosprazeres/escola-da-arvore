/**
 * Roda o `axe-core` sobre o `document` renderizado e falha o teste com a lista legível de
 * violações — WCAG 2.1 AA é a régua (Princípio VII; FR-043 a FR-046; SC-006, SC-007).
 */
import axe from 'axe-core';
import { expect } from 'vitest';

export async function rodarAxe(): Promise<void> {
  const resultado = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  });

  const mensagens = resultado.violations.map(
    (violacao) =>
      `${violacao.id} (${violacao.impact ?? 'desconhecido'}): ${violacao.help} — ${violacao.nodes
        .map((no) => no.target.join(' '))
        .join('; ')}`,
  );

  expect(mensagens, mensagens.join('\n')).toHaveLength(0);
}
