import { cache, getOrSet } from "@devpulse/cache";
import { NotFoundError, ValidationError } from "@devpulse/core";
import { logger } from "@devpulse/logger";

export interface VulnerabilityRecord {
  id: string;
  summary: string;
  details: string;
  severity?: string;
  published: string;
  modified: string;
  affectedPackage?: {
    name: string;
    ecosystem: string;
  };
  fixedVersions: string[];
  references: string[];
}

export class SecurityService {
  async lookupCve(cveId: string): Promise<VulnerabilityRecord> {
    const cleanId = cveId.trim().toUpperCase();
    if (!cleanId.startsWith("CVE-") && !cleanId.startsWith("GHSA-")) {
      throw new ValidationError("Vulnerability ID must start with 'CVE-' or 'GHSA-'.");
    }

    const cacheKey = `cve:${cleanId}`;

    return getOrSet(
      cacheKey,
      async () => {
        logger.debug({ cveId: cleanId }, "Fetching vulnerability from OSV API");
        const response = await fetch(`https://api.osv.dev/v1/vulns/${encodeURIComponent(cleanId)}`);

        if (response.status === 404) {
          throw new NotFoundError("Vulnerability", cleanId);
        }
        if (!response.ok) {
          throw new Error(`OSV API returned status ${response.status}`);
        }

        const data = (await response.json()) as any;
        const affected = data.affected?.[0];
        const fixedVersions: string[] = [];

        if (affected?.ranges) {
          for (const r of affected.ranges) {
            for (const event of r.events || []) {
              if (event.fixed) fixedVersions.push(event.fixed);
            }
          }
        }

        const references = (data.references || []).map((r: any) => r.url).slice(0, 5);

        return {
          id: data.id,
          summary: data.summary || "No summary provided in advisory database.",
          details: data.details || data.summary || "No details provided.",
          severity: data.database_specific?.severity || data.severity?.[0]?.score || "Unknown",
          published: data.published || new Date().toISOString(),
          modified: data.modified || new Date().toISOString(),
          affectedPackage: affected?.package
            ? {
                name: affected.package.name,
                ecosystem: affected.package.ecosystem,
              }
            : undefined,
          fixedVersions,
          references,
        };
      },
      86400, // Cache for 24 hours
      cache,
    );
  }

  async lookupPackageVulnerabilities(
    ecosystem: string,
    packageName: string,
    version?: string,
  ): Promise<VulnerabilityRecord[]> {
    const cacheKey = `vuln:pkg:${ecosystem.toLowerCase()}:${packageName.toLowerCase()}:${version || "latest"}`;

    return getOrSet(
      cacheKey,
      async () => {
        const body: any = {
          package: {
            name: packageName.trim(),
            ecosystem: ecosystem.trim(),
          },
        };
        if (version) {
          body.version = version.trim();
        }

        const response = await fetch("https://api.osv.dev/v1/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(`OSV API query error: ${response.statusText}`);
        }

        const data = (await response.json()) as any;
        const vulns = data.vulns || [];

        return vulns.slice(0, 10).map((v: any) => ({
          id: v.id,
          summary: v.summary || "Advisory reported",
          details: v.details || "",
          published: v.published,
          modified: v.modified,
          affectedPackage: {
            name: packageName,
            ecosystem,
          },
          fixedVersions: [],
          references: (v.references || []).map((r: any) => r.url).slice(0, 3),
        }));
      },
      3600, // 1 hour cache
      cache,
    );
  }
}

export const securityService = new SecurityService();
