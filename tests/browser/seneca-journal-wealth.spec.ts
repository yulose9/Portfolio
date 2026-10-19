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



test('Journal activity opens an entry and omits the floating insert menu',async({page},info)=>{
 await page.addInitScript(()=>{ const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());localStorage.setItem('journal_entries',JSON.stringify([{id:'rhythm',isoDate:today,title:'A kept day',content:null}])); });
 await page.goto('/admin?section=seneca&view=journal');
 await expect(page.getByRole('region',{name:'Journal consistency'})).toBeVisible();
 await page.locator('.sn-journal-activity-grid button').click();
 await expect(page.getByRole('textbox',{name:'Title',exact:true})).toHaveValue('A kept day');
 await page.locator('.tiptap').click();
 await expect(page.getByRole('button',{name:'Insert block',exact:true})).toHaveCount(0);
 await page.goBack();
 await page.screenshot({path:info.outputPath('journal.png'),fullPage:true});
});
test('Expense and category budget persist after reload',async({page},info)=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('wealth_assets'))localStorage.setItem('wealth_assets',JSON.stringify([{id:'cash',name:'Daily cash',category:'Savings',amount:1000,icon:'cash'}]));});
 await page.goto('/admin?section=seneca&view=wealth');
 await page.getByRole('button',{name:'Add transaction',exact:true}).first().click();
 await page.getByRole('button',{name:/Record expense/}).click();
 await page.getByRole('button',{name:/Daily cash/}).click();
 await page.getByRole('combobox',{name:'Spending category'}).click();
 await page.getByRole('option',{name:'Food & drink',exact:true}).click();
 await page.getByRole('button',{name:'+100',exact:true}).click();
 await page.getByRole('button',{name:'−10',exact:true}).click();
 await page.getByRole('button',{name:'Record expense',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wealth_transactions')||'[]')[0]?.amount)).toBe(90);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wealth_assets')||'[]')[0]?.amount)).toBe(910);
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'Add budget',exact:true}).click();
 await page.getByLabel('Budget limit in pesos').fill('500');
 await page.getByRole('button',{name:'Save budget',exact:true}).click();
 await expect(page.getByRole('meter',{name:'Food & drink spent'})).toHaveAttribute('aria-valuenow','90');
 await page.reload();
 await expect(page.getByRole('meter',{name:'Food & drink spent'})).toHaveAttribute('aria-valuenow','90');
 await page.locator('.sn-budgets').scrollIntoViewIfNeeded();
 await page.screenshot({path:info.outputPath('wealth.png'),fullPage:true});
 await page.getByRole('button',{name:'Edit Food & drink budget'}).click();
 await page.getByLabel('Budget limit in pesos').fill('80');
 await page.getByRole('button',{name:'Save budget',exact:true}).click();
 await expect(page.locator('.sn-budget')).toContainText('over budget');
 await page.getByRole('button',{name:'Edit Food & drink budget'}).click();
 await page.getByRole('button',{name:'Delete budget',exact:true}).click();
 await page.getByRole('button',{name:'Confirm delete',exact:true}).click();
 await page.reload();
 await expect(page.getByRole('button',{name:'Edit Food & drink budget'})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
