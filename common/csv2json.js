/**
 * copyright (c) cosmo tech corporation.
 * licensed under the mit license.
 *
 * This module reads CSV data line by line,
 * convert the line to JSON and store it in an Azure Storate Queue.
 * Inserting to the queue is batched and timedout in order to respect
 * Azure Function limits on max outbound connections.
 * https://docs.microsoft.com/en-us/azure/azure-functions/functions-scale#service-limits
 * You can define an env var LOG_DETAILS in order to get details of parsing.
 * Throws exception if there are parsing errors or issues sending to queue.
 */

const {QueueClient} = require('@azure/storage-queue');
const Papa = require('papaparse');
const https = require('https');

/* Limit the number of outbound connections to 200
 *   (higher value of 500 does not work).
 * Works with option to disable keep alive on client further.
 * https://github.com/Azure/azure-functions-host/wiki/Host-Health-Monitor
 */
https.globalAgent.maxSockets = 200;

/**
 * Log detailed information on parsing
 * @param {string} str text to log
 */
function logDetails(str) {
  if (process.env.LOG_DETAILS) {
    context.log.verbose(str);
  }
}

module.exports.csv2json = async function(context, csvData) {
  context.log('Running csv2json...');
  context.warning('Starting CSV to JSON conversion and send to Queue');
  const queueClient = new QueueClient(
      process.env.JSON_STORAGE_CONNECTION,
      process.env.JSON_STORAGE_QUEUE,
      {
        keepAliveOptions: {enable: false},
      },
  );
  context.log.verbose(`Queue client: ${process.env.JSON_STORAGE_QUEUE}`);
  context.log.verbose('Queue: create if not exist');
  queueClient.createIfNotExists();
  context.log('Parsing CSV data...');
  let count = 0;
  let cumulatedIds = '';
  let batchCount = 0;
  Papa.parse(csvData.toString('utf8'), {
    header: true,
    dynamicTyping: true,
    step: function(results, parser) {
      logDetails('Parser step');
      /* eslint-disable */
      let content = {};
      /* eslint-enable */
      logDetails('Iterating results data');
      logDetails(`Results data: ${JSON.stringify(results.data)}`);
      if (Object.keys(results.data).length == 1) {
        context.log.warn(`CSV parsed object with only 1 property: ignored.
        Certainly a blank line`);
      } else {
        cumulatedIds = `${cumulatedIds},${results.data.$id}`;
        count = count + 1;
        batchCount = batchCount + 1;
        for (const key in results.data) {
          if (results.data.hasOwnProperty(key)) {
            key.split('.').reduce((acc, e, i, arr) => {
              const returnVal = (i === arr.length - 1) ?
                (acc[e.toString()] = results.data[key]) :
                acc[e.toString()] || (acc[e.toString()] = {});
              logDetails(`Transformed data: ${returnVal}`);
              return returnVal;
            }, content);
          }
        }

        /**
         * Send a message to the Azure Storage Queue
         * @param {Object} content the object to send
         */
        function sendMessage(content) {
          context.log.verbose('Sending message to queue');
          queueClient.sendMessage(
              Buffer.from(JSON.stringify(content)).toString('base64'))
              .catch((e) => {
                const err = `error sending message: ${e}`;
                throw err;
              });
        }

        sendMessage(content);
      }
    },
    error: function(err, file, inputElem, reason) {
      context.log.error(`Papaparse error: ${err}, file: ${file},
        inputElem: ${inputElem}, reason: ${reason}`);
      context.log.verbose(`Cumulated ids: ${cumulatedIds}`);
      throw err;
    },
    complete: function() {
      context.log(`Total sent messages: ${count.toString()}`);
      context.log.verbose(`Cumulated ids: ${cumulatedIds}`);
    },
  });
};
