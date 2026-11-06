/* One Feed - real client-side aggregator: Bluesky (api.bsky.app, no auth) + Mastodon (public timelines, no auth). */
'use strict';

const BSKY = 'https://api.bsky.app/xrpc';
const HOT_FEED = 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot';
const MASTO_INSTANCE = 'mastodon.world';

const DEFAULT_SOURCES = {
  bsky: ['theverge.com', 'techcrunch.com', 'wired.com'],
  mastoTags: ['photography', 'technology'],
  mastoAccounts: []
};
const LS_SOURCES = 'onefeed.sources', LS_SAVED = 'onefeed.saved', LS_MOMENTS = 'onefeed.moments';

const ICONS = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  saved: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  sources: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
  moments: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  about: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  repost: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>',
  external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>'
};

const $ = s => document.querySelector(s);
const feed = $('#feed'), feedStatus = $('#feed-status');
let state = { tab: 'foryou', posts: [], loading: false, query: null };
let sources = load(LS_SOURCES, DEFAULT_SOURCES);
let saved = load(LS_SAVED, []);
let moments = load(LS_MOMENTS, []);

function load(k, dflt) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? structuredClone(dflt); } catch { return structuredClone(dflt); } }
function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function stripHtml(h) { const d = document.createElement('div'); d.innerHTML = String(h).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n'); return (d.textContent || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(); }
function relTime(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h'; return Math.floor(s / 86400) + 'd';
}
async function getJson(url, ms = 12000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

/* ---------- normalizers ---------- */
function normBsky(p) {
  const rec = p.record || {};
  let img = null;
  const em = p.embed;
  const imgs = em?.images || em?.media?.images;
  if (imgs && imgs.length) img = imgs[0].thumb || imgs[0].fullsize;
  else if (em?.external?.thumb) img = em.external.thumb;
  const rkey = (p.uri || '').split('/').pop();
  return {
    id: p.uri, source: 'bsky',
    name: p.author?.displayName || p.author?.handle || '', handle: '@' + (p.author?.handle || ''),
    avatar: p.author?.avatar || '', text: rec.text || '', img,
    mediaType: (em?.$type || '').includes('video') ? 'video' : (img ? 'image' : null),
    likes: p.likeCount || 0, replies: p.replyCount || 0, reposts: p.repostCount || 0,
    ts: rec.createdAt || p.indexedAt,
    url: p.author ? `https://bsky.app/profile/${p.author.handle}/post/${rkey}` : 'https://bsky.app',
    cw: '', sensitive: !!(p.labels || []).some(l => ['porn', 'sexual', 'graphic-media', 'nudity'].includes(l.val))
  };
}
function normMasto(s) {
  const img = (s.media_attachments || []).find(m => m.type === 'image' || m.type === 'gifv' || m.type === 'video');
  return {
    id: 'masto:' + s.id, source: 'masto',
    name: s.account?.display_name || s.account?.acct || '', handle: '@' + (s.account?.acct || ''),
    avatar: s.account?.avatar || '', text: stripHtml(s.content || ''),
    img: img ? (img.preview_url || img.url) : null, mediaType: img ? img.type : null,
    likes: s.favourites_count || 0, replies: s.replies_count || 0, reposts: s.reblogs_count || 0,
    ts: s.created_at, url: s.url || 'https://' + MASTO_INSTANCE,
    cw: s.spoiler_text || '', sensitive: !!s.sensitive
  };
}

/* ---------- fetchers (each returns {posts, error}) ---------- */
async function fBskyHot() {
  try { const d = await getJson(`${BSKY}/app.bsky.feed.getFeed?feed=${encodeURIComponent(HOT_FEED)}&limit=30`); return { posts: (d.feed || []).map(x => normBsky(x.post)) }; }
  catch (e) { return { posts: [], error: 'Bluesky feed: ' + e.message }; }
}
async function fBskyAuthor(h) {
  try { const d = await getJson(`${BSKY}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(h)}&limit=15&filter=posts_no_replies`); return { posts: (d.feed || []).map(x => normBsky(x.post)) }; }
  catch (e) { return { posts: [], error: `Bluesky @${h}: ` + e.message }; }
}
async function fBskySearch(q) {
  try { const d = await getJson(`${BSKY}/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&limit=25&sort=top`); return { posts: (d.posts || []).map(normBsky) }; }
  catch (e) { return { posts: [], error: 'Bluesky search: ' + e.message }; }
}
async function fMastoTag(t) {
  try { const d = await getJson(`https://${MASTO_INSTANCE}/api/v1/timelines/tag/${encodeURIComponent(t)}?limit=15`); return { posts: (d || []).map(normMasto) }; }
  catch (e) { return { posts: [], error: `Mastodon #${t}: ` + e.message }; }
}
async function fMastoAccount(acct) {
  try {
    const a = await getJson(`https://${MASTO_INSTANCE}/api/v1/accounts/lookup?acct=${encodeURIComponent(acct)}`);
    const d = await getJson(`https://${MASTO_INSTANCE}/api/v1/accounts/${a.id}/statuses?limit=15&exclude_replies=true`);
    return { posts: (d || []).map(normMasto) };
  } catch (e) { return { posts: [], error: `Mastodon @${acct}: ` + e.message }; }
}
async function fMastoSearch(q) {
  try {
    const d = await getJson(`https://${MASTO_INSTANCE}/api/v2/search?q=${encodeURIComponent(q)}&type=statuses&limit=15`);
    return { posts: (d.statuses || []).map(normMasto) };
  } catch (e) { return { posts: [], error: 'Mastodon search: ' + e.message }; }
}

/* ---------- load & render ---------- */
async function loadFeed() {
  if (state.loading) return;
  state.loading = true; $('#btn-refresh').classList.add('spin');
  feedStatus.textContent = 'Loading live posts...';
  let jobs = [], errors = [];
  if (state.query) {
    jobs.push(fBskySearch(state.query), fMastoSearch(state.query));
  } else if (state.tab === 'foryou') {
    jobs.push(fBskyHot());
    sources.mastoTags.forEach(t => jobs.push(fMastoTag(t)));
  } else {
    sources.bsky.forEach(h => jobs.push(fBskyAuthor(h)));
    sources.mastoAccounts.forEach(a => jobs.push(fMastoAccount(a)));
    if (!jobs.length) jobs.push(fBskyHot());
  }
  const results = await Promise.all(jobs);
  let posts = [];
  results.forEach(r => { posts = posts.concat(r.posts); if (r.error) errors.push(r.error); });
  const seen = new Set();
  posts = posts.filter(p => p.text && !seen.has(p.id) && seen.add(p.id));
  posts.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  state.posts = posts; state.loading = false;
  $('#btn-refresh').classList.remove('spin');
  feedStatus.textContent = '';
  renderFeed(errors);
}

function renderFeed(errors = []) {
  if (!state.posts.length) {
    feed.innerHTML = `<div class="status-card"><b>No posts loaded.</b><br>${errors.length ? esc(errors.join('<br>')) : 'Check your connection and tap refresh.'}</div>`;
    return;
  }
  feed.innerHTML = state.posts.map((p, i) => {
    const long = p.text.length > 220;
    const blurred = p.sensitive && p.img;
    return `
  <section class="scene" data-url="${esc(p.url)}">
    ${p.img ? `<div class="scene-bg ${blurred ? 'blur-media' : ''}" data-bg="${i}" style="background-image:url('${esc(p.img)}')"></div>` : ''}
    ${blurred ? `<div class="sensitive-wrap"><button class="reveal-btn" data-reveal="${i}">Sensitive media - tap to show</button></div>` : ''}
    <div class="scene-scrim"></div>
    <button class="save-fab ${isSaved(p.id) ? 'saved' : ''}" data-save="${i}" aria-label="Save post">${ICONS.saved}</button>
    <div class="scene-content">
      <div class="kicker">${p.source === 'bsky' ? 'Bluesky' : 'Mastodon'} · ${p.mediaType === 'video' || p.mediaType === 'gifv' ? 'Video' : p.img ? 'Photo' : 'Post'}</div>
      ${p.cw ? `<div class="cw-banner">Content warning: ${esc(p.cw)}</div>` : ''}
      <div class="scene-text ${long ? 'long' : ''} ${p.cw ? 'cw-body hidden-cw' : ''}" data-cwbody="${i}">${esc(p.text.length > 500 ? p.text.slice(0, 500) + '...' : p.text)}</div>
      ${p.cw ? `<button class="reveal-btn" data-cwbtn="${i}">Show post</button>` : ''}
      <button class="more-btn" data-more="${i}" hidden>Read more</button>
      <div class="card-meta">
        ${p.avatar ? `<img class="avatar" loading="lazy" src="${esc(p.avatar)}" alt="" onerror="this.remove()">` : ''}
        <div class="who"><div class="nm">${esc(p.name)}</div><div class="hd">${esc(p.handle)}</div></div>
        <span class="src ${p.source}">${p.source === 'bsky' ? 'Bluesky' : 'Mastodon'}</span>
      </div>
      <div class="stats">
        <span class="stat">${ICONS.comment}${p.replies}</span>
        <span class="stat">${ICONS.repost}${p.reposts}</span>
        <span class="stat">${ICONS.heart}${p.likes}</span>
        <span class="stat" style="margin-left:2px">${relTime(p.ts)}</span>
        <span class="open-chip">${(p.mediaType === 'video' || p.mediaType === 'gifv') ? 'Open video' : 'Open post'} ${ICONS.external}</span>
      </div>
    </div>
  </section>`;
  }).join('');
  requestAnimationFrame(() => feed.querySelectorAll('.scene-text').forEach(el => {
    const btn = feed.querySelector(`[data-more="${el.dataset.cwbody}"]`);
    if (btn && el.scrollHeight > el.clientHeight + 4) btn.hidden = false;
  }));
}
feed.addEventListener('click', e => {
  const sb = e.target.closest('.save-fab');
  if (sb) { toggleSave(state.posts[+sb.dataset.save], sb); return; }
  const rv = e.target.closest('[data-reveal]');
  if (rv) { feed.querySelector(`[data-bg="${rv.dataset.reveal}"]`).classList.remove('blur-media'); rv.closest('.sensitive-wrap').remove(); return; }
  const cw = e.target.closest('[data-cwbtn]');
  if (cw) { feed.querySelector(`[data-cwbody="${cw.dataset.cwbtn}"]`).classList.remove('hidden-cw'); cw.remove(); return; }
  const mr = e.target.closest('[data-more]');
  if (mr) { openSheet('post', +mr.dataset.more); return; }
  const scene = e.target.closest('.scene');
  if (scene && scene.dataset.url) window.open(scene.dataset.url, '_blank', 'noopener');
});
function isSaved(id) { return saved.some(s => s.id === id); }
function toggleSave(p, btn) {
  if (isSaved(p.id)) saved = saved.filter(s => s.id !== p.id);
  else saved.unshift({ id: p.id, text: p.text, name: p.name, handle: p.handle, img: p.img, url: p.url, source: p.source, ts: Date.now() });
  saved = saved.slice(0, 100); store(LS_SAVED, saved);
  btn.classList.toggle('saved', isSaved(p.id));
}

/* ---------- tabs / refresh / dock ---------- */
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  t.classList.add('active'); state.tab = t.dataset.tab; state.query = null; loadFeed();
}));
$('#btn-refresh').addEventListener('click', loadFeed);
$('#btn-search').addEventListener('click', () => openSheet('search'));
$('#btn-search').innerHTML = ICONS.search; $('#btn-refresh').innerHTML = ICONS.refresh; $('#sheet-close').innerHTML = ICONS.close;
document.querySelectorAll('.di-ic').forEach(el => el.innerHTML = ICONS[el.dataset.ic] || '');

const dock = $('#dock'), toggle = $('#dock-toggle');
toggle.addEventListener('click', () => { dock.classList.remove('hidden'); toggle.classList.add('hidden'); });
function closeDock(){ dock.classList.add('hidden'); toggle.classList.remove('hidden'); }
dock.addEventListener('click', e => {
  const b = e.target.closest('.dock-item'); if (!b) return;
  const act = b.dataset.act;
  if (act === 'close') { closeDock(); return; }
  if (act === 'refresh') { closeDock(); loadFeed(); return; }
  if (act === 'camera') { closeDock(); $('#camera-input').click(); return; }
  closeDock(); openSheet(act);
});

/* ---------- sheets ---------- */
function openSheet(kind, arg) {
  $('#sheet-wrap').classList.remove('hidden');
  const T = $('#sheet-title'), B = $('#sheet-body');
  if (kind === 'search') {
    T.textContent = 'Search'; B.innerHTML = `
      <input class="txt-in" id="search-in" placeholder="Search Bluesky and Mastodon..." enterkeyhint="search">
      <div class="note">Live public search. Results replace the feed; pick a tab to go back.</div>`;
    const inp = $('#search-in'); inp.focus();
    inp.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' && inp.value.trim()) {
        state.query = inp.value.trim(); closeSheet(); loadFeed();
      }
    });
  }
  if (kind === 'saved') {
    T.textContent = 'Saved';
    B.innerHTML = saved.length ? saved.map((s, i) => `
      <div class="saved-item" data-url="${esc(s.url)}">
        ${s.img ? `<img src="${esc(s.img)}" alt="" onerror="this.remove()">` : ''}
        <div class="t">${esc(s.text)}<div class="w">${esc(s.name)} · ${esc(s.handle)} · ${s.source === 'bsky' ? 'Bluesky' : 'Mastodon'}</div></div>
        <button class="mini-btn" data-unsave="${i}">Remove</button>
      </div>`).join('') : 'Nothing saved yet. Tap the bookmark on any post.';
    B.querySelectorAll('[data-unsave]').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation(); saved.splice(+b.dataset.unsave, 1); store(LS_SAVED, saved); openSheet('saved'); renderFeed();
    }));
    B.querySelectorAll('.saved-item').forEach(el => el.addEventListener('click', () => window.open(el.dataset.url, '_blank', 'noopener')));
  }
  if (kind === 'sources') {
    T.textContent = 'Sources';
    B.innerHTML = `
      <b>Following tab</b> is built from these sources (kept on this device):
      ${sources.bsky.map((h, i) => `<div class="row"><span class="src-tag bsky">Bluesky</span><span style="flex:1">@${esc(h)}</span><button class="mini-btn" data-del-bsky="${i}">Remove</button></div>`).join('')}
      ${sources.mastoAccounts.map((a, i) => `<div class="row"><span class="src-tag masto">Mastodon</span><span style="flex:1">@${esc(a)}</span><button class="mini-btn" data-del-ma="${i}">Remove</button></div>`).join('')}
      <b>For you topics (Mastodon hashtags)</b>
      ${sources.mastoTags.map((t, i) => `<div class="row"><span class="src-tag masto">Tag</span><span style="flex:1">#${esc(t)}</span><button class="mini-btn" data-del-tag="${i}">Remove</button></div>`).join('')}
      <div style="margin-top:12px"><input class="txt-in" id="src-in" placeholder="Add a source..."></div>
      <div class="note">Formats: <b>bsky:</b>handle.com &nbsp; <b>masto:</b>user@host &nbsp; <b>tag:</b>topic</div>
      <button class="pill-btn" id="src-add">Add source</button>
      <div class="note">Bluesky and Mastodon public content only - no account login needed. YouTube, RSS and Reddit are being verified and are not connected yet.</div>`;
    B.querySelectorAll('[data-del-bsky]').forEach(b => b.addEventListener('click', () => { sources.bsky.splice(+b.dataset.delBsky, 1); store(LS_SOURCES, sources); openSheet('sources'); }));
    B.querySelectorAll('[data-del-ma]').forEach(b => b.addEventListener('click', () => { sources.mastoAccounts.splice(+b.dataset.delMa, 1); store(LS_SOURCES, sources); openSheet('sources'); }));
    B.querySelectorAll('[data-del-tag]').forEach(b => b.addEventListener('click', () => { sources.mastoTags.splice(+b.dataset.delTag, 1); store(LS_SOURCES, sources); openSheet('sources'); }));
    $('#src-add').addEventListener('click', () => {
      const v = $('#src-in').value.trim();
      if (v.startsWith('bsky:')) sources.bsky.push(v.slice(5));
      else if (v.startsWith('masto:')) sources.mastoAccounts.push(v.slice(6));
      else if (v.startsWith('tag:')) sources.mastoTags.push(v.slice(4).replace(/^#/, ''));
      else return;
      store(LS_SOURCES, sources); openSheet('sources');
    });
  }
  if (kind === 'post') {
    const p = state.posts[arg];
    if (!p) return;
    T.textContent = p.name || 'Post';
    B.innerHTML = `<div class="post-full">${esc(p.text)}</div>
      <div class="note" style="margin-top:12px">${esc(p.handle)} \u00b7 ${p.source === 'bsky' ? 'Bluesky' : 'Mastodon'}</div>
      <a class="pill-btn" href="${esc(p.url)}" target="_blank" rel="noopener" style="text-decoration:none">Open original post</a>`;
  }
  if (kind === 'moments') {
    T.textContent = 'Moments';
    B.innerHTML = (moments.length ? `<div class="moments-grid">${moments.map((m, i) => `<img src="${m.data}" data-moment="${i}" alt="">`).join('')}</div>` : 'No photos yet.')
      + `<div class="note">Photos you pick with Camera live here, stored only on this device. Nothing is posted anywhere.</div>
         ${moments.length ? '<button class="pill-btn ghost" id="mom-clear">Clear moments</button>' : ''}`;
    const c = $('#mom-clear'); if (c) c.addEventListener('click', () => { moments = []; store(LS_MOMENTS, moments); openSheet('moments'); });
    B.querySelectorAll('[data-moment]').forEach(img => img.addEventListener('click', () => {
      moments.splice(+img.dataset.moment, 1); store(LS_MOMENTS, moments); openSheet('moments');
    }));
  }
  if (kind === 'about') {
    T.textContent = 'About One Feed';
    B.innerHTML = `
      <b>One Feed</b> combines public posts from <b>Bluesky</b> and <b>Mastodon</b> in one mobile feed - live data, no account needed.<br><br>
      <b>Working now:</b> combined feed, following your chosen sources, live search, saving posts, local photo moments.<br><br>
      <b>Not connected:</b> Instagram, TikTok and X do not offer a free consumer feed API. YouTube, RSS and Reddit are being verified and will appear only when they work end to end.<br><br>
      <b>Privacy:</b> your sources, saves and moments stay in this browser's storage. Nothing is uploaded.`;
  }
}
function closeSheet() { $('#sheet-wrap').classList.add('hidden'); }
$('#sheet-close').addEventListener('click', closeSheet);
$('#sheet-wrap').addEventListener('click', e => { if (e.target.id === 'sheet-wrap') closeSheet(); });

/* ---------- camera -> local moments ---------- */
$('#camera-input').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    const s = Math.min(1, 900 / Math.max(img.width, img.height));
    c.width = img.width * s; c.height = img.height * s;
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    moments.unshift({ data: c.toDataURL('image/jpeg', .8), ts: Date.now() });
    moments = moments.slice(0, 12); store(LS_MOMENTS, moments);
    URL.revokeObjectURL(img.src); openSheet('moments');
  };
  img.src = URL.createObjectURL(f);
  e.target.value = '';
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
loadFeed();

/* test hooks: #dock, #following, #sheet-search|saved|sources|moments|about */
if (location.hash === '#dock') dock.classList.remove('hidden');
if (location.hash === '#following') { setTimeout(() => document.querySelector('[data-tab=following]').click(), 3500); }
if (location.hash.startsWith('#sheet-')) setTimeout(() => openSheet(location.hash.slice(7)), 400);
