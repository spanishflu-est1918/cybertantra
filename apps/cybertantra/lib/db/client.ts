import { sql } from '@vercel/postgres';

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await sql.query(text, params);
  return result.rows as T[];
}

export { sql };