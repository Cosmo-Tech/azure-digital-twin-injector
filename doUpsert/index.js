/**
 * copyright (c) cosmo tech corporation.
 * licensed under the mit license.
 *
 * Upsert a twin or a relationship into ADT
 * This module handle 1 message from the queue
 * which contains the ADT API compliant JSON to upsert.
 * Requests are timedout to respect ADT API limits:
 * https://docs.microsoft.com/en-us/azure/digital-twins/reference-service-limits
 * The queue trigger is serialized in host.json with batchSize and maxDequeueCount.
 * https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue
 */

const {DigitalTwinsClient} = require('@azure/digital-twins-core');
const {DefaultAzureCredential} = require('@azure/identity');
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

module.exports = async function(context, jsonItem) {
  context.log('doUpsert function triggered');
  context.log.verbose('creating ADT client');
  const digitalTwin = new DigitalTwinsClient(
      process.env.DIGITAL_TWINS_URL,
      new DefaultAzureCredential());
  const jsonString = JSON.stringify(jsonItem);
  context.log.verbose('Json item: ' + jsonString);
  if ('$relationshipId' in jsonItem) {
    context.log.verbose('upserting relationship' + jsonItem.$relationshipId);
    (async () => {
      context.log.verbose('waiting 100ms');
      sleep(100);
      context.log.verbose('calling ADT relationship API');
      digitalTwin.upsertRelationship(
          jsonItem.$sourceId,
          jsonItem.$relationshipId, jsonItem)
          .catch((e) => {
            context.log.error(`relationship ${jsonItem.$relationshipId} on source ${jsonItem.$sourceId} insertion failed: ${e}`);
            context.log.error(`failed relationship: ${jsonString}`);
            throw (e);
          });
    })()
    .catch((e) => {
      throw (e);
    });
  } else if ('$id' in jsonItem) {
    context.log.verbose('upserting twin' + jsonItem.$id);
    // twin
    (async () => {
      context.log.verbose('waiting 20ms');
      sleep(20);
      context.log.verbose('calling ADT twin API');
      digitalTwin.upsertDigitalTwin(jsonItem.$id, jsonString)
          .catch((e) => {
            context.log.error(`twin ${jsonItem.$id} insertion failed: ${e}`);
            context.log.error(`failed twin: ${jsonString}`);
            throw (e);
          });
    })()
    .catch((e) => {
      throw (e);
    });
  } else {
    context.log.warning(`unrecognised message format: ${jsonString}`);
  }
};
