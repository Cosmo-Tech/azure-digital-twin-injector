const { QueueServiceClient } = require("@azure/storage-queue");
const parseCSV = require('csv-parse/lib/sync');

module.exports = async function (context, csvBlob, jsonQueue) {
    const queueServiceClient = new QueueServiceClient.fromConnectionString(process.env.JSON_STORAGE_CONNECTION);
    const queueClient = queueServiceClient.getQueueClient(process.env.JSON_STORAGE_QUEUE);
    queueClient.createIfNotExists();
    const records = parseCSV(csvBlob,
        { columns: true, skip_empty_lines: true, cast: true });
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