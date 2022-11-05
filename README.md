# SSD1306 Display Driver

This is a Node.JS for the [SSD1306](https://cdn-shop.adafruit.com/datasheets/SSD1306.pdf) OLED display which
will be placed inside the R nineT navigation tower to provide some basic system status information.

## Methods

The module exposes the following methods:

- `init(width, height)` - initialises a new device with the given dimensions
- `reset()` - resets the device, this is part of the initialisation schedule
- `display(buffer, x, y, width, pages)` - writes the data in the given buffer on a section of the screen,
if no buffer is specified the entire in-memory buffer is written to the display
- `clear(page)` - clear a single page on the in-memory buffer or all pages if no page is specified

## Constants

The module exposes the following constants:

- `SPLASH` - used for testing purposes and some fun
- `SPI_BUS` - the default SPI bus is **0**
- `DEVICE_NUMBER` - the default device number is **0**

## Tests & Samples

The script [test.js](https://github.com/sailingscally/ssd1306/blob/master/test.js) provides some sample
code which may be used to test connectivity to the device.

## Usage

This module isn't published to the NPM registry and needs to be installed from GitHub with the command:

```
npm install https://github.com/sailingscally/ssd1306
```
