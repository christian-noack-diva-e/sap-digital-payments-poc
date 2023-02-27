const express = require('express')
const http = require('http')
const swaggerUi = require('swagger-ui-express')
const sapAPIV1 = require('./definitions/20221221/SAP_Digital_Payments_API_v1.json')
const sapAPIV2 = require('./definitions/20221221/SAP_Digital_Payments_API_v2.json')
const Logger = require("@ptkdev/logger");

const logger = new Logger()

const app = express()

const port = 6070;

var swaggerHtmlV1 = swaggerUi.generateHTML(sapAPIV1)
var swaggerHtmlV2 = swaggerUi.generateHTML(sapAPIV2)

app.use('/v1', swaggerUi.serveFiles(sapAPIV1))
app.get('/v1', (req, res) => { res.send(swaggerHtmlV1) });

app.use('/v2', swaggerUi.serveFiles(sapAPIV2))
app.get('/v2', (req, res) => { res.send(swaggerHtmlV2) });

app.get('/', (req, res) => {
    res.write('<html><body><h1>SAP DP API Doc</h1><ol>')
    res.write('<li><a href="/v1">v1</a></li>')
    res.write('<li><a href="/v2">v2</a></li>')
    res.end('</ol></body></html>')
})

logger.info("Listening on http://localhost:" + port)

http.createServer(app).listen(port)
