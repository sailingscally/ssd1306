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

const ssd1306 = require('./ssd1306.js');

const crash = async () => {
  await ssd1306.reset();
  await ssd1306.init();
  await ssd1306.display(); // clears the display on start in case there was data in the display

  await ssd1306.display(ssd1306.SPLASH, 48, 0, 32, 32 / 8); // 32 pixels high, 8 pixels/ page -> 4 pages

  let i1 = 0;
  let i2 = 0;

  // the following code will cause the display to crash if there isn't a mutex
  // in the 'dislay()' method making it thread safe

  setInterval(async () => {
    const buffer = new Array(32);
    buffer.fill(i1 ++ % 2 == 0 ? 0b00110000 : 0b00000011);
    await ssd1306.display(buffer, 0, 0, 32, 1);
  }, 100);

  setInterval(async () => {
    const buffer = new Array(32);
    buffer.fill(i2 ++ % 2 == 0 ? 0b00001010 : 0b10100000);
    await ssd1306.display(buffer, 96, 0, 32, 1);
  }, 120);
}

crash();
