// DevPulse Interactive Landing Page Controller (Strictly SVG Icons, Zero Emojis)
import { icons } from "./icons.js";

export interface SimState {
  activeTab: string;
  prStatus: "open" | "approved" | "changes_requested" | "merged";
  repoTab: "overview" | "commits" | "prs" | "issues" | "releases";
}

const state: SimState = {
  activeTab: "pr",
  prStatus: "open",
  repoTab: "overview",
};

// Clipboard copy helper with animated SVG checkmark
export function copyText(text: string, triggerBtn?: HTMLElement) {
  navigator.clipboard.writeText(text).then(() => {
    if (triggerBtn) {
      const originalHtml = triggerBtn.innerHTML;
      triggerBtn.innerHTML = `
        ${icons.check(14, "#3fb950")}
        <span style="color: #3fb950; font-weight: 600;">Copied</span>
      `;
      setTimeout(() => {
        triggerBtn.innerHTML = originalHtml;
      }, 2200);
    }
  });
}

// Simulator views
const tabTemplates: Record<string, () => string> = {
  pr: () => {
    let statusBadge = `<span class="status-tag status-tag-green">${icons.checkCircle(14, "#3fb950")} Ready to merge</span>`;
    let mergeButtonHtml = `<button class="discord-btn discord-btn-primary" id="sim-btn-merge">${icons.gitMerge(14, "#ffffff")} Merge into main</button>`;

    if (state.prStatus === "approved") {
      statusBadge = `<span class="status-tag status-tag-green">${icons.checkCircle(14, "#3fb950")} Approved by you</span>`;
    } else if (state.prStatus === "changes_requested") {
      statusBadge = `<span class="status-tag" style="background: rgba(248,81,73,0.15); color: #f85149; border: 1px solid rgba(248,81,73,0.3)">${icons.alertTriangle(14, "#f85149")} Changes Requested</span>`;
    } else if (state.prStatus === "merged") {
      statusBadge = `<span class="status-tag status-tag-purple">${icons.gitMerge(14, "#a371f7")} Merged into main (commit #9a8f2c)</span>`;
      mergeButtonHtml = `<button class="discord-btn discord-btn-disabled" disabled>${icons.gitMerge(14, "#8b949e")} Merged</button>`;
    }

    return `
      <div class="discord-message">
        <div class="discord-avatar">
          ${icons.gitPullRequest(22, "#ffffff")}
        </div>
        <div class="discord-content">
          <div class="discord-header">
            <span class="bot-name">DevPulse</span>
            <span class="bot-tag">BOT</span>
            <span class="message-time">Today at 10:42 AM</span>
          </div>
          <div class="command-echo">/pr 142 repo:vercel/next.js</div>
          <div class="discord-embed" style="border-left-color: ${state.prStatus === "merged" ? "#a371f7" : "#2ea043"}">
            <div class="embed-author">
              <span>vercel/next.js</span>
              <span>&bull;</span>
              <span>Pull Request #142</span>
            </div>
            <div class="embed-title">
              feat(router): optimize parallel route cache hydration
            </div>
            <div class="embed-desc">
              ${statusBadge}
              Author: <strong>@timneutkens</strong> &bull; Target: <code>canary &larr; feature/route-cache</code>
              Files Changed: <strong>14</strong> &bull; <span style="color: #3fb950">+482</span> <span style="color: #f85149">&minus;193</span>
            </div>
            <div class="embed-grid">
              <div>
                <div class="embed-field-name">CI Status</div>
                <div class="embed-field-value">${icons.checkCircle(14, "#3fb950")} 12/12 Checks Passing</div>
              </div>
              <div>
                <div class="embed-field-name">Reviews</div>
                <div class="embed-field-value">${state.prStatus === "approved" ? "3/2 (Required met)" : "2/2 (Required met)"}</div>
              </div>
              <div>
                <div class="embed-field-name">Merge Conflicts</div>
                <div class="embed-field-value">None (Clean merge)</div>
              </div>
              <div>
                <div class="embed-field-name">Cycle Time</div>
                <div class="embed-field-value">1d 4h 12m</div>
              </div>
            </div>
            <div class="discord-action-row">
              <button class="discord-btn discord-btn-success" id="sim-btn-approve">${icons.check(14, "#ffffff")} Approve</button>
              <button class="discord-btn discord-btn-danger" id="sim-btn-changes">${icons.x(14, "#ffffff")} Request Changes</button>
              ${mergeButtonHtml}
              <button class="discord-btn" onclick="window.open('https://github.com', '_blank')">Open GitHub ${icons.externalLink(12, "#ffffff")}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  repo: () => {
    return `
      <div class="discord-message">
        <div class="discord-avatar">
          ${icons.repo(22, "#ffffff")}
        </div>
        <div class="discord-content">
          <div class="discord-header">
            <span class="bot-name">DevPulse</span>
            <span class="bot-tag">BOT</span>
            <span class="message-time">Today at 10:45 AM</span>
          </div>
          <div class="command-echo">/repo name:vercel/next.js</div>
          <div class="discord-embed" style="border-left-color: #58a6ff">
            <div class="embed-author">Repository Intelligence</div>
            <div class="embed-title">vercel/next.js</div>
            <div class="embed-desc">
              The React Framework for the Web. Used by production engineering teams worldwide.
              <strong>Health Score: 96 / 100</strong> [■■■■■■■■■□]
            </div>
            <div class="embed-grid">
              <div>
                <div class="embed-field-name">Stars &amp; Forks</div>
                <div class="embed-field-value">${icons.star(14, "#e3b341")} 124,510 &bull; ${icons.repoForked(14, "#8b949e")} 26,840</div>
              </div>
              <div>
                <div class="embed-field-name">Open Issues / PRs</div>
                <div class="embed-field-value">Issues: 412 &bull; PRs: 89</div>
              </div>
              <div>
                <div class="embed-field-name">License / Branch</div>
                <div class="embed-field-value">MIT &bull; canary</div>
              </div>
              <div>
                <div class="embed-field-name">30-Day Velocity</div>
                <div class="embed-field-value"><span style="color:#3fb950">+1,840 stars</span> (+1.5%)</div>
              </div>
            </div>
            <div class="discord-action-row">
              <button class="discord-btn ${state.repoTab === "overview" ? "discord-btn-primary" : ""}" id="sim-repo-overview">Overview</button>
              <button class="discord-btn ${state.repoTab === "commits" ? "discord-btn-primary" : ""}" id="sim-repo-commits">Commits</button>
              <button class="discord-btn ${state.repoTab === "prs" ? "discord-btn-primary" : ""}" id="sim-repo-prs">PRs (89)</button>
              <button class="discord-btn ${state.repoTab === "issues" ? "discord-btn-primary" : ""}" id="sim-repo-issues">Issues (412)</button>
              <button class="discord-btn ${state.repoTab === "releases" ? "discord-btn-primary" : ""}" id="sim-repo-releases">Releases (v15.2.0)</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  actions: () => {
    return `
      <div class="discord-message">
        <div class="discord-avatar">
          ${icons.actions(22, "#ffffff")}
        </div>
        <div class="discord-content">
          <div class="discord-header">
            <span class="bot-name">DevPulse</span>
            <span class="bot-tag">BOT</span>
            <span class="message-time">Today at 10:48 AM</span>
          </div>
          <div class="command-echo">/actions repo:vercel/next.js branch:canary</div>
          <div class="discord-embed" style="border-left-color: #2ea043">
            <div class="embed-author">GitHub Actions CI/CD Pipeline</div>
            <div class="embed-title">canary &bull; Run #4,892 Passed</div>
            <div class="embed-desc">Triggered by <strong>@leerob</strong> via push on commit <code>3a91e4f</code></div>
            <div class="embed-code-block">canary (commit 3a91e4f)
|-- Unit Tests (Node 20 & 22)   [Passing] (1m 42s)
|-- Turbopack Integration E2E   [Passing] (4m 15s)
|-- Edge Runtime Compatibility  [Passing] (52s)
|-- Security Scanning & Audit   [Passing] (38s)
\-- Production Bundle Analyzer  [Passing] (1m 04s)</div>
            <div class="discord-action-row">
              <button class="discord-btn" id="sim-btn-rerun">${icons.sync(14, "#ffffff")} Rerun All Jobs</button>
              <button class="discord-btn discord-btn-danger" id="sim-btn-cancel" disabled>Cancel</button>
              <button class="discord-btn" onclick="window.open('https://github.com', '_blank')">View Workflow Run ${icons.externalLink(12, "#ffffff")}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  investigate: () => {
    return `
      <div class="discord-message">
        <div class="discord-avatar">
          ${icons.investigate(22, "#ffffff")}
        </div>
        <div class="discord-content">
          <div class="discord-header">
            <span class="bot-name">DevPulse</span>
            <span class="bot-tag">BOT</span>
            <span class="message-time">Today at 10:50 AM</span>
          </div>
          <div class="command-echo">/investigate pr:142 repo:vercel/next.js</div>
          <div class="discord-embed" style="border-left-color: #a371f7">
            <div class="embed-author">Lifecycle Investigation Engine</div>
            <div class="embed-title">Full Development Trace</div>
            <div class="embed-desc">Chronological lifecycle trace from originating issue to published version:</div>
            <div class="embed-code-block">1. Issue Created:   #892 "Hydration mismatch in nested parallel routes" by @alex (Sep 1)
2. Branch Created:  feature/route-cache (Sep 2)
3. Commit Added:    8f3b12a "fix: reconcile router slot metadata" by @timneutkens
4. PR Opened:       #142 (Sep 2)
5. CI Verification: 12 checks passed (Sep 2)
6. Code Reviews:    Approved by @sokra & @kdy1 (Sep 3)
7. Merged:          Merged into canary by @timneutkens (Sep 3)
8. Shipped In:      v15.2.0-canary.18 (Sep 4)</div>
            <div class="discord-action-row">
              <button class="discord-btn" id="sim-btn-copy-trace">${icons.copy(14, "#ffffff")} Copy Investigation Summary</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  code: () => {
    return `
      <div class="discord-message">
        <div class="discord-avatar">
          ${icons.code(22, "#ffffff")}
        </div>
        <div class="discord-content">
          <div class="discord-header">
            <span class="bot-name">DevPulse</span>
            <span class="bot-tag">BOT</span>
            <span class="message-time">Today at 10:52 AM</span>
          </div>
          <div class="command-echo">/code blame file:packages/next/src/server/route-matcher.ts lines:40-46</div>
          <div class="discord-embed" style="border-left-color: #58a6ff">
            <div class="embed-author">Code Blame &amp; Attribution</div>
            <div class="embed-title">route-matcher.ts (Lines 40-46)</div>
            <div class="embed-code-block">40 | export function matchRoute(url: string, routes: Route[]): Route | null {
41 |   // [e71ab82 @timneutkens 3d ago] Fast-path lookup for exact match
42 |   const exact = exactMap.get(url);
43 |   if (exact) return exact;
44 |   // [8f3b12a @sokra 1w ago] Fallback dynamic param evaluator
45 |   return evaluateRegexRoutes(url, routes);
46 | }</div>
            <div class="embed-desc">Commit <code>8f3b12a</code> originated from <strong>PR #138</strong> merged into canary on Aug 28.</div>
          </div>
        </div>
      </div>
    `;
  },

  activity: () => {
    return `
      <div class="discord-message">
        <div class="discord-avatar">
          ${icons.graph(22, "#ffffff")}
        </div>
        <div class="discord-content">
          <div class="discord-header">
            <span class="bot-name">DevPulse</span>
            <span class="bot-tag">BOT</span>
            <span class="message-time">Today at 10:55 AM</span>
          </div>
          <div class="command-echo">/activity me days:7</div>
          <div class="discord-embed" style="border-left-color: #3fb950">
            <div class="embed-author">Developer Engineering Rhythm</div>
            <div class="embed-title">Personal Activity Profile (@swadhin)</div>
            <div class="embed-desc">
              Total Commits: <strong>48</strong> &bull; PRs Authored: <strong>6</strong> &bull; PRs Reviewed: <strong>14</strong>
              Weekly Rhythm Histogram:
            </div>
            <div class="embed-code-block">Mon [||||||||||||||||] 14
Tue [||||||||||||    ] 10
Wed [||||||||        ]  6
Thu [||||||||||||||  ] 12
Fri [||||            ]  4
Sat [|               ]  1
Sun [|               ]  1</div>
            <div class="embed-grid">
              <div>
                <div class="embed-field-name">Churn Ratio</div>
                <div class="embed-field-value">+2,140 / &minus;840 (2.5x)</div>
              </div>
              <div>
                <div class="embed-field-name">Average Cycle Time</div>
                <div class="embed-field-value">18h 40m</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },
};

export function renderSimulator() {
  const container = document.getElementById("simulator-render-area");
  if (!container) return;

  const renderer = tabTemplates[state.activeTab];
  if (renderer) {
    container.innerHTML = renderer();
    attachSimulatorEvents();
  }
}

function attachSimulatorEvents() {
  const approveBtn = document.getElementById("sim-btn-approve");
  const changesBtn = document.getElementById("sim-btn-changes");
  const mergeBtn = document.getElementById("sim-btn-merge");
  const rerunBtn = document.getElementById("sim-btn-rerun");
  const copyTraceBtn = document.getElementById("sim-btn-copy-trace");

  if (approveBtn) {
    approveBtn.addEventListener("click", () => {
      state.prStatus = "approved";
      renderSimulator();
    });
  }

  if (changesBtn) {
    changesBtn.addEventListener("click", () => {
      state.prStatus = "changes_requested";
      renderSimulator();
    });
  }

  if (mergeBtn) {
    mergeBtn.addEventListener("click", () => {
      mergeBtn.innerHTML = `${icons.sync(14, "#ffffff")} Merging...`;
      setTimeout(() => {
        state.prStatus = "merged";
        renderSimulator();
      }, 500);
    });
  }

  if (rerunBtn) {
    rerunBtn.addEventListener("click", () => {
      rerunBtn.innerHTML = `${icons.sync(14, "#ffffff")} Dispatching GitHub Actions...`;
      setTimeout(() => {
        rerunBtn.innerHTML = `${icons.check(14, "#3fb950")} Workflows Triggered`;
      }, 700);
    });
  }

  if (copyTraceBtn) {
    copyTraceBtn.addEventListener("click", () => {
      copyText("Issue #892 -> PR #142 -> v15.2.0-canary.18 (Commit 8f3b12a)", copyTraceBtn);
    });
  }

  // Repo sub-tabs
  for (const sub of ["overview", "commits", "prs", "issues", "releases"]) {
    const btn = document.getElementById(`sim-repo-${sub}`);
    if (btn) {
      btn.addEventListener("click", () => {
        state.repoTab = sub as any;
        renderSimulator();
      });
    }
  }
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  // Populate tab button icons dynamically
  const tabIcons: Record<string, string> = {
    pr: icons.gitPullRequest(14),
    repo: icons.repo(14),
    actions: icons.actions(14),
    investigate: icons.investigate(14),
    code: icons.code(14),
    activity: icons.graph(14),
  };

  const tabs = document.querySelectorAll<HTMLButtonElement>(".sim-tab-btn");
  for (const tab of tabs) {
    const target = tab.getAttribute("data-tab");
    if (target && tabIcons[target]) {
      const label = tab.innerText.replace(/[^a-zA-Z0-9_./#-]/g, "").trim();
      tab.innerHTML = `${tabIcons[target]} <span>/${target === "actions" ? "actions" : target === "activity" ? "activity" : target} ${label}</span>`;
    }

    tab.addEventListener("click", () => {
      for (const t of tabs) {
        t.classList.remove("active");
      }
      tab.classList.add("active");
      if (target) {
        state.activeTab = target;
        renderSimulator();
      }
    });
  }

  // Initial render
  renderSimulator();

  // Filter feature cards
  const filterInput = document.getElementById("feature-search-input") as HTMLInputElement | null;
  if (filterInput) {
    filterInput.addEventListener("input", (e) => {
      const q = (e.target as HTMLInputElement).value.toLowerCase().trim();
      const cards = document.querySelectorAll<HTMLElement>(".feature-card");
      for (const card of cards) {
        const text = card.innerText.toLowerCase();
        if (q === "" || text.includes(q)) {
          card.style.display = "flex";
        } else {
          card.style.display = "none";
        }
      }
    });
  }

  // Copy Clone command button
  const clonePill = document.getElementById("clone-repo-pill");
  if (clonePill) {
    clonePill.addEventListener("click", () => {
      copyText("git clone git@github.com:husteno-o/git-discord-bot.git", clonePill);
    });
  }
});
