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

// Escapes stray double quotes the model left unescaped inside a string value (e.g. a
// description that quotes a pace or phrase: "Run at "tempo" pace") — this breaks the JSON
// string boundary mid-document, producing a syntax error like "expected ':' after property
// name" somewhere in the middle of the response, not at the tail, so repairJsonTail alone
// can't fix it. Decides whether a quote is a real string boundary by peeking at the next
// non-whitespace character: a legitimate closing quote is always followed by , : } or ] —
// anything else means it's content, so it gets escaped instead of closing the string.
function sanitizeStrayQuotes(text: string): string {
  let result = "";
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { result += ch; escape = false; continue; }
    if (ch === "\\") { result += ch; escape = true; continue; }
    if (ch === '"') {
      if (!inString) { inString = true; result += ch; continue; }
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      const next = text[j];
      if (next === undefined || ",:}]".includes(next)) { inString = false; result += ch; }
      else { result += '\\"'; }
      continue;
    }
    result += ch;
  }
  return result;
}

export function parseModelJson(cleaned: string): any {
  const stripped = stripPreamble(cleaned);
  try { return JSON.parse(stripped); } catch {}
  try { return JSON.parse(repairJsonTail(stripped)); } catch {}
  return JSON.parse(repairJsonTail(sanitizeStrayQuotes(stripped)));
}
