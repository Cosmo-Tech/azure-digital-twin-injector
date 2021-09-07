const {DigitalTwinsClient} = require('@azure/digital-twins-core');
const {DefaultAzureCredential} = require('@azure/identity');

module.exports = async function(context, jsonItem) {
  const digitalTwin = new DigitalTwinsClient(
      process.env.DIGITAL_TWINS_URL,
      new DefaultAzureCredential());
  const jsonString = JSON.stringify(jsonItem);
  console.debug('Json item: ' + jsonString);
  if ('$relationshipId' in jsonItem) {
    setTimeout(() => {
      digitalTwin.upsertRelationship(
          jsonItem.$sourceId,
          jsonItem.$relationshipId, jsonItem)
          .catch((e) => {
            console.error(`relationship ${jsonItem.$relationshipId} on source ${jsonItem.$sourceId} insertion failed: ${e}`);
            console.error(`failed relationship: ${jsonString}`);
            throw (e);
          });
    }, 100).ref();
  } else if ('$id' in jsonItem) {
    if (jsonItem.$id) {
      // twin
      setTimeout(() => {
        digitalTwin.upsertDigitalTwin(jsonItem.$id, jsonString)
            .catch((e) => {
              console.error(`twin ${jsonItem.$id} insertion failed: ${e}`);
              console.error(`failed twin: ${jsonString}`);
              throw (e);
            });
      }, 20).ref();
  } else {
    context.warning(`unrecognised message format: ${jsonString}`);
  }
};
