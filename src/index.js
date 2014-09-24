'use strict';

var _       = require('lodash');
var Promise = require('bluebird');
var config  = require('./config');
var ironmq  = require('iron_mq');
var queue   = Promise.promisifyAll(new ironmq.Client({
  token: config.iron.token,
  project_id: config.iron.project,
  queue_name: 'payment-reminders'
}));

var template = _.template('Reminder! Complete your ${ pledge.campaign.organization.name } pledge: ${ payment_url }');

var Request = require('request2');

exports.extract = function () {
  return new Request('GET', config.api + '/pledges?paid=false&expand[]=donor&expand[]=campaign&expand[]=campaign.organization').send();
};

exports.transform = function (pledges) {
  return pledges.map(function (pledge) {
    return {
      to: pledge.donor.phone,
      body: template({
        pledge: pledge,
        payment_url: config.app + '/payments/create?pledge=' + pledge.id
      })
    };
  });
};


exports.load = function (pledges) {
  return Promise.map(pledges, JSON.stringify)
    .bind(queue)
    .then(queue.postAsync);
};
