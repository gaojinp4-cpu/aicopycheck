// Detection patterns for AI-generated code signatures
// Each pattern has: name, regex, weight (risk contribution 0-1), description

const AI_TOOL_PATTERNS = [
  {
    name: 'claude-generated',
    regex: /(?:generated|created|written)\s+(?:by|using|with)\s+(?:Claude|Anthropic|claude\.ai|Claude Code)/i,
    weight: 0.9,
    description: 'Explicitly marked as Claude-generated'
  },
  {
    name: 'copilot-generated',
    regex: /(?:generated|created|written)\s+(?:by|using|with)\s+(?:GitHub\s*Copilot|Copilot)/i,
    weight: 0.9,
    description: 'Explicitly marked as Copilot-generated'
  },
  {
    name: 'chatgpt-generated',
    regex: /(?:generated|created|written)\s+(?:by|using|with)\s+(?:ChatGPT|OpenAI|GPT-\d)/i,
    weight: 0.9,
    description: 'Explicitly marked as ChatGPT/OpenAI-generated'
  },
  {
    name: 'cursor-generated',
    regex: /(?:generated|created|written)\s+(?:by|using|with)\s+(?:Cursor|cursor\.sh)/i,
    weight: 0.85,
    description: 'Explicitly marked as Cursor-generated'
  },
  {
    name: 'generic-ai-comment',
    regex: /(?:generated|created|written)\s+(?:by|using|with)\s+(?:AI|artificial intelligence|LLM|large language model)/i,
    weight: 0.8,
    description: 'Generic AI generation attribution'
  },
  {
    name: 'ai-disclaimer',
    regex: /(?:this\s+(?:code|file|module|component|function)\s+(?:was|is)\s+(?:AI-generated|auto-generated|machine-generated))/i,
    weight: 0.85,
    description: 'Self-declared AI-generated code'
  },
  {
    name: 'as-an-ai-copy-paste',
    regex: /(?:as\s+an\s+AI|I\s+apologize|I\s+am\s+(?:an?\s+)?AI|as\s+a\s+(?:large\s+)?language\s+model)/i,
    weight: 0.95,
    description: 'Copy-paste artifact from AI conversation'
  },
  {
    name: 'vibe-coding',
    regex: /(?:vibe\s*coding|vibe\s*coded|vibecoding)/i,
    weight: 0.7,
    description: 'Vibe coding reference (AI-assisted development)'
  }
];

const CODE_PATTERNS = [
  {
    name: 'excessive-comment-ratio',
    weight: 0.3,
    description: 'High comment-to-code ratio (AI tendency to over-comment)',
    threshold: 0.4 // comment lines > 40% of total
  },
  {
    name: 'uniform-function-length',
    weight: 0.2,
    description: 'Suspiciously uniform function lengths (AI pattern)',
    threshold: 0.8 // > 80% functions within 10% length variance
  },
  {
    name: 'copilot-suggestion-format',
    regex: /^(?:def|function|class|const|let|var)\s+\w+.*\/\/\s*\w/i,
    weight: 0.15,
    description: 'Common Copilot inline suggestion format'
  },
  {
    name: 'ai-guard-comments',
    regex: /\/\/\s*(?:TODO|FIXME|HACK|XXX|NOTE|OPTIMIZE|REVIEW):?\s*$/im,
    weight: 0.1,
    description: 'AI-generated placeholder comments'
  },
  {
    name: 'overly-descriptive-naming',
    regex: /\b(?:result|data|info|temp|tmp|foo|bar|baz)\b/,
    weight: 0.05,
    description: 'Generic variable names common in AI output'
  }
];

const LICENSE_PATTERNS = [
  {
    name: 'missing-license',
    weight: 0.6,
    description: 'No license header found in file'
  },
  {
    name: 'mit-license',
    regex: /MIT\s+License|Permission\s+is\s+hereby\s+granted/i,
    weight: 0,
    description: 'MIT license (permissive, low risk)'
  },
  {
    name: 'apache-license',
    regex: /Apache\s+License|Licensed\s+under\s+the\s+Apache/i,
    weight: 0,
    description: 'Apache license (permissive, low risk)'
  },
  {
    name: 'gpl-license',
    regex: /GNU\s+(?:General\s+Public|GPL|Affero|AGPL)/i,
    weight: 0.7,
    description: 'GPL license (copyleft, potential conflict with AI-generated code)'
  },
  {
    name: 'proprietary-notice',
    regex: /All\s+(?:right|Rights)\s+(?:reserved|Reserved)|Proprietary|Confidential/i,
    weight: 0.5,
    description: 'Proprietary notice (may conflict with AI training data origins)'
  }
];

const IGNORE_PATTERNS = [
  /^node_modules\//,
  /^\.git\//,
  /^dist\//,
  /^build\//,
  /^\.next\//,
  /^vendor\//,
  /\.min\.(js|css)$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.lock$/,
  /\.exe$/,
  /\.dll$/,
  /\.so$/,
  /\.dylib$/,
  /\.bin$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.ico$/,
  /\.svg$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.eot$/,
  /\.pdf$/,
  /\.zip$/,
  /\.tar$/,
  /\.gz$/,
  /\.mp4$/,
  /\.mp3$/,
  /\.wav$/,
  /aiscan-report\./,
  /test-report\./
];

const CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.py', '.pyi', '.pyx',
  '.go', '.rs', '.java', '.kt', '.kts', '.swift',
  '.c', '.h', '.cpp', '.hpp', '.cc', '.hh', '.cxx', '.hxx',
  '.cs', '.rb', '.php', '.scala', '.clj', '.cljs', '.cljc',
  '.elm', '.hs', '.lhs', '.nim', '.zig', '.odin',
  '.vue', '.svelte', '.astro', '.sol', '.move',
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1',
  '.sql', '.r', '.jl', '.lua', '.ex', '.exs', '.erl', '.hrl',
  '.dart', '.groovy', '.gradle', '.tf', '.tfvars',
  '.yaml', '.yml', '.toml', '.json', '.xml', '.md', '.mdx',
  '.css', '.scss', '.less', '.html', '.htm',
  '.m', '.mm', '.pl', '.pm', '.t', '.rake', '.gemspec'
];

module.exports = {
  AI_TOOL_PATTERNS,
  CODE_PATTERNS,
  LICENSE_PATTERNS,
  IGNORE_PATTERNS,
  CODE_EXTENSIONS
};
