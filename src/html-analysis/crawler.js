const path = require('path');
const fs = require('fs-extra');
const { Cluster } = require('puppeteer-cluster');

const statsDir = path.resolve(__dirname, '../../stats-html');
const projectName = 'openshift';
// List of pages to crawl
const pages = [];
let crawlCount = 0;
const report = {};
let exitCode = 0;

async function crawlPatternflyUsage(page, pagePath, options) {
  // Naive looking at <a> tags
  // Possible improvement would be to be more like Google
  // https://searchengineland.com/tested-googlebot-crawls-javascript-heres-learned-220157
  const classNames = (await page.$$eval('[class*="pf"]', as => as.map(a => a.classList)))
    .map(classList => Object.values(classList).join(' '));

  if (report[pagePath]) {
    console.error('duplicate pagePath?', pagePath);
  }
  report[pagePath] = { count: classNames.length };
  // For loop gives a little more perf
  for (let i = 0; i < classNames.length; i++) {
    const className = classNames[i];
    report[pagePath][className] = report[pagePath][className] + 1 || 1;
  }
}

function normalizeHref(href) {
  return href
    .replace(/#.*/, '') // Remove after # (anchor links)
    .replace(/\/$/, ''); // Remove trailing /
}

async function crawlLinks(page, options, cluster) {
  // Naive looking at <a> tags
  // Possible improvement would be to be more like Google
  // https://searchengineland.com/tested-googlebot-crawls-javascript-heres-learned-220157
  (await page.$$eval('a', as => as.map(a => a.href)))
    .map(normalizeHref)
    .filter(href => href.startsWith(options.prefix) || href.startsWith('/'))
    .forEach(href => {
      if (!pages.includes(href)) {
        pages.push(href);
        cluster.queue(href);
      }
    });
}

async function crawlPage(page, pagePath, options, cluster) {
  try {
    await page.goto(pagePath, { waitUntil: 'load', timeout: 6000 });
    console.log(`${++crawlCount}/${pages.length} ${pagePath}`);
  }
  catch {
    console.error(`${pagePath} timeout`);
  }

  const startTime = process.hrtime();
  await Promise.all([
    crawlLinks(page, options, cluster),
    crawlPatternflyUsage(page, pagePath, options),
  ])
    .then(() => {
      const elapsed = process.hrtime(startTime);
      report[pagePath].time = elapsed[0] + elapsed[1] / 1000000000;
    })
}

async function crawl(options) {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: 4,
  });

  async function crawlPageWrapper({ page, data: pagePath }) {
    await crawlPage(page, pagePath, options, cluster);
  }
  await cluster.task(crawlPageWrapper);

  pages.push(...options.pages.map(page => `${options.prefix}${page}`));
  pages.forEach(initialPage => cluster.queueJob(initialPage));

  await cluster.idle();
  await cluster.close();
  const reportPath = path.join(statsDir, `/${new Date().toISOString().substr(0, 10)}/`, projectName, '/report.json');
  fs.ensureFileSync(reportPath);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  process.exit(exitCode);
}

// crawl({
//   prefix: 'http://localhost:8080',
//   pages: ['']
// });

// crawl({
//   prefix: 'http://localhost:9000',
//   pages: ['/dashboards', '/add/ns/default']
// });

// (async () => {
//   const browser = await puppeteer.launch();
//   const page = await browser.newPage();
//   await page.goto('https://example.com');
//   await page.screenshot({path: 'example.png'});

//   await browser.close();
// })();