import * as crypto from "node:crypto";

export interface DetectedSecret {
  type: string;
  maskedSnippet: string;
  fingerprintHash: string;
  recommendation: string;
}

interface SecretPattern {
  type: string;
  regex: RegExp;
  recommendation: string;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  {
    type: "GitHub Personal Access Token",
    regex: /(?:ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82})/,
    recommendation:
      "Revoke and rotate this GitHub token immediately via GitHub Settings -> Developer settings.",
  },
  {
    type: "AWS Access Key ID",
    regex: /\b(AKIA[0-9A-Z]{16})\b/,
    recommendation:
      "Rotate this AWS access key immediately in AWS IAM Console and deactivate the leaked key.",
  },
  {
    type: "Discord Bot Token",
    regex: /\b([MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27,})\b/,
    recommendation: "Reset this bot token immediately in the Discord Developer Portal.",
  },
  {
    type: "RSA / Private Key",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    recommendation:
      "This private cryptographic key is compromised. Generate a new keypair immediately.",
  },
  {
    type: "OpenAI / API Key",
    regex: /\b(sk-[a-zA-Z0-9]{32,})\b/,
    recommendation: "Revoke and generate a new API key in the provider dashboard.",
  },
  {
    type: "Database Connection String with Password",
    regex:
      /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[a-zA-Z0-9_-]+:[^@\s/:]+@[a-zA-Z0-9_.-]+/,
    recommendation: "Rotate the database user password immediately and restrict host access.",
  },
];

export function scanForSecrets(content: string): DetectedSecret[] {
  if (!content || content.length < 10) return [];
  const detected: DetectedSecret[] = [];

  for (const pattern of SECRET_PATTERNS) {
    const match = content.match(pattern.regex);
    if (match) {
      const fullMatch = match[0];
      const start = fullMatch.slice(0, 4);
      const end = fullMatch.slice(-3);
      const maskedSnippet = `${start}••••••••${end}`;
      // Generate one-way SHA-256 fingerprint for tracking without storing the secret
      const fingerprintHash = crypto
        .createHash("sha256")
        .update(fullMatch)
        .digest("hex")
        .slice(0, 16);

      detected.push({
        type: pattern.type,
        maskedSnippet,
        fingerprintHash,
        recommendation: pattern.recommendation,
      });
    }
  }

  return detected;
}
