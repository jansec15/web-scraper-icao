const express = require('express');
const app = express()
var api = require('./icao');
cache = require('./vars')
const PORT = process.env.PORT || 3030;
'use strict';
const fs = require('fs');
const mysql = require('mysql')
const rawdata = fs.readFileSync('country.json');
const countries = JSON.parse(rawdata);
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'icao_cache'
})
// console.log(countries);
// app.get('/:from&:to&:type',  (request, response) => {
//     return response.send("404").end()
// })
// --CRUD--
//LIST
function list_cache() {
    return pool.getConnection((err, connection) => {
                if (err) throw err
                console.log('connected as id ' + connection.threadId)
                connection.query('SELECT * from flight', (err, rows) => {
                    connection.release() // return the connection to pool

                    if (!err) {
                        return rows
                    } else {
                        console.log(err)
                        return []
                    }

                    // if(err) throw err
                    console.log('The icao_cache from beer table are: \n', rows)
                })
            })
}
//ADD
function add_cache(data){
    pool.getConnection((err, connection) => {
        if (err) throw err

        const params = data
        connection.query('INSERT INTO icao_cache SET ?', params, (err, rows) => {
            connection.release() // return the connection to pool
            if (!err) {
                console.log(`Cache with the record ID  has been added.`)
            } else {
                console.log(err)
            }

            console.log('The data from beer table are:11 \n', rows)

        })
    })
}
//UPDATE
function update_cache(data){
    pool.getConnection((err, connection) => {
        if (err) throw err
        console.log(`connected as id ${connection.threadId}`)

        const { id, time_stamp, origin, destination, main, detail } = data

        connection.query('UPDATE icao_cache SET time_stamp = ?, origin = ?, destination = ?, main = ?, detail = ? WHERE id = ?', [time_stamp, origin, destination, main, detail, id], (err, rows) => {
            connection.release() // return the connection to pool

            if (!err) {
                console.log(`Flight with the rute: ${origin} - ${destination} has been update.`)
            } else {
                console.log(err)
            }

        })

        console.log(data)
    })
}
//DELETE
function delete_cache(id){
    pool.getConnection((err, connection) => {
        if (err) throw err
        connection.query('DELETE FROM beers WHERE id = ?', [id], (err, rows) => {
            connection.release() // return the connection to pool
            if (!err) {
                console.log(`icao_cache with the record ID ${[id]} has been removed.`)
            } else {
                console.log(err)
            }

            console.log('The data from icao_cache table are: \n', rows)
        })
    })
}
function sleep(s) {
    return new Promise(resolve => setTimeout(resolve, (s * 1000)));
}
app.get('/calcular', async (request, response) => {
    let data = request.query;

    if (!data.from || !data.to || data.from == '' || data.to == '') {
        return response.status(404).end();
    }
    data.from = data.from.toUpperCase();
    data.to = data.to.toUpperCase();
    // if(data.from === data.to){
    //     return response.json({ 'result': 0}).end();
    // }
    // console.log(data.from + ' ' +data.to);

    // result = await api.icao(data.from, data.to);

    if (!countries[data.from] || !countries[data.to]) {
        return response.json({ 'result': null }).end();
    }
    let result = null
    var dia = 86300000 //24 horas en milisegundos
    var semana = dia*7
    if (cache.flights[`${data.from}` + "/" + `${data.to}`] && (new Date() - cache.time_stamp[`${data.from}` + "/" + `${data.to}`]) > semana) {
        result = (data.type == '1') ? cache.flights[`${data.from}` + "/" + `${data.to}`][1] : cache.flights[`${data.from}` + "/" + `${data.to}`][0]
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
        return response.json({ 'result': null }).end();
    }
    let main = result.main;
    let detail1 = result.detail1;
    let detail2 = result.detail2;
    cache.time_stamp[`${data.from}` + "/" + `${data.to}`] = new Date();
    cache.flights[`${data.from}` + "/" + `${data.to}`] = [main, detail1];
    cache.flights[`${data.to}` + "/" + `${data.from}`] = [main, detail2];
    if (data.type == '1') {
        console.log(cache.time_stamp[`${data.from}` + "/" + `${data.to}`] + data.from + "/" + data.to + " " + cache.flights[`${data.from}` + "/" + `${data.to}`][1])
        return response.json({ 'result': cache.flights[`${data.from}` + "/" + `${data.to}`][1] }).end();
    } else {
        console.log(cache.time_stamp[`${data.from}` + "/" + `${data.to}`] + data.from + "/" + data.to + " " + cache.flights[`${data.from}` + "/" + `${data.to}`][0])
        return response.json({ 'result': cache.flights[`${data.from}` + "/" + `${data.to}`][0] }).end();
    }
})

app.listen(PORT, () => {
    console.log(`server started on port ${PORT}`)
})