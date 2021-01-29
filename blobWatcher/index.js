const { QueueClient } = require('@azure/storage-queue');
const parseCSV = require('csv-parse/lib/sync');

module.exports = async function (context, csvBlob) {
    const queueClient = new QueueClient(process.env.JSON_STORAGE_CONNECTION, process.env.JSON_STORAGE_QUEUE);
    queueClient.createIfNotExists();
    const records = parseCSV(csvBlob,
        { columns: true,
          skip_empty_lines: true,
          trim: true,
          castDate: true,
          cast: true
        });
    records.forEach(row => {
        var id = "";
        var relationshipId = "";
        var content = {};
        for (var key in row) {
            if (key === "$id") {
                id = row[key].toString();
            } else if (key === "$relationshipId") {
                relationshipId = row[key].toString();
            } else {
                key.split('.').reduce((acc, e, i, arr) => {
                    return (i === arr.length - 1) ? (acc[e.toString()] = row[key]) : acc[e.toString()] || (acc[e.toString()] = {});
                }, content);
            }
        }
        var msg = { "$id": id, "$content": content };
        if (relationshipId !== "") {
            msg["$relationshipId"] = relationshipId;
            msg.$content["$sourceId"] = id;
            msg.$content["$relationshipId"] = relationshipId;
        }
        queueClient.sendMessage(Buffer.from(JSON.stringify(msg)).toString('base64'))
            .catch(e => { console.log("error sending message " + e) });
    });
};