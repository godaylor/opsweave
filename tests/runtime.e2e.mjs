import { test, expect } from '@playwright/test';
test('real browser: publish, run, task, approval, timer, resolve, export and RU/EN', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Пошаговые планы для устранения сбоев сайтов и IT-сервисов' })).toBeVisible();
  await page.screenshot({ path: 'screenshots/01-welcome-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Открыть учебный пример' }).click();
  await page.getByRole('link', { name: /Инциденты/ }).click();
  await page.getByRole('button', { name: 'Перейти к планам действий' }).click();
  await page.getByRole('button', { name: 'Создать первый план' }).click();
  await page.getByRole('button', { name: 'Взять за основу: восстановление' }).click();
  await page.getByLabel('Название плана', {exact:true}).fill('Учебный план: проверка релиза');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByText('Черновик сохранён', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(page.getByText('План опубликован. Теперь можно запустить инцидент.')).toBeVisible();
  await page.screenshot({ path: 'screenshots/02-playbook-editor.png', fullPage: true });
  await page.getByRole('link', { name: /Инциденты/ }).click();
  await page.getByRole('button', { name: 'Запустить первый инцидент' }).click();
  await page.getByLabel('Название инцидента').fill('Учебный сбой платёжного API');
  await page.getByLabel('Сервис', { exact: true }).fill('training-payments-api');
  await page.getByRole('button', { name: 'Создать и запустить' }).click();
  await expect(page.getByRole('heading', { name: 'Выполните задачу' })).toBeVisible();
  await page.screenshot({ path: 'screenshots/03-incident-action.png', fullPage: true });
  await page.getByLabel('Результат или обоснование').fill('Учебная заметка: проверены вымышленные метрики.');
  await page.getByRole('button', { name: 'Подтвердить выполнение' }).click();
  await expect(page.getByRole('heading', { name: 'Требуется подтверждение' })).toBeVisible();
  await page.getByLabel('Результат или обоснование').fill('Учебное решение подтверждено после проверки примера.');
  await page.getByRole('button', { name: 'Подтвердить и продолжить' }).click();
  await expect(page.getByRole('heading', { name: 'План выполнен' })).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'План выполнен' })).toBeVisible();
  await page.screenshot({ path: 'screenshots/04-run-completed.png', fullPage: true });
  const response = await page.request.get(await page.getByRole('link', { name: 'Выгрузить JSON' }).getAttribute('href'));
  const exported = await response.json(); expect(exported.status).toBe('completed'); expect(exported.incidentStatus).toBe('resolved'); expect(exported.events.some(e => e.type === 'action.approve')).toBeTruthy();
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByRole('heading', { name: 'Action plan completed' })).toBeVisible();
  await page.getByRole('link', { name: /Analytics/ }).click();
  await expect(page.getByRole('heading', { name: 'Response analytics' })).toBeVisible();
  await page.screenshot({ path: 'screenshots/05-analytics-en.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('phone: first run, accessible navigation and no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Пошаговые планы для устранения сбоев сайтов и IT-сервисов' })).toBeVisible();
  await page.screenshot({ path: 'screenshots/06-welcome-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Открыть учебный пример' }).click();
  await page.getByRole('link', { name: /Инциденты/ }).click();
  await expect(page.getByRole('heading', { name: 'Каждому инциденту — следующий шаг' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'screenshots/07-workspace-mobile.png', fullPage: true });
  await page.getByRole('link', { name: /Планы действий/ }).click();
  await page.getByRole('button', { name: 'Создать первый план' }).click();
  await page.getByLabel('Название плана').fill('Мобильный учебный план');
  await page.getByLabel('Действие или сообщение').fill('Проверить метрики');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByText('Черновик сохранён', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('practice guide: real controls, blocking confirmation, refresh, history and export', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Как пользоваться', exact: true }).click();
  const intro = page.getByRole('region', { name: 'Пошаговое знакомство' });
  await expect(intro).toBeVisible();
  await intro.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(intro).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Как пользоваться', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Открыть учебный пример', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'В магазине не работает оплата', exact: true })).toBeVisible();
  const guide = page.getByRole('region', { name: 'Пошаговое знакомство' });
  await guide.getByRole('button', { name: 'Далее', exact: true }).click();
  await guide.getByRole('button', { name: 'Далее', exact: true }).click();
  await guide.getByRole('button', { name: 'Перейти к элементу' }).click();
  await expect(guide.getByText(/Этот элемент пока недоступен/)).toBeVisible();
  await guide.getByRole('button', { name: 'Назад', exact: true }).click();
  await page.getByRole('button', { name: 'Открыть учебный план', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Учебный план открыт' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Открыть учебный план', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Начать учебное выполнение' })).toBeEnabled();
  await page.getByRole('button', { name: 'Начать учебное выполнение' }).click();
  await expect(page.getByRole('heading', { name: 'Выполните задачу', exact: true })).toBeVisible();
  const exportHref = await page.getByRole('link', { name: /Выгрузить JSON/ }).getAttribute('href');
  const runId = exportHref.split('/')[3];
  let run = await (await page.request.get('/api/runs/' + runId)).json();
  expect(run.steps[run.cursor].type).toBe('task');
  const bypass = await page.request.post('/api/runs/' + runId + '/actions', { data: { action: 'approve', stepId: run.steps.find(s => s.type === 'approval').id, reason: 'Practice bypass must fail' } });
  expect(bypass.status()).toBe(409);
  await page.getByLabel('Результат или обоснование').fill('Учебная заметка: ошибка оплаты описана, сообщение специалисту подготовлено.');
  await page.getByRole('button', { name: 'Подтвердить выполнение', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Требуется подтверждение', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Требуется подтверждение', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Подтвердить и продолжить' })).toBeDisabled();
  await page.screenshot({ path: 'screenshots/v3-confirmation.png', fullPage: true });
  const before = await (await page.request.get('/api/runs/' + runId)).json();
  const invalidResolve = await page.request.post('/api/runs/' + runId + '/actions', { data: { action: 'resolve' } });
  expect(invalidResolve.status()).toBe(409);
  expect(before.steps[before.cursor].type).toBe('approval');
  await page.getByLabel('Результат или обоснование').fill('Учебное подтверждение: специалист проверил результат.');
  await page.getByRole('button', { name: 'Подтвердить и продолжить' }).click();
  await expect(page.getByRole('heading', { name: 'План выполнен', exact: true })).toBeVisible({ timeout: 15000 });
  await page.getByRole('link', { name: /Инциденты/ }).click();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'План выполнен', exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Каждому инциденту — следующий шаг' })).toBeVisible();
  await page.getByRole('link', { name: /Как пользоваться/ }).click();
  await page.reload();
  // The guide can render before its server-backed execution after a cold/remote load.
  await expect(page.getByRole('heading', { name: 'План выполнен', exact: true })).toBeVisible();
  run = await (await page.request.get(exportHref)).json();
  expect(run.status).toBe('completed');
  expect(run.events.filter(e => e.type === 'action.approve')).toHaveLength(1);
  expect(run.events.some(e => e.detail.includes('Учебная заметка'))).toBeTruthy();
  const sequence = run.events.map(e => e.type);
  expect(sequence.indexOf('action.complete')).toBeLessThan(sequence.indexOf('action.approve'));
  expect(sequence.indexOf('action.approve')).toBeLessThan(sequence.indexOf('step.timer_started'));
  expect(sequence.indexOf('step.timer_started')).toBeLessThan(sequence.indexOf('run.completed'));
  await page.getByRole('button', { name: 'Пропустить', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Повторить подсказки' })).toBeFocused();
  await page.getByRole('button', { name: 'Повторить подсказки' }).click();
  for (let i=0;i<6;i++) await guide.getByRole('button', { name: 'Далее', exact: true }).click();
  await guide.getByRole('button', { name: 'Перейти к элементу' }).click();
  await expect(page.getByRole('link', { name: /Выгрузить JSON/ })).toBeFocused();
  await guide.getByRole('button', { name: 'Завершить', exact: true }).click();
  await expect(guide).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading',{name:'План выполнен',exact:true})).toBeVisible();
  await expect(guide).toHaveCount(0);
  await page.screenshot({ path: 'screenshots/v3-history.png', fullPage: true });
  const visitor = await context.browser().newContext();
  try {
    const other = await visitor.newPage(); await other.goto(page.url().split('?')[0]);
    await other.getByRole('button', { name: 'Открыть учебный пример', exact: true }).click();
    await expect(other.getByRole('heading', { name: 'В магазине не работает оплата', exact: true })).toBeVisible();
    expect((await other.request.get(new URL(exportHref, page.url()).href)).status()).toBe(404);
    expect((await (await other.request.get(new URL('/api/runs', page.url()).href)).json())).toEqual([]);
  } finally { await visitor.close(); }
});

test('responsive RU/EN, API errors, lists and keyboard at all requested widths', async ({ page }) => {
  test.skip(!!process.env.OPSWEAVE_E2E_URL, 'Large responsive matrix uses isolated local test database');
  test.setTimeout(180000);
  const widths = [320,360,390,430,539,540,541,768,849,850,851,1024,1149,1150,1151,1280,1440,1920,2560,3840,5120,7680];
  const fits = async () => { const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth); if(overflow) { console.log('Overflow bounds',await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,nodes:[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,cls:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(e=>e.right>innerWidth+1||e.left < -1).slice(0,20)}))); await page.screenshot({path:'screenshots/v3-overflow-diagnostic.png',fullPage:true}); } expect(overflow, `horizontal overflow at ${page.viewportSize().width}px`).toBe(false); };
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Пошаговые планы для устранения сбоев сайтов и IT-сервисов'})).toBeVisible();
  for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); }
  await page.setViewportSize({width:320,height:800});
  await page.screenshot({path:'screenshots/v3-welcome-320.png',fullPage:true});
  await page.getByRole('button',{name:'Switch to English'}).click();
  for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); }
  await page.getByRole('button',{name:'Переключить на русский'}).click();
  await page.getByRole('button',{name:'Открыть учебный пример',exact:true}).click();
  await expect(page.getByRole('heading',{name:'В магазине не работает оплата',exact:true})).toBeVisible();
  for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); }
  await page.getByRole('link',{name:/Планы действий/}).click();
  await page.getByRole('button',{name:'Создать первый план'}).click();
  for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); }
  await page.getByLabel('Название плана',{exact:true}).fill('Учебный план '+ 'ДлинноеНазвание'.repeat(5));
  await page.getByLabel('Действие или сообщение').fill('Учебное действие '+ 'ПроверитьРезультат'.repeat(10));
  await page.route('**/api/playbooks', async route => route.request().method()==='POST' ? route.fulfill({status:503,contentType:'application/json',body:'{"error":"unavailable"}'}) : route.continue());
  await page.getByRole('button',{name:'Сохранить',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Название плана',{exact:true})).toHaveValue(/ДлинноеНазвание/);
  await page.unroute('**/api/playbooks');
  await page.getByRole('button',{name:'Сохранить',exact:true}).click();
  await expect(page.getByText('Черновик сохранён',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Опубликовать',exact:true}).click();
  await expect(page.getByText('План опубликован. Теперь можно запустить инцидент.')).toBeVisible();
  await page.getByRole('link',{name:/Инциденты/}).click();
  await page.getByRole('button',{name:'Запустить первый инцидент'}).click();
  for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); }
  await page.getByLabel('Название инцидента',{exact:true}).fill('Учебный сбой '+ 'Название'.repeat(15));
  await page.getByLabel('Сервис',{exact:true}).fill('training-service');
  await page.getByRole('button',{name:'Создать и запустить'}).click();
  await expect(page.getByRole('heading',{name:'Выполните задачу',exact:true})).toBeVisible();
  for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); }
  await page.setViewportSize({width:320,height:800});
  await page.getByRole('button',{name:'Остановить выполнение',exact:true}).scrollIntoViewIfNeeded();
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button',{name:'Остановить выполнение',exact:true}).click();
  await expect(page.getByRole('button',{name:'Остановить выполнение',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Switch to English'}).click();
  for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); }
  await page.getByRole('link',{name:/Action plans/}).click();
  const plans = await (await page.request.get('/api/playbooks')).json();
  for(let i=0;i<7;i++) { const response=await page.request.post('/api/playbooks',{data:{name:'Practice list '+i,description:'Long training description '.repeat(10),steps:plans[0].steps}}); expect(response.ok()).toBeTruthy(); if(i===0){ await page.reload(); await expect(page.locator('.playbook-card')).toHaveCount(2); await page.setViewportSize({width:320,height:800}); await fits(); } }
  await page.reload();
  await expect(page.locator('.playbook-card')).toHaveCount(8);
  for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); }
  for(const name of [/Analytics/,/Integrations/,/Account/]) { await page.getByRole('link',{name}).click(); await expect(page.locator('main h1')).toBeVisible(); for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); } }
  await page.getByRole('link',{name:/How to use/}).click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:640,height:480});
  await page.evaluate(()=>{document.documentElement.style.zoom='2';}); await fits();
  await page.evaluate(()=>{document.documentElement.style.zoom='';});
  await page.setViewportSize({width:320,height:240}); await fits();
  await page.getByRole('button',{name:'Skip',exact:true}).click();
  await expect(page.getByRole('button',{name:'Restart guide'})).toBeFocused();
});

test('two independent registered accounts keep their own practice records', async ({ browser, baseURL }) => {
  test.skip(!!process.env.OPSWEAVE_E2E_URL, 'Account fixtures belong to local isolated test database');
  const one = await browser.newContext({baseURL}); const two = await browser.newContext({baseURL});
  const suffix = crypto.randomUUID(); const password = crypto.randomUUID()+'-test';
  try {
    for (const [index, ctx] of [one,two].entries()) {
      const page=await ctx.newPage(); await page.goto('/');
      await page.getByRole('button',{name:'Регистрация',exact:true}).click();
      await page.getByLabel('Почта',{exact:true}).fill(`opsweave-v3-${suffix}-${index}@example.invalid`);
      await page.getByLabel('Пароль').fill(password);
      await page.getByRole('button',{name:'Создать аккаунт',exact:true}).click();
      await expect(page.getByRole('heading',{name:'Каждому инциденту — следующий шаг'})).toBeVisible();
    }
    const plan = await (await one.request.post('/api/playbooks',{data:{name:'Private training plan',description:'Isolated test',steps:[{type:'task',title:'Private training note',condition:'always'}]}})).json();
    expect((await (await two.request.get('/api/playbooks')).json())).toEqual([]);
    expect((await two.request.put(`/api/playbooks/${plan.id}`,{data:{name:'Forbidden',revision:plan.revision,steps:plan.steps}})).status()).toBe(404);
    await one.request.post('/api/auth/logout',{data:{}});
    expect((await one.request.get('/api/playbooks')).status()).toBe(401);
    await one.request.post('/api/auth/login',{data:{email:`opsweave-v3-${suffix}-0@example.invalid`,password}});
    expect((await (await one.request.get('/api/playbooks')).json()).some(p=>p.id===plan.id)).toBe(true);
  } finally { await one.close(); await two.close(); }
});

test('guidance accessibility and touch: welcome, example and editor', async ({ browser, baseURL }) => {
  test.skip(!process.env.OPSWEAVE_AXE_PATH || !!process.env.OPSWEAVE_E2E_URL, 'Uses existing local axe tool only');
  test.setTimeout(90000);
  const context = await browser.newContext({baseURL,hasTouch:true,reducedMotion:'reduce'});
  try {
    const page=await context.newPage();
    await page.route('**/__opsweave_test_axe.js', route => route.fulfill({path:process.env.OPSWEAVE_AXE_PATH,contentType:'application/javascript'}));
    const check=async()=>{
      await page.addScriptTag({url:'/__opsweave_test_axe.js'});
      const violations=await page.evaluate(async()=> (await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
      expect(violations).toEqual([]);
    };
    for(const width of [320,1440]) {
      await page.setViewportSize({width,height:900}); await page.goto('/');
      await expect(page.getByRole('heading',{name:'Пошаговые планы для устранения сбоев сайтов и IT-сервисов'})).toBeVisible();
      await page.getByRole('button',{name:'Как пользоваться',exact:true}).tap();
      await check();
      await page.keyboard.press('Escape');
    }
    await page.getByRole('button',{name:'Открыть учебный пример',exact:true}).tap();
    await expect(page.getByRole('heading',{name:'В магазине не работает оплата',exact:true})).toBeVisible();
    for(const width of [320,1440]) { await page.setViewportSize({width,height:900}); await check(); }
    await page.getByRole('link',{name:/Планы действий/}).tap();
    await page.getByRole('button',{name:'Создать первый план'}).tap();
    for(const width of [320,1440]) { await page.setViewportSize({width,height:900}); await check(); }
  } finally { await context.close(); }
});
