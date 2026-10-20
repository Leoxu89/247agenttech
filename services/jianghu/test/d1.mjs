import {DatabaseSync} from 'node:sqlite';
export class D1 {
 constructor(path=':memory:'){this.db=new DatabaseSync(path);}
 exec(sql){this.db.exec(sql);}
 prepare(sql){const db=this.db;let params=[];return{bind(...p){params=p;return this;},async first(){return db.prepare(sql).get(...params)||null;},async all(){return{results:db.prepare(sql).all(...params)};},async run(){const r=db.prepare(sql).run(...params);return{success:true,meta:{changes:r.changes}};}};}
 async batch(stmts){this.db.exec('BEGIN');try{const result=[];for(const s of stmts)result.push(await s.run());this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
