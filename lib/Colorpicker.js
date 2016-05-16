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
import debug from 'debug'; let logger = debug('ColorItem');

import { UpdateListener } from './UpdateListener.js';

class Colorpicker {
  constructor(name, url, state, itemType) {
    this.HUE = 'hue';
    this.SATURATION = 'saturation';

    this.name = name;
    this.url = url;
    this.accessory = this.buildAccessory(state);
    this.updatingFromOpenHAB = false;

    // listen for OpenHAB updates
    this.listener = undefined;
    this.registerOpenHABListener();
  }

  registerOpenHABListener() {
    this.listener = new UpdateListener(this.url, this.updateCharacteristics.bind(this));
    this.listener.startListener();
  };

  buildAccessory(state) {
    let accessory = new Accessory(
      this.name, uuid.generate(this.constructor.name + this.name));

    let singleStates = this.parseState(state);
    let hue = +singleStates[0];
    let saturation = +singleStates[1];
    let brightness = +singleStates[2];

    let service = accessory.addService(Service.Lightbulb, this.name);

    let charactersiticOnOff =
      service.getCharacteristic(Characteristic.On);
    charactersiticOnOff.setValue(brightness > 0);
    charactersiticOnOff.on('set', this.updateOpenHabBrightness.bind(this));
    charactersiticOnOff.on('get', this.readOpenHabPowerState.bind(this));

    let charactersiticBrightness =
      service.addCharacteristic(Characteristic.Brightness);
    charactersiticBrightness.setValue(brightness);
    charactersiticBrightness.on('set', this.updateOpenHabBrightness.bind(this));
    charactersiticBrightness.on('get', this.readOpenHabBrightnessState.bind(this));

    let charactersiticHue =
      service.addCharacteristic(Characteristic.Hue);
    charactersiticHue.setValue(hue);
    charactersiticHue.on('set', this.updateHue.bind(this));
    charactersiticHue.on('get', this.readOpenHabHueState.bind(this));

    let charactersiticSaturation =
      service.addCharacteristic(Characteristic.Saturation);
    charactersiticSaturation.setValue(saturation);
    charactersiticSaturation.on('set', this.updateSaturation.bind(this));
    charactersiticSaturation.on('get', this.readOpenHabSaturationState.bind(this));

    return accessory;
  }

  readOpenHabPowerState(callback) {
    /* istanbul ignore next */
    if (process.env.NODE_ENV !== 'test') {
      logger('ColorItem: read power state called');
    }
    this.getCurrentStateFromOpenHAB(function(brightness, hue, saturation) {
      callback(false, brightness > 0 ? true : false);
    });
  }

  readOpenHabBrightnessState(callback) {
    /* istanbul ignore next */
    if (process.env.NODE_ENV !== 'test') {
      logger('ColorItem: read brightness state called');
    }
    this.getCurrentStateFromOpenHAB(function(brightness, hue, saturation) {
      callback(false, brightness);
    });
  }

  readOpenHabHueState(callback) {
    /* istanbul ignore next */
    if (process.env.NODE_ENV !== 'test') {
      logger('ColorItem: read hue state called');
    }
    this.getCurrentStateFromOpenHAB(function(brightness, hue, saturation) {
      callback(false, hue);
    });
  }

  readOpenHabSaturationState(callback) {
    /* istanbul ignore next */
    if (process.env.NODE_ENV !== 'test') {
      logger('ColorItem: read saturation state called');
    }
    this.getCurrentStateFromOpenHAB(function(brightness, hue, saturation) {
      callback(false, saturation);
    });
  }

  parseState(state) {
		let regex = /[\.\d]+/g;
		let result = [];
		let v;
		while (v = regex.exec(state)) {
			result.push(v[0]);
		}

		return result;
	}

  updateHue(value, callback) {
    this.updateHS(value, this.HUE, callback);
  }

  updateSaturation(value, callback) {
    this.updateHS(value, this.SATURATION, callback);
  }

	updateHS(value, type, callback) {
    if (this.updatingFromOpenHAB) {
      callback();
      return;
    }
		let message = type === this.HUE ? ('hue: ' + value) : ('saturation: ' + value)

    /* istanbul ignore next */
    if (process.env.NODE_ENV !== 'test') {
  		logger('received color information from iOS: ' + message);
    }

    let _this = this;
    this.getCurrentStateFromOpenHAB(function(brightness, hue, saturation) {
      hue = type === _this.HUE ? value : hue;
      saturation = type === _this.SATURATION ? value : saturation;
      let command = hue + ',' + saturation + ',' + brightness;

      /* istanbul ignore next */
      if (process.env.NODE_ENV !== 'test') {
        logger('sending color command to openHAB: ' + command);
      }

      request.post(
        _this.url,
        {
          body: command,
          headers: {'Content-Type': 'text/plain'}
        },
        function (error, response, body) {
          if (!error && response.statusCode === 200) {
            logger(body)
          }
          callback();
        }
      );
    });
	};

	updateOpenHabBrightness(value, callback) {
    if (this.updatingFromOpenHAB) {
      callback();
      return;
    }

    /* istanbul ignore next */
    if (process.env.NODE_ENV !== 'test') {
      logger('received brightness value from iOS: ' + value);
    }

		let command = 0;
		if (typeof value === 'boolean') {
			command = value ? '100' : '0';
		} else {
			command = '' + value;
		}
		request.post(
			this.url,
			{
				body: command,
				headers: {'Content-Type': 'text/plain'}
			},
			function (error, response, body) {
					if (!error && response.statusCode === 200) {
							logger(body)
					}
          callback();
			}
		);
  };

  getCurrentStateFromOpenHAB(updateValues) {
    // request current HSB state from openHAB:
    let _this = this;
		request.get(
			this.url + '/state',
			function (error, response, body) {
				if (!error && response.statusCode === 200) {
          /* istanbul ignore next */
          if (process.env.NODE_ENV !== 'test') {
            logger('received color information from openHAB: ' + body);
          }

					let state = _this.parseState(body);
					let hue = state[0];
					let saturation = state[1];
					let brightness = state[2];

					updateValues(brightness, hue, saturation);
				}
			}
		);
  }

	updateCharacteristics(message) {
    this.updatingFromOpenHAB = true;
    let finished = 0;
    let state = this.parseState(message);
    let hue = +state[0];
    let saturation = +state[1];
    let brightness = +state[2];
    let power = brightness > 0;

    // set brightness
    this.getCharacteristic(Characteristic.Brightness).setValue(brightness,
      function() { // callback to signal us iOS did process the update
        finished++;
        if (finished === 4) {
          this.updatingFromOpenHAB = false;
        }
      }.bind(this)
    );
    // set hue
    this.getCharacteristic(Characteristic.Hue).setValue(hue,
      function() { // callback to signal us iOS did process the update
        finished++;
        if (finished === 4) {
          this.updatingFromOpenHAB = false;
        }
      }.bind(this)
    );
    // set saturation
    this.getCharacteristic(Characteristic.Saturation).setValue(saturation,
      function() { // callback to signal us iOS did process the update
        finished++;
        if (finished === 4) {
          this.updatingFromOpenHAB = false;
        }
      }.bind(this)
    );
    // update ON/OFF state
    this.getCharacteristic(Characteristic.On).setValue(power,
      function() { // callback to signal us iOS did process the update
        finished++;
        if (finished === 4) {
          this.updatingFromOpenHAB = false;
        }
      }.bind(this)
    );
	};

  getCharacteristic(type) {
    return this.accessory.getService(Service.Lightbulb).getCharacteristic(type);
  }

}

export { Colorpicker };
