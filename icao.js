async function loadChromium() {
    const PCR = require("puppeteer-chromium-resolver");
    const option = {
        revision: "", // Deja esto vacío para que PCR busque la mejor revisión
        detectionPath: "", // Deja esto vacío para que PCR busque la mejor ruta
        folderName: ".chromium-browser-snapshots", // Directorio para snapshots
        defaultHosts: ["https://storage.googleapis.com", "https://npm.taobao.org/mirrors"],
        hosts: [],
        cacheRevisions: 2,
        retry: 3,
        silent: false,
    };

    try {
        const stats = await PCR(option);
        process.env['PUPPETEER_EXECUTABLE_PATH'] = stats.executablePath;
        console.log("Ruta de Chromium:", process.env.PUPPETEER_EXECUTABLE_PATH);
        return stats.executablePath; // Devuelve la ruta para usarla directamente
    } catch (error) {
        console.error("Error al cargar Chromium:", error);
        // Aquí puedes manejar el error de forma más específica:
        if (error.message.includes('No revision found')) {
            console.error("No se encontró una revisión compatible de Chromium. Asegúrate de tener conexión a internet para la primera ejecución.");
            // Aquí puedes ofrecer instrucciones al usuario o tomar una acción alternativa.
        } else if (error.message.includes("Couldn't find expected browser")) {
            console.error("No se pudo encontrar el navegador. Asegúrate de que el directorio '.chromium-browser-snapshots' tenga los permisos correctos.");
        }
        else {
            console.error("Error desconocido al cargar Chromium");
        }
        return null; // Indica que no se pudo cargar Chromium
    }
}
async function icao(from, to) {
    const executablePath = await loadChromium();
    if (!executablePath) {
        console.error("No se pudo iniciar Puppeteer porque no se encontró Chromium.");
        return null;
    }
    const start = new Date();
    const baseurl = "https://applications.icao.int/icec/Home/Index";
    const puppeteer = require('puppeteer');

    //cargar el navegador en una variable
    const browser = await puppeteer.launch({
        headers: { "Accept-Encoding": "gzip,deflate,compress" },
        //false si quiere ver el navegador, true si no quiere mostrar el navegador
        headless: true,
        executablePath: process.env['PUPPETEER_EXECUTABLE_PATH'],
        args: ["--no-sandbox", '--disable-setuid-sandbox', '--use-gl=egl'],
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

    await page.waitForSelector('[aria-labelledby="select2-SelectPassengerDestination1-container"]');
    //ejecuta codigo en el navegador
    await page.evaluate(async () => {
        var opt1 = "#SelectPassengerDeparture";
        var opt2 = "#SelectPassengerDestination1";
        //cargar variable from con la funcion getFrom()
        var frm = await getFrom();
        console.log("From: " + frm);
        //input de la pagina para origen de vuelo
        $(opt1).val(frm);
        // $(opt2).empty();
        //funcion de la pagina icao que actualiza el input de destino
        // Reduce("second");
        PassengerGetAirportsByDeparture(frm, false, "Departure");
        const delay = ms => new Promise(res => setTimeout(res, ms));
        await delay(500);
        //cargar variable to con la funcion getTo()
        var to = await getTo();
        //actualiza inputs de la pagina
        $(opt2).val(to);
        PassengerGetAirportsByDeparture(to, false, "Destination1");
        // Reduce("second");
        // $(opt + "frm3").val(frm);
    }).catch(error => {
        console.log(error);
        return undefined;
    });

    //envia el formulario
    try {
        await Promise.race([
            page.click('#calculateButton'),
            new Promise((_, reject) => {
                setTimeout(() => {
                    console.log("Límite de tiempo excedido")
                    reject(new Error('Límite de tiempo excedido'));
                }, 3000); // Tiempo límite en milisegundos (en este caso, 5 segundos)
            })
        ]);
    } catch (error) {
        console.log(error);
        await browser.close();
        return undefined;
    }

    //div que contiene los resultados
    await page.waitForSelector('div#ResultDivPassengerEconomyMetric .body-content-result');

    //codigo para extraer respuesta del navegador
    const result = await page.evaluate(async () => {
        var table = document.querySelectorAll('div#ResultDivPassengerEconomyMetric .body-content-result');
        var result = [];

        for (var i = 0; i < table.length; i++) {
            let elementLabel = table[i].querySelectorAll(".result-item-label-layout label")
            let elementValue = table[i].querySelectorAll(".result-item-value-layout label")
            let fuel = "";
            if (elementLabel && elementLabel[1].innerHTML == "Aircraft Fuel Burn/leg") {
                console.log(elementLabel[1].innerHTML)
                console.log(elementValue[1].innerHTML)
                fuel = elementValue[1].innerHTML;
                result.push(["Aircraft Fuel Burn/leg", fuel]);
                continue
            }
            // let element = table[i].querySelectorAll('label');
            let key = elementLabel[2].innerHTML
            let value = elementValue[2].innerHTML;
            if (key == "" || value == "") {
                continue
            }
            result.push([key, value]);
        }
        return result;
    });
    //cierra el navegador
    await browser.close();

    //si por alguna razon no tiene resultado
    if (result.length == 0) {
        return undefined;
    }
    // let origin = 7;
    // let destination = 12;
    //el valor de origen y destino, trae un label que contiene Passenger si no lo contiene es que o cambio o existe problema
    // if (!result[origin][0].includes('Passenger CO')) {
    //     return undefined;
    // }

    // if (!result[destination][0].includes('Passenger CO')) {
    //     return undefined;
    // }
    let response = {};
    //replace(/\D+/g, "") quita todo lo que no sea numero
    response.main = parseFloat(result[0][1].replace(/[^0-9.]+/g,""));
    response.detail1 = parseFloat(result[1][1].replace(/[^0-9.]+/g,""));
    response.detail2 = parseFloat(result[3][1].replace(/[^0-9.]+/g,""));
    response.fuel1 = parseFloat(result[2][1].replace(/[^0-9.]+/g,""));
    response.fuel2 = parseFloat(result[4][1].replace(/[^0-9.]+/g,""));
    const end = new Date() - start;
    console.log(`Tiempo de ejecución ${end} ms`);
    // console.log(result);
    // console.log(response)
    return response;
}

module.exports = {
    "icao": icao
}
const result = icao("BOG", "MDE");

