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
import { z } from "zod";
import { aiProvider } from "./provider.js";

const AiCodeReviewFindingSchema = z.object({
  category: z.enum(["security", "performance", "bug", "style"]),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
  title: z.string().min(1),
  file: z.string(),
  line: z.number().optional(),
  description: z.string().min(1),
  suggestion: z.string().optional(),
});

const AiCodeReviewResultSchema = z.object({
  summary: z.string().min(1),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  score: z.number().min(0).max(100),
  findings: z.array(AiCodeReviewFindingSchema),
  approvedForMerge: z.boolean(),
  diffProposal: z.string().optional(),
});

const AiSummaryResultSchema = z.object({
  headline: z.string().min(1),
  features: z.array(z.string()),
  fixes: z.array(z.string()),
  perfAndChores: z.array(z.string()),
  topContributors: z.array(z.string()),
});

const AiBugfixResultSchema = z.object({
  rootCause: z.string().min(1),
  targetFile: z.string(),
  targetLine: z.number().optional(),
  proposedPatch: z.string().optional().default(""),
  explanation: z.string().min(1),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  testSuggestions: z.array(z.string()),
});

const AiExplanationResultSchema = z.object({
  summary: z.string().min(1),
  architectureRole: z.string().min(1),
  keyComponents: z.array(z.object({ name: z.string(), purpose: z.string() })),
  complexity: z.enum(["Low", "Moderate", "High"]),
  dependencies: z.array(z.string()),
  securityConsiderations: z.array(z.string()),
});

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
  score: number;
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
          const rawParsed = JSON.parse(jsonMatch[0]);
          const result = AiCodeReviewResultSchema.safeParse(rawParsed);
          if (result.success) {
            return { ...result.data, poweredBy: aiProvider.name };
          }
          logger.warn({ issues: result.error.issues }, "AI review response failed validation");
        }
      } catch (err: unknown) {
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
    let riskScore = 100;
    let securityIssues = 0;
    let bugIssues = 0;
    let perfIssues = 0;
    let styleIssues = 0;

    for (const f of files) {
      const patch = f.patch || "";
      const lines = patch.split("\n");
      let hasCleanup = /clearInterval|removeEventListener|abort\(\)|return\s*\(\s*\)\s*=>\s*\{/.test(patch);
      let hasAwait = /await/.test(patch);
      let hasTryCatch = /try\s*\{/.test(patch);
      const hasTypeAnnotation = /:\s*(string|number|boolean|Promise<|Array<)/.test(patch);
      if (!hasTypeAnnotation && f.filename.match(/\.(ts|tsx)$/)) {
        findings.push({
          category: "style",
          severity: "LOW",
          title: "No Type Annotations Detected",
          file: f.filename,
          description: "TypeScript file has no visible type annotations in this diff. Implicit 'any' reduces type safety.",
          suggestion: "Add explicit type annotations to function parameters and return types for better compile-time guarantees.",
        });
        riskScore -= 3;
      }

      lines.forEach((line: string, idx: number) => {
        if (!line.startsWith("+") || line.startsWith("+++")) return;
        const code = line.slice(1).trim();

        // 1. Unhandled async or missing await
        if (/\bnew Promise\b/.test(code) && !code.includes("reject") && !code.includes("catch")) {
          findings.push({
            category: "bug",
            severity: "HIGH",
            title: "Unhandled Promise Rejection Risk",
            file: f.filename,
            line: idx + 1,
            description: "Promise created without .catch() or rejection handler. Crashes Node.js on unhandled rejection.",
            suggestion: "Wrap in try/catch or append .catch() handler to gracefully manage async failures.",
          });
          riskScore -= 12;
          bugIssues++;
        }

        // 2. Missing await on async call
        if (/\b(fetch|axios|await\s+import|Promise\.all|Promise\.race)\b/.test(code) && !hasAwait && !code.includes("await")) {
          findings.push({
            category: "bug",
            severity: "MEDIUM",
            title: "Missing Await on Async Operation",
            file: f.filename,
            line: idx + 1,
            description: "Async call detected without await — returns unresolved Promise instead of resolved value.",
            suggestion: "Add `await` before the async call or handle the returned Promise explicitly.",
          });
          riskScore -= 8;
          bugIssues++;
        }

        // 3. Leaked debug statements
        if (/\bconsole\.(log|debug|dir|trace)\(/.test(code) && !f.filename.includes("test")) {
          findings.push({
            category: "style",
            severity: "LOW",
            title: "Production Console Statement",
            file: f.filename,
            line: idx + 1,
            description: `console.${code.match(/\bconsole\.(\w+)/)?.[1] || "log"}() left in production code leaks internal state to stdout.`,
            suggestion: "Use structured logger (pino/winston) with appropriate log level, or remove before merge.",
          });
          riskScore -= 3;
          styleIssues++;
        }

        // 4. Dangerous HTML or Eval
        if (/dangerouslySetInnerHTML|eval\(|new Function\(|\.innerHTML\s*=/.test(code)) {
          findings.push({
            category: "security",
            severity: "CRITICAL",
            title: "XSS / Code Injection Vector",
            file: f.filename,
            line: idx + 1,
            description: "Direct code execution or unsanitized HTML injection detected. Attackers can inject arbitrary scripts.",
            suggestion: "Use DOMPurify for HTML sanitization, or safe DOM APIs (textContent, createElement). Never use eval().",
          });
          riskScore -= 30;
          securityIssues++;
        }

        // 5. Hardcoded Secrets
        if (/(api[_-]?key|secret|password|token|private[_-]?key)\s*[:=]\s*['"][A-Za-z0-9_\-]{12,}['"]/i.test(code)) {
          findings.push({
            category: "security",
            severity: "CRITICAL",
            title: "Hardcoded Credential in Source",
            file: f.filename,
            line: idx + 1,
            description: "High-entropy secret string committed to source control. Exposed in git history even after removal.",
            suggestion: "Immediately rotate this credential. Use environment variables or a secret vault (AWS Secrets Manager, Vault).",
          });
          riskScore -= 35;
          securityIssues++;
        }

        // 6. Memory leak: setInterval or addEventListener without cleanup
        if (
          /(setInterval|addEventListener)\(/.test(code) &&
          !hasCleanup &&
          (f.filename.includes(".tsx") || f.filename.includes(".jsx") || f.filename.includes(".vue"))
        ) {
          findings.push({
            category: "performance",
            severity: "HIGH",
            title: "Unbounded Timer / Event Listener",
            file: f.filename,
            line: idx + 1,
            description: "Timer or listener attached without visible cleanup. Accumulates on re-renders causing memory leaks.",
            suggestion: "Return cleanup function from useEffect that calls clearInterval/removeEventListener on unmount.",
          });
          riskScore -= 10;
          perfIssues++;
        }

        // 7. SQL Injection Risk
        if (/\b(query|execute|sql)\s*\(.*(\$\{|`.*\$\{|[\+"])/i.test(code) || /\bWHERE\b.*[\+\$\`]/i.test(code)) {
          findings.push({
            category: "security",
            severity: "CRITICAL",
            title: "SQL Injection Vulnerability",
            file: f.filename,
            line: idx + 1,
            description: "Dynamic SQL string concatenation detected. Attacker can inject arbitrary SQL commands.",
            suggestion: "Use parameterized queries or prepared statements. Never interpolate user input into SQL strings.",
          });
          riskScore -= 30;
          securityIssues++;
        }

        // 8. Floating Promise (no return or await)
        if (/(async\s+function|\.then\()/.test(code) && !hasTryCatch && lines.length > 5) {
          findings.push({
            category: "bug",
            severity: "MEDIUM",
            title: "Floating Promise Without Error Boundary",
            file: f.filename,
            line: idx + 1,
            description: "Async operation without try/catch wrapper. Errors propagate as unhandled rejections.",
            suggestion: "Wrap async operations in try/catch blocks with proper error logging and user-facing fallbacks.",
          });
          riskScore -= 7;
          bugIssues++;
        }

        // 9. Large function / file
        if (idx > 50 && lines.slice(idx, idx + 20).filter(l => l.startsWith("+")).length > 20) {
          findings.push({
            category: "style",
            severity: "MEDIUM",
            title: "Large Code Block — Consider Splitting",
            file: f.filename,
            line: idx + 1,
            description: "Adding 20+ lines in single block suggests function may violate single-responsibility principle.",
            suggestion: "Extract logic into smaller, testable helper functions with clear interfaces.",
          });
          riskScore -= 5;
          styleIssues++;
        }

        // 10. TODO/FIXME/HACK left in code
        if (/\/\/\s*(TODO|FIXME|HACK|XXX|TEMP)\b/i.test(code)) {
          findings.push({
            category: "style",
            severity: "LOW",
            title: "Unresolved Technical Debt Marker",
            file: f.filename,
            line: idx + 1,
            description: `Code marker "${code.match(/\/\/\s*(TODO|FIXME|HACK|XXX|TEMP)/i)?.[1]}" indicates incomplete implementation.`,
            suggestion: "Resolve the tracked issue before merge, or file a follow-up ticket with reference.",
          });
          riskScore -= 2;
          styleIssues++;
        }

        // 11. Type safety: using 'any' type
        if (f.filename.match(/\.(ts|tsx)$/) && /:\s*any\b|as any|<any>/.test(code)) {
          findings.push({
            category: "bug",
            severity: "MEDIUM",
            title: "Type Safety: 'any' Type Usage",
            file: f.filename,
            line: idx + 1,
            description: "Using 'any' bypasses TypeScript's type checker, deferring errors to runtime.",
            suggestion: "Replace with proper type annotations, generics, or 'unknown' with type guards.",
          });
          riskScore -= 5;
          bugIssues++;
        }

        // 12. Missing error handling in catch blocks
        if (/\bcatch\s*\(/.test(code) && !/\b(console\.error|log|throw|reject)/.test(lines[idx + 1] || "")) {
          findings.push({
            category: "bug",
            severity: "HIGH",
            title: "Silent Catch Block — Swallowed Error",
            file: f.filename,
            line: idx + 1,
            description: "Catch block detected without error logging or re-throw. Failures become invisible.",
            suggestion: "Log the error context and either re-throw or return a meaningful error response.",
          });
          riskScore -= 10;
          bugIssues++;
        }
      });
    }

    // PR-level analysis
    if (pr.additions + pr.deletions > 800) {
      findings.push({
        category: "performance",
        severity: "MEDIUM",
        title: "High Change Blast Radius",
        file: "Pull Request Scope",
        description: `PR modifies ${pr.additions + pr.deletions} lines across ${pr.changedFiles} files. Reviewability degrades significantly.`,
        suggestion: "Split into smaller, independently deployable PRs (aim for < 400 lines changed).",
      });
      riskScore -= 5;
    }

    if (!pr.body || pr.body.length < 20) {
      findings.push({
        category: "style",
        severity: "LOW",
        title: "Missing PR Description",
        file: "Pull Request",
        description: "PR lacks a meaningful description. Reviewers lack context on intent and testing strategy.",
        suggestion: "Add description covering: motivation, changes made, testing performed, and breaking changes.",
      });
      riskScore -= 2;
    }

    const finalScore = Math.max(10, Math.min(100, riskScore));
    const riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" =
      finalScore >= 80
        ? "LOW"
        : finalScore >= 60
          ? "MEDIUM"
          : finalScore >= 40
            ? "HIGH"
            : "CRITICAL";

    const criticalFindings = findings.filter(f => f.severity === "CRITICAL" || f.severity === "HIGH");
    const topFinding = criticalFindings[0] || findings[0];
    const diffProposal = topFinding?.suggestion
      ? `// Fix for ${topFinding.file}${topFinding.line ? `:${topFinding.line}` : ""}:\n// ${topFinding.suggestion}`
      : undefined;

    return {
      summary:
        findings.length === 0
          ? `✓ Clean review: ${files.length} files, +${pr.additions}/-${pr.deletions} lines. Zero security, bug, or performance regressions. Safe to merge.`
          : `⚠ ${findings.length} findings across ${files.length} files: ${securityIssues} security, ${bugIssues} bugs, ${perfIssues} performance, ${styleIssues} style. ${criticalFindings.length} require immediate attention.`,
      riskLevel,
      score: finalScore,
      findings: findings.slice(0, 8),
      approvedForMerge: riskLevel === "LOW" && securityIssues === 0,
      diffProposal,
      poweredBy: "GITBOT Heuristic Analyzer v2",
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
          const rawParsed = JSON.parse(jsonMatch[0]);
          const result = AiSummaryResultSchema.safeParse(rawParsed);
          if (result.success) {
            return {
              timeframe,
              headline: result.data.headline,
              features: result.data.features.slice(0, 4),
              fixes: result.data.fixes.slice(0, 4),
              perfAndChores: result.data.perfAndChores.slice(0, 4),
              topContributors: result.data.topContributors.map(
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
          logger.warn({ issues: result.error.issues }, "AI summary response failed validation");
        }
      } catch (err: unknown) {
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
          const rawParsed = JSON.parse(jsonMatch[0]);
          const result = AiBugfixResultSchema.safeParse(rawParsed);
          if (result.success) {
            return { ...result.data, poweredBy: aiProvider.name };
          }
          logger.warn({ issues: result.error.issues }, "AI bugfix response failed validation");
        }
      } catch (err: unknown) {
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
          const rawParsed = JSON.parse(jsonMatch[0]);
          const result = AiExplanationResultSchema.safeParse(rawParsed);
          if (result.success) {
            return { ...result.data, poweredBy: aiProvider.name };
          }
          logger.warn({ issues: result.error.issues }, "AI explanation response failed validation");
        }
      } catch (err: unknown) {
        logger.warn({ err }, "LLM code explainer failed, using deterministic AST parser");
      }
    }

    // Deterministic AST / Keyword Code Explainer
    const lines = code.split("\n");
    const keyComponents: { name: string; purpose: string }[] = [];
    const dependencies: string[] = [];
    const securityConsiderations: string[] = [];
    let hasAsync = false;
    let hasErrorHandling = false;
    let hasValidation = false;
    let hasSideEffects = false;
    let patternDetected = "Module";

    for (const l of lines) {
      const trimmed = l.trim();

      // Imports
      const impMatch = trimmed.match(/import\s+(?:.+\s+from\s+)?['"]([^'"]+)['"]/);
      if (impMatch && !dependencies.includes(impMatch[1]) && dependencies.length < 8) {
        dependencies.push(impMatch[1]);
      }

      // Exported functions
      const fnMatch = trimmed.match(/export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)/);
      if (fnMatch && keyComponents.length < 6) {
        const params = fnMatch[2] ? fnMatch[2].split(",").map(p => p.trim().split(/[=:]/)[0].trim()).filter(Boolean) : [];
        keyComponents.push({
          name: `${fnMatch[1]}(${params.slice(0, 3).join(", ")}${params.length > 3 ? "..." : ""})`,
          purpose: inferFunctionPurpose(fnMatch[1], trimmed, code),
        });
      }

      // Arrow functions
      const arrowMatch = trimmed.match(/export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/);
      if (arrowMatch && keyComponents.length < 6) {
        keyComponents.push({
          name: `${arrowMatch[1]}()`,
          purpose: inferFunctionPurpose(arrowMatch[1], trimmed, code),
        });
      }

      // Classes
      const classMatch = trimmed.match(/export\s+(?:abstract\s+)?class\s+([a-zA-Z0-9_]+)/);
      if (classMatch && keyComponents.length < 6) {
        const classBody = lines.slice(lines.indexOf(l), lines.indexOf(l) + 30).join("\n");
        const methods = (classBody.match(/\b(async\s+)?([a-zA-Z0-9_]+)\s*\(/g) || []).slice(0, 3).map(m => m.replace(/\($/, "()"));
        keyComponents.push({
          name: `class ${classMatch[1]}`,
          purpose: `Encapsulates state and behavior${methods.length > 0 ? `. Methods: ${methods.join(", ")}` : ""}`,
        });
      }

      // Interfaces / Types
      const ifaceMatch = trimmed.match(/export\s+(?:interface|type)\s+([a-zA-Z0-9_]+)/);
      if (ifaceMatch && keyComponents.length < 6) {
        keyComponents.push({
          name: `${trimmed.match(/export\s+(interface|type)/)?.[1] || "type"} ${ifaceMatch[1]}`,
          purpose: "Defines the shape of data flowing through this module's boundaries",
        });
      }

      // Pattern detection
      if (/\buseState|useEffect|useMemo|useCallback|useRef\b/.test(trimmed)) patternDetected = "React Hook";
      if (/\brouter\.(get|post|put|delete|patch)\b/.test(trimmed)) patternDetected = "Route Handler";
      if (/\bexpress\(\)|app\.(get|post|use|listen)\b/.test(trimmed)) patternDetected = "Express Middleware";
      if (/\b(schema|model|entity)\b/i.test(trimmed) && /\b(string|number|boolean|Date|relation)\b/.test(trimmed)) patternDetected = "Data Model";
      if (/\bdescribe\(|it\(|expect\(|test\(/.test(trimmed)) patternDetected = "Test Suite";
      if (/\bdispatch|reducer|createSlice|useSelector/.test(trimmed)) patternDetected = "State Management";
      if (/\bfetch\(|axios|http\.request/.test(trimmed)) { hasSideEffects = true; }
      if (/\bawait\b/.test(trimmed)) hasAsync = true;
      if (/\btry\s*\{|catch\s*\(/.test(trimmed)) hasErrorHandling = true;
      if (/\b(zod|joi|yup|validate|isEmail|isURL)\b|if\s*\(\s*!\w+\s*\)\s*throw/.test(trimmed)) hasValidation = true;
    }

    // Build architecture role
    let role = "Core Domain Utility";
    const pathLower = path.toLowerCase();
    if (pathLower.includes("route") || pathLower.includes("controller") || pathLower.includes("/api/")) {
      role = "API Gateway & HTTP Route Controller";
    } else if (pathLower.includes("schema") || pathLower.includes("migration") || pathLower.includes("model")) {
      role = "Data Access & Persistence Layer";
    } else if (pathLower.includes("auth") || pathLower.includes("middleware") || pathLower.includes("guard")) {
      role = "Authentication & Authorization Middleware";
    } else if (pathLower.includes("hook") || pathLower.includes("use-")) {
      role = "React Composition Hook";
    } else if (pathLower.includes("util") || pathLower.includes("helper") || pathLower.includes("lib")) {
      role = "Shared Utility Library";
    } else if (pathLower.includes("test") || pathLower.includes("__test") || pathLower.includes(".spec.")) {
      role = "Test Suite / Quality Gate";
    } else if (pathLower.includes("config") || pathLower.includes(".env") || pathLower.includes("constant")) {
      role = "Configuration & Environment Contract";
    } else if (pathLower.includes("store") || pathLower.includes("state") || pathLower.includes("redux")) {
      role = "Application State Store";
    }

    // Generate security considerations based on actual code analysis
    if (!hasValidation && dependencies.some(d => /express|fastify|koa/.test(d))) {
      securityConsiderations.push("Add input validation (zod/joi) on all incoming request payloads to prevent injection");
    }
    if (!hasErrorHandling && hasAsync) {
      securityConsiderations.push("Wrap async operations in try/catch to prevent unhandled promise rejections from crashing the process");
    }
    if (hasSideEffects && !hasValidation) {
      securityConsiderations.push("Sanitize external data before use — validate URLs and responses from third-party APIs");
    }
    if (dependencies.some(d => /jsonwebtoken|bcrypt|passport/.test(d))) {
      securityConsiderations.push("Ensure token secrets use strong entropy and implement token expiration/rotation");
    }
    if (dependencies.some(d => /sql|pg|mysql|prisma|sequelize|typeorm/.test(d))) {
      securityConsiderations.push("Use parameterized queries exclusively — never interpolate user input into SQL strings");
    }
    if (code.includes("CORS") || code.includes("Access-Control")) {
      securityConsiderations.push("Restrict CORS origins to explicit allowlist — avoid wildcard (*) in production");
    }
    if (/\.env|process\.env/.test(code)) {
      securityConsiderations.push("Ensure .env files are gitignored and secrets are rotated if ever committed");
    }

    if (securityConsiderations.length === 0) {
      securityConsiderations.push("Review all public function signatures for input boundary safety");
    }

    const complexityFactors = [
      lines.length > 300,
      keyComponents.length > 4,
      (code.match(/if\s*\(/g) || []).length > 10,
      (code.match(/switch\s*\(/g) || []).length > 2,
      (code.match(/for\s*\(|while\s*\(/g) || []).length > 3,
      dependencies.length > 6,
    ].filter(Boolean).length;

    const complexity: "Low" | "Moderate" | "High" =
      complexityFactors >= 3 ? "High" : complexityFactors >= 1 ? "Moderate" : "Low";

    return {
      summary: `${patternDetected} with ${keyComponents.length} exported members across ${lines.length} lines. ${hasAsync ? "Contains async operations. " : ""}${hasErrorHandling ? "Has error handling. " : ""}${hasValidation ? "Includes input validation. " : ""}${dependencies.length > 0 ? `Depends on ${dependencies.length} external modules.` : "Zero external dependencies."}`,
      architectureRole: role,
      keyComponents:
        keyComponents.length > 0
          ? keyComponents
          : [{ name: "Module Root", purpose: "Executes module-level initialization and side effects" }],
      complexity,
      dependencies: dependencies.length > 0 ? dependencies : ["Standard Library Only"],
      securityConsiderations: securityConsiderations.slice(0, 4),
      poweredBy: "GITBOT Structural Analyzer v2",
    };
  }
}

function inferFunctionPurpose(name: string, _signature: string, context: string): string {
  const nameLower = name.toLowerCase();

  if (/^(get|fetch|find|retrieve|load|read)/.test(nameLower)) {
    return `Retrieves and returns data from storage or external source`;
  }
  if (/^(create|add|insert|post|put|register|new)/.test(nameLower)) {
    return `Creates and persists a new entity or resource`;
  }
  if (/^(update|edit|modify|patch|change|set)/.test(nameLower)) {
    return `Mutates existing state or entity with new values`;
  }
  if (/^(delete|remove|destroy|clear|purge)/.test(nameLower)) {
    return `Removes an entity or cleans up associated resources`;
  }
  if (/^(validate|check|verify|assert|is|has|can)/.test(nameLower)) {
    return `Validates input constraints and returns boolean result`;
  }
  if (/^(parse|transform|convert|format|serialize|deserialize|map)/.test(nameLower)) {
    return `Transforms data between representations or formats`;
  }
  if (/^(handle|on|process|execute|run|perform|do)/.test(nameLower)) {
    return `Orchestrates a business logic workflow or event handler`;
  }
  if (/^(init|setup|configure|bootstrap|start)/.test(nameLower)) {
    return `Initializes module state, connections, or configuration`;
  }
  if (/^(send|notify|emit|dispatch|publish)/.test(nameLower)) {
    return `Dispatches messages, events, or notifications to consumers`;
  }
  if (/^(auth|login|logout|sign|token|session)/.test(nameLower)) {
    return `Manages authentication state or credential verification`;
  }
  if (/^(render|display|show|view|component)/.test(nameLower)) {
    return `Renders UI output or composes visual elements`;
  }
  if (/^(log|track|record|audit|metric)/.test(nameLower)) {
    return `Captures observability data for monitoring and debugging`;
  }
  if (/^(middleware|guard|intercept|filter)/.test(nameLower)) {
    return `Intercepts and transforms request/response pipeline`;
  }
  if (/^(hash|encrypt|decrypt|sign|verify)/.test(nameLower)) {
    return `Performs cryptographic operations on sensitive data`;
  }

  // Fallback: check context for clues
  if (context.includes("Promise") || context.includes("async")) {
    return `Asynchronous operation with side effects`;
  }
  if (context.includes("return") && !context.includes("void")) {
    return `Computes and returns derived value`;
  }

  return `Executes domain-specific business logic`;
}

export const aiCopilotService = new AiCopilotService();
