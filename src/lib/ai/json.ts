// Best-effort repair for a JSON response truncated by hitting max_tokens — closes any
// unterminated string and any open brackets/braces so JSON.parse has a chance to succeed,
// rather than discarding whatever object was mid-generation when the model cut off.
export function repairJsonTail(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (const ch of text) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let repaired = text;
  if (inString) repaired += '"';
  repaired = repaired.replace(/,\s*$/, "");
  while (stack.length) repaired += stack.pop() === "{" ? "}" : "]";
  return repaired;
}

// Strips any leading preamble the model added despite being told to return only JSON
// (e.g. "Here's your plan:\n\n[...]") by slicing from the first array/object bracket.
function stripPreamble(text: string): string {
  const start = text.search(/[[{]/);
  return start > 0 ? text.slice(start) : text;
}

export function parseModelJson(cleaned: string): any {
  const stripped = stripPreamble(cleaned);
  try { return JSON.parse(stripped); } catch { return JSON.parse(repairJsonTail(stripped)); }
}
