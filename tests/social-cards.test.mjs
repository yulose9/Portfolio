import test from 'node:test';
import assert from 'node:assert/strict';
import { contentSocialCard, socialImage, socialPath, socialFile, publicArtworkPath } from '../cms/social.ts';
import { publicSocialCards, findSocialCard } from '../app/lib/social-registry.ts';
import { SITE_SOCIAL_CARDS, pageSocialMetadata } from '../app/lib/site-social.ts';
import { pagedPosts } from '../app/lib/writing.ts';
import { publishedProjects } from '../app/lib/projects.ts';

const page={slug:'my-project',title:'A published project',dek:'What I learned',ogImage:null,cover:null,icon:null,authors:[{name:'Author',email:'private@example.test'}],updatedAt:'2026-01-01'};
test('every published document and public page has a distinct resolvable versioned PNG',()=>{
 const cards=publicSocialCards(), paths=cards.map(socialPath);
 assert.equal(new Set(paths).size,paths.length);
 for(const [kind,pages] of [['writing',pagedPosts()],['projects',publishedProjects()]]) for(const post of pages) {
  const card=contentSocialCard(post,kind);
  assert.deepEqual(findSocialCard(kind,socialFile(card)),card);
 }
 for(const card of cards) {
  assert.deepEqual(findSocialCard(card.kind,socialFile(card)),card);
  assert.deepEqual(findSocialCard(card.kind,`${card.slug}.png`),card);
  assert.equal(socialImage(card).width,1200);assert.equal(socialImage(card).height,630);
 }
 assert.equal(findSocialCard('private','draft.png'),undefined);
 assert.equal(findSocialCard('projects','missing.png'),undefined);
});
test('share artwork changes with published facts, not private editor fields',()=>{
 const original=socialPath(contentSocialCard(page,'projects'));
 for(const delta of [{title:'New title'},{dek:'New description'},{icon:'🧭'},{cover:{src:'/media/2026/abc.jpg'}},{ogImage:'/media/2026/custom.jpg'},{updatedAt:'2026-02-01'}]) assert.notEqual(socialPath(contentSocialCard({...page,...delta},'projects')),original);
 assert.equal(socialPath(contentSocialCard({...page,editorDocument:{secret:'draft'},editorial:'private',authors:[{name:'Author',email:'another@example.test'}]},'projects')),original);
 assert.doesNotMatch(JSON.stringify(contentSocialCard(page,'projects')),/email|private@example/);
});
test('public artwork loading cannot become an arbitrary URL or file reader',()=>{
 for(const input of ['https://evil.test/image.png','http://127.0.0.1/admin.png','//evil.test/a.png','https://secret:password@nazarene.dev/media/a.png','file:///private.png','data:image/png;base64,a','/api/private.png','/admin/a.png','/media/2026/../../.env','/media/a%2fsecret.png','/media/a.png?token=secret','/media/a.svg','/media/a.png\n']) assert.equal(publicArtworkPath(input),null,input);
 for(const input of ['/media/2026/abc-1200x630.jpg','/images/other/heyyo.png','/avatar-432.webp','/og/avatar.png']) assert.equal(publicArtworkPath(input),input);
 assert.equal(publicArtworkPath('https://nazarene.dev/media/2026/abc.png'),'/media/2026/abc.png');
});
test('public indexes and policies replace layout metadata with their own complete preview',()=>{
 for(const [key,card] of Object.entries(SITE_SOCIAL_CARDS)) {
  const meta=pageSocialMetadata(card,key==='home'?'/':`/${key}`);
  assert.equal(meta.openGraph.title,card.title);
  assert.equal(meta.openGraph.url,`https://nazarene.dev${key==='home'?'/':`/${key}`}`);
  assert.equal(meta.openGraph.images[0].url,socialImage(card).url);
  assert.deepEqual(meta.twitter.images,meta.openGraph.images);
  assert.equal(meta.twitter.card,'summary_large_image');
 }
});
