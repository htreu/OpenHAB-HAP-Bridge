'use strict';

import should from 'should';
import nock from 'nock';
import { Service, Characteristic } from 'hap-nodejs';

import { DimmerItem } from '..';

process.env.NODE_ENV = 'test';

function createDimmerItem() {
  return new DimmerItem('dimmerName', 'dimmerItemName', 'http://openhab.test/rest/dimmerItem', '80', '1');
}

describe('DimmerItem', function () {

  it('should contain AccessoryInformation & Lightbulb services', function () {
    let dimmerItem = createDimmerItem();
    dimmerItem.should.have.property('accessory');
    dimmerItem.accessory.getService(Service.AccessoryInformation).should.not.be.empty;
    dimmerItem.accessory.getService(Service.Lightbulb).should.not.be.empty;
  });

  it('should have set the correct name', function () {
    let dimmerItem = createDimmerItem();
    let accessory = dimmerItem.accessory;
    accessory.getService(Service.AccessoryInformation)
      .getCharacteristic(Characteristic.Name).value.should.equal('dimmerName');
    accessory.getService(Service.Lightbulb)
      .getCharacteristic(Characteristic.Name).value.should.equal('dimmerName');
  });

  it('should have set the initial value', function () {
    let dimmerItem = createDimmerItem();
    dimmerItem.accessory.getService(Service.Lightbulb)
      .getCharacteristic(Characteristic.On).value.should.be.true;

    dimmerItem.accessory.getService(Service.Lightbulb)
      .getCharacteristic(Characteristic.Brightness).value.should.be.equal(80);
  });

  it('should make web socket connection to OpenHAB', function (done) {
    nock('http://openhab.test')
      .get('/rest/dimmerItem/state?type=json')
      .reply(200, function(uri, requestBody) {
        done();
      });
    createDimmerItem();
  });

  it('should update characteristics value when listener triggers', function (done) {
    let dimmerItem = createDimmerItem();

    dimmerItem.updatingFromOpenHAB = true;
    dimmerItem.listener.callback('0');
    dimmerItem.accessory.getService(Service.Lightbulb)
      .getCharacteristic(Characteristic.On).value.should.be.false;
    dimmerItem.accessory.getService(Service.Lightbulb)
      .getCharacteristic(Characteristic.Brightness).value.should.be.equal(0);
    dimmerItem.updatingFromOpenHAB.should.be.false;

    dimmerItem.updatingFromOpenHAB = true;
    dimmerItem.listener.callback('50');
    dimmerItem.accessory.getService(Service.Lightbulb)
      .getCharacteristic(Characteristic.On).value.should.be.true;
    dimmerItem.accessory.getService(Service.Lightbulb)
      .getCharacteristic(Characteristic.Brightness).value.should.be.equal(50);
    dimmerItem.updatingFromOpenHAB.should.be.false;

    dimmerItem.updatingFromOpenHAB = true;
    dimmerItem.listener.callback('100');
    dimmerItem.accessory.getService(Service.Lightbulb)
      .getCharacteristic(Characteristic.On).value.should.be.true;
    dimmerItem.accessory.getService(Service.Lightbulb)
      .getCharacteristic(Characteristic.Brightness).value.should.be.equal(100);
    dimmerItem.updatingFromOpenHAB.should.be.false;
    done();
  });

});
