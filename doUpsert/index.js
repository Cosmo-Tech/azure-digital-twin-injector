const {DigitalTwinsClient} = require('@azure/digital-twins-core');
const {DefaultAzureCredential} = require('@azure/identity');
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

module.exports = async function(context, jsonItem) {
  context.log('doUpsert function triggered');
  context.log.debug('creating ADT client');
  const digitalTwin = new DigitalTwinsClient(
      process.env.DIGITAL_TWINS_URL,
      new DefaultAzureCredential());
  const jsonString = JSON.stringify(jsonItem);
  context.log.debug('Json item: ' + jsonString);
  if ('$relationshipId' in jsonItem) {
    context.log.debug('upserting relationship' + jsonItem.$relationshipId);
    (async () => {
      context.log.debug('waiting 100ms');
      sleep(100);
      context.log.debug('calling ADT relationship API');
      digitalTwin.upsertRelationship(
          jsonItem.$sourceId,
          jsonItem.$relationshipId, jsonItem)
          .catch((e) => {
            context.log.error(`relationship ${jsonItem.$relationshipId} on source ${jsonItem.$sourceId} insertion failed: ${e}`);
            context.log.error(`failed relationship: ${jsonString}`);
            throw (e);
          });
    })();
  } else if ('$id' in jsonItem) {
    context.log.debug('upserting twin' + jsonItem.$id);
    // twin
    (async () => {
      context.log.debug('waiting 20ms');
      sleep(20);
      context.log.debug('calling ADT twin API');
      digitalTwin.upsertDigitalTwin(jsonItem.$id, jsonString)
          .catch((e) => {
            context.log.error(`twin ${jsonItem.$id} insertion failed: ${e}`);
            context.log.error(`failed twin: ${jsonString}`);
            throw (e);
          });
    })();
  } else {
    context.log.warning(`unrecognised message format: ${jsonString}`);
  }
};
