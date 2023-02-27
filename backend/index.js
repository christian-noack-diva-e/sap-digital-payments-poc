const express = require('express');
const http = require('http')
const https = require('https')
const axios = require('axios');
const cors = require('cors');
const util = require('util');
const PropertiesReader = require('properties-reader');
const Logger = require("@ptkdev/logger");
const bodyParser = require('body-parser')

const logger = new Logger();
const credentials = PropertiesReader('config/credentials.properties');
const port = 6060;

const app = express()
app.use(cors())
app.use(bodyParser.text({ type: "*/*" }))

axios.interceptors.response.use(response => {
    if (response.status != 200) {
        logger.warning(util.inspect(response))
    }
    return response
})

const authUrl = credentials.get("authUrl")
const apiRoot = "https://digitalpayments-demo-core.cfapps.eu10.hana.ondemand.com/core"

var oAuthToken = "";
var digitalPaymentTransaction = "";

async function authorize() {
    await axios
        .post(authUrl, null, {
            auth: {
                username: credentials.get("client.id"),
                password: credentials.get("client.secret")
            },
            params: {
                "grant_type": "client_credentials"
            }
        })
        .then((resp) => {
            oAuthToken = resp.data.access_token;
            logger.info("Authorization successful, Bearer Token retrieved.")
        })
}

function getAuth() {
    return {
        headers: {
            "Authorization": "Bearer " + oAuthToken
        }
    };
}

async function getDPJSLIBConfig() {
    const config = getAuth();

    return axios
        .get(apiRoot + "/v1/dpjslib/loader", config)
        .then((response) => {
            logger.info(util.inspect(response.data), "getDPJSLIB Result")
            return response.data
        })
}

async function initializePayment() {
    const config = getAuth();
    const requestBody = {
        "AmountInTransactionCurrency": 140.75,
        "TransactionCurrency": "USD",
        "DigitalPaymentCommerceType": "ECOMMERCE",
        "DigitalPaymentSessionType": "ONLINE"
    }

    return axios
        .post(apiRoot + "/v2/paymentpage/initiate", requestBody, config)
        .then((response) => {
            // TODO validate response
            logger.info(util.inspect(response.data), "Payment Initiate Result")
            digitalPaymentTransaction = response.data.DigitalPaymentTransaction;
            return response.data
        })
}

/**
 * Can be called multiple times. When the user did not yet complete the payment, HTTP 400 is returned. Afterwards, the transaction details will be returned.
 * 
 * @param {String} transactionByPaytSrvcPrvdr Optional Identifier returned by frontend
 * @returns 
 */
async function finalizePayment(transactionByPaytSrvcPrvdr) {
    const config = getAuth();
    const requestBody = {
        "DigitalPaymentTransaction": digitalPaymentTransaction,
    }
    if (isNotEmpty(transactionByPaytSrvcPrvdr)) {
        requestBody.TransactionByPaytSrvcPrvdr = transactionByPaytSrvcPrvdr
    }

    logger.info(util.inspect(requestBody), "Finalizing Payment with")

    return axios.post(apiRoot + "/v2/paymentpage/finalize", requestBody, config)
        .then((response) => logger.info("Payment Finalize Successful: " + util.inspect(response.data)))
}

function isNotEmpty(obj) {
    return obj && Object.keys(obj).length !== 0
}

app.get('/getlib', async (req, res, next) => {
    authorize()
        .then(getDPJSLIBConfig)
        .then(result => res.send(result))
        .catch(error => next(error))
});

/**
 * Always call /getlib first
 */
app.get('/initpayment', async (req, res, next) => {
    initializePayment()
        .then(result => res.send(result))
        .catch(error => next(error))
})

app.post('/finalizepayment', async (req, res, next) => {
    finalizePayment(req.body)
        .then(() => res.sendStatus(200))
        .catch(error => next(error))
})

logger.info("Listening on http://localhost:" + port)
http.createServer(app).listen(port)
