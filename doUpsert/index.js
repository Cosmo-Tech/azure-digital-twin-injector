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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Delete a relationship in a digital twin instance.
 * @param {Object} context Context.
 * @param {Object} twin A digital twin client.
 * @param {String} sourceId Identifier of the relationship source in twin.
 * @param {String} relId Identifier of the relationship in twin.
 */
async function deleteRel(context, twin, sourceId, relId) {
  context.log.verbose('waiting 100ms');
  sleep(100);
  context.log.verbose('calling ADT relationship API');
  await twin.deleteRelationship(sourceId, relId)
      .catch((e) => {
        context.log.error(`relationship ${relId}
          on source ${sourceId} deletion failed: `, e);
        const err = `failed relationship: ${relId}`;
        throw err;
      });
}

/**
 * Build a JSON patch object using the properties of the input item object.
 * @param {Object} item An object describing a twin update.
 * @return {Object} patch A JSON patch object.
 */
function buildPatch(item) {
  const patch = [];
  for (const i of Object.keys(item)) { // build the JSON patch
    if (!i.startsWith('$')) { // remove metadata keywords
      const path = `/${i}`;
      patch.push({op: 'replace', path, value: item[i]});
    }
  }
  return patch;
}

module.exports = async function(context, jsonItem) {
  context.log('doUpsert function triggered');
  context.log.verbose('creating ADT client');
  const digitalTwin = new DigitalTwinsClient(
      process.env.DIGITAL_TWINS_URL,
      new DefaultAzureCredential(),
  );
  const jsonString = JSON.stringify(jsonItem);
  context.log.verbose(`Json item: ${jsonString}`);

  if ('$relationshipId' in jsonItem) {
    if (jsonItem.relationship.$relationshipDelete === true) {
      // relationship must be deleted
      context.log.verbose(`deleting relationship ${jsonItem.$relationshipId}`);
      await deleteRel(
          context,
          digitalTwin,
          jsonItem.$sourceId,
          jsonItem.$relationshipId,
      );
    } else { // relationship must be upserted
      try { // if relationship exists it must be updated
        await digitalTwin.getRelationship(
            jsonItem.$sourceId, jsonItem.$relationshipId);
        context.log.verbose(
            `updating relationship ${jsonItem.$relationshipId}`);
        const rlPatch = buildPatch(jsonItem);
        await digitalTwin.updateRelationship(
            jsonItem.$sourceId, jsonItem.$relationshipId, rlPatch);
      } catch (error) {
        // relationship does not exist and must be upserted
        context.log.verbose(
            `upserting relationship ${jsonItem.$relationshipId}`);
        await (async () => {
          context.log.verbose('waiting 100ms');
          sleep(100);
          context.log.verbose('calling ADT relationship API');
          await digitalTwin.upsertRelationship(
              jsonItem.$sourceId,
              jsonItem.$relationshipId,
              jsonItem.relationship,
          )
              .catch((e) => {
                context.log.error(`relationship ${jsonItem.$relationshipId}
                on source ${jsonItem.$sourceId} insertion failed: `, e);
                const err = `failed relationship: ${jsonString}`;
                throw err;
              });
        })();
      }
    }
  } else if ('$id' in jsonItem) {
    if (jsonItem.$entityDelete === true) { // twin must be deleted
      // list all twin relationships
      const rels = [];
      // outgoing relationships
      const out = digitalTwin.listRelationships(jsonItem.$id);
      for await (const rel of out) {
        rels.push({sourceId: rel.$sourceId, id: rel.$relationshipId});
      }
      // incoming relationships
      const inc = digitalTwin.listIncomingRelationships(jsonItem.$id);
      for await (const rel of inc) {
        rels.push({sourceId: rel.sourceId, id: rel.relationshipId});
      }
      // delete all twin relationships
      for (const tbd of rels) {
        context.log.verbose(`deleting relationship ${tbd.id}`);
        await deleteRel(
            context,
            digitalTwin,
            tbd.sourceId,
            tbd.id,
        );
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
      try { // if twin already exists, it must be updated instead
        await digitalTwin.getDigitalTwin(jsonItem.$id);
        context.log.verbose(`updating twin ${jsonItem.$id}`);
        const twPatch = buildPatch(jsonItem);
        await digitalTwin.updateDigitalTwin(jsonItem.$id, twPatch);
      } catch (error) {
        // twin does not exist and must be upserted
        context.log.verbose(`upserting twin ${jsonItem.$id}`);
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
    }
  } else {
    context.log.error(`unrecognized message format: ${jsonString}`);
  }
};
