const { DigitalTwinsClient } = require("@azure/digital-twins-core");
const { DefaultAzureCredential } = require("@azure/identity");

module.exports = async function (context, jsonItem) {
    const digitalTwin = new DigitalTwinsClient(process.env.DIGITAL_TWIN_URL, new DefaultAzureCredential());
    const jsonString = JSON.stringify(jsonItem);
    if ("$relationshipId" in jsonItem) {
            setTimeout(() => {
                digitalTwin.upsertRelationship(jsonItem.$sourceId, jsonItem.$relationshipId, jsonItem)
                    .catch(e => {
                        console.log(`relationship ${jsonItem.$relationshipId} on source ${jsonItem.$sourceId} insertion failed: ${e}`);
                        console.log(`failed relationship: ${jsonString}`);
                    });

            }, 100).ref();
    } else if ("$id" in jsonItem) {
        // twin
        setTimeout(() => {
            digitalTwin.upsertDigitalTwin(jsonItem.$id, jsonString)
                .catch(e => {
                    console.log(`twin ${jsonItem.$id} insertion failed: ${e}`);
                    console.log(`failed twin: ${jsonString}`);
                });
        }, 20).ref();
    } else {
        context.log(`unrecognised message format: ${jsonString}`);
    } 
};