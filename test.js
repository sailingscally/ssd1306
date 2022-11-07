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

const test = async () => {
  await ssd1306.reset();
  await ssd1306.init();
  await ssd1306.clear(); // clears the display on start in case there was data in the display

  await ssd1306.display(ssd1306.SPLASH, 48, 0, 32, 32 / 8); // 32 pixels high, 8 pixels/ page -> 4 pages

  console.log('WIDTH: ' + ssd1306.WIDTH);
  console.log('HEIGHT: ' + ssd1306.HEIGHT);
  
  console.log('Width: ' + ssd1306.width());
  console.log('Height: ' + ssd1306.height());
  console.log('Pages: ' + ssd1306.pages());
}

test();
