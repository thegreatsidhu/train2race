import { Fragment, type ReactNode } from "react";

// Matches http(s):// links and bare www. links. Only these two shapes are ever turned into
// anchors, so user-written text like "javascript:..." or "data:..." can never become a link.
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
// Punctuation that usually ends the sentence rather than the URL ("see example.com/x.").
const TRAILING_PUNCT_RE = /[.,!?;:'")\]}]+$/;

function splitTrailing(raw: string): [string, string] {
  let url = raw;
  let trailing = "";
  const m = url.match(TRAILING_PUNCT_RE);
  if (m) {
    trailing = m[0];
    url = url.slice(0, -trailing.length);
    // Keep a closing paren that belongs to the URL itself, e.g. wikipedia.org/wiki/Foo_(bar)
    while (trailing.startsWith(")") && (url.match(/\(/g)?.length ?? 0) > (url.match(/\)/g)?.length ?? 0)) {
      url += ")";
      trailing = trailing.slice(1);
    }
  }
  return [url, trailing];
}

// Renders plain message text with web links made clickable. Links open in a new tab (in the
// Median iOS/Android wrapper that hands them to the system browser) and inherit the surrounding
// text colour so they stay readable on both the signal-coloured "my message" bubble and the
// neutral one.
export function Linkify({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    const [url, trailing] = splitTrailing(match[0]);
    if (/^(?:https?:\/\/|www\.)?$/i.test(url)) continue; // nothing after the scheme — leave as text
    if (start > last) parts.push(text.slice(last, start));
    const href = url.toLowerCase().startsWith("www.") ? `https://${url}` : url;
    parts.push(
      <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc"
        className="underline underline-offset-2 break-all hover:opacity-80">
        {url}
      </a>
    );
    if (trailing) parts.push(trailing);
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>;
}
