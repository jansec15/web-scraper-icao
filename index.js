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
    if (!countries[data.from] || !countries[data.to]) {
        return response.json({ 'result': null }).end();
    }
    // if (!countries[data.from] || !countries[data.to]) {
    //     const from = countries[data.from] ? data.from : {}
    //     const to = countries[data.to] ? data.to : {}
    //     for (let country in countries) {
    //         if (countries[country].includes(data.from) && Object.keys(from).length < 1) from[country] = countries[country];

    //         if (countries[country].includes(data.to) && Object.keys(to).length < 1) to[country] = countries[country];
    //     }
    //     if (Object.keys(to).length < 1 || Object.keys(from).length < 1) {
    //         response.status(404).end()
    //         return null
    //     } else {
    //         // console.log(from)
    //         // console.log(to)
    //         Object.keys(from).length > 0 && !countries[data.from] ? data.from = Object.keys(from)[0] : ''

    //         Object.keys(to).length > 0 && !countries[data.to] ? data.to = Object.keys(to)[0] : ''
    //     }
    // }
    // return response.send(data).end()
    // console.log(data.from)
    // console.log(data.to)
    let result = null
    if (cache.flights[`${data.from}` + "/" + `${data.to}`] && (new Date() - cache.time_stamp[`${data.from}` + "/" + `${data.to}`]) > 86300000) {
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

    // return response.send(result).end()
    // console.log(result)
    if (result == null) {
        // response.status(404).end()
        cache.time_stamp[`${data.from}` + "/" + `${data.to}`] = new Date();
        // add_cache({'time_stamp':new Date(),})
        cache.flights[`${data.from}` + "/" + `${data.to}`] = [null, null];
        console.log(cache.time_stamp[`${data.from}` + "/" + `${data.to}`] + data.from + "/" + data.to + " " + cache.flights[`${data.from}` + "/" + `${data.to}`][0])
        return response.json({ 'result': cache.flights[`${data.from}` + "/" + `${data.to}`][0] }).end();
    }
    let main = result.main[result.main.length - 1];
    let detail1 = result.detail1[result.detail1.length - 1];
    cache.time_stamp[`${data.from}` + "/" + `${data.to}`] = new Date();
    cache.flights[`${data.from}` + "/" + `${data.to}`] = [main, detail1];
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