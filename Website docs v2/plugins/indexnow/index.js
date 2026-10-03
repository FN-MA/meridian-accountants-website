// After a successful production deploy, send any new or updated blog posts to IndexNow
// (used by Bing, Copilot, ChatGPT search, Yandex and others). It never fails the build.
const fs = require('fs');
const path = require('path');

module.exports = {
  async onSuccess({ constants } = {}) {
    if (process.env.CONTEXT !== 'production') return;
    try {
      const baseDir = constants && constants.PUBLISH_DIR ? path.resolve(constants.PUBLISH_DIR, '..') : process.cwd();
      const file = path.join(baseDir, '.indexnow.json');
      if (!fs.existsSync(file)) return;
      const body = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!body.urlList || !body.urlList.length) {
        console.log('IndexNow: nothing new to submit');
        return;
      }
      // Give the new deploy a moment to go live before search engines fetch it.
      await new Promise(r => setTimeout(r, Number(process.env.INDEXNOW_DELAY_MS || 15000)));
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
      });
      console.log(`IndexNow: submitted ${body.urlList.length} URL(s), response ${res.status}`);
      body.urlList.forEach(u => console.log(`  ${u}`));
    } catch (err) {
      console.log(`IndexNow: could not submit (${err.message}). The site is unaffected.`);
    }
  },
};
