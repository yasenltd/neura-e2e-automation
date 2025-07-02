import BasePage from './common/BasePage.js';
import selectors from '../locators/neuraLocators.js';

class SwapPage extends BasePage {
  constructor(page) {
    super(page);
    this.page = page;
    this.selectors = selectors;
    this.wallet = null;
  }
}

export default SwapPage;