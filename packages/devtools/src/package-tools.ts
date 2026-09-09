import { NotFoundError, ValidationError } from "@devpulse/core";

export interface PackageMetadata {
  ecosystem: "npm" | "pypi" | "crates" | "go";
  name: string;
  version: string;
  description: string;
  license: string;
  homepage?: string;
  repository?: string;
  publishedAt?: string;
  dependenciesCount?: number;
  securityNotice: string;
}

export async function lookupPackage(
  ecosystem: "npm" | "pypi" | "crates" | "go",
  packageName: string,
): Promise<PackageMetadata> {
  const cleanName = packageName.trim();
  if (!cleanName) throw new ValidationError("Package name cannot be empty.");

  switch (ecosystem) {
    case "npm":
      return fetchNpmPackage(cleanName);
    case "pypi":
      return fetchPypiPackage(cleanName);
    case "crates":
      return fetchCratesPackage(cleanName);
    case "go":
      return fetchGoModule(cleanName);
    default:
      throw new ValidationError(`Unsupported ecosystem: ${ecosystem}`);
  }
}

async function fetchNpmPackage(name: string): Promise<PackageMetadata> {
  const encodedName = name.startsWith("@")
    ? `@${encodeURIComponent(name.slice(1))}`
    : encodeURIComponent(name);
  const res = await fetch(`https://registry.npmjs.org/${encodedName}`, {
    headers: { Accept: "application/json" },
  });

  if (res.status === 404) {
    throw new NotFoundError(`npm package '${name}' was not found in registry.`);
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch npm package metadata: registry returned ${res.statusText}`);
  }

  const data = (await res.json()) as any;
  const latestVersion =
    data["dist-tags"]?.latest || Object.keys(data.versions || {}).pop() || "unknown";
  const versionData = data.versions?.[latestVersion] || {};

  let repoUrl = "";
  if (typeof versionData.repository === "string") {
    repoUrl = versionData.repository;
  } else if (versionData.repository?.url) {
    repoUrl = versionData.repository.url.replace(/^git\+/, "").replace(/\.git$/, "");
  }

  const depCount = Object.keys(versionData.dependencies || {}).length;

  return {
    ecosystem: "npm",
    name: data.name || name,
    version: latestVersion,
    description: data.description || "No description provided",
    license: versionData.license || data.license || "Not specified",
    homepage: versionData.homepage || data.homepage,
    repository: repoUrl || undefined,
    publishedAt: data.time?.[latestVersion],
    dependenciesCount: depCount,
    securityNotice: "No known advisory returned by the configured security source.",
  };
}

async function fetchPypiPackage(name: string): Promise<PackageMetadata> {
  const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`, {
    headers: { Accept: "application/json" },
  });

  if (res.status === 404) {
    throw new NotFoundError(`PyPI package '${name}' was not found in index.`);
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch PyPI package metadata: registry returned ${res.statusText}`);
  }

  const data = (await res.json()) as any;
  const info = data.info || {};

  return {
    ecosystem: "pypi",
    name: info.name || name,
    version: info.version || "unknown",
    description: info.summary || "No description provided",
    license: info.license || "Not specified",
    homepage: info.home_page || info.project_urls?.Homepage,
    repository: info.project_urls?.Source || info.project_urls?.Repository,
    dependenciesCount: Array.isArray(info.requires_dist) ? info.requires_dist.length : 0,
    securityNotice: "No known advisory returned by the configured security source.",
  };
}

async function fetchCratesPackage(name: string): Promise<PackageMetadata> {
  const res = await fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}`, {
    headers: { "User-Agent": "DevPulse-Bot (contact@devpulse.local)" },
  });

  if (res.status === 404) {
    throw new NotFoundError(`Rust crate '${name}' was not found on crates.io.`);
  }
  if (!res.ok) {
    throw new Error(`crates.io error: ${res.statusText}`);
  }

  const data = (await res.json()) as any;
  const crate = data.crate || {};

  return {
    ecosystem: "crates",
    name: crate.name || name,
    version: crate.max_version || crate.newest_version || "unknown",
    description: crate.description || "No description provided",
    license: crate.license || "Not specified",
    homepage: crate.homepage,
    repository: crate.repository,
    publishedAt: crate.updated_at,
    securityNotice: "No known advisory returned by the configured security source.",
  };
}

async function fetchGoModule(modulePath: string): Promise<PackageMetadata> {
  const res = await fetch(`https://proxy.golang.org/${modulePath.toLowerCase()}/@latest`, {
    headers: { Accept: "application/json" },
  });

  if (res.status === 404 || res.status === 410) {
    throw new NotFoundError(`Go module '${modulePath}' was not found.`);
  }
  if (!res.ok) {
    throw new Error(`Go proxy error: ${res.statusText}`);
  }

  const data = (await res.json()) as any;

  return {
    ecosystem: "go",
    name: modulePath,
    version: data.Version || "unknown",
    description: `Go module: ${modulePath}`,
    license: "See repository",
    publishedAt: data.Time,
    repository: `https://${modulePath.replace(/^github\.com\//, "github.com/")}`,
    securityNotice: "No known advisory returned by the configured security source.",
  };
}
