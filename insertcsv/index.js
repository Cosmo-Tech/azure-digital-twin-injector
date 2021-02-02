const {csv2json} = require('../common/csv2json');

// http front for csv2json
module.exports = async function (context, req) {
  csv2json(context, context.bindings.csvdata);
  context.res = {
    status: 200,
    body: ""
  }
}
