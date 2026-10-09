// Build a spoken version by replacing verified math, without rewriting prose.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
globalThis.marked = marked;
await import('../site/reading.js');
const reading = globalThis.DigestReading;
const [input, output, scriptFolder = fileURLToPath(new URL('../audio/scripts/', import.meta.url))] = process.argv.slice(2);
const days = JSON.parse(await fs.readFile(input, 'utf8'));
await fs.mkdir(output, { recursive: true });
function pronounce(text, substitutions) {
  return reading.plainText(text).replace(reading.mathPattern, expression => {
    if (!substitutions.has(expression)) throw new Error('Missing English pronunciation: ' + expression);
    return substitutions.get(expression);
  }).replace(/\b(?:QEC|QFT|QLDPC|LDPC|CNOT|CCZ|QCD|SPT|SYK|RG|YM|OTOC)\b/g, word => [...word].join(' '))
    .replace(/\[\[/g, '[ [').replace(/\]\]/g, '] ]');
}
for (const day of days) {
  let script;
  try { script = JSON.parse(await fs.readFile(path.join(scriptFolder, day.date + '.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  if (script.version !== 2 || script.date !== day.date) throw new Error('Invalid dated speech script');
  const substitutions = new Map(script.pronunciations.map(entry => [entry.latex, entry.spoken]));
  const spokenDate = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(day.date + 'T12:00:00Z'));
  const items = day.papers.map(paper => {
    const heading = 'arXiv, ' + spokenDate + '. Item ' + paper.rank + '.\n\n' + pronounce(paper.title, substitutions)
      + '\n\nAuthors: ' + reading.plainText(paper.authors) + '.\n\narXiv number ' + paper.id.split('.').map(part => [...part].join(' ')).join(', point, ');
    const sections = [
      { name: 'heading', text: heading },
      { name: 'summary', text: 'Summary.\n\n' + pronounce(paper.summary, substitutions) },
      { name: 'background', text: 'Background and motivation.\n\n' + pronounce(paper.background, substitutions) },
      { name: 'why', text: 'Why it matters for you.\n\n' + pronounce(paper.why, substitutions) },
    ];
    return { rank: paper.rank, id: paper.id, title: reading.plainText(paper.title), sections,
      text: sections.map(section => section.text).join('\n\n') };
  });
  const prepared = { version: 2, date: day.date, title: day.title, source_hash: script.source_hash,
    section_pause_seconds: 1.5, heading_pause_seconds: 0.5, item_pause_seconds: 1.5,
    items, text: items.map(item => item.text).join('\n\n') };
  await fs.writeFile(path.join(output, day.date + '.json'), JSON.stringify(prepared, null, 2) + '\n');
  await fs.writeFile(path.join(output, day.date + '.txt'), prepared.text + '\n');
}
console.log('Prepared English speech scripts; day audio contains items only.');
