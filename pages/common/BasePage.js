import PlaywrightFactory from '../../core/playwright/PlaywrightFactory.js';

class BasePage {
  constructor(window) {
    this.window = window;
    this.play = PlaywrightFactory.getWrapper(window);
  }
}

export default BasePage;
