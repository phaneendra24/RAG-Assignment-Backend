import { db } from './index';

export const run = (sql: string, params: any[] = []) => {
  return new Promise<{ lastID: number; changes: number }>((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const get = (sql: string, params: any[] = []) => {
  return new Promise<any>((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

export const all = (sql: string, params: any[] = []) => {
  return new Promise<any[]>((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};
