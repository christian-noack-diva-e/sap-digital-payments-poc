<script setup>
import { onMounted } from 'vue'
import axios from 'axios'
import { useLogger } from 'vue-logger-plugin'

const log = useLogger()

// backend url for local testing
const backendBaseUrl = "http://localhost:6060"
// backend url for testing with Android VM while running backend on localhost
// const backendBaseUrl = "http://10.0.2.2:6060"

// This is the name of the payment configuration, given on create at https://<namespace>.demo-digitalpayments-sap.cfapps.eu10.hana.ondemand.com/paymentPageConfiguration
const paymentPageConfigurationId = "stripetestnospaces";
const buttonsContainerDivId = "dpButtonContainer";

async function getDPJSLIBConfig() {
  log.info("Getting DPJSLIB Config")
  return axios
    .get(backendBaseUrl + "/getlib")
    .then((response) => {
      log.info("DPJSLIB Config retrieved: " + JSON.stringify(response.data))
      return response.data;
    })
}

async function loadDPJSLIB(scriptLoadingParams) {
  var sLoaderUrl = scriptLoadingParams.LoaderUrl;
  var sApiSessionId = scriptLoadingParams.APISessionId; // needs to be retrieved for every loading of dpjslib

  var scriptId = "com.sap.digital.payments.jslib.loader";
  document.getElementById(scriptId) ? document.getElementById(scriptId).remove() : null; // For reloading during development
  var oScript = document.createElement('script');
  oScript.id = scriptId;
  oScript.onload = function () {
    log.info("DPJSLIB loaded")
    initDPJSLIB(sApiSessionId);
  }
  oScript.onerror = function () {
    // Handle loading error
  };
  oScript.src = sLoaderUrl;
  document.head.appendChild(oScript);
  return sApiSessionId;
}

async function initDPJSLIB(sApiSessionId) {
  var oLoaderPromise = com.sap.fin.digital.payments.jslib.Loader.initLibrary(sApiSessionId);
  oLoaderPromise.then(function (oDPApi) {
    log.info("DPJSLIB init success", oDPApi)
    afterInit(oDPApi)
    // You may assert that oDPApi is set.
    // Actions can be triggered using oDPApi…
  });
  oLoaderPromise.catch(function (oError) {
    log.error("Error", oError)
    // Handle errors raised on initialization
    // (see also section on error handling)
  });
}

async function afterInit(oDPApi) {
  const paymentMethods = await initializePayment().then((response) => loadPaymentPageConfig(response, oDPApi))
  if (paymentMethods.length != 1) {
    throw new Error("Exactly one payment method must be returned in MVP.")
  }

  const userSelectedPaymentMethod = paymentMethods[0]
  selectPaymentMethod(userSelectedPaymentMethod, oDPApi)
}

async function loadPaymentPageConfig(response, oDPApi) {
  log.info("Loading Payment Page Config")
  return oDPApi.loadPaymentTypes(paymentPageConfigurationId, response.data.DigitalPaymentTransaction, buttonsContainerDivId)

}

async function initializePayment() {
  log.info("Initialize Payment in Backend")
  return axios
    .get(backendBaseUrl + "/initpayment");
}

function selectPaymentMethod(paymentMethod, oDPApi) {
  log.info("Auto selecting first payment method & waiting for user interaction.")
  /* 
      oDPApi.selectPaymentType will render a button for the selected payment method that the user has to click. 
      We don't have a callback for when this button is rendered, but are only called after the user entered 
      payment details and completed payment.
  */
  oDPApi.selectPaymentType(paymentMethod.PaymentType).then(function (TransactionByPaytSrvcPrvdr) {

    afterPaymentSuccessful(TransactionByPaytSrvcPrvdr)

    /* TransactionByPaytSrvcPrvdr is optional. If provided, you must add it to the request of the /core/v2/paymentpage/finalize call. */
  }).catch(function (oError) {
    log.error("Payment Failed or Canceled:", oError)
    /* A technical error has occurred, 
     which prevented the authorization/payment to be completed. */
  });
}

async function afterPaymentSuccessful(transactionByPaytSrvcPrvdr) {
  log.info("Payment Successful, dp transaction id: " + transactionByPaytSrvcPrvdr)

  axios.post(backendBaseUrl + "/finalizepayment", transactionByPaytSrvcPrvdr).then(() =>
    log.info("Payment Details transferred to Backend.")
  ).catch(error =>
    log.error("Error occured while transferring payment details to backend: ", error)
  );
}


onMounted(() => {
  // Loading of the DPJSLIB requires a new DPJSLIB Config every time. The old APISession cannot be reused.
  getDPJSLIBConfig().then(loadDPJSLIB)
})
</script>

<template>
  <h1>SAP Digital Payments Integration POC</h1>
  <div>DPJSLIB Places Button here:</div>
  <div id="dpButtonContainer">

  </div>
</template>

<style scoped>
#dpButtonContainer {
  display: flex;
  min-height: 40px;
  background-color: aquamarine;
}
</style>

<style>
/* SAP DP applies Styles on ids, so we can only overwrite them like this. The ids feel internal. */
#dpButtonContainer #dp-stripe-button-container {
  background-color: orangered;
}
</style>