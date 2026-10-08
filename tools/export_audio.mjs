// Convert the same canonical export to speech, using deterministic math rules.
import fs from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';
import katex from 'katex';
import sre from 'speech-rule-engine';
globalThis.marked = marked;
await import('../site/reading.js');
const reading = globalThis.DigestReading;
await sre.setupEngine({ locale: 'en', domain: 'mathspeak', style: 'default' });
await sre.engineReady();
function speech(text) {
  return text.replace(reading.mathPattern, (expression) => {
    const delimiter = expression.startsWith('$$') || expression.startsWith('\\[') || expression.startsWith('\\(') ? 2 : 1;
    const rendered = katex.renderToString(expression.slice(delimiter, -delimiter), { output: 'mathml', throwOnError: true, trust: false });
    const mathml = rendered.match(/<math[\s\S]*?<\/math>/)[0].replace(/<annotation\b[\s\S]*?<\/annotation>/g, '');
    const spoken = sre.toSpeech(mathml);
    if (!spoken.trim()) throw new Error('No speech for equation: ' + expression);
    return ' ' + spoken + ' ';
  }).replace(/arXiv:(\d{4})\.(\d{4,5})/g, (_, a, b) => 'arXiv number ' + [...a].join(' ') + ', point, ' + [...b].join(' '))
    .replace(/ → /g, ' then ').replace(/\bQEC\b/g, 'Q E C').replace(/\bQFT\b/g, 'Q F T')
    .replace(/\[\[/g, '[ [').replace(/\]\]/g, '] ]');
}
const [input, output] = process.argv.slice(2);
const days = JSON.parse(await fs.readFile(input, 'utf8'));
await fs.mkdir(output, { recursive: true });
for (const day of days) {
  const spokenDate = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(day.date + 'T12:00:00Z'));
  const items = day.papers.map((paper) => ({ rank: paper.rank, id: paper.id, title: reading.plainText(paper.title),
    text: speech(reading.itemText(day, paper).replace(day.title + ' — Item ' + paper.rank, 'arXiv, ' + spokenDate + '. Item ' + paper.rank + '.')) }));
  const prepared = { date: day.date, title: day.title, version: 1,
    intro: speech('arXiv, ' + spokenDate + '. ' + day.papers.length + ' papers.\n\n' + (day.overview ? 'Overview.\n\n' + reading.plainText(day.overview) : '')),
    items, notes: day.notes ? speech('Notes.\n\n' + reading.plainText(day.notes)) : '' };
  await fs.writeFile(path.join(output, day.date + '.json'), JSON.stringify(prepared, null, 2) + '\n');
}
console.log('Prepared speech text for ' + days.length + ' digests.');
