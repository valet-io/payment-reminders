var messages = require('./src');

module.exports = messages.extract()
  .then(messages.transform)
  .done(messages.load);
