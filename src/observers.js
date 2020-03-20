import { hideMenuItems } from './overflow-menu';
import { insertStyleTags } from './style-tags';
import { redirects } from './redirects';
import { getLovelace } from 'custom-card-helpers';
import { fireEvent } from 'custom-card-helpers';
import { CustomHeaderConfig } from './config';

export const selectTab = (config, ch) => {
  if (getLovelace() == null) return;
  const lovelace = getLovelace();
  if (!lovelace.current_view) return;
  if (haElem.tabContainer && ch.header.tabContainer) {
    ch.header.tabs[lovelace.current_view].dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: false }));
    ch.footer.tabs[lovelace.current_view].dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: false }));
    fireEvent(ch.header.container, 'iron-resize');
  }
};

export const observers = (config, ch, haElem) => {
  const callback = mutations => {
    const headerType = config.split_mode ? ch.footer : ch.header;
    mutations.forEach(({ addedNodes, target }) => {
      if (mutations.length && mutations[0].target.nodeName == 'HTML') {
        window.customHeaderExceptionConfig = 'init';
        CustomHeaderConfig.buildConfig();
        mutations = [];
      }
      if (target.id == 'view' && addedNodes.length && headerType.tabs.length) {
        // Navigating to new tab/view.
        if (haElem.root.querySelector('app-toolbar').className != 'edit-mode') {
          redirects(config, ch.header);
          // selectTab(config, ch);
          CustomHeaderConfig.buildConfig();
        }
      } else if (addedNodes.length && target.nodeName == 'PARTIAL-PANEL-RESOLVER') {
        // When returning to lovelace/overview from elsewhere in HA.
        if (addedNodes[0].nodeName == 'HA-PANEL-LOVELACE') {
          if (window.customHeaderObservers) {
            for (const observer of window.customHeaderObservers) {
              observer.disconnect();
            }
            window.customHeaderObservers = [];
          }
          window.setTimeout(() => {
            CustomHeaderConfig.buildConfig(addedNodes[0].lovelace);
          }, 2000);
        }
        if (haElem.main.querySelector('ha-panel-lovelace')) {
          if (config.compact_mode && !config.footer_mode) {
            haElem.sidebar.main.querySelector('.menu').style = 'height:49px;';
            haElem.sidebar.main.querySelector('paper-listbox').style = 'height:calc(100% - 175px);';
            haElem.sidebar.main.querySelector('div.divider').style = '';
          } else if (config.footer_mode && !config.split_mode) {
            haElem.sidebar.main.querySelector('.menu').style = '';
            haElem.sidebar.main.querySelector('paper-listbox').style = 'height: calc(100% - 170px);';
            haElem.sidebar.main.querySelector('div.divider').style = 'margin-bottom: -10px;';
          } else if (config.split_mode) {
            haElem.sidebar.main.querySelector('.menu').style = 'height:49px;';
            haElem.sidebar.main.querySelector('paper-listbox').style = 'height: calc(100% - 170px);';
            haElem.sidebar.main.querySelector('div.divider').style = 'margin-bottom: -3px;';
          }
        } else {
          haElem.sidebar.main.querySelector('.menu').style = '';
          haElem.sidebar.main.querySelector('paper-listbox').style = '';
          haElem.sidebar.main.querySelector('div.divider').style = '';
        }
        if (haElem.root.querySelector('editor')) haElem.root.querySelector('editor').remove();
      } else if (target.className === 'edit-mode' && addedNodes.length) {
        // Entered edit mode.
        if (haElem.root.querySelector('editor')) haElem.root.querySelector('editor').remove();
        if (!window.customHeaderDisabled) hideMenuItems(config, ch.header, true);
        ch.header.menu.style.display = 'none';
        haElem.root.querySelector('ch-header').style.display = 'none';
        haElem.root.querySelector('ch-footer').style.display = 'none';
        haElem.appHeader.style.display = 'block';
        if (haElem.root.querySelector('#ch_view_style')) haElem.root.querySelector('#ch_view_style').remove();
        if (haElem.root.querySelector('#ch_header_style')) haElem.root.querySelector('#ch_header_style').remove();
        if (haElem.root.querySelector('#ch_animated')) haElem.root.querySelector('#ch_animated').remove();
      } else if (target.nodeName === 'APP-HEADER' && addedNodes.length) {
        // Exited edit mode.
        insertStyleTags(config, ch);
        haElem.menu = haElem.appHeader.querySelector('ha-menu-button');
        haElem.appHeader.style.display = 'none';
        ch.header.menu.style.display = '';
        haElem.root.querySelector('ch-header').style.display = '';
        haElem.root.querySelector('ch-footer').style.display = '';
      }
    });
  };

  const panel_observer = new MutationObserver(callback);
  const header_observer = new MutationObserver(callback);
  const root_observer = new MutationObserver(callback);
  const html_observer = new MutationObserver(callback);

  if (!window.customHeaderObservers || !window.customHeaderObservers.length) {
    panel_observer.observe(haElem.partialPanelResolver, { childList: true });
    header_observer.observe(haElem.appHeader, { childList: true });
    root_observer.observe(haElem.root.querySelector('#view'), { childList: true });
    html_observer.observe(document.querySelector('html'), { attributes: true });
  }

  window.customHeaderObservers = [panel_observer, header_observer, root_observer, html_observer];
};
