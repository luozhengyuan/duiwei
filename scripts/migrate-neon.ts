import path from 'node:path';
import dotenv from 'dotenv';
import postgres from 'postgres';

const TABLE_CONFIGS = [
  {
    name: 'users',
    columns: ['id', 'username', 'password', 'created_at'],
    createSql: `
      create table if not exists users (
        id serial primary key,
        username varchar(50) unique not null,
        password varchar(255) not null,
        created_at timestamptz not null default now()
      );
      create index if not exists users_username_idx on users (username);
    `,
  },
  {
    name: 'blog_posts',
    columns: ['id', 'title', 'summary', 'content', 'created_at'],
    createSql: `
      create table if not exists blog_posts (
        id serial primary key,
        title varchar(255) not null,
        summary text not null,
        content text not null,
        created_at timestamptz not null default now()
      );
      create index if not exists blog_posts_created_at_idx on blog_posts (created_at);
    `,
  },
  {
    name: 'game_records',
    columns: ['id', 'user_id', 'scenario', 'final_score', 'result', 'played_at'],
    createSql: `
      create table if not exists game_records (
        id serial primary key,
        user_id integer references users(id),
        scenario varchar(100) not null,
        final_score integer not null default 0,
        result varchar(20) default 'in_progress',
        played_at timestamptz not null default now()
      );
    `,
  },
  {
    name: 'health_check',
    columns: ['id', 'updated_at'],
    createSql: `
      create table if not exists health_check (
        id serial not null,
        updated_at timestamptz default now()
      );
    `,
  },
] as const;

type TableConfig = (typeof TABLE_CONFIGS)[number];
type TableName = TableConfig['name'];
type SqlValue = string | number | boolean | Date | null;
type RowRecord = Record<string, SqlValue>;

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

function getSourceDatabaseUrl(): string {
  const url = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL || process.env.COZE_DATABASE_URL;
  if (!url) {
    throw new Error('未找到旧库连接串，请提供 SOURCE_DATABASE_URL。');
  }
  return url;
}

function getTargetDatabaseUrl(): string {
  const url = process.env.TARGET_DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!url) {
    throw new Error('未找到 Neon 连接串，请提供 TARGET_DATABASE_URL 或 NEON_DATABASE_URL。');
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

function createDbClient(databaseUrl: string) {
  return postgres(databaseUrl, {
    max: 1,
    ssl: 'require',
    prepare: !isPooledConnectionString(databaseUrl),
  });
}

async function tableExists(db: ReturnType<typeof createDbClient>, tableName: TableName): Promise<boolean> {
  const rows = (await db.unsafe(
    `select exists (
       select 1
       from information_schema.tables
       where table_schema = 'public' and table_name = '${tableName}'
     ) as exists`,
  )) as Array<{ exists: boolean }>;

  return rows[0]?.exists ?? false;
}

async function fetchPostgresRows(
  db: ReturnType<typeof createDbClient>,
  table: TableConfig,
): Promise<RowRecord[]> {
  if (!(await tableExists(db, table.name))) {
    return [];
  }

  const columns = table.columns.map((column) => `"${column}"`).join(', ');
  return (await db.unsafe(
    `select ${columns} from "${table.name}" order by "id" asc`,
  )) as RowRecord[];
}

async function ensureTargetSchema(db: ReturnType<typeof createDbClient>): Promise<void> {
  for (const table of TABLE_CONFIGS) {
    await db.unsafe(table.createSql);
  }
}

async function resetManagedTablesIfEmpty(db: ReturnType<typeof createDbClient>): Promise<void> {
  let totalRows = 0;

  for (const table of TABLE_CONFIGS) {
    if (!(await tableExists(db, table.name))) {
      continue;
    }

    const rows = (await db.unsafe(
      `select count(*)::int as count from "${table.name}"`,
    )) as Array<{ count: number }>;

    totalRows += rows[0]?.count ?? 0;
  }

  if (totalRows > 0) {
    return;
  }

  await db.unsafe(`
    drop table if exists game_records cascade;
    drop table if exists blog_posts cascade;
    drop table if exists health_check cascade;
    drop table if exists users cascade;
  `);
}

function buildInsertStatement(
  table: TableConfig,
  rows: RowRecord[],
  withConflictUpdate: boolean,
): { query: string; values: SqlValue[] } {
  const values: SqlValue[] = [];
  const columnsSql = table.columns.map((column) => `"${column}"`).join(', ');
  const valueGroups = rows.map((row, rowIndex) => {
    const placeholders = table.columns.map((column, columnIndex) => {
      values.push(row[column]);
      return `$${rowIndex * table.columns.length + columnIndex + 1}`;
    });
    return `(${placeholders.join(', ')})`;
  });

  let query = `insert into "${table.name}" (${columnsSql}) values ${valueGroups.join(', ')}`;

  if (withConflictUpdate) {
    const updateColumns = table.columns.filter((column) => column !== 'id');
    const updateSql = updateColumns
      .map((column) => `"${column}" = excluded."${column}"`)
      .join(', ');
    query += ` on conflict ("id") do update set ${updateSql}`;
  }

  return { query, values };
}

async function upsertRows(
  db: ReturnType<typeof createDbClient>,
  table: TableConfig,
  rows: RowRecord[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const chunkSize = 200;

  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const { query, values } = buildInsertStatement(table, chunk, true);
    await db.unsafe(query, values);
  }
}

async function copyHealthCheckRows(
  db: ReturnType<typeof createDbClient>,
  rows: RowRecord[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const existing = (await db.unsafe(
    'select count(*)::int as count from "health_check"',
  )) as Array<{ count: number }>;

  if ((existing[0]?.count ?? 0) > 0) {
    console.log('health_check 在目标库中已有数据，跳过重复写入。');
    return;
  }

  const table = TABLE_CONFIGS.find((item) => item.name === 'health_check');
  if (!table) {
    return;
  }

  const { query, values } = buildInsertStatement(table, rows, false);
  await db.unsafe(query, values);
}

async function resetSequence(
  db: ReturnType<typeof createDbClient>,
  tableName: 'users' | 'blog_posts' | 'game_records',
): Promise<void> {
  await db.unsafe(
    `select setval(
       pg_get_serial_sequence('"${tableName}"', 'id'),
       coalesce(max(id), 1),
       max(id) is not null
     )
     from "${tableName}"`,
  );
}

async function main(): Promise<void> {
  loadLocalEnv();

  const sourceUrl = getSourceDatabaseUrl();
  const targetUrl = getTargetDatabaseUrl();

  if (sourceUrl === targetUrl) {
    throw new Error('旧库和目标库连接串完全相同，已中止，避免误操作。');
  }

  const sourceDb = createDbClient(sourceUrl);
  const targetDb = createDbClient(targetUrl);

  try {
    console.log(`旧库: ${maskDatabaseUrl(sourceUrl)}`);
    console.log(`Neon: ${maskDatabaseUrl(targetUrl)}`);

    await resetManagedTablesIfEmpty(targetDb);
    await ensureTargetSchema(targetDb);

    const usersTable = TABLE_CONFIGS.find((table) => table.name === 'users');
    const blogTable = TABLE_CONFIGS.find((table) => table.name === 'blog_posts');
    const recordsTable = TABLE_CONFIGS.find((table) => table.name === 'game_records');
    const healthTable = TABLE_CONFIGS.find((table) => table.name === 'health_check');

    if (!usersTable || !blogTable || !recordsTable || !healthTable) {
      throw new Error('迁移表配置不完整。');
    }

    const usersRows = await fetchPostgresRows(sourceDb, usersTable);
    const gameRecordRows = await fetchPostgresRows(sourceDb, recordsTable);
    const blogRows = await fetchPostgresRows(sourceDb, blogTable);
    const healthRows = await fetchPostgresRows(sourceDb, healthTable);

    await upsertRows(targetDb, usersTable, usersRows);
    await upsertRows(targetDb, blogTable, blogRows);
    await upsertRows(targetDb, recordsTable, gameRecordRows);
    await copyHealthCheckRows(targetDb, healthRows);

    await resetSequence(targetDb, 'users');
    await resetSequence(targetDb, 'blog_posts');
    await resetSequence(targetDb, 'game_records');

    console.log(
      JSON.stringify(
        {
          migrated: {
            users: usersRows.length,
            blog_posts: blogRows.length,
            game_records: gameRecordRows.length,
            health_check: healthRows.length,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await sourceDb.end();
    await targetDb.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : '迁移失败，且没有拿到可读错误信息。');
  process.exit(1);
});
