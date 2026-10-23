import fs from 'node:fs';
const [lib, md, html] = process.argv.slice(2);
const { Marked } = await import(lib);
const strip = s => s.replace(/^---[\s\S]*?---\n/, '');
const cases = strip(fs.readFileSync(md, 'utf8')).trim().split(/\n\s*\n/);
const exp = fs.readFileSync(html, 'utf8').trim().split(/\n\s*\n|(?<=<\/p>)\n(?=<p>)/);
let ok = 0; const res = [];
cases.forEach((c, i) => { const got = new Marked().parse(c).trim(); const e = (exp[i] || '').trim(); const pass = got === e; ok += pass; res.push(pass ? 'Y' : 'n'); });
console.log(ok + '/' + cases.length, res.join(''));
