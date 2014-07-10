'use strict';

var Promise = require('bluebird');
var config  = require('./config');
var ironmq  = require('iron_mq');
var queue   = Promise.promisifyAll(new ironmq.Client({
  token: config.iron.token,
  project_id: config.iron.project,
  queue_name: 'payment-reminders'
}));

var Request = require('request2');

exports.fetch = function () {
  return new Request('GET', config.api + '/pledges').send();
};

exports.enqueue = function (pledges) {
  return Promise.map(pledges, JSON.stringify)
    .bind(queue)
    .then(queue.postAsync);
};
