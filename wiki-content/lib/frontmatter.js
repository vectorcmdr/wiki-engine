// Minimal frontmatter parser - alternative to gray-matter

export function matter(input) {
  const str = typeof input === "string" ? input : input.toString();
  const result = { data: {}, content: str };

  const match = str.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return result;

  result.data = parseYaml(match[1]);
  result.content = match[2];
  return result;
}

function parseYaml(raw) {
  const data = {};
  const lines = raw.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!kvMatch) { i++; continue; }

    const key = kvMatch[1];
    let val = kvMatch[2].trim();

    // Inline array: ["a", "b", "c"]
    if (val.startsWith("[")) {
      const arrStr = val.slice(1, val.indexOf("]"));
      data[key] = arrStr
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""));
      i++;
      continue;
    }

    // Multiline array (key: \n  - item)
    if (val === "") {
      const arr = [];
      i++;
      while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
        arr.push(lines[i].trim().replace(/^\s*-\s+/, "").replace(/^["']|["']$/g, ""));
        i++;
      }
      if (arr.length > 0) {
        data[key] = arr;
        continue;
      }
    }

    // Boolean
    if (val === "true") { data[key] = true; i++; continue; }
    if (val === "false") { data[key] = false; i++; continue; }

    // Number
    if (/^-?\d+(\.\d+)?$/.test(val)) {
      data[key] = Number(val);
      i++;
      continue;
    }

    // String (strip quotes)
    data[key] = val.replace(/^["']|["']$/g, "");
    i++;
  }

  return data;
}

export default matter;
