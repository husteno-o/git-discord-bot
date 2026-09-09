// Cloudflare Worker for DevPulse GitHub OAuth Relay
// Relays GitHub OAuth callbacks directly to Turso DB with zero open ports on your Docker host.

export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN?: string;
  ENCRYPTION_KEY?: string; // 32-character key for AES-256-GCM
}

// Convert string/passphrase into AES-256-GCM CryptoKey
async function getCryptoKey(secretKey: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secretKey.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  return keyMaterial;
}

// Encrypt token using Web Crypto AES-256-GCM
async function encryptToken(token: string, secretKey: string): Promise<string> {
  const key = await getCryptoKey(secretKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    enc.encode(token),
  );

  const ivHex = Array.from(iv)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const encryptedHex = Array.from(new Uint8Array(ciphertextBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${ivHex}:${encryptedHex}`;
}

// Execute query against Turso via its HTTP pipeline API
async function executeTurso(
  databaseUrl: string,
  authToken: string | undefined,
  sql: string,
  args: unknown[],
) {
  const httpUrl = databaseUrl.replace(/^libsql:\/\//, "https://");
  const endpoint = `${httpUrl}/v2/pipeline`;

  const body = {
    requests: [
      {
        type: "execute",
        stmt: {
          sql,
          args: args.map((arg) => {
            if (arg === null || arg === undefined) return { type: "null" };
            if (typeof arg === "number") return { type: "integer", value: arg.toString() };
            return { type: "text", value: String(arg) };
          }),
        },
      },
      { type: "close" },
    ],
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  return response.json();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "healthy", service: "DevPulse Cloudflare Auth Relay" }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 2. Login Redirect
    if (url.pathname === "/auth/github/login") {
      const userId = url.searchParams.get("userId") || "anonymous";
      const redirectUri = `${url.origin}/auth/github/callback`;
      const githubUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
        env.GITHUB_CLIENT_ID,
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,read:user&state=${encodeURIComponent(userId)}`;

      return Response.redirect(githubUrl, 302);
    }

    // 3. OAuth Callback
    if (url.pathname === "/auth/github/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code) {
        return new Response("Missing code parameter", { status: 400 });
      }

      // Exchange code for access token
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = (await tokenRes.json()) as {
        access_token?: string;
        error?: string;
        error_description?: string;
      };
      if (!tokenData.access_token) {
        return new Response(
          `Authentication error: ${tokenData.error_description || "Failed to acquire token"}`,
          { status: 400 },
        );
      }

      // Fetch GitHub profile
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "DevPulse-Cloudflare-Relay",
        },
      });
      const ghUser = (await userRes.json()) as { login: string };

      // Encrypt token
      const encKey =
        env.ENCRYPTION_KEY || env.GITHUB_CLIENT_SECRET || "devpulse-default-secure-key-32";
      const encrypted = await encryptToken(tokenData.access_token, encKey);
      const discordUserId = state && state !== "anonymous" ? state : null;

      // Persist directly to shared Turso Database
      if (discordUserId && env.TURSO_DATABASE_URL) {
        const now = Date.now();
        const upsertSql = `
          INSERT INTO users (id, username, github_username, github_token_encrypted, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            github_username = excluded.github_username,
            github_token_encrypted = excluded.github_token_encrypted,
            updated_at = excluded.updated_at
        `;
        await executeTurso(env.TURSO_DATABASE_URL, env.TURSO_AUTH_TOKEN, upsertSql, [
          discordUserId,
          ghUser.login,
          ghUser.login,
          encrypted,
          now,
        ]);
      }

      // Return success page
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8" />
          <title>DevPulse - Connected</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0d1117; color: #f0f6fc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 40px; text-align: center; max-width: 440px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
            h1 { color: #3fb950; font-size: 1.5rem; margin-bottom: 12px; }
            p { color: #8b949e; line-height: 1.6; margin-bottom: 24px; font-size: 0.95rem; }
            .badge { display: inline-block; background: rgba(56,139,253,0.15); color: #58a6ff; border: 1px solid rgba(56,139,253,0.4); padding: 4px 12px; border-radius: 6px; font-family: monospace; font-size: 0.9rem; margin-bottom: 20px; }
            .footer { font-size: 0.8rem; color: #6e7681; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>GitHub Connected</h1>
            <div class="badge">@${ghUser.login}</div>
            <p>Your GitHub account has been securely linked and saved to your database. Your Docker bot is now connected without exposing any ports to the internet.</p>
            <p>You can close this tab and return to Discord!</p>
            <div class="footer">DevPulse via Cloudflare Edge Relay</div>
          </div>
        </body>
        </html>
      `;

      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};
