// Lightweight syntax highlighter for JS, C#, C/C++, Python, XML, JSON
// If we need more we can keep adding, or replace with npm highlight.js

const LANGUAGES = {
  javascript: {
    keywords: new Set([
      "async", "await", "break", "case", "catch", "class", "const", "continue",
      "debugger", "default", "delete", "do", "else", "export", "extends", "false",
      "finally", "for", "from", "function", "if", "import", "in", "instanceof",
      "let", "new", "null", "of", "return", "static", "super", "switch", "this",
      "throw", "true", "try", "typeof", "undefined", "var", "void", "while", "with",
      "yield"
    ]),
    builtins: new Set([
      "console", "document", "window", "Math", "JSON", "Promise", "Map", "Set",
      "Array", "Object", "String", "Number", "Boolean", "Symbol", "RegExp",
      "Error", "Date", "parseInt", "parseFloat", "isNaN", "fetch", "setTimeout",
      "setInterval", "clearTimeout", "clearInterval", "require", "module", "exports"
    ]),
    hashComment: true,
    slashComment: true,
    blockComment: true,
    templateStrings: true,
    regexLiterals: true
  },

  csharp: {
    keywords: new Set([
      "abstract", "as", "base", "bool", "break", "byte", "case", "catch", "char",
      "checked", "class", "const", "continue", "decimal", "default", "delegate",
      "do", "double", "else", "enum", "event", "explicit", "extern", "false",
      "finally", "fixed", "float", "for", "foreach", "goto", "if", "implicit",
      "in", "int", "interface", "internal", "is", "lock", "long", "namespace",
      "new", "null", "object", "operator", "out", "override", "params", "private",
      "protected", "public", "readonly", "ref", "return", "sbyte", "sealed",
      "short", "sizeof", "stackalloc", "static", "string", "struct", "switch",
      "this", "throw", "true", "try", "typeof", "uint", "ulong", "unchecked",
      "unsafe", "ushort", "using", "var", "virtual", "void", "volatile", "while"
    ]),
    builtins: new Set([
      "Console", "String", "Int32", "Boolean", "Object", "Math", "Array",
      "List", "Dictionary", "Task", "Exception", "DateTime", "Guid", "Convert"
    ]),
    slashComment: true,
    blockComment: true,
    verbatimStrings: true
  },

  cpp: {
    keywords: new Set([
      "alignas", "alignof", "and", "asm", "auto", "bitand", "bitor", "bool",
      "break", "case", "catch", "char", "char8_t", "char16_t", "char32_t",
      "class", "concept", "const", "consteval", "constexpr", "constinit",
      "const_cast", "continue", "co_await", "co_return", "co_yield", "decltype",
      "default", "delete", "do", "double", "dynamic_cast", "else", "enum",
      "explicit", "export", "extern", "false", "float", "for", "friend", "goto",
      "if", "inline", "int", "long", "mutable", "namespace", "new", "noexcept",
      "not", "nullptr", "operator", "or", "private", "protected", "public",
      "register", "reinterpret_cast", "requires", "return", "short", "signed",
      "sizeof", "static", "static_assert", "static_cast", "struct", "switch",
      "template", "this", "thread_local", "throw", "true", "try", "typedef",
      "typeid", "typename", "union", "unsigned", "using", "virtual", "void",
      "volatile", "wchar_t", "while"
    ]),
    builtins: new Set([
      "std", "string", "vector", "map", "set", "cout", "cin", "endl",
      "endl", "printf", "scanf", "malloc", "free", "nullptr", "NULL",
      "size_t", "int8_t", "int16_t", "int32_t", "int64_t", "uint8_t",
      "uint16_t", "uint32_t", "uint64_t"
    ]),
    hashComment: true,
    preprocessor: true,
    slashComment: true,
    blockComment: true
  },

  python: {
    keywords: new Set([
      "and", "as", "assert", "async", "await", "break", "class", "continue",
      "def", "del", "elif", "else", "except", "False", "finally", "for",
      "from", "global", "if", "import", "in", "is", "lambda", "None",
      "nonlocal", "not", "or", "pass", "raise", "return", "True", "try",
      "while", "with", "yield"
    ]),
    builtins: new Set([
      "print", "len", "range", "int", "float", "str", "list", "dict",
      "set", "tuple", "bool", "type", "object", "super", "property",
      "staticmethod", "classmethod", "enumerate", "zip", "map", "filter",
      "sorted", "reversed", "abs", "min", "max", "sum", "any", "all",
      "isinstance", "issubclass", "hasattr", "getattr", "setattr"
    ]),
    hashComment: true,
    tripleStrings: true,
    decorators: true
  },

  xml: {
    isXml: true
  },

  json: {
    isJson: true
  }
};

export function highlight(code, lang) {
  const language = lang ? lang.toLowerCase() : "";
  const config = LANGUAGES[language];

  if (!config) return escapeHtml(code);

  if (config.isJson) return highlightJson(code);
  if (config.isXml) return highlightXml(code);

  return highlightCode(code, config);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightCode(code, config) {
  let result = "";
  let i = 0;

  while (i < code.length) {
    // Check for comments first (before strings to handle /* inside strings correctly)
    if (config.blockComment && code[i] === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      const commentEnd = end === -1 ? code.length : end + 2;
      result += `<span class="hljs-comment">${escapeHtml(code.slice(i, commentEnd))}</span>`;
      i = commentEnd;
      continue;
    }

    if (config.slashComment && code[i] === "/" && code[i + 1] === "/") {
      const end = code.indexOf("\n", i);
      const commentEnd = end === -1 ? code.length : end;
      result += `<span class="hljs-comment">${escapeHtml(code.slice(i, commentEnd))}</span>`;
      i = commentEnd;
      continue;
    }

    if (config.hashComment && code[i] === "#") {
      // In C/C++, # at start of line is a preprocessor directive, not a comment
      if (config.preprocessor && i === 0 || (config.preprocessor && code[i - 1] === "\n")) {
        const match = code.slice(i).match(/^#\s*\w+/);
        if (match) {
          result += `<span class="hljs-meta">${escapeHtml(match[0])}</span>`;
          i += match[0].length;
          continue;
        }
      }
      const end = code.indexOf("\n", i);
      const commentEnd = end === -1 ? code.length : end;
      result += `<span class="hljs-comment">${escapeHtml(code.slice(i, commentEnd))}</span>`;
      i = commentEnd;
      continue;
    }

    // Python decorators
    if (config.decorators && code[i] === "@" && i === 0 || (config.decorators && code[i] === "@" && code[i - 1] === "\n")) {
      const match = code.slice(i).match(/^@[\w.]+/);
      if (match) {
        result += `<span class="hljs-meta">${escapeHtml(match[0])}</span>`;
        i += match[0].length;
        continue;
      }
    }

    // Strings
    const stringResult = tryParseString(code, i, config);
    if (stringResult) {
      result += `<span class="hljs-string">${escapeHtml(stringResult.str)}</span>`;
      i += stringResult.str.length;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(code[i]) && (i === 0 || /[\s\({\[=+\-*/<>,;:!&|^%~]/.test(code[i - 1]))) {
      const match = code.slice(i).match(/^(0[xXbBoO])?[0-9][0-9eE+\-_.]*/);
      if (match) {
        result += `<span class="hljs-number">${escapeHtml(match[0])}</span>`;
        i += match[0].length;
        continue;
      }
    }

    // Words (keywords, builtins, identifiers)
    if (/[a-zA-Z_$]/.test(code[i])) {
      const match = code.slice(i).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
      if (match) {
        const word = match[0];
        if (config.keywords.has(word)) {
          result += `<span class="hljs-keyword">${escapeHtml(word)}</span>`;
        } else if (config.builtins.has(word)) {
          result += `<span class="hljs-built_in">${escapeHtml(word)}</span>`;
        } else if (i + word.length < code.length && code[i + word.length] === "(") {
          result += `<span class="hljs-title function_">${escapeHtml(word)}</span>`;
        } else {
          result += escapeHtml(word);
        }
        i += word.length;
        continue;
      }
    }

    // Default: pass through
    result += escapeHtml(code[i]);
    i++;
  }

  return result;
}

function tryParseString(code, pos, config) {
  const ch = code[pos];

  // Python triple strings
  if (config.tripleStrings && (code.slice(pos, pos + 3) === '"""' || code.slice(pos, pos + 3) === "'''")) {
    const quote = code.slice(pos, pos + 3);
    const end = code.indexOf(quote, pos + 3);
    const strEnd = end === -1 ? code.length : end + 3;
    return { str: code.slice(pos, strEnd) };
  }

  // Template strings (JS)
  if (config.templateStrings && ch === "`") {
    const end = findUnescaped(code, "`", pos + 1);
    const strEnd = end === -1 ? code.length : end + 1;
    return { str: code.slice(pos, strEnd) };
  }

  // Regular strings
  if (ch === '"' || ch === "'") {
    // C# verbatim strings @"..."
    if (config.verbatimStrings && ch === '"' && code[pos + 1] === "@") {
      const end = findVerbatimEnd(code, pos + 2);
      return { str: code.slice(pos, end) };
    }

    const end = findUnescaped(code, ch, pos + 1);
    const strEnd = end === -1 ? code.length : end + 1;
    return { str: code.slice(pos, strEnd) };
  }

  return null;
}

function findUnescaped(str, char, from) {
  for (let i = from; i < str.length; i++) {
    if (str[i] === "\\" ) {
      i++; // skip escaped character
    } else if (str[i] === char) {
      return i;
    }
  }
  return -1;
}

function findVerbatimEnd(str, from) {
  for (let i = from; i < str.length; i++) {
    if (str[i] === '"') {
      if (str[i + 1] === '"') {
        i++; // doubled quote
      } else {
        return i + 1;
      }
    }
  }
  return str.length;
}

function highlightJson(code) {
  let result = "";
  let i = 0;

  while (i < code.length) {
    // Whitespace
    if (/\s/.test(code[i])) {
      const match = code.slice(i).match(/^\s+/);
      result += match[0];
      i += match[0].length;
      continue;
    }

    // Strings (keys or values)
    if (code[i] === '"') {
      const end = findUnescaped(code, '"', i + 1);
      const strEnd = end === -1 ? code.length : end + 1;
      const str = code.slice(i, strEnd);

      // Check if this is a key (followed by colon)
      let j = strEnd;
      while (j < code.length && /\s/.test(code[j])) j++;
      if (code[j] === ":") {
        result += `<span class="hljs-attr">${escapeHtml(str)}</span>`;
      } else {
        result += `<span class="hljs-string">${escapeHtml(str)}</span>`;
      }
      i = strEnd;
      continue;
    }

    // Booleans and null
    if (code.slice(i, i + 4) === "true" && !/[a-zA-Z0-9_]/.test(code[i + 4] || "")) {
      result += `<span class="hljs-literal">true</span>`;
      i += 4;
      continue;
    }
    if (code.slice(i, i + 5) === "false" && !/[a-zA-Z0-9_]/.test(code[i + 5] || "")) {
      result += `<span class="hljs-literal">false</span>`;
      i += 5;
      continue;
    }
    if (code.slice(i, i + 4) === "null" && !/[a-zA-Z0-9_]/.test(code[i + 4] || "")) {
      result += `<span class="hljs-literal">null</span>`;
      i += 4;
      continue;
    }

    // Numbers
    if (/[0-9\-]/.test(code[i])) {
      const match = code.slice(i).match(/^-?[0-9][0-9eE+\-_.]*/);
      if (match) {
        result += `<span class="hljs-number">${escapeHtml(match[0])}</span>`;
        i += match[0].length;
        continue;
      }
    }

    // Punctuation
    if (/[{}\[\]:,]/.test(code[i])) {
      result += escapeHtml(code[i]);
      i++;
      continue;
    }

    // Default
    result += escapeHtml(code[i]);
    i++;
  }

  return result;
}

function highlightXml(code) {
  let result = "";
  let i = 0;

  while (i < code.length) {
    // Comments
    if (code.slice(i, i + 4) === "<!--") {
      const end = code.indexOf("-->", i + 4);
      const commentEnd = end === -1 ? code.length : end + 3;
      result += `<span class="hljs-comment">${escapeHtml(code.slice(i, commentEnd))}</span>`;
      i = commentEnd;
      continue;
    }

    // Processing instructions
    if (code.slice(i, i + 2) === "<?") {
      const end = code.indexOf("?>", i + 2);
      const piEnd = end === -1 ? code.length : end + 2;
      result += `<span class="hljs-meta">${escapeHtml(code.slice(i, piEnd))}</span>`;
      i = piEnd;
      continue;
    }

    // CDATA
    if (code.slice(i, i + 9) === "<![CDATA[") {
      const end = code.indexOf("]]>", i + 9);
      const cdataEnd = end === -1 ? code.length : end + 3;
      result += `<span class="hljs-string">${escapeHtml(code.slice(i, cdataEnd))}</span>`;
      i = cdataEnd;
      continue;
    }

    // Tags
    if (code[i] === "<") {
      const tagResult = parseXmlTag(code, i);
      if (tagResult) {
        result += tagResult.html;
        i = tagResult.end;
        continue;
      }
    }

    // Text content
    const nextTag = code.indexOf("<", i + 1);
    const textEnd = nextTag === -1 ? code.length : nextTag;
    result += escapeHtml(code.slice(i, textEnd));
    i = textEnd;
  }

  return result;
}

function parseXmlTag(code, pos) {
  let i = pos;

  // Match < or </
  let prefix = "";
  if (code[i] === "<") {
    if (code[i + 1] === "/") {
      prefix = "</";
      i += 2;
    } else {
      prefix = "<";
      i += 1;
    }
  } else {
    return null;
  }

  // Tag name
  const nameMatch = code.slice(i).match(/^[a-zA-Z][a-zA-Z0-9_:.-]*/);
  if (!nameMatch) return null;

  let html = `<span class="hljs-tag">${escapeHtml(prefix)}</span>`;
  html += `<span class="hljs-name">${escapeHtml(nameMatch[0])}</span>`;
  i += nameMatch[0].length;

  // Attributes
  while (i < code.length && code[i] !== ">" && code[i] !== "/") {
    // Whitespace
    if (/\s/.test(code[i])) {
      const ws = code.slice(i).match(/^\s+/)[0];
      html += ws;
      i += ws.length;
      continue;
    }

    // Attribute name
    const attrMatch = code.slice(i).match(/^[a-zA-Z][a-zA-Z0-9_:.-]*/);
    if (attrMatch) {
      html += `<span class="hljs-attr">${escapeHtml(attrMatch[0])}</span>`;
      i += attrMatch[0].length;

      // = sign
      if (code[i] === "=") {
        html += `=`;
        i++;

        // Attribute value
        if (code[i] === '"' || code[i] === "'") {
          const quote = code[i];
          const end = code.indexOf(quote, i + 1);
          const valEnd = end === -1 ? code.length : end + 1;
          html += `<span class="hljs-string">${escapeHtml(code.slice(i, valEnd))}</span>`;
          i = valEnd;
        }
      }
      continue;
    }

    // Self-closing or other
    html += escapeHtml(code[i]);
    i++;
  }

  // Close the tag
  if (code[i] === "/" && code[i + 1] === ">") {
    html += `<span class="hljs-tag">/&gt;</span>`;
    i += 2;
  } else if (code[i] === ">") {
    html += `<span class="hljs-tag">&gt;</span>`;
    i += 1;
  }

  return { html, end: i };
}

export default highlight;
