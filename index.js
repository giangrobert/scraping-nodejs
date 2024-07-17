const puppeteer = require('puppeteer');

async function getBetanoData() {
  const browser = await puppeteer.launch({ headless: false }); // Change to true for headless mode
  const page = await browser.newPage();
  await page.goto('https://br.betano.com/live/', { waitUntil: 'networkidle2' });

  // Validate if the modal exists
  const modalSelector = '#landing-page-modal .sb-modal__close__btn';
  const modalExists = await page.$(modalSelector);

  if (modalExists) {
    // Close the modal
    await page.click(modalSelector);
    // Wait for the modal to disappear
    await page.waitForSelector(modalSelector, { hidden: true });
  }
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });

  await page.waitForSelector('.vue-recycle-scroller__item-view');

  const items = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.vue-recycle-scroller__item-view')).map(item => item.innerText);
  }
  );
  const formatItems = items.map(item => {
    const lines = item.split('\n');
    const timeRegex = /^\d{1,2}:\d{2}$/;
    const oddsRegex = /^\d+\.\d{2}$/;
    const scoreRegex = /^\d+$/;
    const specialBetRegex = /^X$/;

    let championship = '';
    const teams = [];
    let time = '';
    let teamOneScore = '';
    let teamTwoScore = '';
    const odds = [];
    const specialBets = [];

    lines.forEach(line => {
      if (timeRegex.test(line)) {
        time = line;
      } else if (oddsRegex.test(line)) {
        odds.push(line);
      } else if (scoreRegex.test(line) && !teamOneScore) {
        teamOneScore = line;
      } else if (scoreRegex.test(line) && !teamTwoScore) {
        teamTwoScore = line;
      } else if (specialBetRegex.test(line)) {
        specialBets.push(line);
      } else if (!championship && line.includes(' - ')) {
        championship = line;
      } else if (teams.length < 2) {
        teams.push(line);
      }
    });

    return {
      championship,
      teams: teams.join(' vs '),
      time,
      score: `${teamOneScore}-${teamTwoScore}`,
      odds: odds.join(' | '),
      specialBets: specialBets.join(' | ')
    };
  }
  );
  await browser.close();
  return formatItems;
}

setInterval(async () => {
  const data = await getBetanoData();
  console.log(data);
}, 10000);