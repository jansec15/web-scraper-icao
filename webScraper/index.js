const express = require('express');
const app = express()
var api = require('./icao');


'use strict';

const fs = require('fs');

const rawdata = fs.readFileSync('./country.json');
const countries = JSON.parse(rawdata);
// console.log(countries);


app.get('/:from,:to,:type', async (request, response) => {
    let data = request.params
    data.from = data.from.toUpperCase()
    data.to = data.to.toUpperCase()
    if (!data.from || !data.to || data.from == '' || data.to == '') {
        return response.status(404).end()
    }
    if (!countries[data.from] || !countries[data.to]) {
        const from = {}
        const to = {}
        for (let country in countries) {
            countries[country].includes(data.from) && Object.keys(from).length < 1 ? from[country] = countries[country] : ''
            countries[country].includes(data.to) && Object.keys(to).length < 1 ? to[country] = countries[country] : ''
        }
        if (Object.keys(to).length < 1 || Object.keys(from).length < 1) {
            response.status(404).end()
            return null
        } else {
            Object.keys(from).length > 0 ? data.from = Object.keys(from)[0] : ''
            Object.keys(to).length > 0 ? data.to = Object.keys(to)[0] : ''
        }
    }

    const result = await api.icao(data.from, data.to)
    if (result == null) {
        response.status(404).end()
        return null
    }
    if (data.type=='ida') {
        return response.send(result.detail1[6]).end()
    } else {
        return response.send(result.main[6]).end()
    }
})
const PORT = 3000
app.listen(PORT, () => {
    console.log('Server running on port ' + PORT)
})