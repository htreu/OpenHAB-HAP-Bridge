'use strict';
import { Accessory, Service, Characteristic, uuid } from 'hap-nodejs';
import request from 'request';

import { UpdateListener } from './UpdateListener.js';
import { OhItem } from './OhItem.js';

class RollershutterItem extends OhItem {
  constructor(name, url, state, ohVersion) {
    super(name, url, state, ohVersion);

    this.accessory = this.buildAccessory(state);
    this.updatingFromOpenHAB = false;
  }

  buildAccessory(state) {
    let position = state === 'UP' ? 100 : 0;
    let accessory = new Accessory(
      this.name, uuid.generate(this.constructor.name + this.name));

    let service = accessory.addService(Service.WindowCovering, this.name);

    let charactersiticCurrentPosition =
      service.getCharacteristic(Characteristic.CurrentPosition);
    charactersiticCurrentPosition.setValue(position);
    charactersiticCurrentPosition.on('get', this.readOpenHabCurrentPosition.bind(this));

    let charactersiticTargetPosition =
      service.getCharacteristic(Characteristic.TargetPosition);
    charactersiticTargetPosition.setValue(position);
    charactersiticTargetPosition.on('set', this.updateOpenHabItem.bind(this));
    charactersiticTargetPosition.on('get', this.readOpenHabCurrentPosition.bind(this));

    let charactersiticPositionState =
      service.getCharacteristic(Characteristic.PositionState);
    charactersiticPositionState.setValue(Characteristic.PositionState.STOPPED);
    charactersiticPositionState.on('get', this.readOpenHabPositionState.bind(this));

    return accessory;
  }

  updateOpenHabItem(value, callback) {
		console.log("received rollershutter value from iOS: " + value + ' ' + this.url);
    if (this.updatingFromOpenHAB) {
      callback();
      return;
    }
		var command = 0;
		if (typeof value === 'boolean') {
			command = value ? '100' : '0';
		} else {
			command = "" + value;
		}
		request.post(
				this.url,
				{
					body: command,
					headers: {'Content-Type': 'text/plain'}
				},
				function (error, response, body) {
						if (!error && response.statusCode == 200) {
								console.log(body)
						}
            callback();
				}
		);

	};

  readOpenHabCurrentPosition(callback) {
    callback(100);
  }

  readOpenHabPositionState(callback) {
    callback(Characteristic.PositionState.STOPPED);
  }

  updateCharacteristics(message) {
		var position = message;
	};
}

export { RollershutterItem };
