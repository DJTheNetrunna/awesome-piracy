const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const elements = {
  body: document.body,
  content: $('#content'),
  toc: $('#toc'),
  search: $('#searchInput'),
  searchMeta: $('#searchMeta'),
  empty: $('#emptyState'),
  sectionCount: $('#sectionCount'),
  metricSections: $('#metricSections'),
  metricLinks: $('#metricLinks'),
  resultCount: $('#resultCount'),
  categoryGrid: $('#categoryGrid'),
  themeToggle: $('#themeToggle'),
  menuToggle: $('#menuToggle'),
  enterArchive: $('#enterArchive'),
  boot: $('#bootScreen'),
  bootLine: $('#bootLine'),
  bootProgress: $('#bootProgress'),
  clock: $('#systemClock'),
  scrollProgress: $('#scrollProgress'),
  cursorOrb: $('#cursorOrb'),
  commandButton: $('#commandButton'),
  commandPalette: $('#commandPalette'),
  commandInput: $('#commandInput'),
  commandResults: $('#commandResults'),
  canvas: $('#signalCanvas')
};

const state = {
  headings: [],
  sections: [],
  commandIndex: -1,
  slugCounts: new Map()
};

const accents = ['#ff3d5e', '#d8ff3e', '#8a5cff', '#4be7ff', '#ff8a3d', '#ff4da3'];
const glyphs = ['◈', '⌁', '∆', '◎', '⌘', '◇', '⟁', '◉', '⎔', '⌬', '◫', '⟟'];

function slugify(text) {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/&[^;]+;/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') || 'sector';
  const count = state.slugCounts.get(base) || 0;
  state.slugCounts.set(base, count + 1);
  return count ? `${base}-${count + 1}` : base;
}

function configureMarked() {
  const renderer = new marked.Renderer();
  renderer.heading = ({ text, depth }) => `<h${depth} id="${slugify(text)}">${text}</h${depth}>`;
  marked.setOptions({ renderer, gfm: true, breaks: false });
}

function runBootSequence() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || sessionStorage.getItem('black-flag-booted')) {
    elements.boot.classList.add('done');
    return;
  }

  elements.body.classList.add('booting');
  const phases = [
    ['INITIALIZING ARCHIVE NODE', 18],
    ['MAPPING REPOSITORY SECTORS', 42],
    ['VERIFYING SIGNAL PATHS', 68],
    ['ESTABLISHING BLACK FLAG LINK', 88],
    ['ARCHIVE NODE ONLINE', 100]
  ];

  phases.forEach(([label, progress], index) => {
    window.setTimeout(() => {
      elements.bootLine.textContent = label;
      elements.bootProgress.style.width = `${progress}%`;
    }, 320 * index);
  });

  window.setTimeout(() => {
    elements.boot.classList.add('done');
    elements.body.classList.remove('booting');
    sessionStorage.setItem('black-flag-booted', '1');
  }, 2050);
}

function updateClock() {
  elements.clock.textContent = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(new Date());
}

function wrapSections() {
  const nodes = [...elements.content.childNodes];
  const fragment = document.createDocumentFragment();
  let current = null;
  let sector = 0;

  nodes.forEach((node) => {
    const isSectionHeading = node.nodeType === 1 && /^H[23]$/.test(node.tagName);
    if (isSectionHeading) {
      current = document.createElement('section');
      sector += 1;
      current.dataset.sector = `SECTOR ${String(sector).padStart(3, '0')}`;
      current.dataset.heading = node.id;
      if (node.id === 'contents') current.classList.add('directory-section');
      fragment.appendChild(current);
    }
    if (!current) {
      current = document.createElement('section');
      current.dataset.sector = 'ROOT NODE';
      fragment.appendChild(current);
    }
    current.appendChild(node);
  });

  elements.content.replaceChildren(fragment);
  state.sections = $$(':scope > section', elements.content);
  state.sections.forEach((section) => {
    section.dataset.search = section.textContent.toLowerCase();
  });
}

function buildToc() {
  state.headings = $$('h2, h3', elements.content).filter((heading) => heading.id !== 'contents');
  elements.toc.innerHTML = state.headings.map((heading, index) => {
    const level = heading.tagName === 'H3' ? 'level-3' : 'level-2';
    return `<a class="${level}" href="#${heading.id}" data-index="${index}">${heading.textContent}</a>`;
  }).join('');

  const count = state.headings.length;
  const links = $$('a[href^="http"]', elements.content).length;
  const countText = count.toLocaleString('en-US');
  const linksText = links.toLocaleString('en-US');
  elements.sectionCount.textContent = String(count).padStart(3, '0');
  elements.metricSections.textContent = String(count).padStart(3, '0');
  elements.metricLinks.textContent = linksText.padStart(4, '0');
  elements.searchMeta.textContent = `${countText} SECTORS / ${linksText} REFERENCES INDEXED`;
  elements.resultCount.textContent = `${countText} SECTORS`;
}

function categoryDescription(title) {
  const lookup = {
    vpn: 'Privacy tunnels, setup references, and network routing resources.',
    torrent: 'Clients, trackers, seedboxes, automation, and related tooling.',
    usenet: 'Providers, indexers, clients, and supporting infrastructure.',
    download: 'Direct-download utilities, search tools, hosts, and directories.',
    streaming: 'Media discovery, streaming references, and platform tooling.',
    gaming: 'PC games, console resources, ROM references, and homebrew.',
    music: 'Music services, downloading tools, libraries, and audio utilities.',
    software: 'Applications, utilities, operating-system tools, and archives.',
    ebook: 'Books, academic material, textbooks, and reading resources.',
    automation: 'Scripts, media managers, monitoring, and workflow systems.',
    privacy: 'Privacy education, browser hardening, and defensive utilities.',
    operating: 'Operating systems, Linux distributions, and platform resources.'
  };
  const key = Object.keys(lookup).find((item) => title.toLowerCase().includes(item));
  return lookup[key] || 'Indexed resources, references, tools, and related archive material.';
}

function buildCategories() {
  const topHeadings = state.headings.filter((heading) => heading.tagName === 'H2').slice(0, 16);
  elements.categoryGrid.innerHTML = topHeadings.map((heading, index) => `
    <a class="category-card reveal" href="#${heading.id}" style="--card-accent:${accents[index % accents.length]}">
      <span class="category-index">SECTOR ${String(index + 1).padStart(2, '0')}</span>
      <span class="category-icon">${glyphs[index % glyphs.length]}</span>
      <div>
        <h3>${heading.textContent}</h3>
        <p>${categoryDescription(heading.textContent)}</p>
      </div>
      <span class="category-arrow">↘</span>
    </a>
  `).join('');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.animate([
          { opacity: 0, transform: 'translateY(24px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .08 });
  $$('.reveal').forEach((card, index) => {
    card.style.opacity = '0';
    card.style.animationDelay = `${index * 40}ms`;
    observer.observe(card);
  });
}

function filterSections(query) {
  const normalized = query.trim().toLowerCase();
  let visible = 0;

  state.sections.forEach((section, index) => {
    const isDirectory = section.classList.contains('directory-section');
    const matches = !normalized || section.dataset.search.includes(normalized) || index === 0;
    section.classList.toggle('search-hidden', !matches || isDirectory);
    if (matches && index !== 0 && !isDirectory) visible += 1;
  });

  elements.empty.hidden = visible > 0 || !normalized;
  const total = state.sections.filter((section) => !section.classList.contains('directory-section')).length - 1;
  elements.searchMeta.textContent = normalized
    ? `${visible.toLocaleString('en-US')} MATCHING SECTORS // QUERY: ${normalized.toUpperCase()}`
    : `${state.headings.length.toLocaleString('en-US')} SECTORS / ${$$('a[href^="http"]', elements.content).length.toLocaleString('en-US')} REFERENCES INDEXED`;
  elements.resultCount.textContent = normalized ? `${visible} RESULTS` : `${total} SECTORS`;
}

function observeHeadings() {
  const links = new Map($$('a', elements.toc).map((link) => [link.hash.slice(1), link]));
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (!visible.length) return;
    $$('a', elements.toc).forEach((link) => link.classList.remove('active'));
    const link = links.get(visible[0].target.id);
    link?.classList.add('active');
    link?.scrollIntoView({ block: 'nearest' });
  }, { rootMargin: '-18% 0px -74% 0px' });
  state.headings.forEach((heading) => observer.observe(heading));
}

function configureExternalLinks() {
  $$('a[href^="http"]', elements.content).forEach((link) => {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = `${link.textContent.trim()} — opens external site`;
  });
}

function renderCommandResults(query = '') {
  const normalized = query.trim().toLowerCase();
  const matches = state.headings
    .filter((heading) => !normalized || heading.textContent.toLowerCase().includes(normalized))
    .slice(0, 12);

  state.commandIndex = matches.length ? 0 : -1;
  elements.commandResults.innerHTML = matches.length
    ? matches.map((heading, index) => `
      <button class="command-result${index === 0 ? ' active' : ''}" type="button" data-target="${heading.id}">
        <i>${String(index + 1).padStart(2, '0')}</i>
        <strong>${heading.textContent}</strong>
        <span>${heading.tagName === 'H2' ? 'SECTOR' : 'SUBNODE'}</span>
      </button>
    `).join('')
    : '<div class="empty-state"><span>NO SIGNAL</span><strong>No command matches.</strong></div>';
}

function openCommand() {
  renderCommandResults(elements.search.value);
  elements.commandPalette.showModal();
  elements.commandInput.value = elements.search.value;
  requestAnimationFrame(() => elements.commandInput.focus());
}

function activateCommandResult(button) {
  if (!button) return;
  const target = document.getElementById(button.dataset.target);
  elements.commandPalette.close();
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function moveCommandSelection(direction) {
  const buttons = $$('.command-result', elements.commandResults);
  if (!buttons.length) return;
  state.commandIndex = (state.commandIndex + direction + buttons.length) % buttons.length;
  buttons.forEach((button, index) => button.classList.toggle('active', index === state.commandIndex));
  buttons[state.commandIndex].scrollIntoView({ block: 'nearest' });
}

function setupSignalCanvas() {
  const canvas = elements.canvas;
  const context = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!context || reduced) return;
  let nodes = [];
  let width = 0;
  let height = 0;
  let frame = 0;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(76, Math.max(30, Math.floor(width / 20)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - .5) * .12,
      vy: (Math.random() - .5) * .12,
      r: Math.random() * 1.2 + .4
    }));
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    nodes.forEach((node, index) => {
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
      context.beginPath();
      context.fillStyle = index % 9 === 0 ? 'rgba(255,61,94,.55)' : 'rgba(244,241,233,.22)';
      context.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      context.fill();

      for (let j = index + 1; j < nodes.length; j += 1) {
        const other = nodes[j];
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 120) {
          context.beginPath();
          context.strokeStyle = `rgba(255,255,255,${(1 - distance / 120) * .055})`;
          context.moveTo(node.x, node.y);
          context.lineTo(other.x, other.y);
          context.stroke();
        }
      }
    });
    frame = requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else draw();
  });
}

function setupAmbientInteractions() {
  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const progress = total > 0 ? (window.scrollY / total) * 100 : 0;
    elements.scrollProgress.style.width = `${progress}%`;
  }, { passive: true });

  if (window.matchMedia('(pointer:fine)').matches) {
    window.addEventListener('pointermove', (event) => {
      elements.cursorOrb.style.opacity = '1';
      elements.cursorOrb.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    }, { passive: true });
  }
}

async function loadArchive() {
  try {
    configureMarked();
    const response = await fetch('readme.md', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = await response.text();
    elements.content.innerHTML = marked.parse(markdown);
    configureExternalLinks();
    wrapSections();
    buildToc();
    buildCategories();
    observeHeadings();
    renderCommandResults();
  } catch (error) {
    elements.content.innerHTML = `<div class="empty-state"><span>CONNECTION FAILURE</span><strong>Archive could not be loaded.</strong><p>${error.message}</p></div>`;
    elements.searchMeta.textContent = 'ARCHIVE LOAD ERROR';
  }
}

elements.search.addEventListener('input', (event) => filterSections(event.target.value));
elements.enterArchive.addEventListener('click', () => $('#categories').scrollIntoView({ behavior: 'smooth' }));
elements.themeToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('alt');
  localStorage.setItem('black-flag-palette', document.documentElement.classList.contains('alt') ? 'alt' : 'default');
});
elements.menuToggle.addEventListener('click', () => elements.toc.classList.toggle('open'));
elements.toc.addEventListener('click', () => elements.toc.classList.remove('open'));
elements.commandButton.addEventListener('click', openCommand);
elements.commandInput.addEventListener('input', (event) => renderCommandResults(event.target.value));
elements.commandResults.addEventListener('click', (event) => activateCommandResult(event.target.closest('.command-result')));
elements.commandInput.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown') { event.preventDefault(); moveCommandSelection(1); }
  if (event.key === 'ArrowUp') { event.preventDefault(); moveCommandSelection(-1); }
  if (event.key === 'Enter') {
    event.preventDefault();
    activateCommandResult($$('.command-result', elements.commandResults)[state.commandIndex]);
  }
});

document.addEventListener('keydown', (event) => {
  const paletteOpen = elements.commandPalette.open;
  if (event.key === '/' && !paletteOpen && document.activeElement !== elements.search) {
    event.preventDefault();
    elements.search.focus();
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (!paletteOpen) openCommand();
  }
  if (event.key === 'Escape' && !paletteOpen) {
    elements.search.value = '';
    filterSections('');
    elements.search.blur();
  }
});

if (localStorage.getItem('black-flag-palette') === 'alt') {
  document.documentElement.classList.add('alt');
}

runBootSequence();
updateClock();
window.setInterval(updateClock, 1000);
setupSignalCanvas();
setupAmbientInteractions();
loadArchive();