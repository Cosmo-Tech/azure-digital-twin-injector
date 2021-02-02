const { QueueClient }= require('@azure/storage-queue');
const parseCSV = require('csv-parse/lib/sync');

module.exports.csv2json = async function (context, csvData) {
    const queueClient = new QueueClient(process.env.JSON_STORAGE_CONNECTION, process.env.JSON_STORAGE_QUEUE);
    queueClient.createIfNotExists();
    const records = parseCSV(csvData,
        { columns: true,
          skip_empty_lines: true,
          trim: true,
          cast: true
        });
    records.forEach(row => {
        var id = "";
        var relationshipId = "";
        var content = {};
        for (var key in row) {
            key.split('.').reduce((acc, e, i, arr) => {
                return (i === arr.length - 1) ? (acc[e.toString()] = row[key]) : acc[e.toString()] || (acc[e.toString()] = {});
            }, content);
        }
        queueClient.sendMessage(Buffer.from(JSON.stringify(content)).toString('base64'))
            .catch(e => { console.log("error sending message " + e) });
    });
};
