const express = require('express');
const app = express();
var api = require('./icao');
const { Mutex } = require('async-mutex');
// cache = require('./vars');
const PORT = process.env.PORT || 3030;

'use strict';
const fs = require('fs');
// const mysql = require('mysql')
const rawdata = fs.readFileSync('country.json');
const countries = JSON.parse(rawdata);
let cache = null;
let timeoutId = null;
const mutex = new Mutex(); // Para evitar escrituras concurrentes
let pendingWrites = 0; // Contador de escrituras pendientes

async function loadInitialData() {
    try {
        const rawData = await fs.readFileSync('flights.json', 'utf8');
        cache = JSON.parse(rawData);
        console.log('Datos cargados desde flights.json');
    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        cache = { time_stamp: {}, flights : {} }; // Estructura inicial si el archivo no existe
    }
}
// 4. Función segura para guardar datos
async function saveData() {
    const release = await mutex.acquire();
    try {
        await fs.writeFile('flights.json.tmp', JSON.stringify(cache),(err) => {
            if (err) console.log(err);
            else {
                console.log("flights written tmp successfully\n");
                fs.rename('flights.json.tmp', 'flights.json',(err) => {
                    if (err) console.log(err);
                    else {
                        console.log("flights save successfully\n");
                    }
                });
            }
        });
          // Operación atómica
    } catch (error) {
        console.error('Error guardando datos:', error);
    } finally {
        release();
        pendingWrites=0;
    }
}
// Middleware para gestionar la carga y descarga de datos
app.use(async (req, res, next) => {
    if (!cache) await loadInitialData();
    // Reiniciar temporizador de inactividad
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(saveData, 60000); // 1 minuto de inactividad
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    if (Math.round(used * 100) / 100 > 100) console.log(`Memoria usada: ${Math.round(used * 100) / 100} MB`);
    next();
});

function sleep(s) {
    return new Promise(resolve => setTimeout(resolve, (s * 1000)));
}
app.get('/calcular', async (request, response) => {
    if(!cache) await loadInitialData();
    let data = request.query;

    if (!data.from || !data.to || data.from == '' || data.to == '') {
        return response.status(404).end();
    }
    data.from = data.from.toUpperCase();
    data.to = data.to.toUpperCase();

    if (!countries[data.from] || !countries[data.to]) {
        return response.json({ 'result': null }).end();
    }
    let result = null
    var dia = 86300000 //24 horas en milisegundos
    var limit = dia * 180
    cache_flight = cache.flights[`${data.from}/${data.to}`]
    is_null = cache_flight && cache.flights[`${data.from}/${data.to}`][0] == null
    is_limit_null = (new Date() - new Date(cache.time_stamp[`${data.from}/${data.to}`])) <= dia
    is_limit = (new Date() - new Date(cache.time_stamp[`${data.from}/${data.to}`])) <= limit
    if (cache_flight && ((is_null && is_limit_null) || (!is_null && is_limit))) {
        
        result = (data.type == '1') ? cache.flights[`${data.from}/${data.to}`][1] : cache.flights[`${data.from}/${data.to}`][0]
        console.log(`${data.from}/${data.to} ${result}`)
        // console.log(`ruta: ${data.from}/${data.to} valor: ${result}`);
        return response.json({ 'result': result }).end();
    } else {
        let condition = 0;
        while (condition < 300) {
            try {
                result = await api.icao(data.from, data.to);
                break
            } catch (exeption) {
                await sleep(30);
                condition += 30;
            }
        }

    }

    if (result == null) {
        cache.time_stamp[`${data.from}/${data.to}`] = new Date();
        cache.flights[`${data.from}/${data.to}`] = [null, null];
        console.log(`${data.from}/${data.to} fail`)
        return response.json({ 'result': null }).end();
    }
    let main = result.main;
    let detail1 = result.detail1;
    let detail2 = result.detail2;
    cache.time_stamp[`${data.from}/${data.to}`] = new Date();
    cache.flights[`${data.from}/${data.to}`] = [main, detail1];
    cache.time_stamp[`${data.to}/${data.from}`] = new Date();
    cache.flights[`${data.to}/${data.from}`] = [main, detail2];
    if (data.type == '1') {
        console.log(cache.time_stamp[`${data.from}/${data.to}`] + `${data.from}/${data.to} ` + cache.flights[`${data.from}/${data.to}`][1])
        return response.json({ 'result': cache.flights[`${data.from}/${data.to}`][1] }).end();
    } else {
        console.log(cache.time_stamp[`${data.from}/${data.to}`] + `${data.from}/${data.to} ` + cache.flights[`${data.from}/${data.to}`][0])
        return response.json({ 'result': cache.flights[`${data.from}/${data.to}`][0] }).end();
    }
})

const server = app.listen(PORT, () => {
    console.log(`server started on port ${PORT}`)
})

// 8. Cierre seguro
const gracefulShutdown = async () => {
    console.log('Apagando servidor...');
    
    server.close(async () => {
        // Esperar a que se completen las escrituras pendientes
        while (pendingWrites > 0) {
            console.log(`Esperando ${pendingWrites} escrituras pendientes...`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('Servidor cerrado correctamente');
        process.exit(0);
    });

    setTimeout(() => {
        console.error('Forzando cierre por timeout');
        process.exit(1);
    }, 10000);
};

process.once('SIGINT', gracefulShutdown);
process.once('SIGTERM', gracefulShutdown);

// 9. Precarga inicial
loadInitialData();
// // 10. Limpieza periódica de memoria (opcional)
// setInterval(() => {
//     if (dataInMemory.items.length > 1000) {
//         dataInMemory.items = dataInMemory.items.slice(-500);
//         saveData();
//     }
// }, 3600000); // Cada hora