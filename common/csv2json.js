const { QueueClient }= require('@azure/storage-queue');
const Papa = require('papaparse');


module.exports.csv2json = async function (/*context*/ _, csvData) {
    const queueClient = new QueueClient(process.env.JSON_STORAGE_CONNECTION, process.env.JSON_STORAGE_QUEUE);
    queueClient.createIfNotExists();
    const records = Papa.parse(csvData,{
        header: true,
        dynamicTyping: true,
        step: function(results, parser) {
            var content = {};
            for (var key in results.data) {
                key.split('.').reduce((acc, e, i, arr) => {
                    return (i === arr.length - 1) ? (acc[e.toString()] = results.data[key]) : acc[e.toString()] || (acc[e.toString()] = {});
                }, content);
            }
            queueClient.sendMessage(Buffer.from(JSON.stringify(content)).toString('base64'))
                .catch(e => { console.log("error sending message " + e) });
        }
    });
};
