import { ValidationError } from "@devpulse/core";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export function formatJson(input: string, indent = 2): string {
  try {
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed, null, indent);
  } catch (err: any) {
    throw new ValidationError(`Invalid JSON: ${err.message}`);
  }
}

export function minifyJson(input: string): string {
  try {
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed);
  } catch (err: any) {
    throw new ValidationError(`Invalid JSON: ${err.message}`);
  }
}

export function validateJson(input: string): { valid: boolean; error?: string; type?: string } {
  try {
    const parsed = JSON.parse(input);
    const type = Array.isArray(parsed) ? "array" : typeof parsed;
    return { valid: true, type };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

export function formatYaml(input: string): string {
  try {
    const parsed = parseYaml(input);
    return stringifyYaml(parsed);
  } catch (err: any) {
    throw new ValidationError(`Invalid YAML: ${err.message}`);
  }
}

export function yamlToJson(yamlInput: string): string {
  try {
    const parsed = parseYaml(yamlInput);
    return JSON.stringify(parsed, null, 2);
  } catch (err: any) {
    throw new ValidationError(`Failed to convert YAML to JSON: ${err.message}`);
  }
}

export function jsonToYaml(jsonInput: string): string {
  try {
    const parsed = JSON.parse(jsonInput);
    return stringifyYaml(parsed);
  } catch (err: any) {
    throw new ValidationError(`Failed to convert JSON to YAML: ${err.message}`);
  }
}

export function formatSql(sql: string): string {
  if (!sql.trim()) return "";
  const keywords = [
    "SELECT",
    "FROM",
    "WHERE",
    "AND",
    "OR",
    "ORDER BY",
    "GROUP BY",
    "HAVING",
    "LIMIT",
    "OFFSET",
    "JOIN",
    "LEFT JOIN",
    "RIGHT JOIN",
    "INNER JOIN",
    "OUTER JOIN",
    "INSERT INTO",
    "VALUES",
    "UPDATE",
    "SET",
    "DELETE FROM",
    "CREATE TABLE",
    "ALTER TABLE",
    "DROP TABLE",
  ];

  let formatted = sql.trim().replace(/\s+/g, " ");
  for (const kw of keywords) {
    const regex = new RegExp(`\\b${kw}\\b`, "gi");
    formatted = formatted.replace(regex, (match) => `\n${match.toUpperCase()}`);
  }
  return formatted.trim();
}
