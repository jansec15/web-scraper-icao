const express = require('express');
const app = express()
var api = require('./icao');
const PORT = process.env.PORT || 3030;
'use strict';

const fs = require('fs');
const cache = {}
const rawdata = fs.readFileSync('country.json');
const countries = JSON.parse(rawdata);
// console.log(countries);
// app.get('/:from&:to&:type',  (request, response) => {
//     return response.send("404").end()
// })
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
app.get('/:from&:to&:type', async (request, response) => {
    let data = request.params
    data.from = data.from.toUpperCase()
    data.to = data.to.toUpperCase()
    if (!data.from || !data.to || data.from == '' || data.to == '') {
        return response.status(404).end()
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
    if (cache[`${data.from}` + "/" + `${data.to}`]) {
        result = (data.type == '1') ? cache[`${data.from}` + "/" + `${data.to}`][1] : cache[`${data.from}` + "/" + `${data.to}`][0]
        return response.json({ 'result': result }).end()
    } else {
        let condition = 0
        while (condition < 60) {
            try {
                result = await api.icao(data.from, data.to)
                break
            } catch (exeption) {
                await sleep(10 * 1000)
                condition += 10
            }
        }

    }

    // return response.send(result).end()
    // console.log(result)
    if (result == null) {
        // response.status(404).end()
        cache[`${data.from}` + "/" + `${data.to}`] = [null,null]
        return response.json({ 'result': cache[`${data.from}` + "/" + `${data.to}`] }).end()
    }
    let main = result.main[result.main.length - 1]
    let detail1 = result.detail1[result.detail1.length - 1]
    cache[`${data.from}` + "/" + `${data.to}`] = [main, detail1]
    if (data.type == '1') {
        return response.json({ 'result': cache[`${data.from}` + "/" + `${data.to}`][1] }).end()
    } else {
        return response.json({ 'result': cache[`${data.from}` + "/" + `${data.to}`][0] }).end()
    }
})

app.listen(PORT, () => {
    console.log(`server started on port ${PORT}`)
})