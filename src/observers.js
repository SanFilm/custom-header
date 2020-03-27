import { hideMenuItems } from './overflow-menu';
import { insertStyleTags } from './style-tags';
import { redirects } from './redirects';
import { getLovelace } from 'custom-card-helpers';
import { CustomHeaderConfig } from './config';

export const selectTab = (config, ch) => {
  const headerType = config.compact_mode || config.button_scroll ? ch.header : ch.footer;
  const lovelace = getLovelace();
  if (!lovelace) return;
  const haActiveTabIndex = lovelace.current_view;
  headerType.tabContainer.setAttribute('selected', haActiveTabIndex);
  if (!headerType.tabs[haActiveTabIndex]) return;
  const tab = headerType.tabs[haActiveTabIndex].getBoundingClientRect();
  const container = headerType.tabContainer.shadowRoot.querySelector('#tabsContainer').getBoundingClientRect();
  if (container.right < tab.right || container.left > tab.left) {
    headerType.tabContainer._scrollToLeft();
    headerType.tabContainer._scrollToRight();
    headerType.tabs[haActiveTabIndex].dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: false }));
  }
};

export const observers = (config, ch, haElem) => {
  const callback = mutations => {
    const headerType = config.split_mode ? ch.footer : ch.header;
    mutations.forEach(({ addedNodes, target }) => {
      if (mutations.length && mutations[0].target.nodeName == 'HTML') {
        window.customHeaderExceptionConfig = 'init';
        CustomHeaderConfig.buildConfig(ch);
        mutations = [];
      }
      if (target.id == 'view' && addedNodes.length && headerType.tabs.length) {
        // Navigating to new tab/view.
        if (haElem.root.querySelector('app-toolbar').className != 'edit-mode') {
          redirects(config, ch);
          selectTab(config, ch);
          CustomHeaderConfig.buildConfig(ch);
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
          CustomHeaderConfig.buildConfig(ch, addedNodes[0].lovelace);
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
        const menu_clone = ch.header.menu.cloneNode(true);
        ch.header.menu.parentNode.replaceChild(menu_clone, ch.header.menu);
        ch.header.menu = ch.header.container.querySelector("[buttonelem='menu']");
        if (haElem.root.querySelector('editor')) haElem.root.querySelector('editor').remove();
        if (!window.customHeaderDisabled) hideMenuItems(config, ch.header, true, haElem);
        ch.header.menu.style.display = 'none';
        haElem.root.querySelector('ch-header').style.display = 'none';
        haElem.root.querySelector('ch-footer').style.display = 'none';
        haElem.appHeader.style.display = 'block';
        if (haElem.root.querySelector('#ch_view_style')) haElem.root.querySelector('#ch_view_style').remove();
        if (haElem.root.querySelector('#ch_header_style')) haElem.root.querySelector('#ch_header_style').remove();
        if (haElem.root.querySelector('#ch_animated')) haElem.root.querySelector('#ch_animated').remove();
      } else if (target.nodeName === 'APP-HEADER' && addedNodes.length) {
        // Exited edit mode.
        insertStyleTags(config, ch, haElem);
        haElem.menu = haElem.appHeader.querySelector('ha-menu-button');
        ch.header.menu.addEventListener('click', () => {
          haElem.menu.shadowRoot
            .querySelector('paper-icon-button')
            .dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: false }));
        });
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
