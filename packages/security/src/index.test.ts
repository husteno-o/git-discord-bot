import { describe, expect, it } from "vitest";
import { scanForSecrets } from "./secrets.js";

describe("Security Scanner", () => {
  it("detects GitHub tokens and redacts them", () => {
    const text = "Hey check out my token ghp_123456789012345678901234567890123456 to test";
    const secrets = scanForSecrets(text);
    expect(secrets.length).toBe(1);
    expect(secrets[0].type).toBe("GitHub Personal Access Token");
    expect(secrets[0].maskedSnippet).toBe("ghp_••••••••456");
    expect(secrets[0].fingerprintHash).toBeDefined();
  });

  it("detects AWS Access Keys", () => {
    const text = "AWS key is AKIA1234567890EXAMPL for s3 access";
    const secrets = scanForSecrets(text);
    expect(secrets.length).toBe(1);
    expect(secrets[0].type).toBe("AWS Access Key ID");
    expect(secrets[0].maskedSnippet).toBe("AKIA••••••••MPL");
  });

  it("detects Database connection strings with passwords", () => {
    const text = "DATABASE_URL=postgres://admin:superSecret123@db.prod.acme.com:5432/app";
    const secrets = scanForSecrets(text);
    expect(secrets.length).toBe(1);
    expect(secrets[0].type).toContain("Database Connection");
  });

  it("returns empty array when no secrets are found", () => {
    const text = "Normal conversation about software architecture and pull requests.";
    const secrets = scanForSecrets(text);
    expect(secrets.length).toBe(0);
  });
});
