/**
 * copyright (c) cosmo tech corporation.
 * licensed under the mit license.
 *
 * This function is called when a blob is stored in
 * the watched Azure Storage Container.
 * It's only an entry point for csv2json.
 */

const {csv2json, send2queue, queueClient} = require('../common/csv2json');

module.exports = async function(context, csvBlob) {
  context.log('blobWatcher function triggered');
  csv2json(context, csvBlob);
};
