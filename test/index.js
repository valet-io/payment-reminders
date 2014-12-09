'use strict';

var config = {
  iron: {
    token: 't',
    project: 'p'
  },
  bitly: {},
  api: 'https://api.valet.io',
  app: 'https://pledge.valet.io'
};
var chai       = require('chai').use(require('sinon-chai'));
var expect     = chai.expect;
var sinon      = require('sinon');
var proxyquire = require('proxyquire');
var nock       = require('nock');
var Bitly      = require('bitly');
var ironmq     = require('iron_mq');

sinon.spy(ironmq, 'Client');
var messages   = proxyquire('../', {
  './config': config
});

describe('payment-reminders', function () {

  var sandbox = sinon.sandbox.create();
  afterEach(function () {
    sandbox.restore();
  });

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
        .get('/pledges?paid=false&cancelled=false&expand[]=donor&expand[]=campaign&expand[]=campaign.organization')
        .reply(200, [
          {id: 0}
        ]);
      return messages.extract().then(function (pledges) {
        expect(pledges).to.have.length(1);
      });

    });

  });

  describe('#transform', function () {

    before(function () {
      sinon.stub(Bitly.prototype, 'shorten')
        .withArgs('https://pledge.valet.io/payments/create?pledge=0')
        .yieldsAsync(null, {
          data: {
            url: 'http://bit.ly/shortened'
          }
        });
    });

    it('generates message objects for pledges', function () {
      return messages.transform([{
        id: 0,
        donor: {
          phone: '900'
        },
        campaign: {
          organization: {
            name: 'My Great Org'
          }
        }
      }])
      .then(function (messages) {
        expect(messages)
          .to.have.length(1)
          .and.property(0)
          .that.deep.equals({
            to: '900',
            body: 'Reminder! Complete your My Great Org pledge:\n\nhttp://bit.ly/shortened'
          });
      });
    });

    it('can generate a message object with a custom template', function () {
      return messages.transform([{
        id: 0,
        donor: {
          name: 'Ben',
          phone: '900'
        },
        campaign: {
          reminder_template: 'Thank you ${ donor.name }! Pay here: ${ link }',
          organization: {
            name: 'My Great Org'
          }
        }
      }])
      .then(function (messages) {
        expect(messages)
          .to.have.length(1)
          .and.property(0)
          .that.deep.equals({
            to: '900',
            body: 'Thank you Ben! Pay here: http://bit.ly/shortened'
          });
      });
    });

  });

  describe('#load', function () {

    var queue = ironmq.Client.firstCall.returnValue;

    it('posts the pledges to the queue', function () {
      sandbox.stub(queue, 'post').yieldsAsync(null);
      return messages.load([{id: 0}])
        .then(function () {
          expect(queue.post)
            .to.have.been.called;
          expect(JSON.parse(queue.post.firstCall.args[0][0]))
            .to.deep.equal({id: 0});
        });
    });

    it('is a noop with no pledges', function () {
      sandbox.stub(queue, 'post').yieldsAsync(new Error());
      return messages.load([])
        .then(function () {
          expect(queue.post)
            .to.not.have.been.called;
        });
    });

  });

});
