const express = require('express');
const app = express()
var api = require('./icao');
const PORT = process.env.PORT || 3030;

'use strict';

const fs = require('fs');

const rawdata = fs.readFileSync('country.json');
const countries = JSON.parse(rawdata);
// console.log(countries);


app.get('/:from&:to&:type', async (request, response) => {
    let data = request.params
    data.from = data.from.toUpperCase()
    data.to = data.to.toUpperCase()
    console.log(data.from)
    console.log(data.to)
    if (!data.from || !data.to || data.from == '' || data.to == '') {
        return response.status(404).end()
    }
    if (!countries[data.from] || !countries[data.to]) {
        const from = {}
        const to = {}
        for (let country in countries) {
            countries[country].startsWith(data.from) && Object.keys(from).length < 1 ? from[country] = countries[country] : ''
            countries[country].startsWith(data.to) && Object.keys(to).length < 1 ? to[country] = countries[country] : ''
        }
        console.log(from)
        console.log(to)
        if (Object.keys(to).length < 1 || Object.keys(from).length < 1) {
            response.status(404).end()
            return null
        } else {
            Object.keys(from).length > 0 ? data.from = Object.keys(from)[0] : ''
            Object.keys(to).length > 0 ? data.to = Object.keys(to)[0] : ''
        }
    }
    // return response.send(data).end()
    const result = await api.icao(data.from, data.to) || null
    // console.log(result)
    if (result == null) {
        response.status(404).end()
        return null
    }
    if (data.type=='ida') {
        return response.send(result.detail1[result.detail1.length-1]).end()
    } else {
        return response.send(result.main[result.main.length-1]).end()
    }
})

app.listen(PORT, () => {
    console.log(`server started on port ${PORT}`)
})