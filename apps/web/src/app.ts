// DevPulse Landing Page Controller
// Uses Lucide icons (loaded via CDN in HTML)

interface SimState {
  activeTab: string;
  prStatus: "open" | "approved" | "changes_requested" | "merged";
  repoTab: string;
}

const state: SimState = {
  activeTab: "pr",
  prStatus: "open",
  repoTab: "overview",
};

// All 21 commands data
const commands = [
  {
    name: "/repo",
    desc: "Repository intelligence, health score, dependencies, growth",
    icon: "book-open",
    color: "gh-blue",
  },
  {
    name: "/pr",
    desc: "PR details, CI status, approve, request changes, merge",
    icon: "git-pull-request",
    color: "gh-green",
  },
  {
    name: "/search",
    desc: "Search code, issues, PRs, repos, commits with qualifiers",
    icon: "search",
    color: "gh-purple",
  },
  {
    name: "/code",
    desc: "View files, git blame, commit-to-PR resolution",
    icon: "code",
    color: "gh-blue",
  },
  {
    name: "/investigate",
    desc: "Full lifecycle: issue → commit → PR → review → merge → release",
    icon: "git-merge",
    color: "gh-purple",
  },
  {
    name: "/activity",
    desc: "Commit histograms, churn analysis, personal telemetry",
    icon: "bar-chart-2",
    color: "gh-green",
  },
  {
    name: "/trending",
    desc: "Trending repos across TypeScript, Rust, AI/ML, Go, Python",
    icon: "trending-up",
    color: "gh-amber",
  },
  {
    name: "/watch",
    desc: "Subscribe channels to releases, PRs, issues, security alerts",
    icon: "bell",
    color: "gh-blue",
  },
  {
    name: "/actions",
    desc: "CI/CD workflow trees, run history, rerun/cancel controls",
    icon: "play-circle",
    color: "gh-green",
  },
  {
    name: "/security",
    desc: "Dependabot alerts, CVE lookup, real-time secret scanner",
    icon: "shield-check",
    color: "gh-coral",
  },
  {
    name: "/release",
    desc: "Latest releases, tag comparison, auto changelog generator",
    icon: "tag",
    color: "gh-purple",
  },
  {
    name: "/team",
    desc: "Team velocity, cycle times, review load balancing",
    icon: "users",
    color: "gh-blue",
  },
  {
    name: "/home",
    desc: "Morning cockpit: active PRs, reviews, alerts, trending",
    icon: "home",
    color: "gh-green",
  },
  {
    name: "/connect",
    desc: "AES-256-GCM encrypted PAT storage for write actions",
    icon: "link",
    color: "gh-blue",
  },
  {
    name: "/why",
    desc: "Trace file/line → commit → PR → originating issue",
    icon: "help-circle",
    color: "gh-purple",
  },
  {
    name: "/ask",
    desc: "Query engine: stale PRs, bottlenecks, frequent files",
    icon: "message-circle",
    color: "gh-green",
  },
  {
    name: "/tools",
    desc: "JSON formatter, base64, JWT inspector, hash, timestamps",
    icon: "wrench",
    color: "gh-amber",
  },
  {
    name: "/settings",
    desc: "Server config: repos, channels, access controls",
    icon: "settings",
    color: "gh-blue",
  },
  {
    name: "/help",
    desc: "Interactive command directory with examples",
    icon: "info",
    color: "gh-green",
  },
  {
    name: "/ai",
    desc: "AI code explanations, PR summaries, bug fix suggestions",
    icon: "brain",
    color: "gh-coral",
  },
  {
    name: "/code-review",
    desc: "Automated PR review: security, performance, style",
    icon: "eye",
    color: "gh-purple",
  },
];

// Initialize everything
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide icons
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  // Build commands grid
  buildCommandsGrid();

  // Initialize simulator
  initSimulator();

  // Initialize navbar
  initNavbar();

  // Initialize mobile menu
  initMobileMenu();

  // Initialize copy buttons
  initCopyButtons();

  // Initialize scroll effects
  initScrollEffects();
});

// Build the 21 commands grid
function buildCommandsGrid() {
  const grid = document.getElementById("commands-grid");
  if (!grid) return;

  grid.innerHTML = commands
    .map(
      (cmd) => `
    <div class="command-card group p-4 rounded-xl bg-bg-surface border border-border hover:border-${cmd.color}/30 cursor-default">
      <div class="flex items-start gap-3">
        <div class="w-9 h-9 rounded-lg bg-${cmd.color}/10 border border-${cmd.color}/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
          <i data-lucide="${cmd.icon}" class="w-4 h-4 text-${cmd.color}"></i>
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-mono font-semibold text-${cmd.color}">${cmd.name}</span>
          </div>
          <p class="text-xs text-text-secondary leading-relaxed">${cmd.desc}</p>
        </div>
      </div>
    </div>
  `,
    )
    .join("");

  // Re-initialize icons for new elements
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

// Simulator
function initSimulator() {
  renderSimulator();
  attachSimulatorEvents();
}

function renderSimulator() {
  const container = document.getElementById("simulator-body");
  if (!container) return;

  const templates: Record<string, () => string> = {
    pr: () => renderPREmbed(),
    repo: () => renderRepoEmbed(),
    actions: () => renderActionsEmbed(),
    investigate: () => renderInvestigateEmbed(),
    code: () => renderCodeEmbed(),
    activity: () => renderActivityEmbed(),
  };

  const renderer = templates[state.activeTab];
  if (renderer) {
    container.style.opacity = "0";
    container.style.transform = "translateY(8px)";
    container.style.transition = "opacity 0.15s ease, transform 0.15s ease";

    requestAnimationFrame(() => {
      container.innerHTML = renderer();
      requestAnimationFrame(() => {
        container.style.opacity = "1";
        container.style.transform = "translateY(0)";
      });
    });
  }
}

function renderPREmbed() {
  const statusMap = {
    open: { text: "Ready to merge", color: "gh-green", icon: "check-circle" },
    approved: { text: "Approved by you", color: "gh-green", icon: "check-circle" },
    changes_requested: { text: "Changes Requested", color: "gh-coral", icon: "alert-triangle" },
    merged: { text: "Merged into main", color: "gh-purple", icon: "git-merge" },
  };
  const status = statusMap[state.prStatus];

  return `
    <div class="flex gap-4">
      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-gh-green to-gh-blue flex items-center justify-center flex-shrink-0">
        <i data-lucide="git-pull-request" class="w-5 h-5 text-white"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-semibold text-sm">DevPulse</span>
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-discord-blurple text-white uppercase">Bot</span>
          <span class="text-xs text-text-muted">Today at 10:42 AM</span>
        </div>
        <div class="text-xs font-mono text-gh-blue mb-2">/pr 142 repo:vercel/next.js</div>
        <div class="rounded-lg bg-discord-embed border-l-4 border-${status.color} p-4">
          <div class="text-xs text-text-secondary mb-1">vercel/next.js • Pull Request #142</div>
          <div class="text-sm font-semibold mb-2">feat(router): optimize parallel route cache hydration</div>
          <div class="flex items-center gap-2 mb-3">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-${status.color}/10 text-${status.color} border border-${status.color}/30">
              <i data-lucide="${status.icon}" class="w-3 h-3"></i> ${status.text}
            </span>
            <span class="text-xs text-text-muted">@timneutkens • 14 files • <span class="text-gh-green">+482</span> <span class="text-gh-coral">-193</span></span>
          </div>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div class="text-[10px] uppercase text-text-muted font-bold mb-0.5">CI Status</div>
              <div class="text-xs"><i data-lucide="check-circle" class="w-3 h-3 text-gh-green inline"></i> 12/12 Passing</div>
            </div>
            <div>
              <div class="text-[10px] uppercase text-text-muted font-bold mb-0.5">Reviews</div>
              <div class="text-xs">${state.prStatus === "approved" ? "3/2" : "2/2"} (Required met)</div>
            </div>
          </div>
          <div class="flex gap-2 flex-wrap">
            <button id="sim-btn-approve" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gh-green text-white text-xs font-semibold hover:bg-gh-green-h transition-colors">
              <i data-lucide="check" class="w-3 h-3"></i> Approve
            </button>
            <button id="sim-btn-changes" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gh-coral text-white text-xs font-semibold hover:opacity-90 transition-colors">
              <i data-lucide="x" class="w-3 h-3"></i> Request Changes
            </button>
            ${
              state.prStatus === "merged"
                ? `<button class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gh-purple/20 text-gh-purple text-xs font-semibold" disabled><i data-lucide="git-merge" class="w-3 h-3"></i> Merged</button>`
                : `<button id="sim-btn-merge" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-discord-blurple text-white text-xs font-semibold hover:bg-discord-blurple-h transition-colors"><i data-lucide="git-merge" class="w-3 h-3"></i> Merge</button>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRepoEmbed() {
  return `
    <div class="flex gap-4">
      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-gh-green to-gh-blue flex items-center justify-center flex-shrink-0">
        <i data-lucide="book-open" class="w-5 h-5 text-white"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-semibold text-sm">DevPulse</span>
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-discord-blurple text-white uppercase">Bot</span>
          <span class="text-xs text-text-muted">Today at 10:45 AM</span>
        </div>
        <div class="text-xs font-mono text-gh-blue mb-2">/repo name:vercel/next.js</div>
        <div class="rounded-lg bg-discord-embed border-l-4 border-gh-blue p-4">
          <div class="text-sm font-semibold mb-2">vercel/next.js</div>
          <div class="text-xs text-text-secondary mb-3">The React Framework for the Web. <strong class="text-text-primary">Health Score: 96/100</strong></div>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div class="text-[10px] uppercase text-text-muted font-bold mb-0.5">Stars & Forks</div>
              <div class="text-xs flex items-center gap-1"><i data-lucide="star" class="w-3 h-3 text-gh-amber"></i> 124,510 • <i data-lucide="git-fork" class="w-3 h-3"></i> 26,840</div>
            </div>
            <div>
              <div class="text-[10px] uppercase text-text-muted font-bold mb-0.5">Issues / PRs</div>
              <div class="text-xs">412 / 89</div>
            </div>
          </div>
          <div class="flex gap-2 flex-wrap">
            <button class="px-3 py-1.5 rounded-md bg-gh-blue text-white text-xs font-semibold">Overview</button>
            <button class="px-3 py-1.5 rounded-md bg-bg-surface text-text-secondary text-xs font-medium hover:bg-bg-hover transition-colors">Commits</button>
            <button class="px-3 py-1.5 rounded-md bg-bg-surface text-text-secondary text-xs font-medium hover:bg-bg-hover transition-colors">PRs</button>
            <button class="px-3 py-1.5 rounded-md bg-bg-surface text-text-secondary text-xs font-medium hover:bg-bg-hover transition-colors">Issues</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderActionsEmbed() {
  return `
    <div class="flex gap-4">
      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-gh-green to-gh-blue flex items-center justify-center flex-shrink-0">
        <i data-lucide="play-circle" class="w-5 h-5 text-white"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-semibold text-sm">DevPulse</span>
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-discord-blurple text-white uppercase">Bot</span>
          <span class="text-xs text-text-muted">Today at 10:48 AM</span>
        </div>
        <div class="text-xs font-mono text-gh-blue mb-2">/actions repo:vercel/next.js branch:canary</div>
        <div class="rounded-lg bg-discord-embed border-l-4 border-gh-green p-4">
          <div class="text-sm font-semibold mb-2">canary • Run #4,892 Passed</div>
          <div class="font-mono text-xs text-text-secondary space-y-1 mb-3">
            <div>├── Unit Tests (Node 20 & 22) <span class="text-gh-green">Passing</span> (1m 42s)</div>
            <div>├── Turbopack Integration E2E <span class="text-gh-green">Passing</span> (4m 15s)</div>
            <div>├── Edge Runtime Compatibility <span class="text-gh-green">Passing</span> (52s)</div>
            <div>└── Security Scanning & Audit <span class="text-gh-green">Passing</span> (38s)</div>
          </div>
          <div class="flex gap-2">
            <button id="sim-btn-rerun" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-surface text-text-primary text-xs font-semibold hover:bg-bg-hover transition-colors border border-border">
              <i data-lucide="refresh-cw" class="w-3 h-3"></i> Rerun All
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderInvestigateEmbed() {
  return `
    <div class="flex gap-4">
      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-gh-purple to-gh-blue flex items-center justify-center flex-shrink-0">
        <i data-lucide="git-merge" class="w-5 h-5 text-white"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-semibold text-sm">DevPulse</span>
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-discord-blurple text-white uppercase">Bot</span>
          <span class="text-xs text-text-muted">Today at 10:50 AM</span>
        </div>
        <div class="text-xs font-mono text-gh-blue mb-2">/investigate pr:142 repo:vercel/next.js</div>
        <div class="rounded-lg bg-discord-embed border-l-4 border-gh-purple p-4">
          <div class="text-sm font-semibold mb-2">Full Development Trace</div>
          <div class="font-mono text-xs text-text-secondary space-y-1 mb-3">
            <div>1. Issue #892 created by @alex (Sep 1)</div>
            <div>2. Branch feature/route-cache (Sep 2)</div>
            <div>3. Commit 8f3b12a by @timneutkens</div>
            <div>4. PR #142 opened (Sep 2)</div>
            <div>5. CI: 12 checks passed (Sep 2)</div>
            <div>6. Approved by @sokra & @kdy1 (Sep 3)</div>
            <div>7. Merged into canary (Sep 3)</div>
            <div>8. Shipped in v15.2.0-canary.18 (Sep 4)</div>
          </div>
          <button id="sim-btn-copy-trace" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-surface text-text-primary text-xs font-semibold hover:bg-bg-hover transition-colors border border-border">
            <i data-lucide="copy" class="w-3 h-3"></i> Copy Trace
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderCodeEmbed() {
  return `
    <div class="flex gap-4">
      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-gh-blue to-gh-purple flex items-center justify-center flex-shrink-0">
        <i data-lucide="code" class="w-5 h-5 text-white"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-semibold text-sm">DevPulse</span>
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-discord-blurple text-white uppercase">Bot</span>
          <span class="text-xs text-text-muted">Today at 10:52 AM</span>
        </div>
        <div class="text-xs font-mono text-gh-blue mb-2">/code blame file:packages/next/src/server/route-matcher.ts lines:40-46</div>
        <div class="rounded-lg bg-discord-embed border-l-4 border-gh-blue p-4">
          <div class="text-sm font-semibold mb-2">route-matcher.ts (Lines 40-46)</div>
          <div class="font-mono text-xs bg-[#111214] rounded p-3 mb-2 overflow-x-auto">
            <div><span class="text-text-muted">40</span> | export function matchRoute(url: string, routes: Route[]): Route | null {</div>
            <div><span class="text-text-muted">41</span> |   <span class="text-text-muted">// [e71ab82 @timneutkens 3d ago] Fast-path lookup</span></div>
            <div><span class="text-text-muted">42</span> |   const exact = exactMap.get(url);</div>
            <div><span class="text-text-muted">43</span> |   if (exact) return exact;</div>
            <div><span class="text-text-muted">44</span> |   <span class="text-text-muted">// [8f3b12a @sokra 1w ago] Fallback evaluator</span></div>
            <div><span class="text-text-muted">45</span> |   return evaluateRegexRoutes(url, routes);</div>
            <div><span class="text-text-muted">46</span> | }</div>
          </div>
          <div class="text-xs text-text-secondary">Commit 8f3b12a originated from PR #138 merged Aug 28.</div>
        </div>
      </div>
    </div>
  `;
}

function renderActivityEmbed() {
  return `
    <div class="flex gap-4">
      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-gh-green to-gh-blue flex items-center justify-center flex-shrink-0">
        <i data-lucide="bar-chart-2" class="w-5 h-5 text-white"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-semibold text-sm">DevPulse</span>
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-discord-blurple text-white uppercase">Bot</span>
          <span class="text-xs text-text-muted">Today at 10:55 AM</span>
        </div>
        <div class="text-xs font-mono text-gh-blue mb-2">/activity me days:7</div>
        <div class="rounded-lg bg-discord-embed border-l-4 border-gh-green p-4">
          <div class="text-sm font-semibold mb-2">Personal Activity Profile (@swadhin)</div>
          <div class="text-xs text-text-secondary mb-3">48 commits • 6 PRs authored • 14 PRs reviewed</div>
          <div class="font-mono text-xs space-y-1 mb-3">
            <div class="flex items-center gap-2"><span class="w-8 text-text-muted">Mon</span> <span class="text-gh-green">██████████████</span> 14</div>
            <div class="flex items-center gap-2"><span class="w-8 text-text-muted">Tue</span> <span class="text-gh-green">██████████</span> 10</div>
            <div class="flex items-center gap-2"><span class="w-8 text-text-muted">Wed</span> <span class="text-gh-green">██████</span> 6</div>
            <div class="flex items-center gap-2"><span class="w-8 text-text-muted">Thu</span> <span class="text-gh-green">████████████</span> 12</div>
            <div class="flex items-center gap-2"><span class="w-8 text-text-muted">Fri</span> <span class="text-gh-green">████</span> 4</div>
            <div class="flex items-center gap-2"><span class="w-8 text-text-muted">Sat</span> <span class="text-gh-green">█</span> 1</div>
            <div class="flex items-center gap-2"><span class="w-8 text-text-muted">Sun</span> <span class="text-gh-green">█</span> 1</div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-[10px] uppercase text-text-muted font-bold mb-0.5">Churn Ratio</div>
              <div class="text-xs">+2,140 / -840 (2.5x)</div>
            </div>
            <div>
              <div class="text-[10px] uppercase text-text-muted font-bold mb-0.5">Avg Cycle</div>
              <div class="text-xs">18h 40m</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function attachSimulatorEvents() {
  // Tab switching
  const tabs = document.querySelectorAll<HTMLButtonElement>(".sim-tab-btn");
  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      for (const t of tabs) t.classList.remove("active");
      tab.classList.add("active");
      const target = tab.getAttribute("data-tab");
      if (target) {
        state.activeTab = target;
        renderSimulator();
      }
    });
  }

  // PR simulator buttons
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest("button");
    if (!btn) return;

    if (btn.id === "sim-btn-approve") {
      state.prStatus = "approved";
      renderSimulator();
    } else if (btn.id === "sim-btn-changes") {
      state.prStatus = "changes_requested";
      renderSimulator();
    } else if (btn.id === "sim-btn-merge") {
      btn.innerHTML = `<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> Merging...`;
      if (typeof lucide !== "undefined") lucide.createIcons();
      setTimeout(() => {
        state.prStatus = "merged";
        renderSimulator();
      }, 800);
    } else if (btn.id === "sim-btn-rerun") {
      const original = btn.innerHTML;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> Dispatching...`;
      if (typeof lucide !== "undefined") lucide.createIcons();
      setTimeout(() => {
        btn.innerHTML = `<i data-lucide="check" class="w-3 h-3 text-gh-green"></i> Triggered!`;
        if (typeof lucide !== "undefined") lucide.createIcons();
        setTimeout(() => {
          btn.innerHTML = original;
          if (typeof lucide !== "undefined") lucide.createIcons();
        }, 2000);
      }, 1000);
    } else if (btn.id === "sim-btn-copy-trace") {
      const text = "Issue #892 → PR #142 → v15.2.0-canary.18 (Commit 8f3b12a)";
      navigator.clipboard.writeText(text).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="check" class="w-3 h-3"></i> Copied!`;
        if (typeof lucide !== "undefined") lucide.createIcons();
        setTimeout(() => {
          btn.innerHTML = original;
          if (typeof lucide !== "undefined") lucide.createIcons();
        }, 2000);
      });
    }
  });
}

// Navbar scroll effect
function initNavbar() {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  let ticking = false;
  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        if (window.scrollY > 10) {
          navbar.classList.add("navbar-scrolled");
        } else {
          navbar.classList.remove("navbar-scrolled");
        }
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
}

// Mobile menu toggle
function initMobileMenu() {
  const btn = document.getElementById("mobile-menu-btn");
  const menu = document.getElementById("mobile-menu");

  if (btn && menu) {
    btn.addEventListener("click", () => {
      menu.classList.toggle("hidden");
    });

    // Close on link click
    const links = menu.querySelectorAll("a");
    for (const link of links) {
      link.addEventListener("click", () => {
        menu.classList.add("hidden");
      });
    }
  }
}

// Copy buttons
function initCopyButtons() {
  const copyAllBtn = document.getElementById("copy-all-btn");
  if (copyAllBtn) {
    copyAllBtn.addEventListener("click", () => {
      const commands = `git clone https://github.com/husteno-o/git-discord-bot.git\ncd git-discord-bot\nbun install\ncp .env.example .env\nbun run start`;
      navigator.clipboard.writeText(commands).then(() => {
        const original = copyAllBtn.innerHTML;
        copyAllBtn.innerHTML = `<i data-lucide="check" class="w-3 h-3"></i> Copied!`;
        if (typeof lucide !== "undefined") lucide.createIcons();
        setTimeout(() => {
          copyAllBtn.innerHTML = original;
          if (typeof lucide !== "undefined") lucide.createIcons();
        }, 2000);
      });
    });
  }
}

// Scroll effects
function initScrollEffects() {
  // Intersection observer for reveal animations
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );

    for (const el of reveals) observer.observe(el);
  }
}
