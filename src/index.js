'use strict';

var _       = require('lodash');
var Promise = require('bluebird');
var config  = require('./config');
var ironmq  = require('iron_mq');
var Bitly   = require('bitly');
var queue   = Promise.promisifyAll(new ironmq.Client({
  token: config.iron.token,
  project_id: config.iron.project_id,
  queue_name: 'payment-reminders'
}));
var bitly   = Promise.promisifyAll(new Bitly(config.bitly.username, config.bitly.api_key));

var template = _.template('Reminder! Complete your ${ campaign.organization.name } pledge:\n\n${ payment_url_short }');

var Request = require('request2');

exports.extract = function () {
  return new Request('GET', config.api + '/pledges?paid=false&expand[]=donor&expand[]=campaign&expand[]=campaign.organization').send();
};

exports.transform = function (pledges) {
  return Promise.map(pledges, function (pledge) {
    var longUrl = config.app + '/payments/create?pledge=' + pledge.id;
    return bitly.shortenAsync(longUrl)
      .then(function (shortUrl) {
        pledge.payment_url_short = shortUrl;
      })
      .return(pledge);
  },
  {
    concurrency: 5
  })
  .map(function (pledge) {
    return {
      to: pledge.donor.phone,
      body: template(pledge)
    };
  });
};


exports.load = function (pledges) {
  return Promise.map(pledges, JSON.stringify)
    .bind(queue)
    .then(queue.postAsync);
};
