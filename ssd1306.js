/*
 * Copyright 2022 Luis Martins <luis.martins@gmail.com>
 * 
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 */

const { Gpio } = require('onoff');
const AsyncLock = require('async-lock');

const spi = require('spi-device');

const Mode = {
  DATA: 0b0,
  COMMAND: 0b1
}

/**
 * Datasheet can be found at: https://cdn-shop.adafruit.com/datasheets/SSD1306.pdf
 *
 * Portions of this code have been ported from:
 *   - https://github.com/ondryaso/pi-ssd1306-java/blob/master/src/eu/ondryaso/ssd1306/Display.java
 *   - https://github.com/adafruit/Adafruit_SSD1306/blob/master/Adafruit_SSD1306.cpp
 */

const SPI_BUS = 0; // default to bus number 0
const DEVICE_NUMBER = 0;

/**
 * The SSD1306 has a default dimension of 128x32.
 */
const WIDTH = 128;
const HEIGHT = 32;

/**
 * Constants for device configuration.
 */
const CLOCK_FREQUENCY = 8000000;

const SET_DISPLAY_OFF = 0xAE;
const SET_DISPLAY_ON = 0xAF;
const SET_DISPLAY_ON_RESUME = 0xA4;

const SET_NORMAL_DISPLAY = 0xA6;
const SET_INVERSE_DISPLAY = 0xA7;

const SET_DISPLAY_CLOCK_DIVIDE = 0xD5;
const RATIO_FREQUENCY = 0x80; // ratio is the same for both 128x64 and 128x32 displays

const SET_MULTIPLEX_RATIO = 0xA8;
const MULTIPLEX_RATIO_128x32 = 0x1F;
const MULTIPLEX_RATIO_128x64 = 0x3F;

const SET_DISPLAY_OFFSET = 0xD3;
const DEFAULT_DISPLAY_OFFSET = 0x00;

const SET_START_LINE = 0x40; // start at line 0

const SET_CHARGE_PUMP = 0x8D;
const CHARGE_PUMP_EXTERNAL_VCC = 0x10;
const CHARGE_PUMP_SWITCHING_CAPACITOR = 0x14; // default

const SET_MEMORY_ADDRESSING_MODE = 0x20;
const HORIZONTAL_ADDRESSING_MODE = 0x00; // we're only using horizontal addressing mode

const SET_SEGMENT_REMAP = 0xA1;
const SET_COM_OUTPUT_SCAN_DIRECTION = 0xC8;

const SET_COM_PINS = 0xDA;
const COM_PINS_128x32 = 0x02;
const COM_PINS_128x64 = 0x12;

const SET_CONTRAST = 0x81;
const DEFAULT_CONTRAST = 0x8F; // this value can be adjusted if we're using an external vcc

const SET_PRE_CHARGE_PERIOD = 0xD9;
const DEFAULT_PRE_CHARGE_PERIOD = 0xF1; // change to 0x22 if using an external vcc

const SET_VCOMH_DESELECT_LEVEL = 0xDB;
const DEFAULT_VCOMH_DESELECT_LEVEL = 0x40;

const SET_COLUMN_ADDRESS = 0x21;
const SET_PAGE_ADDRESS = 0x22;

const SPLASH = [
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80,
  0xC0, 0xE0, 0x78, 0x3E, 0x80, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7C, 0xFE, 0xC7, 0x03,
  0x7D, 0xFE, 0xE7, 0xC3, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0C, 0x0C, 0x6E, 0x6A, 0x6A, 0xC8, 0xD8, 0xC9, 0xC9,
  0xC8, 0xCF, 0x6B, 0x6D, 0x4C, 0x04, 0x00, 0x42, 0x62, 0x3E, 0x1E, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x1C, 0x14, 0x34, 0x70, 0x73, 0x73, 0x76, 0x76, 0x76, 0x76,
  0x76, 0x76, 0x77, 0x72, 0x72, 0x50, 0x70, 0x78, 0x78, 0x3C, 0x30, 0x00, 0x00, 0x00, 0x00, 0x00
];

/**
 * Default D/C (data / command) and RESET pins.
 */
const DC_PIN = 23;
const RESET_PIN = 24;

const dc = new Gpio(DC_PIN, 'out'); // data/command for SPI devices, low is command mode
const rst = new Gpio(RESET_PIN, 'high'); // reset is active low, pin needs to be initialised with high

/**
 * Private variables.
 */
let _width = undefined;
let _height = undefined;
let _pages = undefined;

const lock = new AsyncLock();

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Sets the specified pin to LOW.
 */
const low = async (pin) => {
  await change(pin, Gpio.LOW);
}

/**
 * Sets the specified pin to HIGH.
 */
const high = async (pin) => {
  await change(pin, Gpio.HIGH);
}

/**
 * Changes the state of the given pin to the specified level (either HIGH or LOW).
 */
const change = (pin, level) => {
  return new Promise((resolve, reject) => {
    pin.write(level, (error) => {
      if(error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Sends the given data to the OLED display, to send data the D/C pin must be HIGH.
 */
const data = async (data) => {
  await write(Mode.DATA, data);
}

/**
 * Sends a command to the OLED display, to send a command the D/C pin must be LOW.
 */
const command = async (data) => {
  await write(Mode.COMMAND, [data]);
}

/**
 * Writes to the SPI bus, setting the D/C pin for either data or command modes.
 */
const write = async (mode, data) => {
  if(mode == Mode.DATA) {
    await high(dc);
  } else {
    await low(dc);    
  }

  const message = [{
    byteLength: data.length,
    sendBuffer: Buffer.from(data)
  }];

  return new Promise((resolve, reject) => {
    _device.transfer(message, (error, message) => {
      if(error) {
        reject(error);
      } else {
        resolve(message);
      }
    });
  });
}

/**
 * Resets the device which is part of the startup schedule.
 */
const reset = async () => {
  lock.acquire('ssd1306', async () => {
    await low(rst);
    await sleep(10);
    await high(rst);
  });
}

/**
 * Creates a reference to the OLED display device.
 */
const open = () => {
  return new Promise((resolve, reject) => {
    const device = spi.open(SPI_BUS, DEVICE_NUMBER, { maxSpeedHz: CLOCK_FREQUENCY }, (error) => {
      if(error) {
        reject(error);
      } else {
        resolve(device);
      }      
    });
  });
}

/**
 * Sets global variables, initializes the in-memory buffer and sends initialization commands to the device.
 */
const init = async (width = WIDTH, height = HEIGHT) => {
  _width = width;
  _height = height;
  _pages = height / 8;

  lock.acquire('ssd1306', async () => {
    _device = await open();

    await command(SET_DISPLAY_OFF);

    await command(SET_DISPLAY_CLOCK_DIVIDE);
    await command(RATIO_FREQUENCY);

    await command(SET_MULTIPLEX_RATIO);
    await command(height == HEIGHT ? MULTIPLEX_RATIO_128x32 : MULTIPLEX_RATIO_128x64); // default is 32

    await command(SET_DISPLAY_OFFSET);
    await command(DEFAULT_DISPLAY_OFFSET);

    await command(SET_START_LINE);

    await command(SET_CHARGE_PUMP);
    await command(CHARGE_PUMP_SWITCHING_CAPACITOR); // change if an external vcc is used for the OLED display

    await command(SET_MEMORY_ADDRESSING_MODE);
    await command(HORIZONTAL_ADDRESSING_MODE);

    await command(SET_SEGMENT_REMAP);
    await command(SET_COM_OUTPUT_SCAN_DIRECTION);

    await command(SET_COM_PINS);
    await command(height == HEIGHT ? COM_PINS_128x32 : COM_PINS_128x64); // default height is 32

    await command(SET_CONTRAST);
    await command(DEFAULT_CONTRAST);

    await command(SET_PRE_CHARGE_PERIOD);
    await command(DEFAULT_PRE_CHARGE_PERIOD);

    await command(SET_VCOMH_DESELECT_LEVEL);
    await command(DEFAULT_VCOMH_DESELECT_LEVEL);

    await command(SET_DISPLAY_ON_RESUME);
    await command(SET_NORMAL_DISPLAY);

    await command(SET_DISPLAY_ON);
  });
}

/**
 * Writes the given buffer to the specified location on the OLED display.
 */
const display = async (buffer, x, y, width, pages) => {
  lock.acquire('ssd1306', async () => {
    await command(SET_COLUMN_ADDRESS);
    await command(x);
    await command(x + width - 1);
    await command(SET_PAGE_ADDRESS );
    await command(y);
    await command(y + pages - 1);

    await data(buffer);
  });
}

/**
 * Clears the OLED display, either the whole screen or just a single page.
 */
const clear = async (page) => {
  const buffer = new Array(page == undefined ? _width * _pages : _width);
  buffer.fill(0);

  await display(buffer, 0, page | 0, _width, buffer.length / _width);
}

exports.init = init;
exports.reset = reset;
exports.display = display;
exports.clear = clear;

exports.width = () => {
  return _width;
};
exports.height = () => {
  return _height;
};
exports.pages = () => {
  return _pages;
};

exports.SPLASH = SPLASH;
exports.SPI_BUS = SPI_BUS;
exports.DEVICE_NUMBER = DEVICE_NUMBER;
exports.WIDTH = WIDTH;
exports.HEIGHT = HEIGHT;
