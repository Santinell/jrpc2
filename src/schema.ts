import { RpcError } from "./errors.js";
import type { StandardSchemaV1 } from "./types.js";

export function isSchema(value: unknown): value is StandardSchemaV1 {
  return typeof value === "object" && value !== null && (value as { "~standard"?: { version?: unknown } })["~standard"]?.version === 1;
}

export async function validateParams<S extends StandardSchemaV1>(schema: S, value: unknown): Promise<StandardSchemaV1.InferOutput<S>> {
  const result = await schema["~standard"].validate(value);
  if ("issues" in result && result.issues) throw RpcError.invalidParams(result.issues);
  return result.value as StandardSchemaV1.InferOutput<S>;
}

/** Best-effort support for object schemas. Portable consumers should set argNames. */
export function introspectKeys(schema: StandardSchemaV1): readonly string[] | undefined {
  const candidate = schema as unknown as { shape?: unknown; entries?: unknown };
  const shape = candidate.shape;
  if (shape && typeof shape === "object" && !Array.isArray(shape)) return Object.keys(shape);
  const entries = candidate.entries;
  if (entries && typeof entries === "object" && !Array.isArray(entries)) return Object.keys(entries);
  return undefined;
}

export function mapPositional(values: unknown[], schema: StandardSchemaV1 | undefined, argNames: readonly string[] | undefined): Record<string, unknown> {
  const names = argNames ?? (schema ? introspectKeys(schema) : undefined);
  if (!names) throw RpcError.invalidParams("positional params not supported for this method");
  return Object.fromEntries(names.map((name, index) => [name, values[index]]));
}
