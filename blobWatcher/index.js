const {csv2json} = require('../common/csv2json');

// blob trigered call to csv2json
module.exports = async function (context, csvBlob) {
    console.log("blobWatcher function triggered");
    csv2json(context, csvBlob);
};
