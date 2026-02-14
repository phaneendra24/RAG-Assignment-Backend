import { run } from './helper';

export const createDocument = async (
  source: string,
  title: string | null,
  url: string | null,
  content: string,
) => {
  const sql = `
    INSERT INTO documents (source, title, url, content)
    VALUES (?, ?, ?, ?)
  `;

  const result = await run(sql, [source, title, url, content]);
  return result.lastID;
};
