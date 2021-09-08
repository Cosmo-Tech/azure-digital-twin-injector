const {csv2json} = require('../common/csv2json');

// http front for csv2json
module.exports = async function(context, req) {
  context.log('insertcsv function triggered');
  csv2json(context, context.bindings.csvdata);
  context.res = {
    status: 200,
    body: ''
  };
};
