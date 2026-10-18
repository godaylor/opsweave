import { test, expect } from '@playwright/test';

async function installAxe(page) {
  await page.route('**/__opsweave_test_axe.js', route => route.fulfill({
    path: process.env.OPSWEAVE_AXE_PATH,
    contentType: 'application/javascript',
  }));
}

async function checkAccessibility(page) {
  if (!await page.evaluate(() => !!window.axe)) {
    await page.addScriptTag({ url: '/__opsweave_test_axe.js' });
  }
  const violations = await page.evaluate(async () => (await window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
  })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
  expect(violations).toEqual([]);
}
test('real browser: publish, run, task, approval, timer, resolve, export and RU/EN', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Сбой — не время/ })).toBeVisible();
  await page.screenshot({ path: 'screenshots/01-welcome-desktop.png', fullPage: true, animations: "disabled" });
  await page.getByRole('button', { name: 'Попробовать без регистрации' }).click();
  await page.getByRole('link', { name: /Главная/ }).click();
  await page.getByRole('button', { name: 'Перейти к инструкциям' }).click();
  await page.getByRole('button', { name: 'Создать первую инструкцию' }).click();
  await page.getByRole('button', { name: 'Взять за основу: восстановление' }).click();
  await page.getByLabel('Название инструкции', {exact:true}).fill('Восстановить платёжный сервис');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByText('Черновик сохранён', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
  await expect(page.getByText('Инструкция готова к запуску.')).toBeVisible();
  await page.screenshot({ path: 'screenshots/02-playbook-editor.png', fullPage: false, animations: "disabled" });
  await page.getByRole('link', { name: /Главная/ }).click();
  await page.getByRole('button', { name: 'Запустить первую инструкцию' }).click();
  await page.getByLabel('Название инцидента').fill('Недоступна оплата');
  await page.getByLabel('Сервис', { exact: true }).fill('payments-api');
  await page.getByRole('button', { name: 'Создать и запустить' }).click();
  await expect(page.getByRole('heading', { name: 'Текущий шаг' })).toBeVisible();
  await page.screenshot({ path: 'screenshots/03-incident-action.png', fullPage: false, animations: "disabled" });
  const activeUrl=page.url();
  await page.getByRole('link',{name:/Главная/}).click();
  await expect(page.locator('.focus-action h3')).toHaveText('Проверить метрики и определить причину сбоя');
  await page.screenshot({path:'screenshots/redesign-workspace-desktop.png',fullPage:false,animations:'disabled'});
  await page.goto(activeUrl);
  await expect(page.getByRole('heading',{name:'Текущий шаг',exact:true})).toBeVisible();
  await page.getByLabel('Результат или обоснование').fill('Учебная заметка: проверены вымышленные метрики.');
  await page.getByRole('button', { name: 'Шаг выполнен' }).click();
  await expect(page.getByRole('heading', { name: 'Подтвердите решение' })).toBeVisible();
  await page.getByLabel('Результат или обоснование').fill('Учебное решение подтверждено после проверки примера.');
  await page.getByRole('button', { name: 'Подтвердить решение' }).click();
  await expect(page.getByRole('heading', { name: 'Инструкция выполнена' })).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Инструкция выполнена' })).toBeVisible();
  await page.screenshot({ path: 'screenshots/04-run-completed.png', fullPage: false, animations: "disabled" });
  const response = await page.request.get(await page.getByRole('link', { name: 'Выгрузить JSON' }).getAttribute('href'));
  const exported = await response.json(); expect(exported.status).toBe('completed'); expect(exported.incidentStatus).toBe('resolved'); expect(exported.events.some(e => e.type === 'action.approve')).toBeTruthy();
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByRole('heading', { name: 'Instruction complete' })).toBeVisible();
  await page.getByRole('link', { name: /Analytics/ }).click();
  await expect(page.getByRole('heading', { name: 'Response analytics' })).toBeVisible();
  await page.screenshot({ path: 'screenshots/05-analytics-en.png', fullPage: false, animations: "disabled" });
  expect(errors).toEqual([]);
});
test('phone: first run, accessible navigation and no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Сбой — не время/ })).toBeVisible();
  await page.screenshot({ path: 'screenshots/06-welcome-mobile.png', fullPage: true, animations: "disabled" });
  await page.getByRole('button', { name: 'Попробовать без регистрации' }).click();
  await page.getByRole('link', { name: /Главная/ }).click();
  await expect(page.getByRole('heading', { name: 'В работе' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'screenshots/07-workspace-mobile.png', fullPage: true, animations: "disabled" });
  await page.getByRole('link', { name: /Инструкции/ }).click();
  await page.getByRole('button', { name: 'Создать первую инструкцию' }).click();
  await page.getByLabel('Название инструкции').fill('Мобильный учебный план');
  await page.getByLabel('Действие или сообщение').fill('Проверить метрики');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByText('Черновик сохранён', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('practice guide: real controls, blocking confirmation, refresh, history and export', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Справка', exact: true }).click();
  const intro = page.getByRole('region', { name: 'Пошаговое знакомство' });
  await expect(intro).toBeVisible();
  await intro.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(intro).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Справка', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Попробовать без регистрации', exact: true }).click();
  await page.getByRole('link',{name:'Справка',exact:true}).click();
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
  await expect(page.getByRole('heading', { name: 'Текущий шаг', exact: true })).toBeVisible();
  const exportHref = await page.getByRole('link', { name: /Выгрузить JSON/ }).getAttribute('href');
  const runId = exportHref.split('/')[3];
  let run = await (await page.request.get('/api/runs/' + runId)).json();
  expect(run.steps[run.cursor].type).toBe('task');
  const bypass = await page.request.post('/api/runs/' + runId + '/actions', { data: { action: 'approve', stepId: run.steps.find(s => s.type === 'approval').id, reason: 'Practice bypass must fail' } });
  expect(bypass.status()).toBe(409);
  await page.getByLabel('Результат или обоснование').fill('Учебная заметка: ошибка оплаты описана, сообщение специалисту подготовлено.');
  await page.getByRole('button', { name: 'Шаг выполнен', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Подтвердите решение', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Подтвердите решение', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Подтвердить решение' })).toBeDisabled();
  await page.screenshot({ path: 'screenshots/v3-confirmation.png', fullPage: true, animations: "disabled" });
  const before = await (await page.request.get('/api/runs/' + runId)).json();
  const invalidResolve = await page.request.post('/api/runs/' + runId + '/actions', { data: { action: 'resolve' } });
  expect(invalidResolve.status()).toBe(409);
  expect(before.steps[before.cursor].type).toBe('approval');
  await page.getByLabel('Результат или обоснование').fill('Учебное подтверждение: специалист проверил результат.');
  await page.getByRole('button', { name: 'Подтвердить решение' }).click();
  await expect(page.getByRole('heading', { name: 'Инструкция выполнена', exact: true })).toBeVisible({ timeout: 15000 });
  await page.getByRole('link', { name: /Главная/ }).click();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Инструкция выполнена', exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'В работе' })).toBeVisible();
  await page.getByRole('link', { name: /Справка/ }).click();
  await page.reload();
  // The guide can render before its server-backed execution after a cold/remote load.
  await expect(page.getByRole('heading', { name: 'Инструкция выполнена', exact: true })).toBeVisible();
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
  await expect(page.getByRole('heading',{name:'Инструкция выполнена',exact:true})).toBeVisible();
  await expect(guide).toHaveCount(0);
  await page.screenshot({ path: 'screenshots/v3-history.png', fullPage: true, animations: "disabled" });
  const visitor = await context.browser().newContext();
  try {
    const other = await visitor.newPage(); await other.goto(page.url().split('?')[0]);
    await other.getByRole('button', { name: 'Попробовать без регистрации', exact: true }).click();
    await other.getByRole('link',{name:'Справка',exact:true}).click();
    await expect(other.getByRole('heading', { name: 'В магазине не работает оплата', exact: true })).toBeVisible();
    expect((await other.request.get(new URL(exportHref, page.url()).href)).status()).toBe(404);
    expect((await (await other.request.get(new URL('/api/runs', page.url()).href)).json())).toEqual([]);
  } finally { await visitor.close(); }
});

test('responsive RU/EN, API errors, lists and keyboard at all requested widths', async ({ page }) => {
  test.skip(!!process.env.OPSWEAVE_E2E_URL, 'Large responsive matrix uses isolated local test database');
  test.setTimeout(180000);
  const widths = [320,360,390,430,539,540,541,768,849,850,851,1024,1149,1150,1151,1280,1440,1920,2560,3840,5120,7680];
  const fits = async () => { const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth); if(overflow) { console.log('Overflow bounds',await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,nodes:[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,cls:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(e=>e.right>innerWidth+1||e.left < -1).slice(0,20)}))); await page.screenshot({path:'screenshots/v3-overflow-diagnostic.png',fullPage:true, animations: "disabled"}); } expect(overflow, `horizontal overflow at ${page.viewportSize().width}px`).toBe(false); };
  await page.goto('/');
  await expect(page.getByRole('heading',{name: /Сбой — не время/})).toBeVisible();
  for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); }
  await page.setViewportSize({width:320,height:800});
  await page.screenshot({path:'screenshots/v3-welcome-320.png',fullPage:true, animations: "disabled"});
  await page.getByRole('button',{name:'Switch to English'}).click();
  for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); }
  await page.getByRole('button',{name:'Переключить на русский'}).click();
  await page.getByRole('button',{name:'Попробовать без регистрации',exact:true}).click();
  await page.getByRole('link',{name:'Справка',exact:true}).click();
  await expect(page.getByRole('heading',{name:'В магазине не работает оплата',exact:true})).toBeVisible();
  for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); }
  await page.getByRole('link',{name:/Инструкции/}).click();
  await page.getByRole('button',{name:'Создать первую инструкцию'}).click();
  for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); }
  await page.getByLabel('Название инструкции',{exact:true}).fill('Учебный план '+ 'ДлинноеНазвание'.repeat(5));
  await page.getByLabel('Действие или сообщение').fill('Учебное действие '+ 'ПроверитьРезультат'.repeat(10));
  await page.route('**/api/playbooks', async route => route.request().method()==='POST' ? route.fulfill({status:503,contentType:'application/json',body:'{"error":"unavailable"}'}) : route.continue());
  await page.getByRole('button',{name:'Сохранить',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Название инструкции',{exact:true})).toHaveValue(/ДлинноеНазвание/);
  await page.unroute('**/api/playbooks');
  await page.getByRole('button',{name:'Сохранить',exact:true}).click();
  await expect(page.getByText('Черновик сохранён',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Опубликовать',exact:true}).click();
  await expect(page.getByText('Инструкция готова к запуску.')).toBeVisible();
  await page.getByRole('link',{name:/Главная/}).click();
  await page.getByRole('button',{name:'Запустить первую инструкцию'}).click();
  for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); }
  await page.getByLabel('Название инцидента',{exact:true}).fill('Учебный сбой '+ 'Название'.repeat(15));
  await page.getByLabel('Сервис',{exact:true}).fill('training-service');
  await page.getByRole('button',{name:'Создать и запустить'}).click();
  await expect(page.getByRole('heading',{name:'Текущий шаг',exact:true})).toBeVisible();
  for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); }
  await page.setViewportSize({width:320,height:800});
  await page.locator('.run-context summary').click();
  await page.getByRole('button',{name:'Остановить выполнение',exact:true}).scrollIntoViewIfNeeded();
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button',{name:'Остановить выполнение',exact:true}).click();
  await expect(page.getByRole('button',{name:'Остановить выполнение',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Switch to English'}).click();
  for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); }
  await page.getByRole('link',{name:/Instructions/}).click();
  const plans = await (await page.request.get('/api/playbooks')).json();
  for(let i=0;i<7;i++) { const response=await page.request.post('/api/playbooks',{data:{name:'Practice list '+i,description:'Long training description '.repeat(10),steps:plans[0].steps}}); expect(response.ok()).toBeTruthy(); if(i===0){ await page.reload(); await expect(page.locator('.playbook-card')).toHaveCount(2); await page.setViewportSize({width:320,height:800}); await fits(); } }
  await page.reload();
  await expect(page.locator('.playbook-card')).toHaveCount(8);
  for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); }
  for(const name of [/Analytics/,/Integrations/,/Account/]) { await page.getByRole('link',{name}).click(); await expect(page.locator('main h1')).toBeVisible(); for(const width of widths) { await page.setViewportSize({width,height:960}); await fits(); } }
  await page.getByRole('link',{name:/Help/}).click();
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
      await page.getByRole('button',{name:/Войти/,exact:false}).click();
      await page.getByRole('button',{name:'Регистрация',exact:true}).click();
      await page.getByLabel('Почта',{exact:true}).fill(`opsweave-v3-${suffix}-${index}@example.invalid`);
      await page.getByLabel('Пароль').fill(password);
      await page.getByRole('button',{name:'Создать аккаунт',exact:true}).click();
      await expect(page.getByRole('heading',{name:'В работе'})).toBeVisible();
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
    await installAxe(page);
    const check = () => checkAccessibility(page);
    for(const width of [320,1440]) {
      await page.setViewportSize({width,height:900}); await page.goto('/');
      await expect(page.getByRole('heading',{name: /Сбой — не время/})).toBeVisible();
      await page.getByRole('button',{name:'Справка',exact:true}).tap();
      await check();
      await page.keyboard.press('Escape');
    }
    await page.getByRole('button',{name:'Попробовать без регистрации',exact:true}).tap();
    await page.getByRole('link',{name:'Справка',exact:true}).click();
  await expect(page.getByRole('heading',{name:'В магазине не работает оплата',exact:true})).toBeVisible();
    for(const width of [320,1440]) { await page.setViewportSize({width,height:900}); await check(); }
    await page.getByRole('link',{name:/Инструкции/}).tap();
    await page.getByRole('button',{name:'Создать первую инструкцию'}).tap();
    for(const width of [320,1440]) { await page.setViewportSize({width,height:900}); await check(); }
  } finally { await context.close(); }
});

test('guest workspace: direct entry, saved editor reload, repeated entry, library launch and tenant isolation', async ({ page, browser, baseURL }) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Попробовать без регистрации',exact:true}).click();
  await expect(page.getByRole('heading',{name:'В работе',exact:true})).toBeVisible();
  const identity=await (await page.request.get('/api/auth/me')).json();
  await page.getByRole('button',{name:/Открыть готовую инструкцию/}).click();
  await page.getByLabel('Название инструкции',{exact:true}).fill('Проверка восстановления гостевого редактора');
  await page.getByRole('button',{name:'Сохранить',exact:true}).click();
  await expect(page.getByText('Черновик сохранён',{exact:true})).toBeVisible();
  expect(new URL(page.url()).searchParams.get('id')).toBeTruthy();
  await page.reload();
  await expect(page.getByLabel('Название инструкции',{exact:true})).toHaveValue('Проверка восстановления гостевого редактора');
  await page.getByRole('button',{name:'Опубликовать',exact:true}).click();
  await expect(page.getByText('Инструкция готова к запуску.',{exact:true})).toBeVisible();
  const repeated=await page.request.post('/api/auth/guest',{data:{}});
  expect(repeated.status()).toBe(200);
  expect((await repeated.json()).id).toBe(identity.id);
  await page.getByRole('link',{name:'Инструкции',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Проверка восстановления гостевого редактора',exact:true})).toBeVisible();
  await page.getByRole('button',{name:/Запустить/,exact:false}).click();
  await page.getByLabel('Название инцидента',{exact:true}).fill('Сохранённый запуск гостя');
  await page.getByLabel('Сервис',{exact:true}).fill('guest-service');
  await page.getByRole('button',{name:'Создать и запустить',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Текущий шаг',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading',{name:'Текущий шаг',exact:true})).toBeVisible();
  const exportUrl=await page.getByRole('link',{name:/Выгрузить JSON/}).getAttribute('href');
  const other=await browser.newContext({baseURL});
  try {
    await other.request.post('/api/auth/guest',{data:{}});
    expect((await other.request.get(exportUrl)).status()).toBe(404);
    expect((await (await other.request.get('/api/runs')).json())).toEqual([]);
    expect((await (await other.request.get('/api/playbooks')).json())).toEqual([]);
    const foreignRunPage = await other.newPage();
    await foreignRunPage.goto(page.url());
    await expect(foreignRunPage.getByRole('alert')).toContainText('Этот запуск недоступен');
    await expect(foreignRunPage.getByRole('heading', { name: 'Сохранённый запуск гостя', exact: true })).toHaveCount(0);
    await foreignRunPage.getByRole('button', { name: 'Моя история', exact: true }).click();
    await expect(foreignRunPage.getByRole('heading', { name: 'История запусков', exact: true })).toBeVisible();
    await expect(foreignRunPage.getByRole('heading', { name: 'Ещё нет запусков', exact: true })).toBeVisible();
    expect((await (await other.request.get('/api/runs')).json())).toEqual([]);
  } finally {await other.close();}
});

test('mobile current action, navigation, offline retry, reduced motion and accessibility', async ({ browser, baseURL }) => {
  const context=await browser.newContext({baseURL,viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
  try {
    const page=await context.newPage();
    await page.goto('/');
    await page.getByRole('button',{name:'Попробовать без регистрации',exact:true}).tap();
    await page.getByRole('button',{name:/Открыть готовую инструкцию/}).tap();
    await page.route('**/api/playbooks', route=>route.request().method()==='POST' ? route.fulfill({status:503,contentType:'application/json',body:'{"error":"unavailable"}'}) : route.continue());
    await page.getByRole('button',{name:'Сохранить',exact:true}).tap();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Название инструкции',{exact:true})).toHaveValue('Восстановление сервиса');
    await page.unroute('**/api/playbooks');
    await page.getByRole('button',{name:'Сохранить',exact:true}).tap();
    await expect(page.getByText('Черновик сохранён',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Опубликовать',exact:true}).tap();
    await page.getByRole('button',{name:/Запустить инструкцию/}).tap();
    await page.getByLabel('Название инцидента',{exact:true}).fill('Мобильная проверка');
    await page.getByLabel('Сервис',{exact:true}).fill('phone-service');
    await page.getByRole('button',{name:'Создать и запустить',exact:true}).tap();
    await expect(page.getByRole('heading',{name:'Текущий шаг',exact:true})).toBeVisible();
    expect(await page.locator('.decision-panel').evaluate(e=>e.getBoundingClientRect().top)).toBeLessThan(await page.locator('.execution-panel').evaluate(e=>e.getBoundingClientRect().top));
    await page.getByLabel('Результат или обоснование').fill('Метрики проверены на телефоне');
    await page.getByRole('button',{name:'Шаг выполнен',exact:true}).tap();
    await expect(page.getByRole('heading',{name:'Подтвердите решение',exact:true})).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading',{name:'Подтвердите решение',exact:true})).toBeVisible();
    await page.screenshot({path:'screenshots/redesign-mobile-action.png',fullPage:true, animations: "disabled"});
    if(process.env.OPSWEAVE_AXE_PATH){
      await installAxe(page);
      await checkAccessibility(page);
    }
    for(const width of [320,360,390,540,768,850,1024,1440]){
      await page.setViewportSize({width,height:900});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`run overflow ${width}`).toBe(true);
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('.mobile-more summary').tap();
    await page.getByRole('link',{name:'Аккаунт',exact:true}).tap();
    await expect(page.getByRole('heading',{name:'Ваш аккаунт',exact:true})).toBeVisible();
  } finally {await context.close();}
});



test('gateway error: guest entry shows a readable error and retries into a real workspace', async ({page}) => {
  await page.goto('/');
  await page.route('**/api/auth/guest',route=>route.fulfill({status:503,contentType:'text/html',body:'<h1>Service unavailable</h1>'}));
  await page.getByRole('button',{name:'Попробовать без регистрации',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Сервис временно недоступен');
  await page.unroute('**/api/auth/guest');
  await page.getByRole('button',{name:'Повторить',exact:true}).click();
  await expect(page.getByRole('heading',{name:'В работе',exact:true})).toBeVisible();
  expect((await page.request.get('/api/auth/me')).status()).toBe(200);
});



test('theme switch: both themes persist after reload and keep the workspace accessible', async ({ page }) => {
  test.skip(!process.env.OPSWEAVE_AXE_PATH, 'Both-theme WCAG checks require the existing local axe tool');
  test.setTimeout(90000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1050 });
  await installAxe(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Попробовать без регистрации', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'В работе', exact: true })).toBeVisible();
  const identity = await (await page.request.get('/api/auth/me')).json();
  await checkAccessibility(page);
  await page.getByRole('button', { name: 'Светлая тема', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'Тёмная тема', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'В работе', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => localStorage.getItem('opsweave.theme.v2'))).toBe('light');
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).colorScheme)).toBe('light');
  await checkAccessibility(page);
  await page.screenshot({ path: 'screenshots/theme-light-workspace.png', fullPage: false, animations: 'disabled' });
  await page.getByRole('button', { name: 'Тёмная тема', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'В работе', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Светлая тема', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('opsweave.theme.v2'))).toBe('dark');
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).colorScheme)).toBe('dark');
  expect((await (await page.request.get('/api/auth/me')).json()).id).toBe(identity.id);
  await checkAccessibility(page);
  await page.screenshot({ path: 'screenshots/theme-dark-workspace.png', fullPage: false, animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('published instruction launches while the background list refresh is delayed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Попробовать без регистрации', exact: true }).click();
  await page.getByRole('button', { name: /Открыть готовую инструкцию/ }).click();
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByText('Черновик сохранён', { exact: true })).toBeVisible();
  const playbookId = new URL(page.url()).searchParams.get('id');
  let releaseRefresh;
  const refreshGate = new Promise(resolve => { releaseRefresh = resolve; });
  await page.route('**/api/playbooks', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    await refreshGate;
    await route.fulfill({ response });
  });
  try {
    await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
    await expect(page.getByText('Инструкция готова к запуску.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Запустить инструкцию/ }).click();
    const selection = page.locator('select[name="playbookId"]');
    await expect(selection).toHaveValue(playbookId);
    await page.getByLabel('Название инцидента', { exact: true }).fill('Запуск сразу после публикации');
    await page.getByLabel('Сервис', { exact: true }).fill('publish-race-regression');
    const accepted = page.waitForResponse(response => new URL(response.url()).pathname === '/api/runs' && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Создать и запустить', exact: true }).click();
    const response = await accepted;
    expect(response.status()).toBe(202);
    expect(response.request().postDataJSON().playbookId).toBe(playbookId);
  } finally { releaseRefresh(); }
  await expect(page.getByRole('heading', { name: 'Текущий шаг', exact: true })).toBeVisible();
});

test('motion controls, native transitions and synchronized editor outline', async ({ page }) => {
  await page.setViewportSize({width:1440,height:1000});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.addInitScript(() => {
    window.__visualTransitions=0;
    if(document.startViewTransition){
      const original=document.startViewTransition.bind(document);
      document.startViewTransition=update=>{window.__visualTransitions++; return original(update);};
    }
  });
  await page.goto('/');
  await expect(page.locator('.hero-infrastructure')).toBeVisible();
  await expect(page.locator('.hero-infrastructure')).toHaveJSProperty('naturalWidth',1672);
  const signal=page.locator('.trace-signal');
  const firstOffset=await signal.evaluate(el=>getComputedStyle(el).strokeDashoffset);
  await expect.poll(()=>signal.evaluate(el=>getComputedStyle(el).strokeDashoffset)).not.toBe(firstOffset);
  await page.getByRole('button',{name:'Остановить анимацию',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion','paused');
  await expect.poll(()=>page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)).toBe(0);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-motion','paused');
  await page.getByRole('button',{name:'Включить анимацию',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion','running');
  await page.getByRole('button',{name:'Светлая тема',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  expect(await page.evaluate(()=>window.__visualTransitions)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Попробовать без регистрации',exact:true}).click();
  await page.getByRole('button',{name:/Открыть готовую инструкцию/}).click();
  const outline=page.getByRole('list',{name:'Порядок шагов',exact:true});
  await expect(outline.getByRole('button')).toHaveCount(5);
  await page.getByLabel('Действие или сообщение',{exact:true}).nth(1).fill('Проверить платёжный API');
  await expect(outline.getByRole('button').nth(1)).toContainText('Проверить платёжный API');
  await page.getByRole('button',{name:'Переместить шаг 2 вверх',exact:true}).click();
  await expect(outline.getByRole('button').first()).toContainText('Проверить платёжный API');
  await outline.getByRole('button').first().press('Enter');
  await expect(page.getByLabel('Действие или сообщение',{exact:true}).first()).toBeFocused();
  await page.getByRole('button',{name:'Сохранить',exact:true}).click();
  await expect(page.getByText('Черновик сохранён',{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Действие или сообщение',{exact:true}).first()).toHaveValue('Проверить платёжный API');
  await page.getByRole('link',{name:'История',exact:true}).click();
  expect(new URL(page.url()).searchParams.get('page')).toBe('history');
  await page.reload();
  await expect(page.getByRole('heading',{name:'История запусков',exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.transition||'')).toBe('');
  await page.emulateMedia({reducedMotion:'reduce'});
  const count=await page.evaluate(()=>window.__visualTransitions);
  await page.getByRole('link',{name:'Инструкции',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Инструкции',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>window.__visualTransitions)).toBe(count);
  await expect.poll(()=>page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)).toBe(0);
  await expect(page.getByRole('button',{name:'Движение уменьшено в системе',exact:true})).toBeDisabled();
});
