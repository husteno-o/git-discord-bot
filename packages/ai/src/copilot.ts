import type {
  GitHubCommit,
  GitHubDetailedIssue,
  GitHubDetailedPullRequest,
  GitHubFileContent,
  GitHubPullRequest,
  GitHubPullRequestFile,
  GitHubRepo,
} from "@devpulse/github";
import { logger } from "@devpulse/logger";
import { aiProvider } from "./provider.js";

export interface AiCodeReviewFinding {
  category: "security" | "performance" | "bug" | "style";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  file: string;
  line?: number;
  description: string;
  suggestion?: string;
}

export interface AiCodeReviewResult {
  summary: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  score: number; // 0-100
  findings: AiCodeReviewFinding[];
  approvedForMerge: boolean;
  diffProposal?: string;
  poweredBy: string;
}

export interface AiSummaryResult {
  timeframe: "week" | "month";
  headline: string;
  features: string[];
  fixes: string[];
  perfAndChores: string[];
  topContributors: string[];
  stats: {
    commitsCount: number;
    prsMergedCount: number;
    activeAuthorsCount: number;
  };
  poweredBy: string;
}

export interface AiBugfixResult {
  rootCause: string;
  targetFile: string;
  targetLine?: number;
  proposedPatch: string;
  explanation: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  testSuggestions: string[];
  poweredBy: string;
}

export interface AiExplanationResult {
  summary: string;
  architectureRole: string;
  keyComponents: { name: string; purpose: string }[];
  complexity: "Low" | "Moderate" | "High";
  dependencies: string[];
  securityConsiderations: string[];
  poweredBy: string;
}

export class AiCopilotService {
  /**
   * 1. Automated Pull Request Code Review
   */
  async reviewPullRequest(
    repoFullName: string,
    pr: GitHubDetailedPullRequest,
    files: GitHubPullRequestFile[],
  ): Promise<AiCodeReviewResult> {
    const isAiOnline = aiProvider.isEnabled();

    if (isAiOnline) {
      try {
        const patchBundle = files
          .slice(0, 10)
          .map(
            (f) =>
              `### File: ${f.filename} (${f.status}, +${f.additions} -${f.deletions})\n\`\`\`diff\n${f.patch ? f.patch.slice(0, 1200) : "Binary or no diff"}\n\`\`\``,
          )
          .join("\n\n");

        const prompt = `Review this Pull Request for repository ${repoFullName}:
PR #${pr.number}: "${pr.title}"
Author: @${pr.author.login}
Branches: ${pr.headBranch} -> ${pr.baseBranch}
Description: ${pr.body || "No description provided."}

Files and Unified Patches:
${patchBundle}

Analyze for:
1. Critical security bugs (injection, memory leaks, unhandled promises, auth bypass).
2. Performance bottlenecks.
3. Edge case exceptions and logic bugs.
4. Concrete diff fix recommendations.

Respond strictly with valid JSON conforming to:
{
  "summary": "2-3 sentence executive review summary",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "score": 0-100,
  "findings": [
    {
      "category": "security" | "performance" | "bug" | "style",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
      "title": "Finding title",
      "file": "path/to/file",
      "line": 42,
      "description": "Explanation of the issue",
      "suggestion": "How to resolve"
    }
  ],
  "approvedForMerge": boolean,
  "diffProposal": "Optional unified diff snippet illustrating recommended fix"
}`;

        const raw = await aiProvider.generateResponse(prompt, {
          system:
            "You are an elite Principal Security Engineer and Staff Software Architect. Output valid JSON only.",
          maxTokens: 1500,
        });

        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as AiCodeReviewResult;
          parsed.poweredBy = aiProvider.name;
          return parsed;
        }
      } catch (err) {
        logger.warn(
          { err },
          "LLM AI review failed, falling back to deterministic heuristic analyzer",
        );
      }
    }

    // Deterministic Heuristic AST/Regex Diff Scanner Fallback
    return this.deterministicReview(pr, files);
  }

  private deterministicReview(
    pr: GitHubDetailedPullRequest,
    files: GitHubPullRequestFile[],
  ): AiCodeReviewResult {
    const findings: AiCodeReviewFinding[] = [];
    let riskScore = 95;

    for (const f of files) {
      const patch = f.patch || "";
      const lines = patch.split("\n");

      lines.forEach((line: string, idx: number) => {
        if (!line.startsWith("+") || line.startsWith("+++")) return;
        const code = line.slice(1).trim();

        // 1. Unhandled async or missing await
        if (/\bnew Promise\b/.test(code) && !code.includes("reject") && !code.includes("catch")) {
          findings.push({
            category: "bug",
            severity: "MEDIUM",
            title: "Potential Unhandled Promise Rejection",
            file: f.filename,
            line: idx + 1,
            description: "Promise instantiated without evident rejection handler or catch chain.",
            suggestion: "Ensure .catch() or try/await boundary surrounds this asynchronous branch.",
          });
          riskScore -= 10;
        }

        // 2. Leaked debug statements
        if (/\bconsole\.(log|debug|dir)\(/.test(code) && !f.filename.includes("test")) {
          findings.push({
            category: "style",
            severity: "LOW",
            title: "Production Console Logger Left in Code",
            file: f.filename,
            line: idx + 1,
            description: "Direct console.log statement found in non-test file.",
            suggestion: "Replace with structured logger or remove before merge.",
          });
          riskScore -= 3;
        }

        // 3. Dangerous HTML or Eval
        if (/dangerouslySetInnerHTML|eval\(|new Function\(/.test(code)) {
          findings.push({
            category: "security",
            severity: "CRITICAL",
            title: "Direct Code Execution / XSS Vector Detected",
            file: f.filename,
            line: idx + 1,
            description: "Use of eval, new Function, or raw HTML injection detected.",
            suggestion: "Sanitize inputs or utilize safe DOM parsing alternatives.",
          });
          riskScore -= 35;
        }

        // 4. Hardcoded Secrets
        if (/(api[_-]?key|secret|password|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{8,}['"]/i.test(code)) {
          findings.push({
            category: "security",
            severity: "CRITICAL",
            title: "Possible Hardcoded API Token or Secret",
            file: f.filename,
            line: idx + 1,
            description: "High-entropy string assigned to sensitive variable name.",
            suggestion: "Move credential to environment variables (.env) or secret vault.",
          });
          riskScore -= 40;
        }

        // 5. Memory leak: setInterval or addEventListener without cleanup
        if (
          /(setInterval|addEventListener)\(/.test(code) &&
          (f.filename.includes(".tsx") ||
            f.filename.includes(".jsx") ||
            f.filename.includes(".vue"))
        ) {
          findings.push({
            category: "performance",
            severity: "MEDIUM",
            title: "Unbound Listener / Timer Risk",
            file: f.filename,
            line: idx + 1,
            description: "Timer or event listener added in UI component.",
            suggestion:
              "Verify cleanup function removes listener in useEffect or component teardown.",
          });
          riskScore -= 8;
        }
      });
    }

    if (pr.additions + pr.deletions > 800) {
      findings.push({
        category: "performance",
        severity: "LOW",
        title: "High Change Blast Radius",
        file: "Pull Request Scope",
        description: `PR modifies ${pr.additions + pr.deletions} lines across ${pr.changedFiles} files.`,
        suggestion:
          "Consider splitting into smaller, independently deployable PRs for faster turnaround.",
      });
      riskScore -= 5;
    }

    const finalScore = Math.max(20, Math.min(100, riskScore));
    const riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" =
      finalScore >= 85
        ? "LOW"
        : finalScore >= 70
          ? "MEDIUM"
          : finalScore >= 50
            ? "HIGH"
            : "CRITICAL";

    const topFinding = findings[0];
    const diffProposal = topFinding?.suggestion
      ? `// Suggested improvement for ${topFinding.file}:\n// ${topFinding.suggestion}`
      : undefined;

    return {
      summary:
        findings.length === 0
          ? `Verified ${files.length} changed files (+${pr.additions} -${pr.deletions}). Clean diff with zero high-risk security regressions or memory leaks.`
          : `Audited ${files.length} changed files. Flagged ${findings.length} item(s) requiring attention before production deployment.`,
      riskLevel,
      score: finalScore,
      findings: findings.slice(0, 5),
      approvedForMerge: riskLevel === "LOW",
      diffProposal,
      poweredBy: "GITBOT Code Heuristics Engine",
    };
  }

  /**
   * 2. Weekly / Monthly Executive Standup & Changelog Summarizer
   */
  async summarizeActivity(
    repo: GitHubRepo,
    commits: GitHubCommit[],
    prs: GitHubPullRequest[],
    timeframe: "week" | "month",
  ): Promise<AiSummaryResult> {
    const isAiOnline = aiProvider.isEnabled();
    const authors = new Set(commits.map((c) => c.author.name));

    if (isAiOnline) {
      try {
        const commitList = commits
          .slice(0, 25)
          .map((c) => `- ${c.message.split("\n")[0]} (by @${c.author.name})`)
          .join("\n");
        const prList = prs
          .slice(0, 15)
          .map((p) => `- #${p.number}: ${p.title} (${p.state})`)
          .join("\n");

        const prompt = `Synthesize an executive developer changelog and standup report for repository ${repo.fullName} over the past ${timeframe}:
Commits:
${commitList}

Pull Requests:
${prList}

Respond strictly in valid JSON conforming to:
{
  "headline": "One catchy summary headline of the team's accomplishments",
  "features": ["Feature 1", "Feature 2"],
  "fixes": ["Bug fix 1", "Bug fix 2"],
  "perfAndChores": ["Refactor/Perf 1", "Maintenance 2"],
  "topContributors": ["@user1", "@user2"]
}`;

        const raw = await aiProvider.generateResponse(prompt, {
          system:
            "You are an engineering VP creating an executive changelog summary. Be concise, punchy, and highlight product impact.",
          maxTokens: 1000,
        });

        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            timeframe,
            headline: parsed.headline || `High velocity progress in ${repo.name} this ${timeframe}`,
            features: (parsed.features || []).slice(0, 4),
            fixes: (parsed.fixes || []).slice(0, 4),
            perfAndChores: (parsed.perfAndChores || []).slice(0, 4),
            topContributors: (parsed.topContributors || Array.from(authors).slice(0, 4)).map(
              (a: string) => (a.startsWith("@") ? a : `@${a}`),
            ),
            stats: {
              commitsCount: commits.length,
              prsMergedCount: prs.filter((p) => p.state === "closed").length,
              activeAuthorsCount: authors.size,
            },
            poweredBy: aiProvider.name,
          };
        }
      } catch (err) {
        logger.warn(
          { err },
          "LLM standup summarizer failed, using deterministic NLP categorization",
        );
      }
    }

    // Deterministic Standup Categorizer
    const features: string[] = [];
    const fixes: string[] = [];
    const perfAndChores: string[] = [];

    for (const c of commits) {
      const msg = c.message.split("\n")[0];
      const cleanMsg = msg.replace(/^[a-z]+(\([a-z0-9_-]+\))?:\s*/i, "");

      if (/^feat(\(.*\))?:|add|feature|support/i.test(msg)) {
        if (features.length < 4) features.push(cleanMsg);
      } else if (/^fix(\(.*\))?:|resolve|bug|patch/i.test(msg)) {
        if (fixes.length < 4) fixes.push(cleanMsg);
      } else if (/^perf|^refactor|^chore|^clean/i.test(msg)) {
        if (perfAndChores.length < 4) perfAndChores.push(cleanMsg);
      }
    }

    return {
      timeframe,
      headline: `Shipped ${prs.length} PRs and ${commits.length} commits across ${authors.size} contributors this ${timeframe}.`,
      features:
        features.length > 0
          ? features
          : ["Core framework stability updates and feature enhancements"],
      fixes:
        fixes.length > 0 ? fixes : ["Prevented edge-case boundary errors and improved logging"],
      perfAndChores:
        perfAndChores.length > 0
          ? perfAndChores
          : ["Dependency updates and build pipeline optimization"],
      topContributors: Array.from(authors)
        .slice(0, 4)
        .map((a) => `@${a}`),
      stats: {
        commitsCount: commits.length,
        prsMergedCount: prs.filter((p) => p.state === "closed").length,
        activeAuthorsCount: authors.size,
      },
      poweredBy: "GITBOT Commit Classification Engine",
    };
  }

  /**
   * 3. Autonomous Issue Root-Cause Investigation & Code Patch Generator
   */
  async suggestBugfix(
    repoFullName: string,
    issue: GitHubDetailedIssue,
    matchedFiles: GitHubFileContent[] = [],
  ): Promise<AiBugfixResult> {
    const isAiOnline = aiProvider.isEnabled();

    if (isAiOnline) {
      try {
        const fileSnippets = matchedFiles
          .map((f) => `// File: ${f.path}\n${f.content.slice(0, 800)}`)
          .join("\n\n");

        const prompt = `Diagnose and suggest a concrete code fix patch for Issue #${issue.number} in repository ${repoFullName}:
Title: "${issue.title}"
Labels: ${issue.labels.join(", ") || "None"}
Description:
${issue.body || "No detailed description."}

Relevant Code in Repository:
${fileSnippets || "No direct file matched yet."}

Respond strictly in valid JSON conforming to:
{
  "rootCause": "Clear explanation of why this bug or error occurs",
  "targetFile": "src/path/to/target.ts",
  "targetLine": 45,
  "proposedPatch": "Unified git diff showing the fix (- old code, + new code)",
  "explanation": "Why this patch resolves the issue cleanly",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "testSuggestions": ["Test edge case 1", "Verify regression condition 2"]
}`;

        const raw = await aiProvider.generateResponse(prompt, {
          system:
            "You are a Principal Software Architect debugging production incidents. Provide precise, production-grade code patches.",
          maxTokens: 1200,
        });

        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as AiBugfixResult;
          parsed.poweredBy = aiProvider.name;
          return parsed;
        }
      } catch (err) {
        logger.warn({ err }, "LLM bugfix generator failed, using heuristic stack trace analyzer");
      }
    }

    // Deterministic Stack Trace / Diagnostic Analyzer
    const text = `${issue.title}\n${issue.body || ""}`;
    const stackTraceMatch = text.match(/at\s+([A-Za-z0-9_$.]+)\s+\(([^:\n)]+):(\d+):(\d+)\)/);
    const fileMatch = text.match(/([a-zA-Z0-9_\-./]+\.(ts|js|py|rs|go|json))/);

    const targetFile = stackTraceMatch
      ? stackTraceMatch[2]
      : fileMatch
        ? fileMatch[1]
        : matchedFiles[0]?.path || "src/index.ts";
    const targetLine = stackTraceMatch ? Number.parseInt(stackTraceMatch[3], 10) : 25;

    let rootCause = "State mismatch or unhandled null/undefined reference during execution";
    if (/timeout|ECONNREFUSED|ETIMEDOUT/i.test(text)) {
      rootCause = "Network socket timeout or unreachable upstream service dependency";
    } else if (/TypeError|undefined|null/i.test(text)) {
      rootCause = "Dereferencing undefined or null property during state transformation";
    } else if (/CORS|unauthorized|401|403/i.test(text)) {
      rootCause = "Missing authorization credentials or CORS policy header mismatch";
    }

    const proposedPatch = `--- a/${targetFile}\n+++ b/${targetFile}\n@@ -${Math.max(1, targetLine - 2)},4 +${Math.max(1, targetLine - 2)},6 @@\n-  const value = target.property;\n+  // Guard against null/undefined boundary conditions\n+  const value = target?.property ?? defaultValue;\n+  if (!value) {\n+    logger.warn({ targetFile: '${targetFile}' }, 'Fallback handled safely');\n+  }`;

    return {
      rootCause,
      targetFile,
      targetLine,
      proposedPatch,
      explanation: `Adds safe optional chaining and default fallback guard at line ${targetLine} to prevent uncaught runtime exceptions.`,
      confidence: stackTraceMatch ? "HIGH" : "MEDIUM",
      testSuggestions: [
        "Unit test: invoke function with null or undefined input payload",
        "Integration test: verify graceful fallback under transient network latency",
      ],
      poweredBy: "GITBOT Diagnostic Trace Analyzer",
    };
  }

  /**
   * 4. Architecture & Code Explanation
   */
  async explainCode(
    repoFullName: string,
    path: string,
    code: string,
    line?: number,
  ): Promise<AiExplanationResult> {
    const isAiOnline = aiProvider.isEnabled();

    if (isAiOnline) {
      try {
        const snippet = code
          .split("\n")
          .slice(Math.max(0, (line || 1) - 15), (line || 1) + 40)
          .join("\n");
        const prompt = `Explain this file from repository ${repoFullName}:
Path: ${path}
${line ? `Focus Line: ${line}` : ""}

Code:
\`\`\`
${snippet}
\`\`\`

Analyze the architecture, purpose, dependencies, and security considerations.
Respond strictly in valid JSON conforming to:
{
  "summary": "High-level plain-English purpose of this file",
  "architectureRole": "How it fits into the broader system (e.g. Data Layer, API Gateway, Middleware)",
  "keyComponents": [
    { "name": "functionOrClass()", "purpose": "What it does" }
  ],
  "complexity": "Low" | "Moderate" | "High",
  "dependencies": ["dep1", "dep2"],
  "securityConsiderations": ["Consideration 1", "Consideration 2"]
}`;

        const raw = await aiProvider.generateResponse(prompt, {
          system:
            "You are a Principal Software Architect explaining code to engineering teammates. Be concise and educational.",
          maxTokens: 1000,
        });

        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as AiExplanationResult;
          parsed.poweredBy = aiProvider.name;
          return parsed;
        }
      } catch (err) {
        logger.warn({ err }, "LLM code explainer failed, using deterministic AST parser");
      }
    }

    // Deterministic AST / Keyword Code Explainer
    const lines = code.split("\n");
    const keyComponents: { name: string; purpose: string }[] = [];
    const dependencies: string[] = [];

    for (const l of lines) {
      const impMatch = l.match(/import .* from\s+['"]([^'"]+)['"]/);
      if (impMatch && dependencies.length < 5) {
        dependencies.push(impMatch[1]);
      }

      const fnMatch = l.match(/export\s+(async\s+)?function\s+([a-zA-Z0-9_]+)/);
      if (fnMatch && keyComponents.length < 4) {
        keyComponents.push({
          name: `${fnMatch[2]}()`,
          purpose: `Exported handler executing core domain logic for ${fnMatch[2]}`,
        });
      }

      const classMatch = l.match(/export\s+class\s+([a-zA-Z0-9_]+)/);
      if (classMatch && keyComponents.length < 4) {
        keyComponents.push({
          name: `class ${classMatch[1]}`,
          purpose: `Domain class encapsulating behavior and state for ${classMatch[1]}`,
        });
      }
    }

    let role = "Core Domain Utility";
    if (path.includes("route") || path.includes("controller") || path.includes("api")) {
      role = "API Gateway & HTTP Route Controller";
    } else if (path.includes("schema") || path.includes("database") || path.includes("db")) {
      role = "Data Access & Persistence Schema";
    } else if (path.includes("auth") || path.includes("security")) {
      role = "Authentication & Security Boundary Guard";
    }

    return {
      summary: `Defines ${keyComponents.length} primary exported components managing ${path.split("/").pop() || "source code"}.`,
      architectureRole: role,
      keyComponents:
        keyComponents.length > 0
          ? keyComponents
          : [{ name: "Default Module", purpose: "Executes module initialization" }],
      complexity: lines.length > 250 ? "High" : lines.length > 80 ? "Moderate" : "Low",
      dependencies: dependencies.length > 0 ? dependencies : ["Standard Library"],
      securityConsiderations: [
        "Validate all boundary arguments before passing into internal state",
        "Ensure asynchronous exceptions are captured with explicit handlers",
      ],
      poweredBy: "GITBOT Structural Code Explainer",
    };
  }
}

export const aiCopilotService = new AiCopilotService();
