/**
 * Copyright 2016 Henning Treu
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Accessory, Service, Characteristic, uuid } from 'hap-nodejs';
import request from 'request';
import debug from 'debug'; let logger = debug('Rollershutter');

import { UpdateListener } from '../UpdateListener.js';

class RollershutterItem {
  constructor(name, url, state) {
    this.name = name;
    this.url = url;

    this.accessory = this.buildAccessory(state);
    this.updatingFromOpenHAB = false;

    // listen for OpenHAB updates
    let listener = undefined;
    this.registerOpenHABListener();
  }

  registerOpenHABListener() {
    this.listener = new UpdateListener(this.url, this.updateCharacteristics.bind(this));
    this.listener.startListener();
  };

  buildAccessory(state) {
    let position = state === 'Uninitialized' ? 100 : +state;
    let accessory = new Accessory(
      this.name, uuid.generate(this.constructor.name + this.name));

    let service = accessory.addService(Service.WindowCovering, this.name);

    let charactersiticCurrentPosition =
      service.getCharacteristic(Characteristic.CurrentPosition);
    charactersiticCurrentPosition.setValue(this.convertValue(position));
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
		logger('received rollershutter value from iOS: ' + value + ' for ' + this.name);
    if (this.updatingFromOpenHAB) {
      callback();
      return;
    }

    let command = '' + this.convertValue(value);

    request.post(
				this.url,
				{ body: command },
				function (error, response, body) {
            if (!error) {
              callback();
            }
				}
		);
	};

  convertValue(value) {
    return 100 - (+value);
  }

  readOpenHabCurrentPosition(callback) {
    let widgetName = this.name;
    let widgetUrl = this.url;
    let _this = this;

		request(this.url + '/state?type=json', function (error, response, body) {
		  if (!error && response.statusCode === 200) {
        let value = _this.convertValue(body);
        /* istanbul ignore next */
        if (process.env.NODE_ENV !== 'test') {
          logger('read current position state: [' + body + '] ' + value + ' for ' + widgetName + ' from ' + widgetUrl);
        }
		    callback(false, value);
		  }
		});
  }

  readOpenHabPositionState(callback) {
    callback(false, Characteristic.PositionState.STOPPED);
  }

  updateCharacteristics(message) {
    let position = this.convertValue(message);
    /* istanbul ignore next */
    if (process.env.NODE_ENV !== 'test') {
      logger('current rollershutter position from openHAB: ' + message
        + ' for ' + this.name + ', updating iOS: ' + position + '');
    }

    this.updatingFromOpenHAB = true;
    this.accessory.getService(Service.WindowCovering)
      .getCharacteristic(Characteristic.CurrentPosition)
        .setValue(position,
          function() { // callback to signal us iOS did process the update
            this.updatingFromOpenHAB = false;
          }.bind(this)
        );
	};
}

export { RollershutterItem };
