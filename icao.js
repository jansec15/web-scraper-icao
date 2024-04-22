
const baseurl = "https://applications.icao.int/icec/Home/Index";
const puppeteer = require('puppeteer');

async function icao(from, to) {
    const start = new Date();
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
    //cargar opciones
    const stats = await PCR(option);
    process.env.PUPPETEER_EXECUTABLE_PATH = stats.executablePath;
    //cargar el navegador en una variable
    const browser = await puppeteer.launch({
        headers: { "Accept-Encoding": "gzip,deflate,compress" },
        //false si quiere ver el navegador, true si no quiere mostrar el navegador
        headless: true,
        args: ["--no-sandbox", '--disable-setuid-sandbox', '--use-gl=egl'],
        executablePath: stats.executablePath,
    }).catch(function (error) {
        console.log(error);
    });
    // const browser = await puppeteer.launch({ headless: false });

    // inicia el navegador
    const page = await browser.newPage();

    //funcion para enviar la variable from al navegador
    await page.exposeFunction("getFrom", function () {
        return from;
    });
    //funcion para enviar la variable to al navegador
    await page.exposeFunction("getTo", function () {
        return to;
    });
    //permite la cargar correctamente la pagina
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
    //crea una pestaña con la url
    await page.goto(baseurl);

    await page.waitForSelector('form');

    //ejecuta codigo en el navegador
    await page.evaluate(async () => {
        var opt = "#passenger_";
        //cargar variable from con la funcion getFrom()
        var frm = await getFrom();

        //input de la pagina para origen de vuelo
        $(opt + "frm1").val(frm)

        //funcion de la pagina icao que actualiza el input de destino
        reduce(2);
        GetAirport(frm, opt + "to1", '#passenger');

        //cargar variable to con la funcion getTo()
        var to = await getTo();
        //actualiza inputs de la pagina
        $(opt + "to1").val(to);
        $(opt + "frm3").val(frm);
    }).catch(error => {
        console.log(error);
        return undefined;
    });
    
    //envia el formulario
    try {
        await Promise.race([
            page.click('#computeByInput'),
            // new Promise((_, reject) => {
            //     setTimeout(() => {
            //         console.log("Límite de tiempo excedido")
            //         reject(new Error('Límite de tiempo excedido'));
            //     }, 3000); // Tiempo límite en milisegundos (en este caso, 5 segundos)
            // })
        ]);
    } catch (error) {
        console.log(error);
        return undefined;
    }

    // await page.click('#computeByInput');

    //div que contiene los resultados
    await page.waitForSelector('#h-Metric');

    //codigo para extraer respuesta del navegador
    const result = await page.evaluate(async () => {
        var table = document.querySelectorAll('div#h-Metric .body-content tr th div');
        var result = [];
        for (var i = 0; i < table.length; i++) {
            let element = table[i].querySelectorAll('label');
            let key = element[0].innerHTML
            let value = element[1].innerHTML;
            result.push([key, value])

        }
        return result;
    });

    //cierra el navegador
    // await browser.close();

    //si por alguna razon tiene menos de 6 de longitud es que sucedio algo
    if (result.length < 6) {
        return undefined
    }

    //el valor de origen y destino, trae un label que contiene Passenger si no lo contiene es que o cambio o existe problema
    if (!result[3][0].includes('Passenger CO')) {
        return undefined
    }

    if (!result[5][0].includes('Passenger CO')) {
        return undefined
    }
    let response = {};
    response.main = parseInt(result[3][1]) + parseInt(result[5][1]);
    response.detail1 = result[3][1];
    response.detail2 = result[5][1];
    const end = new Date() - start;
    console.log(`Tiempo de ejecución ${end} ms`);
    return response;
}

module.exports = {
    "icao": icao
}
// const result = icao("BOG", "MDE");

