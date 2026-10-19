import { test, expect } from '@playwright/test';
import website from '../../content/website.json';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('seneca_local_session', 'true');
    if (!localStorage.getItem('study_goal_active')) localStorage.setItem('study_goal_active', JSON.stringify({ id: 'first', name: 'First study subject', target: 'Dec 2026', routeWeeks: 2 }));
    if (!localStorage.getItem('seneca_custom_certifications')) localStorage.setItem('seneca_custom_certifications', JSON.stringify([{ id: 'first', name: 'First study subject', status: 'progress' }, { id: 'second', name: 'Second study subject', status: 'locked' }]));
  });
  await page.route('**/api/admin/me', route => route.fulfill({ json: { email: 'test@example.com', github: true, storage: true } }));
  await page.route('**/api/admin/posts', route => route.fulfill({ json: { posts: [] } }));
  await page.route('**/api/admin/projects/posts', route => route.fulfill({ json: { posts: [] } }));
  await page.route('**/api/admin/website', route => route.fulfill({ json: { content: website, version: null, source: JSON.stringify(website) } }));
  await page.route('**/api/admin/analytics?**', route => route.fulfill({ json: { configured: false } }));
});


test('Home opens the right journal date and keeps day review stable', async ({ page }, info) => {
  await page.addInitScript(() => {
    const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const history: Record<string, Record<string, boolean>> = {};
    for (const phase of ['morningIgnition','arena','maintenance','shutdown']) for (let id=1;id<=40;id++) history[`${phase}-${id}`] = {[today]:true};
    localStorage.setItem('protocol_task_history', JSON.stringify(history));
    localStorage.setItem('protocol_today_tasks', JSON.stringify({date:today,timestamp:Date.now(),tasks:Object.fromEntries(['morningIgnition','arena','maintenance','shutdown'].map(phase=>[phase,Object.fromEntries(Array.from({length:40},(_,i)=>[i+1,true]))]))}));
    if (!localStorage.getItem('journal_entries')) localStorage.setItem('journal_entries', JSON.stringify([{id:'home-today',isoDate:today,title:'Today reflection',content:null,mood:'📝'}]));
  });
  await page.goto('/admin?section=seneca&view=home');
  await page.getByRole('button',{name:"Read today's entry",exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Title',exact:true})).toHaveValue('Today reflection');
  await page.goBack();
  await page.locator('.sn-area-d').getByRole('button',{name:/view entry/i}).click();
  await expect(page.getByRole('textbox',{name:'Title',exact:true})).toHaveValue('Today reflection');
  await page.goBack();
  const protocol=page.locator('.sn-todos');
  await expect(protocol).toContainText('Protocol complete');
  const before=await protocol.boundingBox();
  const journalBefore=await page.locator('.sn-area-d > .sn-card-well').boundingBox();
  const past=page.locator('.sn-day:not(.is-today):not(.is-future)').first();
  if (!await past.count()) await page.getByRole('button', {name:'Previous month',exact:true}).click();
  await past.click();
  await expect(page.locator('#sn-todos')).not.toHaveText("Today's protocol");
  await expect(page.locator('.sn-area-d')).toContainText('No journal entry');
  expect(Math.abs((await protocol.boundingBox())!.height-before!.height)).toBeLessThan(2);
  expect(Math.abs((await page.locator('.sn-area-d > .sn-card-well').boundingBox())!.height-journalBefore!.height)).toBeLessThan(2);
  await page.locator('.sn-area-d').getByRole('button',{name:/Write for/}).click();
  const date=new URL(page.url()).searchParams.get('entryDate');
  expect(date).toBeTruthy();
  await expect(page.locator('input[type="date"]')).toHaveValue(date!);
  await page.getByRole('textbox',{name:'Title',exact:true}).fill('Earlier reflection');
  await page.getByRole('button',{name:'Save entry',exact:true}).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('journal_entries')!).find((e:any)=>e.title==='Earlier reflection')?.isoDate)).toBe(date);
});

test('Home glow, weather and study toggles stay clear and stable', async ({ page }, info) => {
  await page.goto('/admin?section=seneca&view=home&wx=rain');
  await expect(page.locator('.sn-day.is-today')).toBeVisible();
  expect(await page.locator('.sn-cal-frame').evaluate(el=>getComputedStyle(el).overflowX)).toBe('visible');
  await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
  expect(await page.locator('.sn-weather').evaluate(el=>getComputedStyle(el).filter)).toBe('none');
  const dots=page.locator('.sn-map-stop');
  await expect(dots.first()).toBeAttached();
  await page.evaluate(()=>{ (window as any).__routeDot=document.querySelector('.sn-map-stop'); });
  const button=page.locator('.sn-studied');
  for(let i=0;i<4;i++) await button.click();
  await expect(button).toHaveAttribute('aria-pressed','false');
  expect(await page.evaluate(()=>(window as any).__routeDot===document.querySelector('.sn-map-stop'))).toBe(true);
  expect(await dots.first().getAttribute('r')).not.toBe('0');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.sn-weather').screenshot({path:info.outputPath('weather-dark.png')});
  await page.getByRole('region', {name:/October|January|February|March|April|May|June|July|August|September|November|December/}).filter({has:page.locator('.sn-cal-frame')}).screenshot({path:info.outputPath('calendar-glow.png')});
});
