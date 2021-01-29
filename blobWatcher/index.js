const {csv2json} = require('../common/csv2json');

module.exports = async function (context, csvBlob) {
    csv2json(csvBlob);
};