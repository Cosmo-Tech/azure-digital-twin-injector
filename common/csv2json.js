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
 */

const {QueueClient} = require('@azure/storage-queue');
const Papa = require('papaparse');
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
const batchCountSize = 300;
const batchWaitMs = 3000;


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
  const queueClient = new QueueClient(
      process.env.JSON_STORAGE_CONNECTION,
      process.env.JSON_STORAGE_QUEUE);
  context.log.verbose('Queue client: ' + process.env.JSON_STORAGE_QUEUE);
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
      let content = {};
      logDetails('Iterating results data');
      logDetails('Results data: ' + JSON.stringify(results.data));
      if (Object.keys(results.data).length == 1) {
        context.log.warn('CSV parsed object with only 1 property: ignored. Certainly a blank line');
      } else {
        cumulatedIds = cumulatedIds + ',' + results.data.$id;
        count = count + 1;
        batchCount = batchCount + 1;
        for (const key in results.data) {
          key.split('.').reduce((acc, e, i, arr) => {
            const returnVal = (i === arr.length - 1) ?
              (acc[e.toString()] = results.data[key]) :
              acc[e.toString()] || (acc[e.toString()] = {});
            logDetails('Transformed data: ' + returnVal);
            return returnVal;
          }, content);
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
                context.log.error('error sending message ' + e);
                throw (e);
              });
        }

        if (batchCount >= batchCountSize) {
          context.log(`Waiting ${batchWaitMs} ms for next queue batch...`);
          parser.pause();
          (async () => {
            context.log('Resuming parer & sending message');
            await sleep(batchWaitMs);
            batchCount = 0;
            parser.resume();
            sendMessage(content);
          })();
        } else {
          sendMessage(content);
        }
      }
    },
    error: function(err, file, inputElem, reason) {
      context.log.error('Papaparse error:' + err + ', file:' + file + ', inputElem:' + inputElem + ', reason:' + reason);
      context.log.verbose('Cumulated ids: ' + cumulatedIds);
    },
    complete: function() {
      context.log('Total sent messages:' + count.toString());
      context.log.verbose('Cumulated ids: ' + cumulatedIds);
    }
  });
};
