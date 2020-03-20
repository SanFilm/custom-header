import { invertNumArray, subscribeRenderTemplate, processTabArray } from './helpers';
import { conditionalConfig } from './conditional-config';
import { styleHeader } from './style-header';
import { defaultConfig } from './default-config';
import { observers } from './observers';
import { ha_elements } from './ha-elements';
import { getLovelace } from 'custom-card-helpers';
import { ch } from './custom-header';

window.customHeaderUnsub = [];

export class CustomHeaderConfig {
  static buildConfig(lovelace = getLovelace()) {
    clearTimeout(window.customHeaderTempTimeout);
    this._config = {
      ...defaultConfig(),
      ...lovelace.config.custom_header,
    };
    this.template_vars = this._config.template_variables;
    this.last_template_result = null;
    this.test_config = { ...this._config, ...conditionalConfig(this._config) };
    const config_string = JSON.stringify(this._config);
    this.has_templates = !!this.template_vars || config_string.includes('{{') || config_string.includes('{%');
    this.template_failed = false;
    this.disabled =
      (typeof this.test_config.disabled_mode == 'boolean' && this.test_config.disabled_mode) ||
      (typeof this.test_config.disabled_mode == 'string' &&
        !this.test_config.disabled_mode.includes('{{') &&
        !this.test_config.disabled_mode.includes('{%')) ||
      window.location.href.includes('disable_ch');

    if (typeof window.customHeaderUnsub === 'function') {
      window.customHeaderUnsub();
      window.customHeaderUnsub = null;
    }

    this.renderTemplate();
    this.lessHelpfulTempError();
  }

  static renderTemplate() {
    if (this.has_templates && !this.disabled) {
      const template_vars = JSON.stringify(this.template_vars).replace(/\\/g, '');
      const config = JSON.stringify(this._config).replace(/\\/g, '');
      this.unsub = subscribeRenderTemplate(
        result => {
          try {
            result = result.replace(/"true"/gi, 'true');
            result = result.replace(/"false"/gi, 'false');
            result = result.replace(/""/, '');
            this._config = JSON.parse(result);
            this._config = conditionalConfig(this._config);
          } catch (e) {
            this.template_failed = true;
            console.log(this.helpfulTempError(result, e));
          }
          if (JSON.stringify(window.last_template_result) == JSON.stringify(this._config)) {
            return;
          } else {
            window.last_template_result = this._config;
          }
          this.processAndContinue();
        },
        { template: template_vars + config },
        this._config.locale,
      );
    } else {
      this.processAndContinue();
    }
  }

  static helpfulTempError(result, error) {
    const position = error.toString().match(/\d+/g)[0];
    const left = result.substr(0, position).match(/[^,]*$/);
    const right = result.substr(position).match(/^[^,]*/);
    const err = `${left ? left[0] : ''}${right ? right[0] : ''}`.replace('":"', ': "');
    err = `[CUSTOM-HEADER] There was an issue with the template: ${err}`;
    if (err.includes('locale')) {
      err = '[CUSTOM-HEADER] There was an issue one of your "template_variables".';
    }
    return err;
  }

  static async lessHelpfulTempError() {
    if (typeof window.customHeaderUnsub === 'function') {
      window.customHeaderUnsub();
      window.customHeaderUnsub = null;
    }
    try {
      window.customHeaderUnsub = await this.unsub;
    } catch (e) {
      this.template_failed = true;
      console.log('[CUSTOM-HEADER] There was an error with one or more of your templates:');
      console.log(`${e.message.substring(0, e.message.indexOf(')'))})`);
    }
  }

  static processAndContinue() {
    const haElem = ha_elements();
    const config = { ...this._config, ...conditionalConfig(this._config) };
    if (config.hide_tabs) config.hide_tabs = processTabArray(config.hide_tabs);
    if (config.show_tabs) config.show_tabs = processTabArray(config.show_tabs);
    if (config.show_tabs && config.show_tabs.length) config.hide_tabs = invertNumArray(config.show_tabs);
    if (config.disable_sidebar || config.menu_dropdown) config.menu_hide = true;
    if (config.voice_dropdown) config.voice_hide = true;
    if (config.header_text != undefined && config.header_text == '') config.header_text = defaultConf.header_text;
    if (config.header_text && config.header_text == ' ') config.header_text = '&nbsp;';
    if (config.hide_header && config.disable_sidebar) {
      config.kiosk_mode = true;
      config.hide_header = false;
      config.disable_sidebar = false;
    }
    if (config.test_template != undefined) {
      if (this.disabled) {
        console.log(`Custom Header cannot render templates while disabled.`);
      } else if (
        typeof config.test_template == 'string' &&
        (config.test_template.toLowerCase().includes('true') || config.test_template.toLowerCase().includes('false'))
      ) {
        console.log(`Custom Header test returned: "${config.test_template}"`);
        console.log(`Warning: Boolean is returned as string instead of Boolean.`);
      } else if (typeof config.test_template == 'string') {
        console.log(`Custom Header test returned: "${config.test_template}"`);
      } else {
        console.log(`Custom Header test returned: ${config.test_template}`);
      }
    }

    clearTimeout(window.customHeaderTempTimeout);
    // Render templates every minute.
    window.customHeaderTempTimeout = window.setTimeout(() => {
      const panelLovelace = document
        .querySelector('home-assistant')
        .shadowRoot.querySelector('home-assistant-main')
        .shadowRoot.querySelector('ha-panel-lovelace');
      const editor = panelLovelace ? panelLovelace.shadowRoot.querySelector('hui-editor') : null;
      if (
        !panelLovelace ||
        editor ||
        this.template_failed ||
        panelLovelace.shadowRoot.querySelector('hui-root').shadowRoot.querySelector('custom-header-editor')
      ) {
        return;
      }
      this.buildConfig();
    }, (60 - new Date().getSeconds()) * 1000);
    window.customHeaderTempTimeout;

    styleHeader(this._config, ch, haElem);
    observers(this._config, ch, haElem);
  }
}
