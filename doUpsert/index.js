/**
 * copyright (c) cosmo tech corporation.
 * licensed under the mit license.
 *
 * Upsert a twin or a relationship into ADT
 * This module handle 1 message from the queue
 * which contains the ADT API compliant JSON to upsert.
 * Requests are timedout to respect ADT API limits:
 * https://docs.microsoft.com/en-us/azure/digital-twins/reference-service-limits
 * The queue trigger is serialized in host.json
 * with batchSize and maxDequeueCount.
 * https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue
 * Errors during upsert of twin or relationship throw errors.
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
  context.log.verbose(`Json item: ${jsonString}`);
  if ('$relationshipId' in jsonItem) {
    context.log.verbose(`upserting relationship ${jsonItem.$relationshipId}`);
    await (async () => {
      context.log.verbose('waiting 100ms');
      sleep(100);
      context.log.verbose('calling ADT relationship API');
      await digitalTwin.upsertRelationship(
          jsonItem.$sourceId,
          jsonItem.$relationshipId,
          jsonItem.relationship)
          .catch((e) => {
            context.log.error(`relationship ${jsonItem.$relationshipId}
              on source ${jsonItem.$sourceId} insertion failed: `, e);
            const err = `failed relationship: ${jsonString}`;
            throw err;
          });
    })();
  } else if ('$id' in jsonItem) {
    context.log.verbose(`upserting twin ${jsonItem.$id}`);
    // twin
    await (async () => {
      context.log.verbose('waiting 20ms');
      sleep(20);
      context.log.verbose('calling ADT twin API');
      await digitalTwin.upsertDigitalTwin(jsonItem.$id, jsonString)
          .catch((e) => {
            context.log.error(`twin ${jsonItem.$id} insertion failed: `, e);
            const err = `failed twin: ${jsonString}`;
            throw err;
          });
    })();
  } else {
    context.log.error(`unrecognized message format: ${jsonString}`);
  }
};
