import { stripVTControlCharacters } from 'node:util';
import { counts, list, option, repeat, selectors, stdout, value } from '@cairul/plugin-kit/runner';

function summarize(output) {
  const summary = [...stripVTControlCharacters(output).matchAll(/\d+ tests? run:\s*([^\r\n]+)/g)].at(-1);
  if (!summary) throw new Error('Nextest returned no execution summary.');
  function count(outcome) {
    return Number(new RegExp('\\b(\\d+) ' + outcome + '\\b').exec(summary[1])?.[1] ?? 0);
  }
  return counts(count('passed'), count('failed'), count('skipped'));
}

export default {
  command: ['cargo'],
  select: selectors({ packages: list, binaries: list, names: list, filterset: value }),
  build(select) {
    const { packages, binaries, names, filterset } = select;
    if (binaries?.some((name) => !/^[\w.-]+$/.test(name)))
      throw new Error('Use a filterset for unusual test binary names.');
    const combined = [
      filterset && '(' + filterset + ')',
      binaries && '(' + binaries.map((name) => 'binary(=' + name + ')').join(' | ') + ')',
    ]
      .filter(Boolean)
      .join(' & ');
    return {
      args: [
        'nextest',
        'run',
        ...repeat('--package', packages),
        ...option('-E', combined || undefined),
        ...(names ? ['--', ...names] : []),
      ],
      capture: 'combined',
      read: stdout(summarize),
    };
  },
};
