import { transformAnthropicMessages, setAllowedModelBases } from 'pxpipe-proxy';
import fs from 'fs';
setAllowedModelBases(['claude-fable-5', 'claude-opus-5-5', 'claude-sonnet-5-5', 'gemini']);
const C = JSON.parse(fs.readFileSync('corpus/corpus.json', 'utf8'));
const out = {};
for (const [name, d] of Object.entries(C)) {
  out[name] = {};
  for (const [prof, model] of [['spaced', 'claude-opus-5-5'], ['dense', 'claude-fable-5-1']]) {
    const body = { model, max_tokens: 1000, system: [{ type: 'text', text: 'You are a coding assistant.' }], messages: [
      { role: 'user', content: [{ type: 'text', text: `Read ${name}.txt` }] },
      { role: 'assistant', content: [{ type: 'tool_use', id: 'tu1', name: 'Read', input: { file_path: name + '.txt' } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu1', content: [{ type: 'text', text: d.text }] }] },
      { role: 'assistant', content: [{ type: 'text', text: 'I have read the file.' }] },
      { role: 'user', content: [{ type: 'text', text: 'Thanks.' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'Ready.' }] },
      { role: 'user', content: [{ type: 'text', text: 'Next question.' }] } ] };
    const r = await transformAnthropicMessages({ body: Buffer.from(JSON.stringify(body)), model });
    const o = JSON.parse(Buffer.from(r.body).toString());
    const tr = o.messages[2].content[0];
    const blocks = Array.isArray(tr.content) ? tr.content : [{ type: 'text', text: tr.content }];
    const imgs = blocks.filter(b => b.type === 'image').map(b => b.source.data);
    const texts = blocks.filter(b => b.type === 'text').map(b => b.text);
    out[name][prof] = { applied: r.applied, reason: r.reason, detail: r.detail, images: imgs, texts };
    const fsheet = texts.join('\n');
    const hits = d.facts.filter(f => fsheet.includes(f.hex)).length, nhits = d.facts.filter(f => fsheet.includes(String(f.num))).length;
    console.log(name, prof, r.applied, r.reason, 'imgs', imgs.length, 'textChars', texts.map(t => t.length), 'hex in factsheet', hits, 'num', nhits);
    imgs.forEach((b, i) => fs.writeFileSync(`corpus/${name}_${prof}_${i + 1}.png`, Buffer.from(b, 'base64')));
  }
}
fs.writeFileSync('corpus/payloads.json', JSON.stringify(out));
