import crypto from "node:crypto";

export function sha256(input: string | Buffer): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map(k => JSON.stringify(k)+":"+stableJson(obj[k])).join(",")}}`;
  }
  return JSON.stringify(value);
}
