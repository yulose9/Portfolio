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




test('Wealth transfers, edits, plans and exports work',async({page},info)=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('wealth_assets'))localStorage.setItem('wealth_assets',JSON.stringify([{id:'cash',name:'Daily cash',category:'Savings',amount:1000},{id:'save',name:'Rainy day',category:'Savings',amount:100}]));});
 await page.goto('/admin?section=seneca&view=wealth');
 const tools=page.getByRole('region',{name:'Money tools'});
 await tools.getByRole('button',{name:'Transfer money',exact:true}).click();
 await page.getByRole('combobox',{name:'To account',exact:true}).click();
 await page.getByRole('option',{name:'Rainy day',exact:true}).click();
 await page.getByLabel('Amount in pesos',{exact:true}).fill('200');
 await page.getByLabel('Transfer fee in pesos').fill('5');
 await page.getByLabel('Description',{exact:true}).fill('Emergency fund');
 await page.getByRole('button',{name:'Save record',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wealth_assets')!)[0].amount)).toBe(795);
 await tools.getByRole('button',{name:'Records',exact:true}).click();
 await tools.getByRole('button',{name:/Emergency fund/}).click();
 await page.getByLabel('Amount in pesos',{exact:true}).fill('100');
 await page.getByRole('button',{name:'Save record',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wealth_assets')!)[0].amount)).toBe(895);
 await tools.getByRole('button',{name:'Organize',exact:true}).click();
 await tools.getByRole('button',{name:'New category',exact:true}).click();
 await page.getByLabel('Name',{exact:true}).fill('Commute');
 await page.getByRole('button',{name:'Save plan',exact:true}).click();
 await tools.getByRole('button',{name:'Recurring',exact:true}).click();
 await tools.getByRole('button',{name:'Add recurring entry',exact:true}).click();
 await page.getByLabel('Name',{exact:true}).fill('Lunch');
 await page.getByLabel('Recurring amount',{exact:true}).fill('50');
 await page.getByRole('combobox',{name:'Recurring category',exact:true}).click();
 await page.getByRole('option',{name:'Commute',exact:true}).click();
 await page.getByRole('button',{name:'Save plan',exact:true}).click();
 await tools.getByRole('button',{name:'Post next due entry',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wealth_assets')!)[0].amount)).toBe(845);
 await expect(tools.getByRole('button',{name:'Post next due entry',exact:true})).toBeDisabled();
 await tools.getByRole('button',{name:'Organize',exact:true}).click();
 await tools.getByRole('button',{name:'Commute Edit ↗',exact:true}).click();
 await page.getByLabel('Name',{exact:true}).fill('Travel');
 await page.getByRole('button',{name:'Save plan',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wealth_transactions')!).find((t:any)=>t.note==='Lunch')?.spendingCategory)).toBe('Travel');
 await tools.getByRole('button',{name:'Add account',exact:true}).click();
 await page.getByLabel('Account name',{exact:true}).fill('Travel fund');
 await page.getByLabel('Account balance in pesos',{exact:true}).fill('25');
 await page.getByRole('button',{name:'Save account',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wealth_assets')!).find((a:any)=>a.name==='Travel fund')?.amount)).toBe(25);
 await tools.getByRole('button',{name:'Travel fund · Edit',exact:true}).click();
 await page.getByLabel('Account balance in pesos',{exact:true}).fill('30');
 await page.getByRole('button',{name:'Save account',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wealth_assets')!).find((a:any)=>a.name==='Travel fund')?.amount)).toBe(30);
 await page.reload();
 await tools.getByRole('button',{name:'Reports',exact:true}).click();
 const download=page.waitForEvent('download');await tools.getByRole('button',{name:'Export CSV',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/seneca.*csv/);
 await tools.scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await tools.screenshot({path:info.outputPath('wealth-expanded.png')});
});

test('legacy payment form requires cash source and updates both balances',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('wealth_assets',JSON.stringify([{id:'cash',name:'Daily cash',category:'Savings',amount:1000}]));
  localStorage.setItem('wealth_liabilities',JSON.stringify([{id:'loan',name:'Test loan',category:'Liabilities',amount:500}]));
 });
 await page.goto('/admin?section=seneca&view=wealth');
 await page.getByRole('button',{name:'Add transaction',exact:true}).first().click();
 await page.getByRole('button',{name:/Pay Liability/}).click();
 await page.getByRole('button',{name:/Test loan/}).click();
 await page.getByRole('button',{name:'+100',exact:true}).click();
 await page.getByRole('button',{name:'Confirm Payment',exact:true}).click();
 await expect(page.getByText('Choose the account paying this debt.')).toBeVisible();
 await page.getByRole('combobox',{name:'Pay from',exact:true}).click();
 await page.getByRole('option',{name:'Daily cash',exact:true}).click();
 await page.getByRole('button',{name:'Confirm Payment',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wealth_assets')!)[0].amount)).toBe(900);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wealth_liabilities')!)[0].amount)).toBe(400);
});

test('report drilldown preserves dates and supports income, fees and borrowing',async({page},info)=>{
 await page.addInitScript(()=>{
  localStorage.setItem('wealth_assets',JSON.stringify([{id:'cash',name:'Daily cash',category:'Savings',amount:1200},{id:'save',name:'Reserve',category:'Savings',amount:100}]));
  localStorage.setItem('wealth_liabilities',JSON.stringify([{id:'loan',name:'Test loan',category:'Liabilities',amount:500}]));
  localStorage.setItem('wealth_transactions',JSON.stringify([
   {id:'salary',date:'2026-10-14T12:00:00+08:00',type:'deposit',amount:200,accountId:'cash',spendingCategory:'Salary',note:'October salary'},
   {id:'old',date:'2026-09-14T12:00:00+08:00',type:'deposit',amount:300,accountId:'cash',spendingCategory:'Salary',note:'September salary'},
  ]));
 });
 await page.goto('/admin?section=seneca&view=wealth');
 const tools=page.getByRole('region',{name:'Money tools'});
 await tools.getByLabel('From',{exact:true}).fill('2026-10-01');
 await tools.getByLabel('To',{exact:true}).fill('2026-10-14');
 await expect(tools.getByText('Opening balance',{exact:true})).toBeVisible();
 await tools.getByRole('button',{name:/Salary/}).click();
 await expect(tools.getByRole('button',{name:/October salary/})).toBeVisible();
 await expect(tools.getByRole('button',{name:/September salary/})).toHaveCount(0);
 await tools.getByRole('button',{name:'Show all records',exact:true}).click();
 await expect(tools.getByRole('button',{name:/September salary/})).toBeVisible();
 await tools.getByRole('button',{name:'New record',exact:true}).click();
 await page.getByRole('combobox',{name:'Record type',exact:true}).click();
 await page.getByRole('option',{name:'Borrow money',exact:true}).click();
 await page.getByRole('combobox',{name:'Debt account',exact:true}).click();
 await page.getByRole('option',{name:'Test loan',exact:true}).click();
 await page.getByRole('combobox',{name:'To account',exact:true}).click();
 await page.getByRole('option',{name:'Daily cash',exact:true}).click();
 await page.getByLabel('Amount in pesos',{exact:true}).fill('50');
 await page.getByRole('button',{name:'Save record',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wealth_assets')!)[0].amount)).toBe(1250);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wealth_liabilities')!)[0].amount)).toBe(550);
 await tools.getByRole('button',{name:'Reports',exact:true}).click();
 await tools.screenshot({path:info.outputPath('wealth-reports.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('local mode never renders the previous signed-in account cache',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('seneca_private_cache_owner','user:previous-user');
  localStorage.setItem('wealth_assets',JSON.stringify([{id:'private',name:'Private account',category:'Savings',amount:99999}]));
 });
 await page.goto('/admin?section=seneca&view=wealth');
 await expect(page.getByRole('region',{name:'Money tools'})).toBeVisible();
 await expect(page.getByText('Private account',{exact:true})).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('seneca_private_cache_owner'))).toBe('local');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wealth_assets') || '[]').length)).toBe(0);
});

test('all-category budgets include fees and adjustment records stay editable',async({page})=>{
 await page.addInitScript(()=>{
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  localStorage.setItem('wealth_assets',JSON.stringify([{id:'cash',name:'Daily cash',category:'Savings',amount:110}]));
  localStorage.setItem('wealth_transactions',JSON.stringify([{id:'adjust',type:'adjustment',date:`${today}T12:00:00+08:00`,amount:10,accountId:'cash',category:'Savings',adjustmentDirection:'up',excludeFromReport:true,note:'Balance Adjustment'},{id:'fee',type:'transfer',date:`${today}T12:00:00+08:00`,amount:100,fee:5,accountId:'cash',destinationId:'old'}]));
 });
 await page.goto('/admin?section=seneca&view=wealth');
 await page.getByRole('button',{name:'Add budget',exact:true}).click();
 await page.getByRole('combobox',{name:'Budget category',exact:true}).click();
 await page.getByRole('option',{name:'All categories',exact:true}).click();
 await page.getByLabel('Budget limit in pesos').fill('100');
 await page.getByRole('button',{name:'Save budget',exact:true}).click();
 await expect(page.getByRole('meter',{name:'All categories spent'})).toHaveAttribute('aria-valuenow','5');
 const tools=page.getByRole('region',{name:'Money tools'});
 await tools.getByRole('button',{name:'Records',exact:true}).click();
 await tools.getByRole('button',{name:/Balance Adjustment/}).click();
 await expect(page.getByRole('combobox',{name:'Record type',exact:true})).toBeDisabled();
 await page.getByLabel('Amount in pesos',{exact:true}).fill('20');
 await page.getByRole('button',{name:'Save record',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wealth_assets')!)[0].amount)).toBe(120);
});
