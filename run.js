var messages = require('./src');

module.exports = messages.extract()
  .tap(function (pledges) {
    console.log('Retrieved %d unpaid pledges', pledges.length);
  })
  .then(messages.transform)
  .done(messages.load);
