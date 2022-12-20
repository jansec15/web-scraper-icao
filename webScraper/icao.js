
const baseurl = "https://applications.icao.int/icec";

const puppeteer = require('puppeteer');

async function icao(from, to) {
    const start = new Date();
    const browser = await puppeteer.launch({ headless: false });
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
    await page.goto(baseurl);
    await page.waitForSelector('form');
    await page.waitForTimeout(1000);
    await page.type(".frm1", from);
    await page.waitForTimeout(1000);
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
        console.log('origen no encontrado');
        await browser.close();
        return null;
    }
    await page.click(formId);
    await page.type(".to1", to);
    await page.waitForTimeout(1000);
    //busca el id em la lista de destinos
    const toId = await page.evaluate(async () => {

        txt = document.querySelector('#ui-id-2').innerHTML;
        const ids = await getIds(txt);
        for (x in ids) {
            if ((document.querySelector('#ui-id-' + ids[x]).innerHTML).includes(await getTo())) return '#ui-id-' + ids[x];

        }
        return null;
    });
    if (toId == null) {
        console.log('destino no encontrado');
        await browser.close();
        return null;
    }
    await page.click(toId);
    await page.waitForTimeout(1000);
    await page.click('#computeByInput');
    await page.waitForTimeout(1000);
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
    console.log(response);
    await browser.close();
    const end = new Date() - start;
    console.log(`Tiempo de ejecución ${end} ms`);
    return response;

}
module.exports = {
    "icao": icao
}
// const result = icao("BOG", "MDE");
