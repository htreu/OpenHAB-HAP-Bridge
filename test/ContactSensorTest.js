'use strict';

import should from 'should';
import nock from 'nock';
import { Service, Characteristic } from 'hap-nodejs';

import { ContactSensor } from '..';

process.env.NODE_ENV = 'test';

function createContactSensor() {
  return new ContactSensor('contactSensorName', 'contactSensorItemName', 'http://openhab.test/rest/contactSensor', 'OPEN', '1');
}

describe('ContactSensor', function () {

  it('should contain AccessoryInformation & ContactSensor services', function () {
    let contactSensor = createContactSensor();
    contactSensor.should.have.property('accessory');
    contactSensor.accessory.getService(Service.AccessoryInformation).should.not.be.empty;
    contactSensor.accessory.getService(Service.ContactSensor).should.not.be.empty;
  });

  it('should have set the correct name', function () {
    let contactSensor = createContactSensor();
    let accessory = contactSensor.accessory;
    accessory.getService(Service.AccessoryInformation)
      .getCharacteristic(Characteristic.Name).value.should.equal('contactSensorName');
    accessory.getService(Service.ContactSensor)
      .getCharacteristic(Characteristic.Name).value.should.equal('contactSensorName');
  });

  it('should have set the initial value', function () {
    let contactSensor = createContactSensor();
    contactSensor.accessory.getService(Service.ContactSensor)
      .getCharacteristic(Characteristic.ContactSensorState).value.should.equal(Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
  });

  it('should make web socket connection to OpenHAB', function (done) {
    nock('http://openhab.test')
      .get('/rest/contactSensor/state?type=json')
      .reply(200, function(uri, requestBody) {
        done();
      });
    createContactSensor();
  });

});
