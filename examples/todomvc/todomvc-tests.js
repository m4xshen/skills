async page => {
  const DIR = 'screenshots'; // relative to where playwright-cli runs; must exist
  const URL_ = 'https://demo.playwright.dev/todomvc/';
  const results = [];
  let n = 0;

  const input = () => page.getByPlaceholder('What needs to be done?');
  const items = () => page.getByTestId('todo-item');
  const titles = () => page.getByTestId('todo-title').allTextContents();
  const counter = async () => (await page.getByTestId('todo-count').count()) ? (await page.getByTestId('todo-count').innerText()).trim() : null;
  const add = async (...ts) => { for (const t of ts) { await input().fill(t); await input().press('Enter'); } };
  // retrying assertion (like expect().toPass): re-evaluates the getter until it matches or 3s elapse
  const eq = async (getter, b, msg) => {
    const deadline = Date.now() + 3000; let a;
    while (true) {
      a = await getter();
      if (JSON.stringify(a) === JSON.stringify(b)) return;
      if (Date.now() > deadline) throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
      await new Promise(r => setTimeout(r, 100));
    }
  };
  const fresh = async () => {
    await page.goto(URL_);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  };

  async function scenario(name, fn) {
    n++;
    const slug = String(n).padStart(2, '0') + '-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
    let status = 'PASS', error = null;
    try { await fresh(); await fn(); }
    catch (e) { status = 'FAIL'; error = String(e.message).split('\n')[0]; }
    const file = `${DIR}/${status}-${slug}.png`;
    try { await page.screenshot({ path: file, fullPage: true }); } catch (e) { error = (error || '') + ' [screenshot failed: ' + e.message + ']'; }
    results.push({ status, name, file: file.replace(DIR + '/', ''), error });
  }

  await scenario('Initial empty state', async () => {
    await eq(async () => await items().count(), 0, 'todo count');
    await eq(async () => await page.locator('.footer').count(), 0, 'footer hidden');
    await eq(async () => await page.locator('.main').count(), 0, 'main hidden');
  });

  await scenario('Add single todo', async () => {
    await add('buy some cheese');
    await eq(async () => await titles(), ['buy some cheese'], 'titles');
    await eq(async () => await input().inputValue(), '', 'input cleared');
    await eq(async () => await counter(), '1 item left', 'counter');
  });

  await scenario('Add multiple todos in order', async () => {
    await add('buy some cheese', 'feed the cat', 'book a doctors appointment');
    await eq(async () => await titles(), ['buy some cheese', 'feed the cat', 'book a doctors appointment'], 'titles');
    await eq(async () => await counter(), '3 items left', 'counter');
  });

  await scenario('Empty input is ignored', async () => {
    await input().press('Enter');
    await add('   ');
    await eq(async () => await items().count(), 0, 'no todos created from empty/whitespace');
  });

  await scenario('Input text is trimmed', async () => {
    await add('    feed the cat    ');
    await eq(async () => await titles(), ['feed the cat'], 'trimmed title');
  });

  await scenario('Special characters and HTML are escaped', async () => {
    await add('<b>bold</b> & "quotes" 🎉 中文');
    await eq(async () => await titles(), ['<b>bold</b> & "quotes" 🎉 中文'], 'literal title');
    await eq(async () => await page.locator('.todo-list b').count(), 0, 'no injected HTML');
  });

  await scenario('Mark todo as completed', async () => {
    await add('buy some cheese', 'feed the cat');
    await items().nth(0).getByRole('checkbox').check();
    await eq(async () => await items().nth(0).getAttribute('class'), 'completed', 'first completed');
    await eq(async () => await counter(), '1 item left', 'counter');
    await eq(async () => await page.getByRole('button', { name: 'Clear completed' }).isVisible(), true, 'clear completed visible');
  });

  await scenario('Unmark completed todo', async () => {
    await add('buy some cheese');
    const cb = items().nth(0).getByRole('checkbox');
    await cb.check(); await cb.uncheck();
    await eq(async () => await items().nth(0).getAttribute('class'), '', 'not completed');
    await eq(async () => await counter(), '1 item left', 'counter');
  });

  await scenario('Toggle all marks every todo complete', async () => {
    await add('a', 'b', 'c');
    await page.getByLabel('Mark all as complete').check();
    await eq(async () => await page.locator('.todo-list li.completed').count(), 3, 'all completed');
    await eq(async () => await counter(), '0 items left', 'counter');
  });

  await scenario('Toggle all twice clears completion', async () => {
    await add('a', 'b', 'c');
    const all = page.getByLabel('Mark all as complete');
    await all.check(); await all.uncheck();
    await eq(async () => await page.locator('.todo-list li.completed').count(), 0, 'none completed');
    await eq(async () => await counter(), '3 items left', 'counter');
  });

  await scenario('Toggle-all checkbox syncs with items', async () => {
    await add('a', 'b');
    const all = page.getByLabel('Mark all as complete');
    await all.check();
    await items().nth(0).getByRole('checkbox').uncheck();
    await eq(async () => await all.isChecked(), false, 'toggle-all unchecked after one item unchecked');
    await items().nth(0).getByRole('checkbox').check();
    await eq(async () => await all.isChecked(), true, 'toggle-all re-checked');
  });

  await scenario('Edit todo by double-click', async () => {
    await add('buy some cheese', 'feed the cat');
    await items().nth(1).dblclick();
    await eq(async () => await items().nth(1).getByRole('checkbox').isVisible(), false, 'checkbox hidden while editing');
    await items().nth(1).getByRole('textbox', { name: 'Edit' }).fill('buy some sausages');
    await items().nth(1).getByRole('textbox', { name: 'Edit' }).press('Enter');
    await eq(async () => await titles(), ['buy some cheese', 'buy some sausages'], 'titles');
  });

  await scenario('Edit saves on blur', async () => {
    await add('feed the cat');
    await items().nth(0).dblclick();
    const ed = items().nth(0).getByRole('textbox', { name: 'Edit' });
    await ed.fill('feed the dog');
    await ed.dispatchEvent('blur');
    await eq(async () => await titles(), ['feed the dog'], 'titles');
  });

  await scenario('Edit trims text', async () => {
    await add('feed the cat');
    await items().nth(0).dblclick();
    const ed = items().nth(0).getByRole('textbox', { name: 'Edit' });
    await ed.fill('    feed the dog   ');
    await ed.press('Enter');
    await eq(async () => await titles(), ['feed the dog'], 'titles');
  });

  await scenario('Edit with empty text deletes todo', async () => {
    await add('a', 'b');
    await items().nth(0).dblclick();
    const ed = items().nth(0).getByRole('textbox', { name: 'Edit' });
    await ed.fill('');
    await ed.press('Enter');
    await eq(async () => await titles(), ['b'], 'titles');
  });

  await scenario('Escape cancels edit', async () => {
    await add('buy some cheese');
    await items().nth(0).dblclick();
    const ed = items().nth(0).getByRole('textbox', { name: 'Edit' });
    await ed.fill('something else');
    await ed.press('Escape');
    await eq(async () => await titles(), ['buy some cheese'], 'titles');
  });

  await scenario('Delete todo via destroy button', async () => {
    await add('a', 'b', 'c');
    await items().nth(1).hover();
    await items().nth(1).getByRole('button', { name: 'Delete' }).click();
    await eq(async () => await titles(), ['a', 'c'], 'titles');
    await eq(async () => await counter(), '2 items left', 'counter');
  });

  await scenario('Clear completed removes completed todos', async () => {
    await add('a', 'b', 'c');
    await items().nth(1).getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Clear completed' }).click();
    await eq(async () => await titles(), ['a', 'c'], 'titles');
    await eq(async () => await page.getByRole('button', { name: 'Clear completed' }).count(), 0, 'clear completed hidden');
  });

  await scenario('Filter Active', async () => {
    await add('a', 'b', 'c');
    await items().nth(1).getByRole('checkbox').check();
    await page.getByRole('link', { name: 'Active' }).click();
    await eq(async () => await titles(), ['a', 'c'], 'titles');
    await eq(() => page.url().endsWith('#/active'), true, 'url hash');
  });

  await scenario('Filter Completed', async () => {
    await add('a', 'b', 'c');
    await items().nth(1).getByRole('checkbox').check();
    await page.getByRole('link', { name: 'Completed' }).click();
    await eq(async () => await titles(), ['b'], 'titles');
    await eq(() => page.url().endsWith('#/completed'), true, 'url hash');
  });

  await scenario('Filter All and back button navigation', async () => {
    await add('a', 'b', 'c');
    await items().nth(1).getByRole('checkbox').check();
    await page.getByRole('link', { name: 'All' }).click();
    await page.getByRole('link', { name: 'Active' }).click();
    await page.getByRole('link', { name: 'Completed' }).click();
    await eq(async () => await titles(), ['b'], 'completed view');
    await page.goBack();
    await eq(async () => await titles(), ['a', 'c'], 'active view after back');
    await page.goBack();
    await eq(async () => await titles(), ['a', 'b', 'c'], 'all view after back');
  });

  await scenario('Selected filter is highlighted', async () => {
    await add('a');
    await page.getByRole('link', { name: 'Active' }).click();
    await eq(async () => await page.getByRole('link', { name: 'Active' }).getAttribute('class'), 'selected', 'active selected');
    await eq(async () => await page.getByRole('link', { name: 'All' }).getAttribute('class'), '', 'all not selected');
  });

  await scenario('Counter pluralization', async () => {
    await add('a');
    await eq(async () => await counter(), '1 item left', 'singular');
    await add('b');
    await eq(async () => await counter(), '2 items left', 'plural');
  });

  await scenario('Todos persist after reload', async () => {
    await add('buy some cheese', 'feed the cat');
    await items().nth(1).getByRole('checkbox').check();
    await page.reload();
    await eq(async () => await titles(), ['buy some cheese', 'feed the cat'], 'titles after reload');
    await eq(async () => await items().nth(1).getAttribute('class'), 'completed', 'completion persisted');
  });

  // Intentional negative check: the app has no length limit, so a very long todo should be accepted
  await scenario('Very long todo text is accepted', async () => {
    const long = 'x'.repeat(1000);
    await add(long);
    await eq(async () => (await titles())[0].length, 1000, 'length');
  });

  return results;
}
