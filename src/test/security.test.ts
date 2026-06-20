import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', 'temp'].includes(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

const allFiles = walk(ROOT);
const srcFiles = allFiles.filter((f) => f.includes(`${ROOT}/src/`));
const sqlFiles = allFiles.filter((f) => f.endsWith('.sql'));

describe('Security: hardcoded secrets', () => {
  const SECRET_PATTERNS: Array<[string, RegExp]> = [
    ['Stripe live key', /sk_live_[0-9a-zA-Z]{16,}/],
    ['AWS access key', /AKIA[0-9A-Z]{16}/],
    ['GitHub PAT', /ghp_[0-9A-Za-z]{20,}/],
    ['Slack token', /xox[baprs]-[0-9A-Za-z-]{10,}/],
    ['RSA private key', /-----BEGIN RSA PRIVATE KEY-----/],
    ['OpenSSH private key', /-----BEGIN OPENSSH PRIVATE KEY-----/],
  ];

  for (const [label, pattern] of SECRET_PATTERNS) {
    it(`no ${label} committed`, () => {
      const offenders = allFiles.filter((f) => {
        if (f.includes('/test/security.test.')) return false;
        try {
          return pattern.test(readFileSync(f, 'utf8'));
        } catch {
          return false;
        }
      });
      expect(offenders, `Found in: ${offenders.join(', ')}`).toEqual([]);
    });
  }
});

describe('Security: service-role key never reaches client bundle', () => {
  it('SUPABASE_SERVICE_ROLE_KEY is not referenced in src/', () => {
    const offenders = srcFiles.filter((f) =>
      readFileSync(f, 'utf8').includes('SUPABASE_SERVICE_ROLE_KEY')
    );
    expect(offenders, `Found in: ${offenders.join(', ')}`).toEqual([]);
  });
});

describe('Security: SQL migrations', () => {
  // Legacy migrations may contain patterns that were later tightened by
  // newer hardening migrations. Mark them with `-- @security-legacy` to
  // exclude them from static scanning (live state is verified via the
  // Supabase linter / security scan).
  const migrations = sqlFiles
    .filter((f) => f.includes('/supabase/migrations/'))
    .filter((f) => !readFileSync(f, 'utf8').includes('@security-legacy'));

  it('no permissive WITH CHECK (true) on write policies', () => {
    const offenders = migrations.filter((f) =>
      /with check\s*\(\s*true\s*\)/i.test(readFileSync(f, 'utf8'))
    );
    expect(offenders, `Found in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('no policies granted to PUBLIC role on write operations', () => {
    const offenders = migrations.filter((f) => {
      const sql = readFileSync(f, 'utf8');
      return /for\s+(insert|update|delete)[\s\S]{0,80}to\s+public\b/i.test(sql);
    });
    expect(offenders, `Found in: ${offenders.join(', ')}`).toEqual([]);
  });
});

describe('Security: Edge Functions', () => {
  const fnDir = join(ROOT, 'supabase/functions');
  const config = (() => {
    try {
      return readFileSync(join(ROOT, 'supabase/config.toml'), 'utf8');
    } catch {
      return '';
    }
  })();
  const jwtVerified = (fn: string): boolean => {
    const re = new RegExp(
      `\\[functions\\.${fn}\\][^\\[]*verify_jwt\\s*=\\s*true`,
      'i'
    );
    return re.test(config);
  };
  const functions = (() => {
    try {
      return readdirSync(fnDir).filter((d) =>
        statSync(join(fnDir, d)).isDirectory()
      );
    } catch {
      return [];
    }
  })();

  it.each(functions)('%s does not use wildcard CORS without auth check', (fn) => {
    const idx = join(fnDir, fn, 'index.ts');
    let src = '';
    try {
      src = readFileSync(idx, 'utf8');
    } catch {
      return;
    }
    const hasWildcard = /Access-Control-Allow-Origin['"]?\s*[:=]\s*['"]\*/.test(src);
    const hasAuthCheck =
      jwtVerified(fn) ||
      /getClaims|getUser|webhook|signature|x-signature|hmac|api[_-]?key|x-api-key|bearer/i.test(src);
    if (hasWildcard) {
      expect(
        hasAuthCheck,
        `${fn}: wildcard CORS requires auth or signature check`
      ).toBe(true);
    }
  });
});