import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

const search = createFromSource(source, {
  language: "english",
});

function decodeSearchEntities(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#x22;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function extractAttributeText(attributes: string) {
  const values = Array.from(attributes.matchAll(/\b(?:title|description|children|type)=["']([^"']+)["']/g), (match) => match[1]);
  if (values.length > 0) return values.join(" ");

  return attributes
    .replace(/[{}[\](),]/g, " ")
    .replace(/\b(?:title|description|type|href|className|items)=/g, " ")
    .replace(/["'`]/g, " ");
}

function cleanMdxComponentSource(value: string) {
  if (!/<[A-Z][\w.]/.test(value) && !/&lt;[A-Z][\w.]/.test(value) && !/^\s*(?:import|export)\s.+$/m.test(value)) return value;

  return decodeSearchEntities(value)
    .replace(/^\s*(?:import|export)\s.+$/gm, " ")
    .replace(/<Card\s+([^>]*)\/>/g, (_match, attributes: string) => extractAttributeText(attributes))
    .replace(/<([A-Z][\w.]*)\b[^>]*>([\s\S]*?)<\/\1>/g, " $2 ")
    .replace(/<([A-Z][\w.]*)\b([^>]*)\/>/g, (_match, _component: string, attributes: string) => extractAttributeText(attributes))
    .replace(/<([A-Z][\w.]*)\b[^>]*>/g, " ")
    .replace(/<\/[A-Z][\w.]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeSearchPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeSearchPayload);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key === "content" && typeof item === "string" ? cleanMdxComponentSource(item) : sanitizeSearchPayload(item),
    ]),
  );
}

async function sanitizeSearchResponse(response: Response) {
  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) return response;

  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return Response.json(sanitizeSearchPayload(await response.json()), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function GET(request: Request) {
  return sanitizeSearchResponse(await search.GET(request));
}

export async function staticGET() {
  return sanitizeSearchResponse(await search.staticGET());
}
