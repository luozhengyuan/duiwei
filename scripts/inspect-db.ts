import path from 'node:path';
import dotenv from 'dotenv';
import postgres from 'postgres';

const TABLES = ['users', 'game_records', 'blog_posts', 'health_check'] as const;

type TableName = (typeof TABLES)[number];

type TableCount = {
  table: TableName;
  exists: boolean;
  count: number;
};

function loadLocalEnv(): void {
  const cwd = process.cwd();
  for (const file of ['.env.local', '.env']) {
    dotenv.config({ path: path.join(cwd, file), override: false, quiet: true });
  }
}

function maskDatabaseUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.password) {
      url.password = '***';
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function getInspectDatabaseUrl(): string {
  const url =
    process.env.INSPECT_DATABASE_URL ||
    process.env.SOURCE_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.COZE_DATABASE_URL;

  if (!url) {
    throw new Error('未找到数据库连接串，请提供 INSPECT_DATABASE_URL 或 SOURCE_DATABASE_URL。');
  }

  return url;
}

function isPooledConnectionString(databaseUrl: string): boolean {
  try {
    const { hostname } = new URL(databaseUrl);
    return hostname.includes('pooler.');
  } catch {
    return false;
  }
}

async function inspectPostgresTables(databaseUrl: string): Promise<TableCount[]> {
  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: 'require',
    prepare: !isPooledConnectionString(databaseUrl),
  });

  try {
    const tableRows = (await sql.unsafe(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
         and table_name in ('users', 'game_records', 'blog_posts', 'health_check')
       order by table_name`,
    )) as Array<{ table_name: string }>;

    const existingTables = new Set(tableRows.map((row) => row.table_name));
    const counts: TableCount[] = [];

    for (const table of TABLES) {
      if (!existingTables.has(table)) {
        counts.push({ table, exists: false, count: 0 });
        continue;
      }

      const result = (await sql.unsafe(
        `select count(*)::int as count from "${table}"`,
      )) as Array<{ count: number }>;

      counts.push({
        table,
        exists: true,
        count: result[0]?.count ?? 0,
      });
    }

    return counts;
  } finally {
    await sql.end();
  }
}

async function main(): Promise<void> {
  loadLocalEnv();

  const databaseUrl = getInspectDatabaseUrl();
  const tableCounts = await inspectPostgresTables(databaseUrl);

  console.log(
    JSON.stringify(
      {
        database: maskDatabaseUrl(databaseUrl),
        tables: tableCounts,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : '数据库盘点失败，且没有拿到可读错误信息。',
  );
  process.exit(1);
});
