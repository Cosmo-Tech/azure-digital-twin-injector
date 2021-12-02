/**
 * copyright (c) cosmo tech corporation.
 * licensed under the mit license.
 *
 * Upsert or delete a twin or a relationship into ADT
 * This module handle 1 message from the queue
 * which contains the ADT API compliant JSON to upsert or delete.
 * Requests are timedout to respect ADT API limits:
 * https://docs.microsoft.com/en-us/azure/digital-twins/reference-service-limits
 * The queue trigger is serialized in host.json
 * with batchSize and maxDequeueCount.
 * https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue
 * Errors during upsert or delete of twin or relationship throw errors.
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
    if (jsonItem.relationship.$relationshipDelete === true) { // relationship must be deleted
      context.log.verbose(`deleting relationship ${jsonItem.$relationshipId}`);
      await (async () => {
        context.log.verbose('waiting 100ms');
        sleep(100);
        context.log.verbose('calling ADT relationship API');
        await digitalTwin.deleteRelationship(
            jsonItem.$sourceId,
            jsonItem.$relationshipId)
            .catch((e) => {
              context.log.error(`relationship ${jsonItem.$relationshipId}
                on source ${jsonItem.$sourceId} deletion failed: `, e);
              const err = `failed relationship: ${jsonString}`;
              throw err;
            });
      })();
    } else { // relationship must be upserted
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
    }
  } else if ('$id' in jsonItem) {
    if (jsonItem.$entityDelete === true) { // twin must be deleted
      // list all twin relationships
      let rels = []
      // outgoing relationships
      let out = digitalTwin.listRelationships(jsonItem.$id);
      for await (const rel of out) {
        rels.push([rel.$sourceId, rel.$relationshipId])
      }
      // incoming relationships
      let inc = digitalTwin.listIncomingRelationships(jsonItem.$id);
      for await (const rel of inc) {
        rels.push([rel.sourceId, rel.relationshipId])
      }
      // delete all twin relationships
      for (const tbd of rels) {
        context.log.verbose(`deleting relationship ${tbd[1]}`);
        await (async () => {
          context.log.verbose('waiting 100ms');
          sleep(100);
          context.log.verbose('calling ADT relationship API');
          await digitalTwin.deleteRelationship(tbd[0], tbd[1])
              .catch((e) => {
                context.log.error(`relationship ${tbd[1]}
                  on source ${tbd[0]} deletion failed: `, e);
                const err = `failed relationship: ${jsonString}`;
                throw err;
              });
        })();
      }
      // delete twin
      context.log.verbose(`deleting twin ${jsonItem.$id}`);
      await (async () => {
        context.log.verbose('waiting 20ms');
        sleep(20);
        context.log.verbose('calling ADT twin API');
        await digitalTwin.deleteDigitalTwin(jsonItem.$id)
            .catch((e) => {
              context.log.error(`twin ${jsonItem.$id} deletion failed: `, e);
              const err = `failed twin: ${jsonString}`;
              throw err;
            });
      })();
    } else { // twin must be upserted
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
    }
  } else {
    context.log.error(`unrecognized message format: ${jsonString}`);
  }
};
