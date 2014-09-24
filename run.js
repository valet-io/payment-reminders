var messages = require('./src');

module.exports = messages.extract()
  .then(message.transform)
  .done(messages.load);
