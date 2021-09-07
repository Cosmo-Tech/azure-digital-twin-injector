const {QueueClient} = require('@azure/storage-queue');
const Papa = require('papaparse');


module.exports.csv2json = async function(/*context*/ _, csvData) {
  console.log('Running csv2json...');
  const queueClient = new QueueClient(
      process.env.JSON_STORAGE_CONNECTION,
      process.env.JSON_STORAGE_QUEUE);
  console.log('Queue client: ' + process.env.JSON_STORAGE_QUEUE);
  console.log('Queue: create if not exist');
  queueClient.createIfNotExists();
  console.log('Parsing CSV data...');
  Papa.parse(csvData.toString('utf8'), {
    header: true,
    dynamicTyping: true,
    step: function(results, parser) {
      console.log('Parser step');
      let content = {};
      console.log('Iterating results data');
      console.debug('Results data: ' + JSON.stringify(results.data));
      if (Object.keys(results.data).length == 1) {
        console.warn('CSV parsed object with only 1 property: ignored. Certainly a blank line');
      } else {
        for (const key in results.data) {
          key.split('.').reduce((acc, e, i, arr) => {
            const returnVal = (i === arr.length - 1) ?
              (acc[e.toString()] = results.data[key]) :
              acc[e.toString()] || (acc[e.toString()] = {});
            console.debug('Transformed data: ' + returnVal);
            return returnVal;
          }, content);
        }
        /*
        console.log('Sending message to queue');
        queueClient.sendMessage(
            Buffer.from(JSON.stringify(content)).toString('base64'))
            .catch((e) => {
              console.error('error sending message ' + e);
              throw (e);
            });
            */
      }
    }
  });
};
