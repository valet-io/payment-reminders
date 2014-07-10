var messages = require('./src');

module.exports = messages.fetch().done(messages.enqueue);
