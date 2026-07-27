const contentEl = document.querySelector('#content');
const tocEl = document.querySelector('#toc');
const searchInput = document.querySelector('#searchInput');
const searchMeta = document.querySelector('#searchMeta');
const emptyState = document.querySelector('#emptyState');
const sectionCount = document.querySelector('#sectionCount');
const themeToggle = document.querySelector('#themeToggle');
const menuToggle = document.querySelector('#menuToggle');

const slugify = (text) => text
  .toLowerCase()
  .trim()
  .replace(/<[^>]*>/g, '')
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-');

function configureMarked() {
  const renderer = new marked.Renderer();
  renderer.heading = ({ text, depth }) => {
    const id = slugify(text);
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };
  marked.setOptions({ renderer, gfm: true, breaks: false });
}

function wrapSections() {
  const nodes = [...contentEl.childNodes];
  let current = null;
  const fragment = document.createDocumentFragment();

  nodes.forEach((node) => {
    if (node.nodeType === 1 && /^H[23]$/.test(node.tagName)) {
      current = document.createElement('section');
      current.dataset.search = node.textContent.toLowerCase();
      fragment.appendChild(current);
    }
    if (!current) {
      current = document.createElement('section');
      fragment.appendChild(current);
    }
    current.appendChild(node);
  });

  contentEl.replaceChildren(fragment);
  [...contentEl.querySelectorAll('section')].forEach((section) => {
    section.dataset.search = section.textContent.toLowerCase();
  });
}

function buildToc() {
  const headings = [...contentEl.querySelectorAll('h2, h3')];
  tocEl.innerHTML = headings.map((heading) => {
    const level = heading.tagName === 'H3' ? 'level-3' : 'level-2';
    return `<a class="${level}" href="#${heading.id}">${heading.textContent}</a>`;
  }).join('');
  sectionCount.textContent = headings.length.toLocaleString();
  searchMeta.textContent = `${headings.length.toLocaleString()} sections indexed`;
}

function filterSections(query) {
  const normalized = query.trim().toLowerCase();
  const sections = [...contentEl.querySelectorAll('section')];
  let visible = 0;

  sections.forEach((section, index) => {
    const matches = !normalized || section.dataset.search.includes(normalized) || index === 0;
    section.classList.toggle('search-hidden', !matches);
    if (matches && index !== 0) visible += 1;
  });

  emptyState.hidden = visible > 0 || !normalized;
  searchMeta.textContent = normalized
    ? `${visible.toLocaleString()} matching sections`
    : `${(sections.length - 1).toLocaleString()} sections indexed`;
}

function observeHeadings() {
  const links = new Map([...tocEl.querySelectorAll('a')].map((link) => [link.hash.slice(1), link]));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      tocEl.querySelectorAll('a').forEach((link) => link.classList.remove('active'));
      links.get(entry.target.id)?.classList.add('active');
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  contentEl.querySelectorAll('h2, h3').forEach((heading) => observer.observe(heading));
}

async function loadArchive() {
  try {
    configureMarked();
    const response = await fetch('readme.md', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = await response.text();
    contentEl.innerHTML = marked.parse(markdown);
    contentEl.querySelectorAll('a[href^="http"]').forEach((link) => {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });
    wrapSections();
    buildToc();
    observeHeadings();
  } catch (error) {
    contentEl.innerHTML = `<div class="empty-state"><strong>Archive could not be loaded</strong><span>${error.message}</span></div>`;
    searchMeta.textContent = 'Load error';
  }
}

searchInput.addEventListener('input', (event) => filterSections(event.target.value));
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === 'Escape') {
    searchInput.value = '';
    filterSections('');
    searchInput.blur();
  }
});

themeToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('light');
  localStorage.setItem('archive-theme', document.documentElement.classList.contains('light') ? 'light' : 'dark');
});

menuToggle.addEventListener('click', () => tocEl.classList.toggle('open'));
tocEl.addEventListener('click', () => tocEl.classList.remove('open'));

if (localStorage.getItem('archive-theme') === 'light') {
  document.documentElement.classList.add('light');
}

loadArchive();
