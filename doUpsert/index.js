const { DigitalTwinsClient } = require("@azure/digital-twins-core");
const { ClientSecretCredential, DefaultAzureCredential } = require("@azure/identity");

module.exports = async function (context, jsonItem) {
    let credential;
    const useClientSecret = process.env.USE_CLIENT_SECRET;
    if (useClientSecret.toLowerCase() === "true") {
      const azureTenantId = process.env.AZURE_TENANT_ID;
      const azureClientId = process.env.AZURE_CLIENT_ID;
      const azureClientSecret = process.env.AZURE_CLIENT_SECRET;
      credential = new ClientSecretCredential(azureTenantId, azureClientId, azureClientSecret)
    } else {
      credential = new DefaultAzureCredential()
    }

    const digitalTwin = new DigitalTwinsClient(process.env.DIGITAL_TWINS_URL, credential);
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
