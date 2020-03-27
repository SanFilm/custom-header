import { invertNumArray, subscribeRenderTemplate, processTabArray } from './helpers';
import { conditionalConfig } from './conditional-config';
import { styleHeader } from './style-header';
import { defaultConfig } from './default-config';
import { observers } from './observers';
import { ha_elements } from './ha-elements';
import { getLovelace } from 'custom-card-helpers';

window.customHeaderUnsub = [];

export class CustomHeaderConfig {
  static buildConfig(ch, lovelace = getLovelace()) {
    if (!lovelace) return;
    const haElem = ha_elements();
    if (!haElem) return;
    clearTimeout(window.customHeaderTempTimeout);
    this.default_config = defaultConfig();
    this.config = {
      ...this.default_config,
      ...lovelace.config.custom_header,
    };
    this.template_vars = this.config.template_variables;
    this.last_template_result = null;
    this.test_config = { ...this.config, ...conditionalConfig(this.config, haElem) };
    const config_string = JSON.stringify(this.config);
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

    this.renderTemplate(ch, haElem);
    this.catchTemplate();
  }

  static renderTemplate(ch, haElem) {
    if (this.has_templates && !this.disabled) {
      const template_vars = JSON.stringify(this.template_vars).replace(/\\/g, '');
      const config = JSON.stringify(this.config).replace(/\\/g, '');
      this.unsub = subscribeRenderTemplate(
        result => {
          try {
            result = result.replace(/"true"/gi, 'true');
            result = result.replace(/"false"/gi, 'false');
            result = result.replace(/""/, '');
            this.config = JSON.parse(result);
            this.config = conditionalConfig(this.config, haElem);
          } catch (e) {
            this.template_failed = true;
            this.helpfulTempError(result, e);
          }
          if (JSON.stringify(window.last_template_result) == JSON.stringify(this.config)) {
            return;
          } else {
            window.last_template_result = this.config;
          }
          this.processAndContinue(ch, haElem);
        },
        { template: template_vars + config },
        this.config.locale,
      );
    } else {
      this.processAndContinue(ch, haElem);
    }
  }

  static helpfulTempError(result, error) {
    let err;
    const position = error.toString().match(/\d+/g);
    if (position) {
      position = error.toString().match(/\d+/g)[0];
      const left = result.substr(0, position).match(/[^,]*$/);
      const right = result.substr(position).match(/^[^,]*/);
      err = `${left ? left[0] : ''}${right ? right[0] : ''}`.replace('":"', ': "');
      err = `[CUSTOM-HEADER] There was an issue with the template: ${err}`;
    }
    if (err && err.includes('locale')) {
      err = '[CUSTOM-HEADER] There was an issue one of your "template_variables".';
    }
    if (err) console.log(err);
    else return;
  }

  static async catchTemplate() {
    if (window.customHeaderUnsub) {
      for (const unsub of window.customHeaderUnsub) {
        if (typeof unsub === 'function') unsub();
      }
      window.customHeaderUnsub = [];
    } else {
      window.customHeaderUnsub = [];
    }
    try {
      const unsub = await this.unsub;
      window.customHeaderUnsub.push(unsub);
    } catch (e) {
      this.template_failed = true;
      console.log('[CUSTOM-HEADER] There was an error with one or more of your templates:');
      console.log(`${e.message.substring(0, e.message.indexOf(')'))})`);
    }
  }

  static processAndContinue(ch, haElem) {
    const config = this.config;
    if (config.hide_tabs) config.hide_tabs = processTabArray(config.hide_tabs);
    if (config.show_tabs) config.show_tabs = processTabArray(config.show_tabs);
    if (config.show_tabs && config.show_tabs.length) config.hide_tabs = invertNumArray(config.show_tabs);
    if (config.disable_sidebar || config.menu_dropdown) config.menu_hide = true;
    if (config.voice_dropdown) config.voice_hide = true;
    if (config.header_text != undefined && config.header_text == '') {
      config.header_text = this.default_config.header_text;
    }
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

    if (window.customHeaderTempTimeout) {
      for (const timeout of window.customHeaderTempTimeout) {
        clearTimeout(timeout);
      }
      window.customHeaderTempTimeout = [];
    } else {
      window.customHeaderTempTimeout = [];
    }
    // Render templates every minute.
    const template_timeout = window.setTimeout(() => {
      haElem = ha_elements();
      if (!haElem) return;
      const editor = haElem.panel ? haElem.panel.shadowRoot.querySelector('hui-editor') : null;
      const edit_mode = haElem.root.querySelector('app-toolbar').className != 'edit-mode';
      if (!haElem.panel || editor || this.template_failed || edit_mode) return;
      if (haElem.root && haElem.root.querySelector('custom-header-editor')) return;
      this.buildConfig(ch);
    }, (60 - new Date().getSeconds()) * 1000);
    window.customHeaderTempTimeout.push(template_timeout);
    window.customHeaderTempTimeout[window.customHeaderTempTimeout.length - 1];

    styleHeader(config, ch, haElem);
    observers(config, ch, haElem);
  }
}
