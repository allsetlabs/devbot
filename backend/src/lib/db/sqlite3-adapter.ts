/* eslint-disable @typescript-eslint/no-explicit-any */
import sqlite3 from 'sqlite3';

/**
 * Simple adapter to make sqlite3 work with Drizzle-like syntax
 * This is a compatibility layer that allows existing code to work with raw sqlite3
 */

function promisifyDb(db: sqlite3.Database) {
  return {
    run: (sql: string, params: any[] = []) =>
      new Promise<{ changes?: number; lastID?: number }>((resolve, reject) => {
        db.run(sql, params, function (err: any) {
          if (err) reject(err);
          else resolve({ changes: this.changes, lastID: this.lastID });
        });
      }),

    get: (sql: string, params: any[] = []) =>
      new Promise<any>((resolve, reject) => {
        db.get(sql, params, (err: any, row: any) => {
          if (err) reject(err);
          else resolve(row);
        });
      }),

    all: (sql: string, params: any[] = []) =>
      new Promise<any[]>((resolve, reject) => {
        db.all(sql, params, (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      }),

    exec: (sql: string) =>
      new Promise<void>((resolve, reject) => {
        db.exec(sql, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };
}

export function createDrizzleCompatibleDb(db: sqlite3.Database) {
  const promisified = promisifyDb(db);

  return {
    // For raw SQL execution (used by init-core.ts)
    run: promisified.run,
    get: promisified.get,
    all: promisified.all,
    exec: promisified.exec,

    // Drizzle-like select API (minimal implementation)
    select: (_columns?: any) => ({
      from: (table: any) => ({
        where: (_condition: any) => ({
          orderBy: (_orderBy: any) => ({
            limit: (limit: number) => ({
              execute: () =>
                promisified.all(`SELECT * FROM ${table.name || 'table'} LIMIT ${limit}`),
            }),
            execute: () => promisified.all(`SELECT * FROM ${table.name || 'table'}`),
          }),
          limit: (limit: number) => ({
            execute: () => promisified.all(`SELECT * FROM ${table.name || 'table'} LIMIT ${limit}`),
          }),
          execute: () => promisified.all(`SELECT * FROM ${table.name || 'table'}`),
        }),
        orderBy: (_orderBy: any) => ({
          execute: () => promisified.all(`SELECT * FROM ${table.name || 'table'}`),
        }),
        limit: (limit: number) => ({
          execute: () => promisified.all(`SELECT * FROM ${table.name || 'table'} LIMIT ${limit}`),
        }),
        execute: () => promisified.all(`SELECT * FROM ${table.name || 'table'}`),
      }),
    }),

    // Drizzle-like insert API
    insert: (table: any) => ({
      values: (data: any) => ({
        returning: () => ({
          execute: async () => {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map(() => '?').join(', ');
            await promisified.run(
              `INSERT INTO ${table.name || 'table'} (${keys.join(', ')}) VALUES (${placeholders})`,
              values as any[]
            );
            return data;
          },
        }),
        execute: async () => {
          const keys = Object.keys(data);
          const values = Object.values(data);
          const placeholders = keys.map(() => '?').join(', ');
          const result = await promisified.run(
            `INSERT INTO ${table.name || 'table'} (${keys.join(', ')}) VALUES (${placeholders})`,
            values as any[]
          );
          return result;
        },
      }),
    }),

    // Drizzle-like update API
    update: (table: any) => ({
      set: (data: any) => ({
        where: (_condition: any) => ({
          execute: async () => {
            const keys = Object.keys(data);
            const setClauses = keys.map((k) => `${k} = ?`).join(', ');
            const result = await promisified.run(
              `UPDATE ${table.name || 'table'} SET ${setClauses}`,
              Object.values(data) as any[]
            );
            return result;
          },
        }),
      }),
    }),

    // Drizzle-like delete API
    delete: (table: any) => ({
      where: (_condition: any) => ({
        execute: async () => {
          return await promisified.run(`DELETE FROM ${table.name || 'table'}`);
        },
      }),
    }),
  };
}
