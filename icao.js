
const baseurl = "https://applications.icao.int/icec";
const puppeteer = require('puppeteer');

async function icao(from, to) {
    const start = new Date();
    // const browser = await puppeteer.launch({
    //     executablePath: '/usr/bin/chromium-browser'
    //   })
    const PCR = require("puppeteer-chromium-resolver");
    const option = {
        revision: "",
        detectionPath: "",
        folderName: ".chromium-browser-snapshots",
        defaultHosts: ["https://storage.googleapis.com", "https://npm.taobao.org/mirrors"],
        hosts: [],
        cacheRevisions: 2,
        retry: 3,
        silent: false,
    };
    const stats = await PCR(option);
    process.env.PUPPETEER_EXECUTABLE_PATH = stats.executablePath;
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox"],
        executablePath: stats.executablePath,
    }).catch(function (error) {
        console.log(error);
    });
    // const browser = await puppeteer.launch({ headless: false });
    // inicia el navegador
    const page = await browser.newPage();
    await page.exposeFunction("getFrom", function () {
        return '(' + from + ' ';
    });
    await page.exposeFunction("getTo", function () {
        return '(' + to + ' ';
    });
    await page.exposeFunction("getIds", function (txt) {
        const tmp = {};
        const indices = [];
        let i = 0;
        let addPost;
        let num = '';
        const ids = [];
        let idx = txt.indexOf('ui-id-');
        while (idx !== -1) {
            indices.push(idx + 6);
            idx = txt.indexOf('ui-id-', (idx + 1));
        }

        while (indices.length > i) {
            if (addPost == undefined) addPost = indices[0];
            if (isNaN(+txt[addPost])) {
                ids.push(num);
                i += 1;
                addPost = indices[i];
                num = '';
            } else {
                num += txt[addPost];
                addPost += 1;
            }
            if (indices[i] == undefined) break;
        }
        return ids;
    });
    //permite la cargar correctamente la pagina
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
    await page.goto(baseurl);
    // await page.screenshot({ path: 'icao1.jpg' });
    await page.waitForSelector('form');
    // await page.waitForTimeout(1000);
    await page.type(".frm1", from);
    await page.waitForSelector('#ui-id-1 li');
    // await page.screenshot({ path: 'icao1.jpg' });
    //busca el id en la lista de origen

    const formId = await page.evaluate(async () => {
        txt = document.querySelector('#ui-id-1').innerHTML;

        const ids = await getIds(txt);
        for (x in ids) {
            if ((document.querySelector('#ui-id-' + ids[x]).innerHTML).includes(await getFrom())) return '#ui-id-' + ids[x];

        }
        return null;
    });
    if (formId == null) {
        console.log('origen o id no encontrado');
        // await browser.close();
        return null;
    }
    await page.click(formId);
    await page.type(".to1", to);
    await page.waitForSelector('#ui-id-2 li');
    // await page.waitForTimeout(1000);
    //busca el id em la lista de destinos
    const toId = await page.evaluate(async () => {

        try {
            txt = document.querySelector('#ui-id-2').innerHTML;
        } catch {
            return null
        }
        const ids = await getIds(txt);
        for (x in ids) {
            if ((document.querySelector('#ui-id-' + ids[x]).innerHTML).includes(await getTo())) return '#ui-id-' + ids[x];

        }
        return null;
    });
    if (toId == null) {
        console.log('destino o id no encontrado');
        await browser.close();
        return null;
    }
    await page.click(toId);
    await page.click('#computeByInput');
    await page.waitForSelector('#tableTotal');
    const tableTotal = await page.$eval("#tableTotal tbody tr", el => el.innerHTML);

    let result = tableTotal.replace(/<th>/g, '').split('</th>');
    result = result.map(x => x.replace(/\n/g, '').trim())
    result = result.filter((item) => item !== '')
    let tableDetail = await page.$eval("#tableDetail tbody", el => el.innerHTML);
    let detail = tableDetail.replace(/<tr class="active">/g, '').split('</tr>');

    detail = detail.map((x) => x.replace(/\n/g, '').trim())
    detail = detail.filter((item) => item !== '')
    detail = detail.map((x) => x.replace(/<th>/g, '').split('</th>'))
    detail = detail.map((x) => x.map(j => j.trim()))
    detail = detail.map((item) => item.filter((item) => item !== ''))
    let response = {}
    response.main = result;
    response.detail1 = detail[0];
    response.detail2 = detail[1];
    await browser.close();
    const end = new Date() - start;
    console.log(`Tiempo de ejecución ${end} ms`);
    return response;
    return formId;

}
module.exports = {
    "icao": icao
}
// const result = icao("BOG", "MDE");

