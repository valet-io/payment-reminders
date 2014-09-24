'use strict';

var config = {
  iron: {
    token: 't',
    project: 'p'
  },
  api: 'https://api.valet.io',
  app: 'https://pledge.valet.io'
};
var chai       = require('chai').use(require('sinon-chai'));
var expect     = chai.expect;
var sinon      = require('sinon');
var proxyquire = require('proxyquire');
var nock       = require('nock');
var ironmq     = require('iron_mq');

sinon.spy(ironmq, 'Client');
var messages   = proxyquire('../', {
  './config': config
});

describe('enqueue-payment-reminders', function () {

  describe('#extract', function () {

    var api;
    before(function () {
      api = nock(config.api);
    });

    afterEach(function () {
      api.done();
    });

    it('resolves unpaid pledges', function () {
      api
        .get('/pledges?paid=false&expand[]=donor&expand[]=campaign&expand[]=campaign.organization')
        .reply(200, [
          {id: 0}
        ]);
      return messages.extract().then(function (pledges) {
        expect(pledges).to.have.length(1);
      });

    });

  });

  describe('#transform', function () {

    it('generates message objects for pledges', function () {
      expect(messages.transform([{
        id: 0,
        donor: {
          phone: '900'
        },
        campaign: {
          organization: {
            name: 'My Great Org'
          }
        }
      }]))
      .to.have.length(1)
      .and.property(0)
      .that.deep.equals({
        to: '900',
        body: 'Reminder! Complete your My Great Org pledge: https://pledge.valet.io/payments/create?pledge=0'
      });
    });

  });

  describe('#load', function () {

    var queue = ironmq.Client.firstCall.returnValue;

    it('posts the pledges to the queue', function () {
      sinon.stub(queue, 'post').yieldsAsync(null);
      return messages.load([{id: 0}])
        .then(function () {
          expect(queue.post)
            .to.have.been.called;
          expect(JSON.parse(queue.post.firstCall.args[0][0]))
            .to.deep.equal({id: 0});
        });
    });

  });

});
