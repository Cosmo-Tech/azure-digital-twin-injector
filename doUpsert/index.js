const { DigitalTwinsClient } = require("@azure/digital-twins-core");
const { DefaultAzureCredential } = require("@azure/identity");

module.exports = async function (context, jsonItem) {
    const digitalTwin = new DigitalTwinsClient(process.env.DIGITAL_TWIN_URL, new DefaultAzureCredential());
    jsonContent = JSON.stringify(jsonItem.$content);
    if ("$relationshipId" in jsonItem) {
            setTimeout(() => {
                digitalTwin.upsertRelationship(jsonItem.$id, jsonItem.$relationshipId, jsonItem.$content)
                    .catch(e => {
                        console.log(`relationship ${jsonItem.$relationshipId} on source ${jsonItem.$id} insertion failed: ${e}`);
                        console.log(`failed relationship: ${jsonContent}`);
                    });

            }, 100).ref();
    } else {
        // twin
        setTimeout(() => {
            digitalTwin.upsertDigitalTwin(jsonItem.$id, jsonContent)
                .catch(e => {
                    console.log(`twin ${jsonItem.$id} insertion failed: ${e}`);
                    console.log(`failed twin: ${jsonContent}`);
                });
        }, 20).ref();
    }
};