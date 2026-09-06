// DevPulse Interactive Landing Page Controller

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

// Clipboard copy helper
export function copyText(text: string, triggerBtn?: HTMLElement) {
  navigator.clipboard.writeText(text).then(() => {
    if (triggerBtn) {
      const originalHtml = triggerBtn.innerHTML;
      triggerBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="#3fb950">
          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
        </svg>
        <span style="color: #3fb950; font-weight: 600;">Copied!</span>
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
    let statusBadge = `<span class="status-tag status-tag-green">🟢 Ready to merge</span>`;
    let mergeButtonHtml = `<button class="discord-btn discord-btn-primary" id="sim-btn-merge">Merge into main</button>`;

    if (state.prStatus === "approved") {
      statusBadge = `<span class="status-tag status-tag-green">✅ Approved by you</span>`;
    } else if (state.prStatus === "changes_requested") {
      statusBadge = `<span class="status-tag" style="background: rgba(248,81,73,0.15); color: #f85149; border: 1px solid rgba(248,81,73,0.3)">⚠️ Changes Requested</span>`;
    } else if (state.prStatus === "merged") {
      statusBadge = `<span class="status-tag status-tag-purple">🟣 Merged into main (commit #9a8f2c)</span>`;
      mergeButtonHtml = `<button class="discord-btn discord-btn-disabled" disabled>Merged</button>`;
    }

    return `
      <div class="discord-message">
        <div class="discord-avatar">
          <svg viewBox="0 0 16 16"><path d="M5 3.254V3.25v.004a.75.75 0 1 1 0-.004Zm1.5 0a2.25 2.25 0 1 0-3 2.122V8.75a2.25 2.25 0 0 0 1.5 2.122v.378a2.25 2.25 0 1 0 1.5 0v-.378a2.25 2.25 0 0 0 1.5-2.122V5.376A2.25 2.25 0 0 0 6.5 3.254Z"/></svg>
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
              <span>•</span>
              <span>Pull Request #142</span>
            </div>
            <div class="embed-title">
              feat(router): optimize parallel route cache hydration
            </div>
            <div class="embed-desc">
              ${statusBadge}
              Author: <strong>@timneutkens</strong> • Target: <code>canary ⬅ feature/route-cache</code>
              Files Changed: <strong>14</strong> • <span style="color: #3fb950">+482</span> <span style="color: #f85149">−193</span>
            </div>
            <div class="embed-grid">
              <div>
                <div class="embed-field-name">CI Status</div>
                <div class="embed-field-value">✅ 12/12 Checks Passing</div>
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
              <button class="discord-btn discord-btn-success" id="sim-btn-approve">Approve</button>
              <button class="discord-btn discord-btn-danger" id="sim-btn-changes">Request Changes</button>
              ${mergeButtonHtml}
              <button class="discord-btn" onclick="window.open('https://github.com', '_blank')">Open GitHub ↗</button>
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
          <svg viewBox="0 0 16 16"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25H12v1.5H5.25a.25.25 0 0 1-.25-.25Z"/></svg>
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
              The React Framework for the Web. Used by top engineering teams worldwide.
              <strong>Health Score: 96 / 100</strong> [■■■■■■■■■□]
            </div>
            <div class="embed-grid">
              <div>
                <div class="embed-field-name">Stars / Forks</div>
                <div class="embed-field-value">★ 124,510 • ⑂ 26,840</div>
              </div>
              <div>
                <div class="embed-field-name">Open Issues / PRs</div>
                <div class="embed-field-value">Issue: 412 • PR: 89</div>
              </div>
              <div>
                <div class="embed-field-name">License / Branch</div>
                <div class="embed-field-value">MIT • canary</div>
              </div>
              <div>
                <div class="embed-field-name">30d Star Velocity</div>
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
          <svg viewBox="0 0 16 16"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"/></svg>
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
            <div class="embed-title">canary • Run #4,892 Passed</div>
            <div class="embed-desc">Triggered by <strong>@leerob</strong> via push on commit <code>3a91e4f</code></div>
            <div class="embed-code-block">canary (commit 3a91e4f)
├── Unit Tests (Node 20 & 22)   ✅ Passing (1m 42s)
├── Turbopack Integration E2E   ✅ Passing (4m 15s)
├── Edge Runtime Compatibility  ✅ Passing (52s)
├── Security Scanning & Audit   ✅ Passing (38s)
└── Production Bundle Analyzer  ✅ Passing (1m 04s)</div>
            <div class="discord-action-row">
              <button class="discord-btn" id="sim-btn-rerun">Rerun All Jobs</button>
              <button class="discord-btn discord-btn-danger" id="sim-btn-cancel" disabled>Cancel</button>
              <button class="discord-btn" onclick="window.open('https://github.com', '_blank')">View Workflow Run ↗</button>
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
          <svg viewBox="0 0 16 16"><path d="M11.5 7a4.499 4.499 0 1 1-8.998 0A4.499 4.499 0 0 1 11.5 7Zm-.82 4.74a6 6 0 1 0-1.06 1.06l3.04 3.04a.75.75 0 1 0 1.06-1.06l-3.04-3.04Z"/></svg>
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
            <div class="embed-title">Full End-to-End Development Trace</div>
            <div class="embed-desc">Chronological lifecycle trace from original bug report to published version:</div>
            <div class="embed-code-block">1. Issue Created:   #892 "Hydration mismatch in nested parallel routes" by @alex (Sep 1)
2. Branch Created:  feature/route-cache (Sep 2)
3. Commit Added:    8f3b12a "fix: reconcile router slot metadata" by @timneutkens
4. PR Opened:       #142 (Sep 2)
5. CI Verification: 12 checks passed (Sep 2)
6. Code Reviews:    Approved by @sokra & @kdy1 (Sep 3)
7. Merged:          Merged into canary by @timneutkens (Sep 3)
8. Shipped In:      v15.2.0-canary.18 (Sep 4)</div>
            <div class="discord-action-row">
              <button class="discord-btn" onclick="copyText('Issue #892 -> PR #142 -> v15.2.0-canary.18', this)">Copy Investigation Summary</button>
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
          <svg viewBox="0 0 16 16"><path d="m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .215-.734.749.749 0 0 1 1.06-.026Zm-6.56 0a.75.75 0 0 1 1.06 0 .749.749 0 0 1 .215.734.749.749 0 0 1-.215.734L2.06 8l3.72 3.72a.749.749 0 0 1-.215.734.749.749 0 0 1-1.06.026L.22 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"/></svg>
        </div>
        <div class="discord-content">
          <div class="discord-header">
            <span class="bot-name">DevPulse</span>
            <span class="bot-tag">BOT</span>
            <span class="message-time">Today at 10:52 AM</span>
          </div>
          <div class="command-echo">/code blame file:packages/next/src/server/route-matcher.ts lines:40-46</div>
          <div class="discord-embed" style="border-left-color: #58a6ff">
            <div class="embed-author">Code Blame & Attribution</div>
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
          <svg viewBox="0 0 16 16"><path d="M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 2.53 11.53a.75.75 0 0 1-1.06-1.06l5-5a.75.75 0 0 1 1.06 0L10 7.94l4.72-4.72a.75.75 0 0 1 1.06 1.06Z"/></svg>
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
              Total Commits: <strong>48</strong> • PRs Authored: <strong>6</strong> • PRs Reviewed: <strong>14</strong>
              Weekly Rhythm Histogram:
            </div>
            <div class="embed-code-block">Mon ████████████████ 14
Tue ████████████     10
Wed ████████         6
Thu ██████████████   12
Fri ████             4
Sat █                1
Sun █                1</div>
            <div class="embed-grid">
              <div>
                <div class="embed-field-name">Churn Ratio</div>
                <div class="embed-field-value">+2,140 / −840 (2.5x)</div>
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
      mergeBtn.textContent = "Merging...";
      setTimeout(() => {
        state.prStatus = "merged";
        renderSimulator();
      }, 500);
    });
  }

  if (rerunBtn) {
    rerunBtn.addEventListener("click", () => {
      rerunBtn.textContent = "Dispatching GitHub Actions...";
      setTimeout(() => {
        rerunBtn.textContent = "Workflows Triggered ✅";
      }, 700);
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
  // Tab switching
  const tabs = document.querySelectorAll<HTMLButtonElement>(".sim-tab-btn");
  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      for (const t of tabs) {
        t.classList.remove("active");
      }
      tab.classList.add("active");
      const target = tab.getAttribute("data-tab");
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
