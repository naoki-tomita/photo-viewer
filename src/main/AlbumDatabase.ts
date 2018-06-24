import { Database, OPEN_READWRITE, OPEN_CREATE } from "sqlite3";
import { AlbumItem } from "../renderer/models/AlbumList";
import { ImageItem } from "../renderer/models/ImageList";

let db: Database;

export function initialize(path: string) {
  if (db) {
    throw Error("Database is already initialized.");
  }
  db = new Database(path, OPEN_READWRITE | OPEN_CREATE);
  initializeAlbumList();
  initializeThumbnailList();
}

function check() {
  if (!db) {
    throw Error("Database not initialized.");
  }
}

export async function initializeAlbumList() {
  await exec("CREATE TABLE IF NOT EXISTS album_list (id INTEGER PRIMARY KEY, label TEXT, path TEXT);");
}

export async function addAlbum(album: AlbumItem) {
  await exec(`INSERT INTO album_list(label, path) VALUES ("${album.label}", "${album.path}")`);
}

export async function getAlbumId(album: AlbumItem): Promise<number | null> {
  const result = await get(`SELECT id FROM album_list WHERE path="${album.path}"`);
  if (result.id) {
    return result.id;
  }
  return null;
}

export async function initializeThumbnailList() {
  await exec("CREATE TABLE IF NOT EXISTS image_list (id INTEGER PRIMARY KEY, album_id INTEGER, path TEXT, label TEXT, thumbnail TEXT);");
}

export async function addThumbnails(albumId: number, images: ImageItem[]) {
  check();
  return new Promise(done => {
    db.serialize(() => {
      db.exec("BEGIN TRANSACTION");
      const stmt = db.prepare(`INSERT INTO image_list (album_id, path, label, thumbnail) VALUES (${albumId}, ?, ?, ?)`);
      images.forEach(image => stmt.run(image.path, image.label, image.raw));
      stmt.finalize();
      db.exec("COMMIT", () => done());
    });
  });
}

export async function getThumbnail(querys: {
  id?: number;
  path?: string;
  label?: string;
}): Promise<{
  id: number;
  path: string;
  label: string;
} | null> {
  check();
  const queryString = Object.keys(querys).map(q => `${q}="${(querys as any)[q]}"`).join(" AND ");
  const thumbnail = await get(`SELECT * FROM image_list WHERE ${queryString}`);
  if (thumbnail) {
    return {
      id: thumbnail.id,
      path: thumbnail.path,
      label: thumbnail.label,
    };
  }
  return null;
}

export async function getAlbumThumbnails(albumId: number): Promise<ImageItem[] | null> {
  check();
  const thumbnails = await all(`SELECT * FROM image_list WHERE album_id=${albumId}`);
  if (thumbnails) {
    return thumbnails.map(t => ({
      id: t.id,
      path: t.path,
      label: t.label,
      raw: t.thumbnail,
    }));
  }
  return null;
}

export function close() {
  check();
  db.close();
}

export async function run(sql: string, params?: string[]) {
  check();
  return new Promise((ok, ng) => {
    db.run(sql, params, err => {
      if (err) return ng(err);
      ok();
    });
  });
}

export async function exec(sql: string) {
  check();
  return new Promise((ok, ng) => {
    db.exec(sql, err => {
      if (err) return ng(err);
      ok();
    });
  });
}

export async function get(sql: string, params?: string[]) {
  check();
  return new Promise<any>((ok, ng) => {
    db.get(sql, params, (err, row) => {
      if (err) return ng(err);
      ok(row);
    });
  });
}

export async function all(sql: string, params?: string[]) {
  check();
  return new Promise<any[]>((ok, ng) => {
    db.all(sql, params, (err, rows) => {
      if (err) return ng(err);
      ok(rows);
    });
  });
}