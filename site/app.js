/* A static archive: no account, external fonts, or client-side API credentials. */
'use strict';
const $ = (selector) => document.querySelector(selector);
const icons = {
  bookmark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
};
const state = { archive: null, date: '', query: '', topic: '', savedOnly: false, compact: false };
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function readStore(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    return new Set(Array.isArray(data) ? data.filter((v) => typeof v === 'string') : []);
  } catch { return new Set(); }
}
const saved = readStore('daily-arxiv:saved:v1');
const read = readStore('daily-arxiv:read:v1');
function persist(key, set) {
  try { localStorage.setItem(key, JSON.stringify([...set])); return true; }
  catch { toast('Your browser could not save this change. It will last for this visit.'); return false; }
}
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { $('#toast').hidden = true; }, 2800);
}
function formatDate(date, options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
}
function math(element) {
  if (!window.renderMathInElement) return;
  renderMathInElement(element, {
    delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false, trust: false, strict: 'ignore', maxExpand: 1000,
  });
}
function markdown(element, text) {
  // Keep TeX delimiters intact through Markdown's backslash processing.
  const equations = [];
  const protectedText = text.replace(/\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g, (equation) => {
    equations.push(equation); return 'ARXIVMATHPLACEHOLDER' + (equations.length - 1) + 'END';
  });
  const parsed = marked.parse(protectedText, { breaks: false, gfm: true });
  const template = document.createElement('template');
  template.innerHTML = parsed;
  // Imported notes are content, not executable HTML. Restrict markup and links.
  const allowed = new Set(['P', 'STRONG', 'EM', 'A', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'CODE', 'PRE', 'BR', 'HR', 'H4', 'H5', 'H6', 'DEL', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD']);
  for (const node of [...template.content.querySelectorAll('*')]) {
    if (!allowed.has(node.tagName)) {
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH'].includes(node.tagName)) node.remove();
      else node.replaceWith(...node.childNodes);
      continue;
    }
    const href = node.tagName === 'A' ? node.getAttribute('href') : null;
    for (const attribute of [...node.attributes]) node.removeAttribute(attribute.name);
    if (href && /^https:\/\//i.test(href)) {
      node.setAttribute('href', href); node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener noreferrer');
    }
  }
  element.replaceChildren(template.content);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) node.textContent = node.textContent.replace(/ARXIVMATHPLACEHOLDER(\d+)END/g, (_, index) => equations[Number(index)] || '');
  math(element);
}
function currentDay() { return state.archive.days.find((day) => day.date === state.date) || state.archive.days[0]; }
function isArchiveSearch() { return Boolean(state.query || state.topic || state.savedOnly); }
function syncHash(paperRank) {
  const params = new URLSearchParams();
  params.set('date', state.date);
  if (state.query) params.set('q', state.query);
  if (state.topic) params.set('topic', state.topic);
  if (state.savedOnly) params.set('saved', '1');
  if (paperRank) params.set('paper', paperRank);
  history.replaceState(null, '', '#' + params.toString());
}
function applyHash() {
  if (!state.archive) return;
  const params = new URLSearchParams(location.hash.slice(1));
  state.date = state.archive.days.some((d) => d.date === params.get('date')) ? params.get('date') : state.archive.days[0].date;
  state.query = params.get('q') || '';
  state.topic = state.archive.topics.includes(params.get('topic')) ? params.get('topic') : '';
  state.savedOnly = params.get('saved') === '1';
  $('#search-input').value = state.query;
  render();
  const rank = Number(params.get('paper'));
  if (rank >= 1 && rank <= 10) openPaper(state.date, rank);
}
function selectDate(date) {
  state.date = date; state.query = ''; state.topic = ''; state.savedOnly = false;
  $('#search-input').value = ''; syncHash(); render();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function renderArchive() {
  const days = state.archive.days;
  $('#archive-count').textContent = days.length + (days.length === 1 ? ' day' : ' days');
  let month = '';
  $('#archive-list').innerHTML = days.map((day) => {
    const thisMonth = day.date.slice(0, 7);
    let heading = '';
    if (thisMonth !== month) { month = thisMonth; heading = '<div class="archive-month">' + formatDate(day.date, { month: 'long', year: 'numeric' }) + '</div>'; }
    return heading + '<button class="archive-day' + (state.date === day.date && !isArchiveSearch() ? ' active' : '') + '" data-date="' + day.date + '" aria-label="Open arXiv-' + day.date + '"' + (state.date === day.date && !isArchiveSearch() ? ' aria-current="date"' : '') + '><span><span class="day-number">' + day.date.slice(-2) + '</span>' + formatDate(day.date, { weekday: 'short' }) + '</span><span class="archive-paper-count">' + day.papers.length + ' papers</span></button>';
  }).join('');
  $('#date-select').innerHTML = days.map((day) => '<option value="' + day.date + '">' + day.title + (day === days[0] ? ' · latest' : '') + '</option>').join('');
  $('#date-select').value = state.date;
}
function renderTopics() {
  const topics = ['', ...state.archive.topics];
  $('#topic-filters').innerHTML = topics.map((topic) => '<button class="topic-chip" data-topic="' + escapeHTML(topic) + '" aria-pressed="' + (state.topic === topic) + '">' + escapeHTML(topic || 'All topics') + '</button>').join('');
}
function matches(paper) {
  if (state.savedOnly && !saved.has(paper.id)) return false;
  if (state.topic && !paper.topics.includes(state.topic)) return false;
  if (state.query) {
    const haystack = [paper.id, paper.title, paper.authors, paper.summary, paper.background, paper.why, ...paper.topics].join(' ').toLowerCase();
    if (!state.query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word))) return false;
  }
  return true;
}
function renderPaper(day, paper) {
  const label = day.title + ' — Item ' + paper.rank;
  const key = day.date + ':' + paper.id;
  const card = document.createElement('article');
  card.className = 'paper-card' + (read.has(key) ? ' is-read' : '');
  card.id = 'paper-' + day.date + '-' + paper.rank;
  card.dataset.date = day.date; card.dataset.rank = paper.rank; card.dataset.id = paper.id;
  card.innerHTML = '<div class="paper-header"><span class="paper-rank">' + String(paper.rank).padStart(2, '0') + '</span><div class="paper-content"><div class="paper-label-row"><span class="paper-label">' + label + '</span><button class="bookmark-button" aria-label="' + (saved.has(paper.id) ? 'Unsave' : 'Save') + ' item ' + paper.rank + '" aria-pressed="' + saved.has(paper.id) + '" data-action="save">' + icons.bookmark + '</button></div><h3></h3><p class="authors"></p><div class="paper-tags"></div></div></div><details class="paper-detail"' + (!state.compact ? ' open' : '') + '><summary><span class="collapsed-label">Read the briefing</span><span class="expanded-label">Close briefing</span></summary><h4 class="section-label">SUMMARY</h4><div class="prose paper-summary"></div><section class="background-note"><h4 class="section-label">BACKGROUND & MOTIVATION</h4><div class="prose paper-background"></div></section><section class="why-note"><h4 class="section-label">WHY IT MATTERS FOR YOU</h4><div class="prose paper-why"></div></section><div class="paper-footer"><div class="paper-links"><a href="' + paper.url + '" target="_blank" rel="noopener noreferrer">Read on arXiv ' + icons.arrow + '</a><a class="secondary" href="https://arxiv.org/pdf/' + paper.id + '" target="_blank" rel="noopener noreferrer">PDF ' + icons.arrow + '</a><a class="secondary permalink" href="#date=' + day.date + '&paper=' + paper.rank + '" aria-label="Link to ' + label + '">Link</a></div><button class="read-button" aria-pressed="' + read.has(key) + '" data-action="read">' + icons.check + '<span>' + (read.has(key) ? 'Read' : 'Mark as read') + '</span></button></div></details>';
  card.querySelector('h3').textContent = paper.title; math(card.querySelector('h3'));
  card.querySelector('.authors').textContent = (paper.authors ? paper.authors + '  ·  ' : '') + 'arXiv:' + paper.id;
  card.querySelector('.paper-tags').innerHTML = '<span class="priority-tag">' + escapeHTML(paper.priority) + '</span>' + paper.topics.slice(0, 3).map((topic) => '<span class="paper-tag">' + escapeHTML(topic) + '</span>').join('');
  markdown(card.querySelector('.paper-summary'), paper.summary);
  markdown(card.querySelector('.paper-background'), paper.background);
  markdown(card.querySelector('.paper-why'), paper.why);
  return card;
}
function render() {
  const day = currentDay();
  const filtering = isArchiveSearch();
  const results = (filtering ? state.archive.days : [day]).flatMap((d) => d.papers.filter(matches).map((paper) => ({ day: d, paper })));
  document.title = (state.savedOnly ? 'Saved papers' : filtering ? 'Search the archive' : day.title) + ' · daily-arXiv';
  $('#page-title').textContent = state.savedOnly ? 'Ideas to come back to.' : filtering ? 'Follow your curiosity.' : day.title;
  $('#digest-kicker').textContent = state.savedOnly ? 'YOUR PERSONAL READING SHELF' : filtering ? 'EXPLORE THE ARCHIVE' : 'YOUR PERSONAL RESEARCH BRIEFING';
  $('#date-subtitle').textContent = filtering ? 'Across ' + state.archive.days.length + ' archived selection' + (state.archive.days.length === 1 ? '' : 's') : formatDate(day.date) + ' · ' + (day === state.archive.days[0] ? 'Latest selection' : 'From the archive');
  $('#hero-description').textContent = state.savedOnly ? 'Keep the ideas that caught your attention. Pick up where you left off.' : filtering ? 'Find a familiar concept, an unfamiliar connection, or your next deep dive.' : 'Ten papers. A wider perspective. Selected for the physics behind the result.';
  $('#paper-total').textContent = results.length + (results.length === 1 ? ' paper' : ' papers');
  $('#source-label').textContent = 'Summary · Background · Why it matters';
  $('#latest-button').classList.toggle('active', !state.savedOnly);
  $('#latest-button').setAttribute('aria-pressed', !state.savedOnly);
  $('#saved-button').classList.toggle('active', state.savedOnly);
  $('#saved-button').setAttribute('aria-pressed', state.savedOnly);
  $('#saved-count').textContent = String(saved.size);
  $('#reading-plan').hidden = filtering;
  const order = day.reading_order;
  $('#top-three').textContent = order.slice(0, 3).join(', ').replace(/, ([^,]*)$/, ' & $1');
  $('#reading-order').innerHTML = order.map((rank, i) => (i ? '<span aria-hidden="true">→</span>' : '') + '<a href="#date=' + day.date + '&paper=' + rank + '" data-rank="' + rank + '" aria-label="Jump to item ' + rank + '">' + rank + '</a>').join('');
  $('#results-title').textContent = state.savedOnly ? 'Your saved papers' : filtering ? 'Matching papers' : 'The selection';
  $('#results-count').textContent = filtering ? results.length + ' found' : 'Ranked by relevance';
  $('#clear-filters').hidden = !filtering;
  $('#papers').replaceChildren(...results.map(({ day: d, paper }) => renderPaper(d, paper)));
  if (!results.length) {
    $('#papers').innerHTML = '<div class="empty-state"><h3>' + (state.savedOnly && !state.query && !state.topic ? 'Leave a bookmark for later.' : 'No papers match just yet.') + '</h3><p>' + (state.savedOnly ? 'Use the bookmark on any paper to keep it on your reading shelf.' : 'Try another concept, author, or topic. Search covers summaries and background, too.') + '</p><button class="text-button" data-action="reset">Browse the latest selection →</button></div>';
  }
  $('#day-notes').hidden = filtering || !day.notes;
  if (!filtering && day.notes) markdown($('#day-notes-content'), day.notes);
  const index = state.archive.days.indexOf(day);
  $('#day-navigation').hidden = filtering || state.archive.days.length < 2;
  $('#previous-day').disabled = index === state.archive.days.length - 1;
  $('#next-day').disabled = index === 0;
  $('#archive-status').textContent = 'Latest entry: ' + state.archive.days[0].date + ' · Imported from a ChatGPT selection';
  renderArchive(); renderTopics();
}
function openPaper(date, rank) {
  const element = document.getElementById('paper-' + date + '-' + rank);
  if (!element) return;
  element.querySelector('details').open = true;
  element.scrollIntoView({ block: 'start', behavior: 'instant' });
}
function reset() { selectDate(state.archive.days[0].date); }
$('#archive-list').addEventListener('click', (event) => { const button = event.target.closest('[data-date]'); if (button) selectDate(button.dataset.date); });
$('#date-select').addEventListener('change', (event) => selectDate(event.target.value));
$('#latest-button').addEventListener('click', () => { if (state.archive) reset(); });
$('#saved-button').addEventListener('click', () => { if (!state.archive) return; state.savedOnly = !state.savedOnly; state.query = ''; state.topic = ''; $('#search-input').value = ''; syncHash(); render(); });
$('#topic-filters').addEventListener('click', (event) => { const button = event.target.closest('[data-topic]'); if (button) { state.topic = button.dataset.topic; syncHash(); render(); } });
let searchTimer;
$('#search-input').addEventListener('input', (event) => { clearTimeout(searchTimer); state.query = event.target.value.trim(); searchTimer = setTimeout(() => { if (state.archive) { syncHash(); render(); } }, 180); });
$('#clear-filters').addEventListener('click', reset);
$('#view-button').addEventListener('click', () => {
  state.compact = !state.compact;
  $('#view-button').setAttribute('aria-pressed', state.compact);
  $('#view-button span').textContent = state.compact ? 'Reading view' : 'Compact view';
  for (const details of document.querySelectorAll('.paper-detail')) details.open = !state.compact;
});
$('#reading-order').addEventListener('click', (event) => { const link = event.target.closest('[data-rank]'); if (link) { event.preventDefault(); syncHash(link.dataset.rank); openPaper(state.date, Number(link.dataset.rank)); } });
$('#papers').addEventListener('click', (event) => {
  if (event.target.closest('[data-action="reset"]')) { reset(); return; }
  const card = event.target.closest('.paper-card');
  if (!card) return;
  const button = event.target.closest('[data-action]');
  if (button?.dataset.action === 'save') {
    const id = card.dataset.id;
    saved.has(id) ? saved.delete(id) : saved.add(id);
    const stored = persist('daily-arxiv:saved:v1', saved);
    $('#saved-count').textContent = String(saved.size);
    button.setAttribute('aria-pressed', saved.has(id));
    button.setAttribute('aria-label', (saved.has(id) ? 'Unsave' : 'Save') + ' item ' + card.dataset.rank);
    if (stored) toast(saved.has(id) ? 'Saved to your reading shelf' : 'Removed from saved papers');
    if (state.savedOnly) render();
  } else if (button?.dataset.action === 'read') {
    const key = card.dataset.date + ':' + card.dataset.id;
    read.has(key) ? read.delete(key) : read.add(key);
    persist('daily-arxiv:read:v1', read);
    button.setAttribute('aria-pressed', read.has(key)); button.querySelector('span').textContent = read.has(key) ? 'Read' : 'Mark as read'; card.classList.toggle('is-read', read.has(key));
  }
  const link = event.target.closest('.permalink');
  if (link) { event.preventDefault(); selectDate(card.dataset.date); syncHash(card.dataset.rank); openPaper(card.dataset.date, Number(card.dataset.rank)); }
});
$('#previous-day').addEventListener('click', () => { const i = state.archive.days.indexOf(currentDay()); if (state.archive.days[i + 1]) selectDate(state.archive.days[i + 1].date); });
$('#next-day').addEventListener('click', () => { const i = state.archive.days.indexOf(currentDay()); if (state.archive.days[i - 1]) selectDate(state.archive.days[i - 1].date); });
$('#preferences-button').addEventListener('click', () => $('#preferences-dialog').showModal());
$('#close-preferences').addEventListener('click', () => $('#preferences-dialog').close());
$('#preferences-dialog').addEventListener('click', (event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close(); } });
document.addEventListener('keydown', (event) => { if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !$('#preferences-dialog').open) { event.preventDefault(); $('#search-input').focus(); } });
window.addEventListener('hashchange', applyHash);
window.addEventListener('beforeprint', () => { document.querySelectorAll('.paper-detail').forEach((details) => { details.dataset.printWasOpen = details.open; details.open = true; }); });
window.addEventListener('afterprint', () => { document.querySelectorAll('.paper-detail').forEach((details) => { details.open = details.dataset.printWasOpen === 'true'; }); });
async function load() {
  try {
    const response = await fetch('./data/archive.json');
    if (!response.ok) throw new Error('Archive response ' + response.status);
    state.archive = await response.json();
    if (!state.archive.days?.length) throw new Error('Archive is empty');
    applyHash();
  } catch (error) {
    console.error(error);
    $('#date-subtitle').textContent = 'The archive could not be loaded.';
    $('#papers').innerHTML = '<div class="empty-state"><h3>A brief interruption.</h3><p>Check your connection and reload to try again.</p><button class="text-button" id="retry-button">Try again →</button></div>';
    $('#retry-button').addEventListener('click', load);
    $('#reading-plan').hidden = true;
  }
  try {
    const response = await fetch('./data/preferences.json');
    if (!response.ok) throw new Error('Preferences unavailable');
    const preferences = await response.json();
    $('#preferences-content').innerHTML = '<h3>Make room for</h3><div class="preference-tags">' + preferences.prioritize.map((topic) => '<span>' + escapeHTML(topic) + '</span>').join('') + '</div><h3>Keep outside the frame</h3><ul>' + preferences.exclude.map((topic) => '<li>' + escapeHTML(topic) + '</li>').join('') + '</ul><h3>Stay curious</h3><ul>' + preferences.principles.map((principle) => '<li>' + escapeHTML(principle) + '</li>').join('') + '</ul>';
  } catch { $('#preferences-content').textContent = 'Selection preferences could not be loaded. Please reload to try again.'; }
}
load();
